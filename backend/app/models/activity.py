import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid
from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ClaimActivity(Base):
    __tablename__ = "claim_activity"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    claim_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    action: Mapped[str] = mapped_column(String(100))
    # uploaded | viewed | edited | analyzed | status_changed | deleted
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)

    claim: Mapped["Claim"] = relationship(back_populates="activities")
    user: Mapped["User | None"] = relationship(back_populates="activities")
