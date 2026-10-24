from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.brand import BrandProfile
    from app.models.ruleset import RuleSet
    from app.models.submission import Submission


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("brand_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dates: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    goals: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    platforms: Mapped[List[str]] = mapped_column(JSONB, default=list)
    content_types: Mapped[List[str]] = mapped_column(JSONB, default=list)
    required_cues: Mapped[List[str]] = mapped_column(JSONB, default=list)
    min_required_cues: Mapped[int] = mapped_column(Integer, default=0)
    prohibited_items: Mapped[List[str]] = mapped_column(JSONB, default=list)
    extra_rules: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    brand: Mapped["BrandProfile"] = relationship("BrandProfile", back_populates="campaigns")
    rulesets: Mapped[List["RuleSet"]] = relationship(
        "RuleSet", back_populates="campaign", cascade="all, delete-orphan"
    )
    submissions: Mapped[List["Submission"]] = relationship(
        "Submission", back_populates="campaign"
    )
