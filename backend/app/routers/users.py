import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.deps import get_current_user, require_owner_or_admin
from app.models.user import User
from app.models.organization import Organization
from app.schemas.auth import UserOut
from pydantic import BaseModel, EmailStr
from app.core.auth import hash_password

router = APIRouter(prefix="/users", tags=["users"])


class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "member"


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org_name = None
    if current_user.organization_id:
        org = await db.get(Organization, current_user.organization_id)
        org_name = org.name if org else None
    return UserOut(
        id=str(current_user.id), email=current_user.email,
        full_name=current_user.full_name, role=current_user.role,
        organization_id=str(current_user.organization_id) if current_user.organization_id else None,
        organization_name=org_name,
    )


@router.get("/team", response_model=list[UserOut])
async def get_team(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.organization_id:
        return []
    result = await db.execute(
        select(User).where(User.organization_id == current_user.organization_id, User.is_active == True)
    )
    users = result.scalars().all()
    org = await db.get(Organization, current_user.organization_id)
    return [
        UserOut(
            id=str(u.id), email=u.email, full_name=u.full_name,
            role=u.role,
            organization_id=str(u.organization_id) if u.organization_id else None,
            organization_name=org.name if org else None,
        )
        for u in users
    ]


@router.post("/invite", response_model=UserOut, status_code=201)
async def invite_member(
    body: InviteRequest,
    current_user: User = Depends(require_owner_or_admin),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.organization_id:
        raise HTTPException(400, "No organization")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    if body.role not in ("member", "owner"):
        raise HTTPException(400, "Invalid role. Must be member or owner")

    # In production: send invite email. For MVP: create user with temp password.
    import secrets
    temp_password = secrets.token_urlsafe(12)

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(temp_password),
        role=body.role,
        organization_id=current_user.organization_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    org = await db.get(Organization, current_user.organization_id)
    return UserOut(
        id=str(user.id), email=user.email, full_name=user.full_name,
        role=user.role,
        organization_id=str(user.organization_id),
        organization_name=org.name if org else None,
    )
