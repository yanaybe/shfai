from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    organization_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    organization_id: str | None
    organization_name: str | None

    model_config = {"from_attributes": True}
