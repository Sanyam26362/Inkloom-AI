from typing import Optional, List
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None


class UserProfileResponse(BaseModel):
    user_id: str
    user_name: str
    email: Optional[str] = None
    role: str
    tenant_id: str = "tenant_default"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400  # 24 hours in seconds
    user: UserProfileResponse


class DemoUserItem(BaseModel):
    email: str
    user_name: str
    role: str
    default_password: str
    description: str
