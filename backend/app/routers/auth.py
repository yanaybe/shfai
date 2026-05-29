import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.core.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.schemas.auth import SignupRequest, LoginRequest, TokenResponse, RefreshRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:80]


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    base_slug = _make_slug(body.organization_name)
    slug = base_slug
    counter = 1
    while True:
        taken = await db.execute(select(Organization).where(Organization.slug == slug))
        if not taken.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=body.organization_name, slug=slug)
    db.add(org)
    await db.flush()

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role="owner",
        organization_id=org.id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token_payload = {"sub": str(user.id), "role": user.role, "org_id": str(org.id)}
    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account is deactivated")

    user.last_login_at = datetime.now(timezone.utc)

    token_payload = {"sub": str(user.id), "role": user.role, "org_id": str(user.organization_id) if user.organization_id else None}
    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    from jose import JWTError
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
    except JWTError:
        raise HTTPException(401, "Invalid or expired refresh token")

    import uuid
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(401, "User not found")

    token_payload = {"sub": str(user.id), "role": user.role, "org_id": str(user.organization_id) if user.organization_id else None}
    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org_name = None
    if current_user.organization_id:
        org = await db.get(Organization, current_user.organization_id)
        org_name = org.name if org else None
    return UserOut(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        organization_id=str(current_user.organization_id) if current_user.organization_id else None,
        organization_name=org_name,
    )
