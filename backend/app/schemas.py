import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Any


class ClaimIssueOut(BaseModel):
    id: uuid.UUID
    category: str | None
    title: str | None
    description: str | None
    severity: str | None
    code_reference: str | None
    denial_likelihood: str | None
    source: str | None

    model_config = {"from_attributes": True}


class ClaimFixOut(BaseModel):
    id: uuid.UUID
    issue_id: uuid.UUID | None
    action: str | None
    rationale: str | None
    priority: int | None

    model_config = {"from_attributes": True}


class ClaimReportOut(BaseModel):
    executive_summary: str | None
    payer_adjudication_simulation: str | None
    submission_readiness: str | None
    ai_confidence: str | None
    processing_time_ms: int | None

    model_config = {"from_attributes": True}


class ClaimOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    status: str
    file_name: str | None
    file_type: str | None
    extracted_data: dict[str, Any] | None
    risk_score: int | None
    risk_level: str | None
    processing_error: str | None
    issues: list[ClaimIssueOut] = []
    fixes: list[ClaimFixOut] = []
    report: ClaimReportOut | None = None

    model_config = {"from_attributes": True}


class ClaimStatusOut(BaseModel):
    id: uuid.UUID
    status: str
    risk_score: int | None
    risk_level: str | None

    model_config = {"from_attributes": True}
