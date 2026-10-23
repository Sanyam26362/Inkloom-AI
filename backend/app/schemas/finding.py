from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AuditFindingBase(BaseModel):
    category: str = Field(..., max_length=50, description="TONE, TERMINOLOGY, FACTUAL_CLAIM, VISUAL, ACCESSIBILITY")
    severity: str = Field("WARNING", max_length=30, description="CRITICAL, WARNING, SUGGESTION")
    detector_source: str = Field("DETERMINISTIC_RULE", max_length=50, description="DETERMINISTIC_RULE, WCAG_MATH, RAG_LLM, VISION_LLM")
    flagged_excerpt: str = Field(..., description="Exact flagged phrase or context")
    explanation: str = Field(..., description="Why this violates brand governance")
    guideline_citation: str = Field("Brand Governance Policy", max_length=255)
    suggested_correction: str = Field(..., description="Suggested replacement or correction")


class AuditFindingCreate(AuditFindingBase):
    submission_id: int
    revision_id: int
    cited_chunk_id: Optional[int] = None


class AuditFindingOverrideRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000, description="Explanation for overriding this finding")


class AuditFindingResolveRequest(BaseModel):
    resolution_state: str = Field("ACCEPTED", description="ACCEPTED or OVERRIDDEN")
    override_reason: Optional[str] = None


class AuditFindingResponse(AuditFindingBase):
    id: int
    submission_id: int
    revision_id: int
    cited_chunk_id: Optional[int] = None
    resolution_state: str
    override_reason: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
