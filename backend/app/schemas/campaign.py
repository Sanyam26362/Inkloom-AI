from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class CampaignBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Campaign name")
    description: Optional[str] = Field(None, description="Detailed campaign brief and guidelines")
    dates: Optional[Dict[str, Any]] = Field(default=None, description="Campaign timing (e.g. start/end dates)")
    goals: Optional[Any] = Field(default=None, description="Key campaign goals, tone, or theme objectives")
    platforms: List[str] = Field(default_factory=list, description="Target platforms (e.g. instagram, twitter)")
    content_types: List[str] = Field(default_factory=list, description="Allowed content formats (image, video, poster, audio, text)")
    required_cues: List[str] = Field(default_factory=list, description="Campaign-specific mandatory visual/contextual cues")
    min_required_cues: int = Field(0, ge=0, description="Minimum number of campaign cues required for pass")
    prohibited_items: List[str] = Field(default_factory=list, description="Strictly prohibited visual subjects, terms, or elements")
    extra_rules: Optional[Any] = Field(default=None, description="Additional custom rules or parameters")
    is_active: bool = Field(True, description="Whether this campaign is active")


class CampaignCreate(CampaignBase):
    brand_id: int = Field(..., description="Brand ID owning this campaign")


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    dates: Optional[Dict[str, Any]] = None
    goals: Optional[Any] = None
    platforms: Optional[List[str]] = None
    content_types: Optional[List[str]] = None
    required_cues: Optional[List[str]] = None
    min_required_cues: Optional[int] = None
    prohibited_items: Optional[List[str]] = None
    extra_rules: Optional[Any] = None
    is_active: Optional[bool] = None


class CampaignResponse(CampaignBase):
    id: int
    brand_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
