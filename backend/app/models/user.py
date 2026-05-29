import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid
from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(nullable=True)

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="member")  # admin | owner | member
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )

    organization: Mapped["Organization | None"] = relationship(back_populates="users")
    claims: Mapped[list["Claim"]] = relationship(back_populates="uploaded_by")
    activities: Mapped[list["ClaimActivity"]] = relationship(back_populates="user")
