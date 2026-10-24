from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AdminQueueItem(BaseModel):
    id: int
    title: str
    brand_id: int
    brand_name: str
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    content_format: str
    platform: Optional[str] = None
    status: str
    verdict: Optional[str] = None
    compliance_score: Optional[float] = None
    current_version: int
    creator_name: str
    created_at: datetime
    updated_at: datetime
    open_critical_count: int = 0
    open_warning_count: int = 0


class AdminQueueResponse(BaseModel):
    items: List[AdminQueueItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class GuidelineOverrideStat(BaseModel):
    guideline_id: int
    section_reference: str
    rule_category: str
    times_triggered: int
    times_overridden: int
    override_rate: float


class AdminStatsResponse(BaseModel):
    total_submissions: int
    total_reviews_completed: int
    agreement_rate_pct: float
    verdict_distribution: Dict[str, int]
    status_distribution: Dict[str, int]
    total_overrides: int
    override_rate_by_guideline: List[GuidelineOverrideStat]
