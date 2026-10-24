from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import String, Text, Float, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(100), default="tenant_default", nullable=True, index=True)
    owner_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True, default=None)
    industry: Mapped[str] = mapped_column(String(100), default="Technology")
    tone_persona: Mapped[str] = mapped_column(
        Text,
        default="Clear, authoritative, empathetic, and evidence-backed. Avoids hype and unverified superlatives.",
    )

    # Deterministic Governance Rules (JSONB)
    approved_hex_palette: Mapped[List[str]] = mapped_column(JSONB, default=list)
    banned_terms: Mapped[List[str]] = mapped_column(JSONB, default=list)
    preferred_terminology: Mapped[Dict[str, str]] = mapped_column(JSONB, default=dict)
    approved_facts: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, default=list)
    visual_guidelines_summary: Mapped[str] = mapped_column(
        Text,
        default="Use high-contrast typography, approved brand palette, and clear logo spacing.",
    )
    min_wcag_contrast: Mapped[float] = mapped_column(Float, default=4.5)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    guideline_chunks: Mapped[List["GuidelineChunk"]] = relationship(
        "GuidelineChunk", back_populates="brand", cascade="all, delete-orphan"
    )
    submissions: Mapped[List["Submission"]] = relationship(
        "Submission", back_populates="brand", cascade="all, delete-orphan"
    )
    campaigns: Mapped[List["Campaign"]] = relationship(
        "Campaign", back_populates="brand", cascade="all, delete-orphan"
    )
    rulesets: Mapped[List["RuleSet"]] = relationship(
        "RuleSet", back_populates="brand", cascade="all, delete-orphan"
    )