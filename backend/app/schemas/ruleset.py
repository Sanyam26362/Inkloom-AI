from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class ApprovedFactSchema(BaseModel):
    claim: str = Field(..., description="Fact statement or verified claim")
    source: str = Field("Brand Guidelines", description="Source citation or documentation reference")
    verified: bool = Field(True, description="Whether this fact has been verified")


class RubricDimensionSchema(BaseModel):
    dimension: str = Field(..., description="Dimension name (e.g. VISUAL, TONE, EVENT_FIT, ACCESSIBILITY)")
    weight: float = Field(1.0, ge=0.0, description="Weight factor in composite scoring")
    pass_criteria: Optional[str] = Field(None, alias="pass", description="Criteria for clean pass")
    review_criteria: Optional[str] = Field(None, alias="review", description="Criteria for needs review")
    fail_criteria: Optional[str] = Field(None, alias="fail", description="Criteria for outright failure")

    model_config = ConfigDict(populate_by_name=True)


class RuleSetBase(BaseModel):
    brand_id: int = Field(..., description="Target brand profile ID")
    campaign_id: Optional[int] = Field(None, description="Optional associated campaign ID")
    version: int = Field(1, description="RuleSet iteration/version number")
    source_documents: List[str] = Field(default_factory=list, description="Documents extracted from")
    palette: List[str] = Field(default_factory=list, description="Approved hex colors")
    banned_terms: List[str] = Field(default_factory=list, description="Strictly prohibited words/phrases")
    preferred_terminology: Dict[str, str] = Field(default_factory=dict, description="Mappings from deprecated to preferred terms")
    approved_facts: List[ApprovedFactSchema] = Field(default_factory=list, description="Verified brand facts")
    required_phrases: List[str] = Field(default_factory=list, description="Mandatory brand phrases")
    exaggeration_terms: List[str] = Field(default_factory=list, description="Hype or unverified superlative words")
    prohibited_visual_subjects: List[str] = Field(default_factory=list, description="Prohibited visual subjects (e.g. characters, competitors)")
    per_media_rules: Dict[str, Any] = Field(default_factory=dict, description="Specific rules per media format (image, video, audio, text)")
    decision_rules: Dict[str, Any] = Field(default_factory=dict, description="Decision logic for PASS, NEEDS_REVIEW, FAIL")
    rubric: List[Dict[str, Any]] = Field(default_factory=list, description="Multi-dimensional governance evaluation rubric")
    is_active: bool = Field(True, description="Whether this RuleSet is currently authoritative")


class RuleSetCreate(RuleSetBase):
    pass


class RuleSetUpdate(BaseModel):
    palette: Optional[List[str]] = None
    banned_terms: Optional[List[str]] = None
    preferred_terminology: Optional[Dict[str, str]] = None
    approved_facts: Optional[List[ApprovedFactSchema]] = None
    required_phrases: Optional[List[str]] = None
    exaggeration_terms: Optional[List[str]] = None
    prohibited_visual_subjects: Optional[List[str]] = None
    per_media_rules: Optional[Dict[str, Any]] = None
    decision_rules: Optional[Dict[str, Any]] = None
    rubric: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class RuleSetResponse(RuleSetBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RuleExtractRequest(BaseModel):
    campaign_id: Optional[int] = Field(None, description="Optional campaign ID to extract context for")
    extra_instructions: Optional[str] = Field(None, description="Optional client guidance for rule extraction")
