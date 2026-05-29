import uuid
from datetime import datetime
from pydantic import BaseModel


class OrgOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    subscription_status: str
    subscription_plan: str
    is_active: bool
    created_at: datetime
    user_count: int = 0
    claim_count: int = 0
    model_config = {"from_attributes": True}


class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None
    organization_id: uuid.UUID | None
    organization_name: str | None = None
    claim_count: int = 0
    model_config = {"from_attributes": True}


class PlatformStats(BaseModel):
    total_organizations: int
    total_users: int
    total_claims: int
    claims_this_week: int
    high_risk_claims: int
    avg_risk_score: float


class DeactivateRequest(BaseModel):
    reason: str | None = None
