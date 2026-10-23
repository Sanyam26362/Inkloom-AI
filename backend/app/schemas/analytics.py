from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AmbiguousGuidelineMetric(BaseModel):
    chunk_id: int
    source_document: str
    section_reference: str
    rule_category: str
    content_excerpt: str
    times_triggered: int
    times_overridden: int
    override_rate: float = Field(..., description="Percentage of times this rule was overridden by human reviewer")
    ambiguity_flag: bool = Field(..., description="True if override_rate exceeds ambiguity threshold")


class GovernanceAnalyticsResponse(BaseModel):
    total_submissions: int
    status_breakdown: Dict[str, int]
    avg_compliance_score: float
    total_findings_generated: int
    findings_by_severity: Dict[str, int]
    findings_by_category: Dict[str, int]
    findings_by_source: Dict[str, int]
    resolution_breakdown: Dict[str, int]
    ambiguous_guidelines: List[AmbiguousGuidelineMetric]
