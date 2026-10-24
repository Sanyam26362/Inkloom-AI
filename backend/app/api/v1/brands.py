import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, is_admin
from app.models.brand import BrandProfile
from app.models.campaign import Campaign
from app.models.ruleset import RuleSet
from app.models.guideline_chunk import GuidelineChunk
from app.schemas.brand import BrandProfileCreate, BrandProfileUpdate, BrandProfileResponse
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.schemas.ruleset import RuleSetCreate, RuleSetUpdate, RuleSetResponse, RuleExtractRequest
from app.services.gemini_service import gemini_service

logger = logging.getLogger("inkloom_api")
router = APIRouter(prefix="/brands", tags=["Brand Profiles"])


@router.get("", response_model=List[BrandProfileResponse])
async def list_brands(
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[BrandProfile]:
    """Retrieves brand profiles scoped by tenant isolation or all for admin."""
    try:
        if is_admin(user.role):
            stmt = select(BrandProfile).order_by(BrandProfile.created_at.desc())
        else:
            stmt = (
                select(BrandProfile)
                .where(
                    or_(
                        BrandProfile.tenant_id == user.tenant_id,
                        BrandProfile.tenant_id == "tenant_default",
                        BrandProfile.tenant_id.is_(None),
                    )
                )
                .order_by(BrandProfile.created_at.desc())
            )
        result = await session.execute(stmt)
        return list(result.scalars().all())
    except Exception as e:
        logger.warning(f"Tenant-filtered brand query fallback triggered: {e}")
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

    data = payload.model_dump()
    data["tenant_id"] = payload.tenant_id or user.tenant_id or "tenant_default"
    data["owner_id"] = user.user_id
    brand = BrandProfile(**data)
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


# ── RuleSet Endpoints ─────────────────────────────────────────────────────────

@router.post("/{brand_id}/rules/extract", response_model=RuleSetResponse)
async def extract_brand_rules(
    brand_id: int,
    payload: Optional[RuleExtractRequest] = None,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> RuleSet:
    """
    Extracts structured governance RuleSet (palette, banned terms, terminology,
    facts, prohibited subjects, media rules, rubric) from indexed brand guidelines
    and optional campaign brief using Gemini.
    """
    brand = await session.get(BrandProfile, brand_id)
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    chunks_stmt = (
        select(GuidelineChunk)
        .where(GuidelineChunk.brand_id == brand_id)
        .order_by(GuidelineChunk.source_document, GuidelineChunk.chunk_index)
    )
    chunks_res = await session.execute(chunks_stmt)
    chunks = list(chunks_res.scalars().all())

    guidelines_text = "\n\n".join([
        f"[{c.source_document} - {c.section_reference}]\n{c.content_text}"
        for c in chunks
    ])

    campaign_info = None
    campaign_id = payload.campaign_id if payload else None
    if campaign_id:
        camp_stmt = select(Campaign).where(Campaign.id == campaign_id, Campaign.brand_id == brand_id)
        camp_res = await session.execute(camp_stmt)
        camp = camp_res.scalar_one_or_none()
        if camp:
            campaign_info = {
                "name": camp.name,
                "description": camp.description,
                "goals": camp.goals,
                "required_cues": camp.required_cues,
                "prohibited_items": camp.prohibited_items,
            }

    extra_instructions = payload.extra_instructions if payload else None

    extracted = await gemini_service.extract_rules(
        guidelines_text=guidelines_text,
        design_doc="",
        campaign_info=campaign_info,
        additional_instructions=extra_instructions,
    )

    ver_stmt = select(func.max(RuleSet.version)).where(RuleSet.brand_id == brand_id)
    ver_res = await session.execute(ver_stmt)
    max_ver = ver_res.scalar() or 0
    new_version = max_ver + 1

    source_docs = list({c.source_document for c in chunks})

    draft_ruleset = RuleSet(
        brand_id=brand_id,
        campaign_id=campaign_id,
        version=new_version,
        source_documents=source_docs,
        palette=extracted.get("palette") or brand.approved_hex_palette or [],
        banned_terms=extracted.get("banned_terms") or brand.banned_terms or [],
        preferred_terminology=extracted.get("preferred_terminology") or brand.preferred_terminology or {},
        approved_facts=extracted.get("approved_facts") or brand.approved_facts or [],
        required_phrases=extracted.get("required_phrases") or [],
        exaggeration_terms=extracted.get("exaggeration_terms") or [],
        prohibited_visual_subjects=extracted.get("prohibited_visual_subjects") or [],
        per_media_rules=extracted.get("per_media_rules") or {},
        decision_rules=extracted.get("decision_rules") or {},
        rubric=extracted.get("rubric") or [],
        is_active=False,
    )
    session.add(draft_ruleset)
    await session.commit()
    await session.refresh(draft_ruleset)
    return draft_ruleset


@router.post("/{brand_id}/rules", response_model=RuleSetResponse, status_code=status.HTTP_201_CREATED)
async def create_or_confirm_ruleset(
    brand_id: int,
    payload: RuleSetCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> RuleSet:
    """Creates and confirms a RuleSet; syncs deterministic fields to BrandProfile."""
    brand = await session.get(BrandProfile, brand_id)
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand profile not found")

    data = payload.model_dump()
    data["brand_id"] = brand_id
    facts_data = [f.model_dump() if hasattr(f, "model_dump") else f for f in data.get("approved_facts", [])]
    data["approved_facts"] = facts_data

    if data.get("is_active", True):
        deactivate_stmt = (
            update(RuleSet)
            .where(RuleSet.brand_id == brand_id)
            .values(is_active=False)
        )
        await session.execute(deactivate_stmt)

        if data.get("palette"):
            brand.approved_hex_palette = data["palette"]
        if data.get("banned_terms"):
            brand.banned_terms = data["banned_terms"]
        if data.get("preferred_terminology"):
            brand.preferred_terminology = data["preferred_terminology"]
        if facts_data:
            brand.approved_facts = facts_data

    ruleset = RuleSet(**data)
    session.add(ruleset)
    await session.commit()
    await session.refresh(ruleset)
    return ruleset


@router.get("/{brand_id}/rules", response_model=List[RuleSetResponse])
async def list_brand_rulesets(
    brand_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[RuleSet]:
    """Retrieves all RuleSets associated with the specified brand."""
    stmt = (
        select(RuleSet)
        .where(RuleSet.brand_id == brand_id)
        .order_by(RuleSet.version.desc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.get("/{brand_id}/rules/{ruleset_id}", response_model=RuleSetResponse)
async def get_brand_ruleset(
    brand_id: int,
    ruleset_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> RuleSet:
    """Gets a specific RuleSet by ID."""
    stmt = select(RuleSet).where(RuleSet.id == ruleset_id, RuleSet.brand_id == brand_id)
    res = await session.execute(stmt)
    rs = res.scalar_one_or_none()
    if not rs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RuleSet not found")
    return rs


@router.put("/{brand_id}/rules/{ruleset_id}", response_model=RuleSetResponse)
async def update_brand_ruleset(
    brand_id: int,
    ruleset_id: int,
    payload: RuleSetUpdate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> RuleSet:
    """Updates an existing RuleSet; syncs deterministic fields to BrandProfile if active."""
    stmt = select(RuleSet).where(RuleSet.id == ruleset_id, RuleSet.brand_id == brand_id)
    res = await session.execute(stmt)
    rs = res.scalar_one_or_none()
    if not rs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RuleSet not found")

    brand = await session.get(BrandProfile, brand_id)

    update_data = payload.model_dump(exclude_unset=True)
    if "approved_facts" in update_data and update_data["approved_facts"] is not None:
        update_data["approved_facts"] = [
            f.model_dump() if hasattr(f, "model_dump") else f for f in update_data["approved_facts"]
        ]

    for k, v in update_data.items():
        setattr(rs, k, v)

    if rs.is_active and brand:
        if rs.palette:
            brand.approved_hex_palette = rs.palette
        if rs.banned_terms:
            brand.banned_terms = rs.banned_terms
        if rs.preferred_terminology:
            brand.preferred_terminology = rs.preferred_terminology
        if rs.approved_facts:
            brand.approved_facts = rs.approved_facts

    await session.commit()
    await session.refresh(rs)
    return rs


# ── Campaign Endpoints ────────────────────────────────────────────────────────

@router.post("/{brand_id}/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    brand_id: int,
    payload: CampaignCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Campaign:
    """Creates a new campaign for the brand."""
    brand = await session.get(BrandProfile, brand_id)
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")

    data = payload.model_dump()
    data["brand_id"] = brand_id
    campaign = Campaign(**data)
    session.add(campaign)
    await session.commit()
    await session.refresh(campaign)
    return campaign


@router.get("/{brand_id}/campaigns", response_model=List[CampaignResponse])
async def list_campaigns(
    brand_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[Campaign]:
    """Lists all campaigns for a brand."""
    stmt = (
        select(Campaign)
        .where(Campaign.brand_id == brand_id)
        .order_by(Campaign.created_at.desc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.get("/{brand_id}/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    brand_id: int,
    campaign_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Campaign:
    """Gets a specific campaign for a brand."""
    stmt = select(Campaign).where(Campaign.id == campaign_id, Campaign.brand_id == brand_id)
    res = await session.execute(stmt)
    camp = res.scalar_one_or_none()
    if not camp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return camp


@router.put("/{brand_id}/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    brand_id: int,
    campaign_id: int,
    payload: CampaignUpdate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Campaign:
    """Updates campaign details."""
    stmt = select(Campaign).where(Campaign.id == campaign_id, Campaign.brand_id == brand_id)
    res = await session.execute(stmt)
    camp = res.scalar_one_or_none()
    if not camp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(camp, k, v)

    await session.commit()
    await session.refresh(camp)
    return camp

