from enum import Enum
from pydantic import BaseModel
from fastapi import Header, HTTPException, status


class UserRole(str, Enum):
    CREATOR = "CREATOR"
    REVIEWER = "REVIEWER"
    MANAGER = "MANAGER"


class CurrentUser(BaseModel):
    user_id: str
    user_name: str
    role: UserRole


async def get_current_user(
    x_user_id: str = Header(default="user_creator_01", description="Simulated User ID"),
    x_user_name: str = Header(default="Alex Rivera", description="Simulated User Name"),
    x_user_role: UserRole = Header(default=UserRole.CREATOR, description="Role: CREATOR, REVIEWER, or MANAGER"),
) -> CurrentUser:
    """Extracts user identity and governance role from request headers."""
    return CurrentUser(
        user_id=x_user_id,
        user_name=x_user_name,
        role=x_user_role,
    )


def require_reviewer_or_manager(user: CurrentUser) -> None:
    """Guard function ensuring only REVIEWER or MANAGER can approve or reject content."""
    if user.role not in (UserRole.REVIEWER, UserRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action requires REVIEWER or MANAGER role. Current role is {user.role.value}.",
        )