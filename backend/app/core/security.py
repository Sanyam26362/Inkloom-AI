import hashlib
import os
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional, Dict, Any, Union
import jwt
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings


class UserRole(str, Enum):
    CREATOR = "CREATOR"
    JUDGE = "JUDGE"
    ADMIN = "ADMIN"
    # Backwards compatibility aliases
    REVIEWER = "REVIEWER"
    MANAGER = "MANAGER"


def is_reviewer_or_above(role: Union[UserRole, str]) -> bool:
    """Returns True if role has reviewer, judge, or admin authority."""
    val = role.value if isinstance(role, UserRole) else str(role)
    return val in (UserRole.JUDGE.value, UserRole.ADMIN.value, UserRole.REVIEWER.value, UserRole.MANAGER.value)


def is_admin(role: Union[UserRole, str]) -> bool:
    """Returns True if role has admin or manager authority."""
    val = role.value if isinstance(role, UserRole) else str(role)
    return val in (UserRole.ADMIN.value, UserRole.MANAGER.value)


def normalize_role(role: Union[UserRole, str]) -> UserRole:
    """Normalizes role strings to UserRole enum."""
    val = role.value if isinstance(role, UserRole) else str(role).upper()
    if val in ("BRAND", "REVIEWER"):
        return UserRole.REVIEWER
    if val in ("ADMIN", "MANAGER"):
        return UserRole.ADMIN
    if val in ("JUDGE",):
        return UserRole.JUDGE
    try:
        return UserRole(val)
    except ValueError:
        return UserRole.CREATOR


class CurrentUser(BaseModel):
    user_id: str
    user_name: str
    role: UserRole
    email: Optional[str] = None
    tenant_id: str = "tenant_default"


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hashes a password with PBKDF2 HMAC-SHA256."""
    if not salt:
        salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}${hashed.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a password against PBKDF2 hash."""
    try:
        salt, _ = hashed_password.split("$", 1)
        return hash_password(plain_password, salt=salt) == hashed_password
    except Exception:
        return False


# Seeded demo accounts for zero-friction judge demo and local workflows
DEMO_ACCOUNTS: Dict[str, Dict[str, Any]] = {
    "admin@inkloom.ai": {
        "user_id": "usr_admin_001",
        "user_name": "Jordan Vance (Admin)",
        "role": UserRole.ADMIN,
        "password_hash": hash_password("admin123", salt="demo_salt_admin_2026"),
        "tenant_id": "tenant_default",
    },
    "judge@inkloom.ai": {
        "user_id": "usr_judge_001",
        "user_name": "Sasha Bloom (Judge)",
        "role": UserRole.JUDGE,
        "password_hash": hash_password("judge123", salt="demo_salt_judge_2026"),
        "tenant_id": "tenant_default",
    },
    "creator@inkloom.ai": {
        "user_id": "usr_creator_001",
        "user_name": "Alex Rivera (Creator)",
        "role": UserRole.CREATOR,
        "password_hash": hash_password("creator123", salt="demo_salt_creator_2026"),
        "tenant_id": "tenant_default",
    },
}


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Issues a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"iat": now, "exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT access token."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature or payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_demo_token(role: UserRole = UserRole.CREATOR, tenant_id: str = "tenant_default") -> str:
    """Generates a pre-signed JWT token for demo / test accounts."""
    role_email_map = {
        UserRole.ADMIN: "admin@inkloom.ai",
        UserRole.MANAGER: "admin@inkloom.ai",
        UserRole.JUDGE: "judge@inkloom.ai",
        UserRole.REVIEWER: "judge@inkloom.ai",
        UserRole.CREATOR: "creator@inkloom.ai",
    }
    email = role_email_map.get(role, "creator@inkloom.ai")
    demo_data = DEMO_ACCOUNTS.get(email, DEMO_ACCOUNTS["creator@inkloom.ai"])
    return create_access_token({
        "sub": email,
        "user_id": demo_data["user_id"],
        "user_name": demo_data["user_name"],
        "role": role.value,
        "email": email,
        "tenant_id": tenant_id,
    })


def get_auth_headers(role: UserRole = UserRole.CREATOR, tenant_id: str = "tenant_default") -> Dict[str, str]:
    """Helper returning valid Authorization Bearer header dictionary for tests."""
    token = get_demo_token(role, tenant_id=tenant_id)
    return {
        "Authorization": f"Bearer {token}",
        "x-user-role": role.value,
    }


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_role: Optional[str] = Header(None, alias="x-user-role"),
    x_user_id: Optional[str] = Header(None, alias="x-user-id"),
    x_user_name: Optional[str] = Header(None, alias="x-user-name"),
) -> CurrentUser:
    """
    Extracts and authenticates user identity.
    SECURITY RULE: Server must never trust raw x-user-role header without JWT validation.
    """
    # 1. Bearer Token Authentication
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization header format. Expected 'Bearer <token>'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        payload = decode_access_token(token)
        user_role_str = payload.get("role", UserRole.CREATOR.value)
        return CurrentUser(
            user_id=payload.get("user_id") or payload.get("sub", "usr_unknown"),
            user_name=payload.get("user_name", "Authenticated User"),
            role=normalize_role(user_role_str),
            email=payload.get("email") or payload.get("sub"),
            tenant_id=payload.get("tenant_id", "tenant_default"),
        )

    # 2. Rejection of untrusted raw x-user-role headers
    if x_user_role is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Raw x-user-role header is not trusted without valid JWT authentication. Please login to obtain a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Fallback when AUTH_DEMO_MODE is active and no auth headers supplied
    if settings.AUTH_DEMO_MODE:
        return CurrentUser(
            user_id="usr_creator_001",
            user_name="Alex Rivera (Creator)",
            role=UserRole.CREATOR,
            email="creator@inkloom.ai",
            tenant_id="tenant_default",
        )

    # 4. Strict rejection in non-demo mode
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please provide a valid Bearer token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_reviewer_or_manager(user: CurrentUser) -> None:
    """Guard function ensuring only REVIEWER, JUDGE, or ADMIN can review or approve."""
    if not is_reviewer_or_above(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action requires REVIEWER, JUDGE, or ADMIN role. Current role is {user.role.value}.",
        )


def require_admin(user: CurrentUser) -> None:
    """Guard function ensuring only ADMIN or MANAGER can perform admin actions."""
    if not is_admin(user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action requires ADMIN role. Current role is {user.role.value}.",
        )