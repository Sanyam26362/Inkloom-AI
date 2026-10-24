export type UserRole = "CREATOR" | "REVIEWER" | "MANAGER";

export interface BrandProfile {
  id: number;
  name: string;
  industry: string;
  tone_persona: string;
  approved_hex_palette: string[];
  banned_terms: string[];
  preferred_terminology: Record<string, string>;
  approved_facts?: Array<{ claim: string; source: string; verified: boolean }>;
  visual_guidelines_summary?: string;
  min_wcag_contrast: number;
  created_at: string;
  updated_at: string;
}

export interface BrandProfileCreate {
  name: string;
  industry: string;
  tone_persona: string;
  approved_hex_palette?: string[];
  banned_terms?: string[];
  preferred_terminology?: Record<string, string>;
  approved_facts?: Array<{ claim: string; source: string; verified: boolean }>;
  visual_guidelines_summary?: string;
  min_wcag_contrast?: number;
}

export interface GuidelineChunk {
  id: number;
  brand_id: number;
  source_document: string;
  page_number?: number | null;
  section_reference?: string | null;
  rule_category: string;
  content_text: string;
  times_triggered: number;
  times_overridden: number;
  created_at: string;
}

export interface GuidelineSearchResult {
  chunk: GuidelineChunk;
  similarity_score: number;
}

export type SubmissionStatus = "DRAFT" | "NEEDS_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";
export type FindingSeverity = "CRITICAL" | "WARNING" | "SUGGESTION";
export type FindingResolution = "OPEN" | "ACCEPTED" | "OVERRIDDEN" | "RESOLVED";

export interface AuditFinding {
  id: number;
  submission_id: number;
  revision_id?: number | null;
  category: string;
  severity: FindingSeverity;
  detector_source: string;
  flagged_excerpt: string;
  explanation: string;
  suggested_correction?: string | null;
  guideline_chunk_id?: number | null;
  resolution_state: FindingResolution;
  resolved_by?: string | null;
  override_reason?: string | null;
  created_at: string;
}

export interface SubmissionRevision {
  id: number;
  submission_id: number;
  version_number: number;
  content_body: string;
  media_urls?: string[] | null;
  alt_text?: string | null;
  change_summary?: string | null;
  ai_governance_metadata?: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
}

export interface Submission {
  id: number;
  brand_id: number;
  title: string;
  content_format: string;
  status: SubmissionStatus;
  current_version: number;
  creator_id: string;
  creator_name: string;
  compliance_score?: number | null;
  created_at: string;
  updated_at: string;
  revisions?: SubmissionRevision[];
  findings?: AuditFinding[];
}

export interface AuditExecutionResponse {
  submission_id: number;
  revision_id: number;
  version_number: number;
  compliance_score: number;
  status: SubmissionStatus;
  total_findings: number;
  findings_by_severity: {
    CRITICAL: number;
    WARNING: number;
    SUGGESTION: number;
  };
  confidentiality_report?: {
    total_redacted: number;
    categories_redacted: Record<string, number>;
    confidentiality_guard_active: boolean;
  };
  visible_text?: string[];
  dominant_colors?: string[];
  palette_match_pct?: number;
  transcript?: string;
  findings: AuditFinding[];
}

export interface WorkflowEvent {
  id: number;
  submission_id: number;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ReviewComment {
  id: number;
  submission_id: number;
  finding_id?: number | null;
  author_id: string;
  author_name: string;
  author_role: string;
  comment_text: string;
  created_at: string;
}

export interface AmbiguousGuideline {
  chunk_id: number;
  source_document: string;
  section_reference?: string | null;
  rule_category: string;
  content_excerpt: string;
  times_triggered: number;
  times_overridden: number;
  override_rate: number;
  ambiguity_flag: boolean;
}

export interface GovernanceAnalytics {
  total_submissions: number;
  status_breakdown: Record<string, number>;
  avg_compliance_score: number;
  total_findings_generated: number;
  findings_by_severity: Record<string, number>;
  findings_by_category: Record<string, number>;
  findings_by_source: Record<string, number>;
  resolution_breakdown: Record<string, number>;
  ambiguous_guidelines: AmbiguousGuideline[];
}

export interface HealthCheckResponse {
  status: string;
  project: string;
  environment: string;
  database: string;
  pgvector: string;
  redis: string;
  ai_integration: {
    provider: string;
    primary_model: string;
    embedding_model: string;
    embedding_dimensions: number;
    configured: boolean;
    client_ready: boolean;
  };
}
