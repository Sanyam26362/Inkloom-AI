from datetime import timedelta
from typing import List, Optional
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
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserProfileResponse,
    DemoUserItem,
    ClerkSyncRequest,
    OnboardingStateUpdateRequest,
    CreatorProfileUpdateRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Roles"])


async def _get_or_create_user_account(
    session: AsyncSession,
    email: str,
    full_name: str,
    role: str,
    tenant_id: str = "tenant_default",
) -> UserAccount:
    """Finds or creates a persistent UserAccount record in the database."""
    email_clean = email.strip().lower()
    stmt = select(UserAccount).where(UserAccount.email == email_clean)
    res = await session.execute(stmt)
    db_user = res.scalar_one_or_none()
    if not db_user:
        db_user = UserAccount(
            email=email_clean,
            full_name=full_name,
            hashed_password="",
            role=role,
            tenant_id=tenant_id,
            onboarding_status="NOT_STARTED",
            onboarding_step=1,
            onboarding_metadata={},
        )
        session.add(db_user)
        await session.commit()
        await session.refresh(db_user)
    return db_user


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates a user via email/password or quick demo selection.
    Issues a signed JWT access token and returns onboarding lifecycle state.
    """
    user_data = None
    target_email: Optional[str] = None
    target_role: Optional[str] = None
    target_name: Optional[str] = None

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
            target_role = normalized_role.value
            target_name = demo_info["user_name"]

    # 2. Check demo accounts by email
    elif payload.email and settings.AUTH_DEMO_MODE:
        email_clean = payload.email.strip().lower()
        if email_clean in DEMO_ACCOUNTS:
            demo_info = DEMO_ACCOUNTS[email_clean]
            if payload.password and not verify_password(payload.password, demo_info["password_hash"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password.",
                )
            target_email = email_clean
            target_role = demo_info["role"].value
            target_name = demo_info["user_name"]

    # 3. Check database user accounts for password authentication
    elif payload.email:
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
            target_email = db_user.email
            target_role = db_user.role
            target_name = db_user.full_name

    if not target_email or not target_role or not target_name:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Please verify your credentials or select a demo account.",
        )

    # Sync with persistent database record
    db_user = await _get_or_create_user_account(
        session=session,
        email=target_email,
        full_name=target_name,
        role=target_role,
        tenant_id="tenant_default",
    )

    user_profile = UserProfileResponse(
        user_id=f"usr_db_{db_user.id}",
        user_name=db_user.full_name,
        email=db_user.email,
        role=db_user.role,
        tenant_id=db_user.tenant_id,
        onboarding_status=db_user.onboarding_status or "NOT_STARTED",
        onboarding_step=db_user.onboarding_step or 1,
        brand_id=db_user.brand_id,
        creator_type=db_user.creator_type,
        organization_name=db_user.organization_name,
        specialization=db_user.specialization,
        onboarding_metadata=db_user.onboarding_metadata or {},
    )

    token = create_access_token({
        "sub": user_profile.email,
        "user_id": user_profile.user_id,
        "user_name": user_profile.user_name,
        "role": user_profile.role,
        "email": user_profile.email,
        "tenant_id": user_profile.tenant_id,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_profile,
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> UserProfileResponse:
    """Returns the authenticated user profile with current onboarding and workspace state."""
    db_user = None
    if user.email:
        stmt = select(UserAccount).where(UserAccount.email == user.email.strip().lower())
        res = await session.execute(stmt)
        db_user = res.scalar_one_or_none()

    if db_user:
        return UserProfileResponse(
            user_id=f"usr_db_{db_user.id}",
            user_name=db_user.full_name,
            email=db_user.email,
            role=db_user.role,
            tenant_id=db_user.tenant_id,
            onboarding_status=db_user.onboarding_status or "NOT_STARTED",
            onboarding_step=db_user.onboarding_step or 1,
            brand_id=db_user.brand_id,
            creator_type=db_user.creator_type,
            organization_name=db_user.organization_name,
            specialization=db_user.specialization,
            onboarding_metadata=db_user.onboarding_metadata or {},
        )

    # Fallback to token claims
    return UserProfileResponse(
        user_id=user.user_id,
        user_name=user.user_name,
        email=user.email,
        role=user.role.value,
        tenant_id=user.tenant_id,
        onboarding_status="NOT_STARTED",
        onboarding_step=1,
    )


@router.post("/clerk-sync", response_model=TokenResponse)
async def clerk_sync(
    payload: ClerkSyncRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Synchronizes an authenticated Clerk user session into Inkloom:
    1. Normalizes the requested role (CREATOR, BRAND/REVIEWER, JUDGE, ADMIN).
    2. Persists or retrieves UserAccount in the database with onboarding history.
    3. Issues signed JWT access token.
    """
    normalized_role = normalize_role(payload.role or "CREATOR")
    user_name = payload.user_name or payload.email.split("@")[0].title()
    tenant_id = payload.tenant_id or "tenant_default"

    db_user = await _get_or_create_user_account(
        session=session,
        email=payload.email,
        full_name=user_name,
        role=normalized_role.value,
        tenant_id=tenant_id,
    )

    user_profile = UserProfileResponse(
        user_id=f"usr_clerk_{payload.clerk_id}",
        user_name=db_user.full_name,
        email=db_user.email,
        role=db_user.role,
        tenant_id=db_user.tenant_id,
        onboarding_status=db_user.onboarding_status or "NOT_STARTED",
        onboarding_step=db_user.onboarding_step or 1,
        brand_id=db_user.brand_id,
        creator_type=db_user.creator_type,
        organization_name=db_user.organization_name,
        specialization=db_user.specialization,
        onboarding_metadata=db_user.onboarding_metadata or {},
    )

    token = create_access_token({
        "sub": user_profile.email,
        "user_id": user_profile.user_id,
        "user_name": user_profile.user_name,
        "role": user_profile.role,
        "email": user_profile.email,
        "tenant_id": user_profile.tenant_id,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_profile,
    )


@router.post("/onboarding-state", response_model=UserProfileResponse)
@router.put("/onboarding-state", response_model=UserProfileResponse)
async def update_onboarding_state(
    payload: OnboardingStateUpdateRequest,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> UserProfileResponse:
    """
    Updates the current user's onboarding step, draft inputs, or completion state.
    Used by the Brand Setup wizard for 'Save Draft & Exit' and 'Finish Setup'.
    """
    if not user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User email required for state persistence.")

    stmt = select(UserAccount).where(UserAccount.email == user.email.strip().lower())
    res = await session.execute(stmt)
    db_user = res.scalar_one_or_none()
    if not db_user:
        db_user = await _get_or_create_user_account(
            session=session,
            email=user.email,
            full_name=user.user_name,
            role=user.role.value,
            tenant_id=user.tenant_id,
        )

    if payload.onboarding_status is not None:
        db_user.onboarding_status = payload.onboarding_status
    if payload.onboarding_step is not None:
        db_user.onboarding_step = payload.onboarding_step
    if payload.brand_id is not None:
        db_user.brand_id = payload.brand_id
    if payload.onboarding_metadata is not None:
        current_meta = db_user.onboarding_metadata or {}
        db_user.onboarding_metadata = {**current_meta, **payload.onboarding_metadata}

    await session.commit()
    await session.refresh(db_user)

    return UserProfileResponse(
        user_id=f"usr_db_{db_user.id}",
        user_name=db_user.full_name,
        email=db_user.email,
        role=db_user.role,
        tenant_id=db_user.tenant_id,
        onboarding_status=db_user.onboarding_status or "NOT_STARTED",
        onboarding_step=db_user.onboarding_step or 1,
        brand_id=db_user.brand_id,
        creator_type=db_user.creator_type,
        organization_name=db_user.organization_name,
        specialization=db_user.specialization,
        onboarding_metadata=db_user.onboarding_metadata or {},
    )


@router.post("/creator-profile", response_model=UserProfileResponse)
async def update_creator_profile(
    payload: CreatorProfileUpdateRequest,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> UserProfileResponse:
    """
    Submits and finalizes the Content Creator profile:
    - Sets Creator Type (In-House Company Employee vs Ad Agency vs Freelance)
    - Sets Organization / Agency Name
    - Sets Creator Specialization
    - Links selected Brand from dropdown
    - Marks onboarding as COMPLETED so creator never sees setup again.
    """
    if not user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User email required for profile persistence.")

    stmt = select(UserAccount).where(UserAccount.email == user.email.strip().lower())
    res = await session.execute(stmt)
    db_user = res.scalar_one_or_none()
    if not db_user:
        db_user = await _get_or_create_user_account(
            session=session,
            email=user.email,
            full_name=user.user_name,
            role="CREATOR",
            tenant_id=user.tenant_id,
        )

    db_user.creator_type = payload.creator_type
    db_user.organization_name = payload.organization_name
    db_user.specialization = payload.specialization
    db_user.brand_id = payload.brand_id
    db_user.onboarding_status = "COMPLETED"

    meta = db_user.onboarding_metadata or {}
    if payload.portfolio_url:
        meta["portfolio_url"] = payload.portfolio_url
    if payload.extra_metadata:
        meta.update(payload.extra_metadata)
    db_user.onboarding_metadata = meta

    await session.commit()
    await session.refresh(db_user)

    return UserProfileResponse(
        user_id=f"usr_db_{db_user.id}",
        user_name=db_user.full_name,
        email=db_user.email,
        role=db_user.role,
        tenant_id=db_user.tenant_id,
        onboarding_status=db_user.onboarding_status,
        onboarding_step=db_user.onboarding_step or 1,
        brand_id=db_user.brand_id,
        creator_type=db_user.creator_type,
        organization_name=db_user.organization_name,
        specialization=db_user.specialization,
        onboarding_metadata=db_user.onboarding_metadata,
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
