import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.organization import Organization
from app.models.claim import Claim
from app.schemas.admin import OrgOut, AdminUserOut, PlatformStats, DeactivateRequest

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=PlatformStats)
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    orgs = (await db.execute(select(func.count()).select_from(Organization))).scalar_one()
    users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    total_claims = (await db.execute(select(func.count()).select_from(Claim).where(Claim.is_deleted == False))).scalar_one()
    week_claims = (await db.execute(
        select(func.count()).select_from(Claim).where(Claim.created_at >= week_ago, Claim.is_deleted == False)
    )).scalar_one()
    high_risk = (await db.execute(
        select(func.count()).select_from(Claim).where(Claim.risk_level == "high", Claim.is_deleted == False)
    )).scalar_one()
    avg_score_result = (await db.execute(
        select(func.avg(Claim.risk_score)).where(Claim.risk_score.isnot(None), Claim.is_deleted == False)
    )).scalar_one()

    return PlatformStats(
        total_organizations=orgs,
        total_users=users,
        total_claims=total_claims,
        claims_this_week=week_claims,
        high_risk_claims=high_risk,
        avg_risk_score=round(avg_score_result or 0, 1),
    )


@router.get("/organizations", response_model=list[OrgOut])
async def list_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Organization).order_by(Organization.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    orgs = result.scalars().all()

    out = []
    for org in orgs:
        user_count = (await db.execute(
            select(func.count()).select_from(User).where(User.organization_id == org.id)
        )).scalar_one()
        claim_count = (await db.execute(
            select(func.count()).select_from(Claim).where(Claim.organization_id == org.id, Claim.is_deleted == False)
        )).scalar_one()
        out.append(OrgOut(
            id=org.id, name=org.name, slug=org.slug,
            subscription_status=org.subscription_status,
            subscription_plan=org.subscription_plan,
            is_active=org.is_active,
            created_at=org.created_at,
            user_count=user_count,
            claim_count=claim_count,
        ))
    return out


@router.patch("/organizations/{org_id}/deactivate", status_code=200)
async def deactivate_org(
    org_id: uuid.UUID,
    body: DeactivateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found")
    org.is_active = False
    return {"status": "deactivated"}


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    users = result.scalars().all()

    out = []
    for user in users:
        org_name = None
        if user.organization_id:
            org = await db.get(Organization, user.organization_id)
            org_name = org.name if org else None
        claim_count = (await db.execute(
            select(func.count()).select_from(Claim).where(
                Claim.uploaded_by_id == user.id, Claim.is_deleted == False
            )
        )).scalar_one()
        out.append(AdminUserOut(
            id=user.id, email=user.email, full_name=user.full_name,
            role=user.role, is_active=user.is_active,
            created_at=user.created_at, last_login_at=user.last_login_at,
            organization_id=user.organization_id,
            organization_name=org_name,
            claim_count=claim_count,
        ))
    return out


@router.patch("/users/{user_id}/deactivate", status_code=200)
async def deactivate_user(
    user_id: uuid.UUID,
    body: DeactivateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot deactivate yourself")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = False
    return {"status": "deactivated"}


@router.get("/claims")
async def admin_list_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Claim).where(Claim.is_deleted == False)
        .options(selectinload(Claim.uploaded_by), selectinload(Claim.organization))
        .order_by(Claim.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    claims = result.scalars().all()
    total = (await db.execute(select(func.count()).select_from(Claim).where(Claim.is_deleted == False))).scalar_one()

    return {
        "total": total,
        "items": [
            {
                "id": str(c.id),
                "file_name": c.file_name,
                "status": c.status,
                "risk_score": c.risk_score,
                "risk_level": c.risk_level,
                "created_at": c.created_at.isoformat(),
                "organization": c.organization.name if c.organization else None,
                "uploaded_by": c.uploaded_by.full_name if c.uploaded_by else None,
                "payer": (c.extracted_data or {}).get("payer"),
            }
            for c in claims
        ],
    }


@router.delete("/claims/{claim_id}", status_code=204)
async def admin_delete_claim(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    claim = await db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(404, "Claim not found")
    claim.is_deleted = True
