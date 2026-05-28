import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models import Claim
from app.schemas import ClaimOut, ClaimStatusOut
from app.services.storage import storage
from app.pipeline import process_claim
from app.config import settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/claims", tags=["claims"])

ALLOWED_TYPES = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}


@router.post("/upload", response_model=ClaimStatusOut, status_code=202)
async def upload_claim(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Accepted: PDF, PNG, JPG, TIFF.")

    file_bytes = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit.")

    file_url = await storage.save(file_bytes, file.filename or "upload")
    file_type = "pdf" if ext == ".pdf" else "image"

    claim = Claim(
        file_name=file.filename,
        file_url=file_url,
        file_type=file_type,
        status="pending",
    )
    db.add(claim)
    await db.flush()
    await db.refresh(claim)
    claim_id = claim.id
    await db.commit()

    background_tasks.add_task(process_claim, claim_id)
    log.info("Claim %s queued for processing", claim_id)

    return ClaimStatusOut(
        id=claim_id,
        status="pending",
        risk_score=None,
        risk_level=None,
    )


@router.get("/{claim_id}/status", response_model=ClaimStatusOut)
async def get_claim_status(claim_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    claim = await db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found.")
    return claim


@router.get("/{claim_id}", response_model=ClaimOut)
async def get_claim(claim_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Claim)
        .options(
            selectinload(Claim.issues),
            selectinload(Claim.fixes),
            selectinload(Claim.report),
        )
        .where(Claim.id == claim_id)
    )
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(404, "Claim not found.")
    return claim
