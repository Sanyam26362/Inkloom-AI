from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, TYPE_CHECKING
from sqlalchemy import Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.brand import BrandProfile
    from app.models.campaign import Campaign


class RuleSet(Base):
    __tablename__ = "rulesets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("brand_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    campaign_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    source_documents: Mapped[List[str]] = mapped_column(JSONB, default=list)
    palette: Mapped[List[str]] = mapped_column(JSONB, default=list)
    banned_terms: Mapped[List[str]] = mapped_column(JSONB, default=list)
    preferred_terminology: Mapped[Dict[str, str]] = mapped_column(JSONB, default=dict)
    approved_facts: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    required_phrases: Mapped[List[str]] = mapped_column(JSONB, default=list)
    exaggeration_terms: Mapped[List[str]] = mapped_column(JSONB, default=list)
    prohibited_visual_subjects: Mapped[List[str]] = mapped_column(JSONB, default=list)
    per_media_rules: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    decision_rules: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    rubric: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    brand: Mapped["BrandProfile"] = relationship("BrandProfile", back_populates="rulesets")
    campaign: Mapped[Optional["Campaign"]] = relationship("Campaign", back_populates="rulesets")
