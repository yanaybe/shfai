import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, SmallInteger, Integer, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    file_name: Mapped[str | None] = mapped_column(String(255))
    file_url: Mapped[str | None] = mapped_column(Text)
    file_type: Mapped[str | None] = mapped_column(String(20))
    raw_text: Mapped[str | None] = mapped_column(Text)
    extracted_data: Mapped[dict | None] = mapped_column(JSON)
    risk_score: Mapped[int | None] = mapped_column(SmallInteger)
    risk_level: Mapped[str | None] = mapped_column(String(20))
    processing_error: Mapped[str | None] = mapped_column(Text)

    issues: Mapped[list["ClaimIssue"]] = relationship(back_populates="claim", cascade="all, delete-orphan")
    fixes: Mapped[list["ClaimFix"]] = relationship(back_populates="claim", cascade="all, delete-orphan")
    report: Mapped["ClaimReport | None"] = relationship(back_populates="claim", cascade="all, delete-orphan", uselist=False)


class ClaimIssue(Base):
    __tablename__ = "claim_issues"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    category: Mapped[str | None] = mapped_column(String(100))
    title: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str | None] = mapped_column(String(20))
    code_reference: Mapped[str | None] = mapped_column(String(100))
    denial_likelihood: Mapped[str | None] = mapped_column(String(50))
    source: Mapped[str | None] = mapped_column(String(50))

    claim: Mapped["Claim"] = relationship(back_populates="issues")
    fixes: Mapped[list["ClaimFix"]] = relationship(back_populates="issue")


class ClaimFix(Base):
    __tablename__ = "claim_fixes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"))
    issue_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("claim_issues.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    action: Mapped[str | None] = mapped_column(Text)
    rationale: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[int | None] = mapped_column(SmallInteger)

    claim: Mapped["Claim"] = relationship(back_populates="fixes")
    issue: Mapped["ClaimIssue | None"] = relationship(back_populates="fixes")


class ClaimReport(Base):
    __tablename__ = "claim_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), unique=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    executive_summary: Mapped[str | None] = mapped_column(Text)
    payer_adjudication_simulation: Mapped[str | None] = mapped_column(Text)
    submission_readiness: Mapped[str | None] = mapped_column(String(30))
    ai_confidence: Mapped[str | None] = mapped_column(String(20))
    processing_time_ms: Mapped[int | None] = mapped_column(Integer)

    claim: Mapped["Claim"] = relationship(back_populates="report")
