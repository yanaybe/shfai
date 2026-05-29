import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.claim import Claim, ClaimIssue, ClaimFix, ClaimReport
from app.models.activity import ClaimActivity
from app.models.user import User
from app.models.organization import Organization
from app.schemas.claim import ClaimOut, ClaimStatusOut, ClaimListItem, ClaimListResponse, ClaimEditRequest
from app.core.deps import get_current_user, get_current_org
from app.services.storage import storage
from app.pipeline import process_claim
from app.config import settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/claims", tags=["claims"])

ALLOWED_TYPES = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}


async def _log_activity(db: AsyncSession, claim_id: uuid.UUID, user_id: uuid.UUID | None, action: str, meta: dict | None = None):
    db.add(ClaimActivity(claim_id=claim_id, user_id=user_id, action=action, metadata_=meta))


def _assert_claim_access(claim: Claim, org: Organization):
    if claim.organization_id != org.id:
        raise HTTPException(404, "Claim not found")


@router.post("/upload", response_model=ClaimStatusOut, status_code=202)
async def upload_claim(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type '{ext}'.")

    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit.")

    file_url = await storage.save(file_bytes, file.filename or "upload")

    claim = Claim(
        organization_id=org.id,
        uploaded_by_id=current_user.id,
        file_name=file.filename,
        file_url=file_url,
        file_type="pdf" if ext == ".pdf" else "image",
        status="uploaded",
    )
    db.add(claim)
    await db.flush()
    await _log_activity(db, claim.id, current_user.id, "uploaded", {"file_name": file.filename})
    await db.refresh(claim)
    claim_id = claim.id
    await db.commit()

    background_tasks.add_task(process_claim, claim_id)
    return ClaimStatusOut(id=claim_id, status="uploaded", risk_score=None, risk_level=None)


@router.get("", response_model=ClaimListResponse)
async def list_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    risk_level: str | None = Query(None),
    payer: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    base = select(Claim).where(
        Claim.organization_id == org.id,
        Claim.is_deleted == False,
    )
    if status:
        base = base.where(Claim.status == status)
    if risk_level:
        base = base.where(Claim.risk_level == risk_level)
    if payer:
        base = base.where(Claim.extracted_data["payer"].as_string().ilike(f"%{payer}%"))

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(
        base.options(selectinload(Claim.uploaded_by))
        .order_by(Claim.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    claims = result.scalars().all()

    items = [
        ClaimListItem(
            id=c.id,
            created_at=c.created_at,
            updated_at=c.updated_at,
            status=c.status,
            file_name=c.file_name,
            file_type=c.file_type,
            risk_score=c.risk_score,
            risk_level=c.risk_level,
            payer=(c.extracted_data or {}).get("payer"),
            uploaded_by=c.uploaded_by,
        )
        for c in claims
    ]
    return ClaimListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{claim_id}/status", response_model=ClaimStatusOut)
async def get_claim_status(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    claim = await db.get(Claim, claim_id)
    if not claim or claim.is_deleted:
        raise HTTPException(404, "Claim not found")
    _assert_claim_access(claim, org)
    return claim


@router.get("/{claim_id}", response_model=ClaimOut)
async def get_claim(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    result = await db.execute(
        select(Claim)
        .options(
            selectinload(Claim.issues),
            selectinload(Claim.fixes),
            selectinload(Claim.report),
            selectinload(Claim.uploaded_by),
        )
        .where(Claim.id == claim_id, Claim.is_deleted == False)
    )
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(404, "Claim not found")
    _assert_claim_access(claim, org)
    await _log_activity(db, claim.id, current_user.id, "viewed")
    return claim


@router.patch("/{claim_id}", response_model=ClaimStatusOut)
async def edit_claim(
    claim_id: uuid.UUID,
    body: ClaimEditRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    claim = await db.get(Claim, claim_id)
    if not claim or claim.is_deleted:
        raise HTTPException(404, "Claim not found")
    _assert_claim_access(claim, org)

    claim.extracted_data = body.extracted_data
    if body.status:
        claim.status = body.status
    await _log_activity(db, claim.id, current_user.id, "edited")
    return claim


@router.post("/{claim_id}/reanalyze", response_model=ClaimStatusOut)
async def reanalyze_claim(
    claim_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    claim = await db.get(Claim, claim_id)
    if not claim or claim.is_deleted:
        raise HTTPException(404, "Claim not found")
    _assert_claim_access(claim, org)

    # Clear previous results
    await db.execute(select(ClaimIssue).where(ClaimIssue.claim_id == claim_id))
    for issue in (await db.execute(select(ClaimIssue).where(ClaimIssue.claim_id == claim_id))).scalars().all():
        await db.delete(issue)
    for fix in (await db.execute(select(ClaimFix).where(ClaimFix.claim_id == claim_id))).scalars().all():
        await db.delete(fix)
    existing_report = (await db.execute(select(ClaimReport).where(ClaimReport.claim_id == claim_id))).scalar_one_or_none()
    if existing_report:
        await db.delete(existing_report)

    claim.status = "uploaded"
    claim.risk_score = None
    claim.risk_level = None
    claim.processing_error = None
    await _log_activity(db, claim.id, current_user.id, "analyzed", {"trigger": "manual_reanalyze"})
    await db.commit()

    background_tasks.add_task(process_claim, claim_id)
    return ClaimStatusOut(id=claim_id, status="uploaded", risk_score=None, risk_level=None)


@router.delete("/{claim_id}", status_code=204)
async def delete_claim(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    claim = await db.get(Claim, claim_id)
    if not claim or claim.is_deleted:
        raise HTTPException(404, "Claim not found")
    _assert_claim_access(claim, org)
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(403, "Only owners can delete claims")

    claim.is_deleted = True
    await _log_activity(db, claim.id, current_user.id, "deleted")
