from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.finding import AuditFindingResponse


class SubmissionRevisionBase(BaseModel):
    content_body: str = Field("", description="The text or copy to be audited")
    media_urls: List[str] = Field(default_factory=list, description="Associated image/media URLs")
    alt_text: Optional[str] = Field(None, description="Image alt text for accessibility auditing")
    change_summary: str = Field("Initial draft created", max_length=255)


class SubmissionRevisionCreate(SubmissionRevisionBase):
    pass


class SubmissionRevisionResponse(SubmissionRevisionBase):
    id: int
    submission_id: int
    version_number: int
    compliance_score: Optional[float] = None
    ai_governance_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionCreate(BaseModel):
    brand_id: int
    title: str = Field(..., min_length=2, max_length=255)
    content_format: str = Field(
        "TEXT",
        description="TEXT, MARKDOWN, HTML, IMAGE, AUDIO, VIDEO, or DOCUMENT",
    )
    initial_content: str = Field("", description="Initial copy or text draft")
    media_urls: List[str] = Field(default_factory=list)
    alt_text: Optional[str] = None


class SubmissionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)


class SubmissionResponse(BaseModel):
    id: int
    brand_id: int
    title: str
    content_format: str
    status: str
    current_version: int
    compliance_score: Optional[float] = None
    creator_id: str
    creator_name: str
    created_at: datetime
    updated_at: datetime

    revisions: List[SubmissionRevisionResponse] = Field(default_factory=list)
    findings: List[AuditFindingResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AuditExecutionResponse(BaseModel):
    submission_id: int
    revision_id: int
    version_number: int
    compliance_score: float
    status: str
    total_findings: int
    findings_by_severity: Dict[str, int]
    findings: List[AuditFindingResponse]
    confidentiality_report: Dict[str, Any] = Field(default_factory=dict)
    visible_text: Optional[List[str]] = None
    dominant_colors: Optional[List[str]] = None
    palette_match_pct: Optional[float] = None
    transcript: Optional[str] = None
    duration_seconds: Optional[float] = None
    ai_status: str = Field("ok", description="ok | partial | failed | skipped")
    ai_error: Optional[str] = None
