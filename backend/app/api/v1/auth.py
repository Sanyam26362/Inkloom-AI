from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    CurrentUser,
    UserRole,
    get_current_user,
    create_access_token,
    verify_password,
    hash_password,
    DEMO_ACCOUNTS,
    normalize_role,
)
from app.models.user import UserAccount
from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse, DemoUserItem

router = APIRouter(prefix="/auth", tags=["Authentication & Roles"])


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates a user via email/password or quick demo selection.
    Issues a signed JWT access token.
    """
    user_data = None

    # 1. Quick demo login if role is provided and demo mode is active
    if payload.role and settings.AUTH_DEMO_MODE:
        normalized_role = normalize_role(payload.role)
        role_email_map = {
            UserRole.ADMIN: "admin@inkloom.ai",
            UserRole.MANAGER: "admin@inkloom.ai",
            UserRole.JUDGE: "judge@inkloom.ai",
            UserRole.REVIEWER: "judge@inkloom.ai",
            UserRole.CREATOR: "creator@inkloom.ai",
        }
        target_email = role_email_map.get(normalized_role, "creator@inkloom.ai")
        demo_info = DEMO_ACCOUNTS.get(target_email)
        if demo_info:
            user_data = {
                "user_id": demo_info["user_id"],
                "user_name": demo_info["user_name"],
                "role": normalized_role.value,
                "email": target_email,
                "tenant_id": demo_info.get("tenant_id", "tenant_default"),
            }

    # 2. Check demo accounts by email
    if not user_data and payload.email and settings.AUTH_DEMO_MODE:
        email_clean = payload.email.strip().lower()
        if email_clean in DEMO_ACCOUNTS:
            demo_info = DEMO_ACCOUNTS[email_clean]
            # If password provided, verify; if omitted in demo mode, allow quick demo login
            if payload.password and not verify_password(payload.password, demo_info["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password.",
                )
            user_data = {
                "user_id": demo_info["user_id"],
                "user_name": demo_info["user_name"],
                "role": demo_info["role"].value,
                "email": email_clean,
                "tenant_id": demo_info.get("tenant_id", "tenant_default"),
            }

    # 3. Check database user accounts
    if not user_data and payload.email:
        email_clean = payload.email.strip().lower()
        stmt = select(UserAccount).where(UserAccount.email == email_clean)
        res = await session.execute(stmt)
        db_user = res.scalar_one_or_none()
        if db_user:
            if not payload.password or not verify_password(payload.password, db_user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password.",
                )
            user_data = {
                "user_id": f"usr_db_{db_user.id}",
                "user_name": db_user.full_name,
                "role": db_user.role,
                "email": db_user.email,
                "tenant_id": db_user.tenant_id,
            }

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Please verify your credentials or select a demo account.",
        )

    # 4. Generate signed JWT token
    token = create_access_token({
        "sub": user_data["email"],
        "user_id": user_data["user_id"],
        "user_name": user_data["user_name"],
        "role": user_data["role"],
        "email": user_data["email"],
        "tenant_id": user_data["tenant_id"],
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserProfileResponse(**user_data),
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    user: CurrentUser = Depends(get_current_user),
) -> UserProfileResponse:
    """Returns the authenticated user profile based on the decoded JWT."""
    return UserProfileResponse(
        user_id=user.user_id,
        user_name=user.user_name,
        email=user.email,
        role=user.role.value,
        tenant_id=user.tenant_id,
    )


@router.get("/demo-users", response_model=List[DemoUserItem])
async def list_demo_users() -> List[DemoUserItem]:
    """Lists available demo personas for fast switching in UI or judge evaluation."""
    return [
        DemoUserItem(
            email="admin@inkloom.ai",
            user_name="Jordan Vance (Admin)",
            role="ADMIN",
            default_password="admin123",
            description="Superuser with authority to approve FAIL/NEEDS_REVIEW with overrides, manage queues, view stats.",
        ),
        DemoUserItem(
            email="judge@inkloom.ai",
            user_name="Sasha Bloom (Judge)",
            role="JUDGE",
            default_password="judge123",
            description="Compliance reviewer who can approve PASS, request changes, reject, and resolve/override findings.",
        ),
        DemoUserItem(
            email="creator@inkloom.ai",
            user_name="Alex Rivera (Creator)",
            role="CREATOR",
            default_password="creator123",
            description="Marketing creative who uploads creatives, creates revisions, and views audit reports.",
        ),
    ]
