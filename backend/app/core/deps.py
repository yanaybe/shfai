import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.auth import decode_token
from app.models.user import User
from app.models.organization import Organization

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id or payload.get("type") != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise credentials_exception
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_owner_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Owner or admin access required")
    return current_user


async def get_current_org(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Organization:
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User is not associated with an organization")
    org = await db.get(Organization, current_user.organization_id)
    if not org or not org.is_active:
        raise HTTPException(status_code=403, detail="Organization is inactive or not found")
    return org
