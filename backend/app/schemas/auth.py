from typing import Optional, List, Dict, Any
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
    onboarding_status: str = "NOT_STARTED"
    onboarding_step: int = 1
    brand_id: Optional[int] = None
    creator_type: Optional[str] = None
    organization_name: Optional[str] = None
    specialization: Optional[str] = None
    onboarding_metadata: Optional[Dict[str, Any]] = None


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


class ClerkSyncRequest(BaseModel):
    clerk_id: str
    email: str
    user_name: Optional[str] = None
    role: Optional[str] = "CREATOR"
    tenant_id: Optional[str] = "tenant_default"


class OnboardingStateUpdateRequest(BaseModel):
    onboarding_status: Optional[str] = None
    onboarding_step: Optional[int] = None
    brand_id: Optional[int] = None
    onboarding_metadata: Optional[Dict[str, Any]] = None


class CreatorProfileUpdateRequest(BaseModel):
    creator_type: str
    organization_name: str
    specialization: str
    brand_id: int
    portfolio_url: Optional[str] = None
    extra_metadata: Optional[Dict[str, Any]] = None
