from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.brand import BrandProfile
from app.schemas.analytics import GovernanceAnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Brand Governance Analytics"])


@router.get("/{brand_id}", response_model=GovernanceAnalyticsResponse)
async def get_governance_analytics(
    brand_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> GovernanceAnalyticsResponse:
    """
    Returns data-grounded brand governance analytics:
    - Pass/review/changes-requested rates
    - Average compliance scores
    - Most frequent violations by severity, category, and detection engine
    - Ambiguous guideline indicators (rules frequently overridden by human reviewers)
    """
    stmt = select(BrandProfile).where(BrandProfile.id == brand_id)
    res = await session.execute(stmt)
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    return await AnalyticsService.get_brand_analytics(session=session, brand_id=brand_id)
