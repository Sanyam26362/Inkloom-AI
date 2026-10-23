from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.brand import BrandProfile
from app.schemas.brand import BrandProfileCreate, BrandProfileUpdate, BrandProfileResponse

router = APIRouter(prefix="/brands", tags=["Brand Profiles"])


@router.get("", response_model=List[BrandProfileResponse])
async def list_brands(
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[BrandProfile]:
    """Retrieves all registered brand governance profiles."""
    stmt = select(BrandProfile).order_by(BrandProfile.created_at.desc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=BrandProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    payload: BrandProfileCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> BrandProfile:
    """Creates a new enterprise brand profile with tone persona and deterministic rules."""
    # Check uniqueness
    existing_stmt = select(BrandProfile).where(BrandProfile.name == payload.name)
    existing_res = await session.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Brand with name '{payload.name}' already exists.",
        )

    brand = BrandProfile(**payload.model_dump())
    session.add(brand)
    await session.commit()
    await session.refresh(brand)
    return brand


@router.get("/{brand_id}", response_model=BrandProfileResponse)
async def get_brand(
    brand_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> BrandProfile:
    """Gets details of a single brand profile."""
    stmt = select(BrandProfile).where(BrandProfile.id == brand_id)
    res = await session.execute(stmt)
    brand = res.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")
    return brand


@router.put("/{brand_id}", response_model=BrandProfileResponse)
async def update_brand(
    brand_id: int,
    payload: BrandProfileUpdate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> BrandProfile:
    """Updates tone, banned terms, preferred terminology, or palette for a brand."""
    stmt = select(BrandProfile).where(BrandProfile.id == brand_id)
    res = await session.execute(stmt)
    brand = res.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(brand, field, val)

    await session.commit()
    await session.refresh(brand)
    return brand


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> None:
    """Deletes a brand profile and cascades deletion to associated guidelines and submissions."""
    stmt = select(BrandProfile).where(BrandProfile.id == brand_id)
    res = await session.execute(stmt)
    brand = res.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    await session.delete(brand)
    await session.commit()
