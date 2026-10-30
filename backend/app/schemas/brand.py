from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class BrandProfileBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Brand name")
    industry: str = Field("Technology", max_length=100)
    tone_persona: str = Field(
        "Clear, authoritative, empathetic, and evidence-backed. Avoids hype and unverified superlatives.",
        description="Detailed tone persona guideline",
    )
    approved_hex_palette: List[str] = Field(
        default_factory=list,
        description="List of approved brand hex color codes",
    )
    banned_terms: List[str] = Field(
        default_factory=list,
        description="List of strictly banned terms or claims",
    )
    preferred_terminology: Dict[str, str] = Field(
        default_factory=dict,
        description="Dictionary mapping deprecated phrases to approved terminology",
    )
    approved_facts: List[Any] = Field(
        default_factory=list,
        description="Verified corporate facts and claims with citations",
    )
    visual_guidelines_summary: str = Field(
        "Use high-contrast typography, approved brand palette, and clear logo spacing.",
        description="Summary of visual and layout guidelines",
    )
    min_wcag_contrast: float = Field(
        4.5,
        ge=1.0,
        le=21.0,
        description="Minimum WCAG contrast ratio threshold (default 4.5 for AA)",
    )
    tenant_id: Optional[str] = Field("tenant_default", description="Tenant isolation identifier")
    owner_id: Optional[str] = Field(None, description="User owner identifier")


class BrandProfileCreate(BrandProfileBase):
    pass


class BrandProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    industry: Optional[str] = Field(None, max_length=100)
    tone_persona: Optional[str] = None
    approved_hex_palette: Optional[List[str]] = None
    banned_terms: Optional[List[str]] = None
    preferred_terminology: Optional[Dict[str, str]] = None
    approved_facts: Optional[List[Any]] = None
    visual_guidelines_summary: Optional[str] = None
    min_wcag_contrast: Optional[float] = Field(None, ge=1.0, le=21.0)
    tenant_id: Optional[str] = None
    owner_id: Optional[str] = None


class BrandProfileResponse(BrandProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
