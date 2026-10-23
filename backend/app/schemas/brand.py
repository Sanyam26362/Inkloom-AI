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
        default_factory=lambda: ["#0F172A", "#2563EB", "#38BDF8", "#F8FAFC"],
        description="List of approved brand hex color codes",
    )
    banned_terms: List[str] = Field(
        default_factory=lambda: ["guaranteed", "unbreakable", "cheapest", "revolutionary", "best-in-class"],
        description="List of strictly banned terms or claims",
    )
    preferred_terminology: Dict[str, str] = Field(
        default_factory=lambda: {
            "client-side": "on-device",
            "artificial intelligence": "AI-powered governance",
            "cheap": "cost-effective",
        },
        description="Dictionary mapping deprecated phrases to approved terminology",
    )
    approved_facts: List[Dict[str, Any]] = Field(
        default_factory=lambda: [
            {"claim": "99.9% uptime SLA", "source": "SOC2 Report 2026", "verified": True},
            {"claim": "Over 500 enterprise customers", "source": "Q3 2026 Financial Disclosure", "verified": True},
        ],
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


class BrandProfileCreate(BrandProfileBase):
    pass


class BrandProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    industry: Optional[str] = Field(None, max_length=100)
    tone_persona: Optional[str] = None
    approved_hex_palette: Optional[List[str]] = None
    banned_terms: Optional[List[str]] = None
    preferred_terminology: Optional[Dict[str, str]] = None
    approved_facts: Optional[List[Dict[str, Any]]] = None
    visual_guidelines_summary: Optional[str] = None
    min_wcag_contrast: Optional[float] = Field(None, ge=1.0, le=21.0)


class BrandProfileResponse(BrandProfileBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
