import time
import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.claim import Claim, ClaimIssue, ClaimFix, ClaimReport
from app.services.storage import storage
from app.services.ocr import extract_text
from app.services.parser import extract_claim_data
from app.services.rule_engine import run_rules
from app.services.ai_analyzer import analyze_claim
from app.db.database import AsyncSessionLocal

log = logging.getLogger(__name__)


async def process_claim(claim_id: uuid.UUID) -> None:
    start = time.perf_counter()
    async with AsyncSessionLocal() as db:
        claim = await db.get(Claim, claim_id)
        if not claim:
            log.error("Claim %s not found", claim_id)
            return

        try:
            await _set_status(db, claim, "processing")

            file_path = await storage.get_path(claim.file_url)
            raw_text = extract_text(file_path)
            claim.raw_text = raw_text

            # Use existing extracted_data if user edited it before re-run
            if not claim.extracted_data:
                claim_data = await extract_claim_data(raw_text)
                claim.extracted_data = claim_data
            else:
                claim_data = claim.extracted_data

            rule_findings = run_rules(claim_data)
            analysis = await analyze_claim(claim_data, rule_findings)

            claim.risk_score = analysis.get("risk_score")
            claim.risk_level = (analysis.get("risk_level") or "").lower()

            for issue in analysis.get("issues", []):
                db.add(ClaimIssue(
                    claim_id=claim.id,
                    category=issue.get("category"),
                    title=issue.get("title"),
                    description=issue.get("description"),
                    severity=issue.get("severity"),
                    code_reference=issue.get("code_reference"),
                    denial_likelihood=issue.get("denial_likelihood"),
                    source=issue.get("source", "ai"),
                ))

            await db.flush()
            result = await db.execute(select(ClaimIssue).where(ClaimIssue.claim_id == claim.id))
            issue_map: dict[str, uuid.UUID] = {i.title: i.id for i in result.scalars().all()}

            for fix in analysis.get("suggested_fixes", []):
                db.add(ClaimFix(
                    claim_id=claim.id,
                    issue_id=issue_map.get(fix.get("issue_title", "")),
                    action=fix.get("action"),
                    rationale=fix.get("rationale"),
                    priority=fix.get("priority"),
                ))

            elapsed_ms = int((time.perf_counter() - start) * 1000)
            db.add(ClaimReport(
                claim_id=claim.id,
                executive_summary=analysis.get("executive_summary"),
                payer_adjudication_simulation=analysis.get("payer_adjudication_simulation"),
                submission_readiness=analysis.get("submission_readiness"),
                ai_confidence=analysis.get("ai_confidence"),
                processing_time_ms=elapsed_ms,
            ))

            final_status = "analyzed"
            if claim.risk_level == "high" or (claim.risk_score or 0) >= 56:
                final_status = "needs_review"

            await _set_status(db, claim, final_status)
            log.info("Claim %s → %s (score=%s) in %dms", claim_id, final_status, claim.risk_score, elapsed_ms)

        except Exception as exc:
            log.exception("Pipeline failed for claim %s: %s", claim_id, exc)
            claim.processing_error = str(exc)
            await _set_status(db, claim, "analyzed")


async def _set_status(db: AsyncSession, claim: Claim, status: str) -> None:
    claim.status = status
    await db.commit()
