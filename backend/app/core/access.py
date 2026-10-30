from fastapi import HTTPException, status

from app.core.security import CurrentUser, UserRole, is_admin
from app.models.brand import BrandProfile
from app.models.submission import Submission
from sqlalchemy.ext.asyncio import AsyncSession


def ensure_brand_access(
    brand: BrandProfile,
    user: CurrentUser,
    *,
    write: bool = False,
    delete: bool = False,
) -> None:
    """Enforce tenant and policy-management access for a brand resource."""
    if is_admin(user.role):
        return

    brand_tenant = brand.tenant_id or "tenant_default"
    if brand_tenant not in {user.tenant_id, "tenant_default"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    if delete:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an ADMIN can delete a brand.")

    if write:
        if brand_tenant != user.tenant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Shared brands are read-only for this tenant.")
        if user.role != UserRole.REVIEWER:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a brand reviewer or ADMIN can change brand governance settings.")
        if brand.owner_id and brand.owner_id != user.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the brand owner or an ADMIN can change this brand.")


async def ensure_submission_access(
    session: AsyncSession,
    submission: Submission,
    user: CurrentUser,
    *,
    write: bool = False,
) -> None:
    """Enforce submission tenant access and creator ownership for write actions."""
    if is_admin(user.role):
        return

    if submission.tenant_id != user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    brand = await session.get(BrandProfile, submission.brand_id)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if (brand.tenant_id or "tenant_default") not in {user.tenant_id, "tenant_default"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if write and user.role == UserRole.CREATOR and submission.creator_id != user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Creators can only change their own submissions.")


def ensure_policy_creator(user: CurrentUser) -> None:
    """Restrict creation of brand workspaces to reviewers and admins."""
    if user.role not in {UserRole.REVIEWER, UserRole.ADMIN}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only a brand reviewer or ADMIN can create a brand.")
