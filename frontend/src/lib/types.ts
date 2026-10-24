export type UserRole = "CREATOR" | "JUDGE" | "ADMIN" | "REVIEWER" | "MANAGER";

export interface BrandProfile {
  id: number;
  name: string;
  industry: string;
  tone_persona: string;
  approved_hex_palette: string[];
  banned_terms: string[];
  preferred_terminology: Record<string, string>;
  approved_facts?: Array<{ claim?: string; fact?: string; source?: string; verified?: boolean }>;
  visual_guidelines_summary?: string;
  min_wcag_contrast: number;
  tenant_id?: string | null;
  owner_id?: string | null;
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
  approved_facts?: Array<{ claim?: string; fact?: string; source?: string; verified?: boolean }>;
  visual_guidelines_summary?: string;
  min_wcag_contrast?: number;
  tenant_id?: string;
}

export interface Campaign {
  id: number;
  brand_id: number;
  name: string;
  theme?: string | null;
  event_type: string;
  required_cues: string[];
  prohibited_cues: string[];
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
}

export interface RuleSet {
  id: number;
  brand_id: number;
  campaign_id?: number | null;
  rule_version: number;
  palette?: string[];
  banned_terms?: string[];
  preferred_terminology?: Record<string, string>;
  decision_rules: {
    palette?: string[];
    palette_threshold?: number;
    required_cues_minimum?: number;
    require_contrast_check?: boolean;
    banned_terms?: string[];
    preferred_terminology?: Record<string, string>;
    [key: string]: unknown;
  };
  dimension_weights: Record<string, number>;
  is_active: boolean;
  created_at: string;
}

export interface PackSummary {
  name: string;
  brand_name: string;
  industry: string;
  description: string;
  documents: string[];
  campaign_name?: string;
}

export interface PackLoadResponse {
  status?: string;
  message: string;
  brand_id: number;
  campaign_id?: number | null;
  ruleset_id?: number | null;
  documents_indexed: number;
  chunks_created: number;
  ruleset_extracted?: boolean;
  indexed_chunks_count?: number;
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
  source_kind?: string;
  document_type?: string;
  created_at: string;
}

export interface GuidelineSearchResult {
  chunk: GuidelineChunk;
  similarity_score: number;
}

export type SubmissionStatus = "DRAFT" | "AUDITING" | "NEEDS_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
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
  ai_governance_metadata?: {
    ai_status?: string;
    ai_error?: string | null;
    verdict?: string;
    dimension_results?: Record<string, { status: string; score: number; findings_count: number }>;
    storage?: { provider?: string; fallback_reason?: string | null };
    [key: string]: unknown;
  };
  compliance_score?: number | null;
  created_by?: string | null;
  created_at: string;
}

export interface Submission {
  id: number;
  brand_id: number;
  campaign_id?: number | null;
  title: string;
  content_format: string;
  platform?: string | null;
  status: SubmissionStatus;
  verdict?: "PASS" | "NEEDS_REVIEW" | "FAIL" | string | null;
  current_version: number;
  creator_id: string;
  creator_name: string;
  compliance_score?: number | null;
  created_at: string;
  updated_at: string;
  revisions?: SubmissionRevision[];
  findings?: AuditFinding[];
}

export interface DimensionResult {
  status: "PASS" | "NEEDS_REVIEW" | "FAIL";
  score: number;
  findings_count: number;
  details?: string;
}

export interface AuditExecutionResponse {
  submission_id: number;
  revision_id: number;
  version_number: number;
  compliance_score: number;
  status: SubmissionStatus;
  verdict?: "PASS" | "NEEDS_REVIEW" | "FAIL" | string;
  total_findings: number;
  findings_by_severity: {
    CRITICAL: number;
    WARNING: number;
    SUGGESTION: number;
  };
  dimension_results?: Record<string, DimensionResult>;
  confidentiality_report?: {
    total_redacted: number;
    categories_redacted: Record<string, number>;
    confidentiality_guard_active: boolean;
  };
  visible_text?: string[];
  dominant_colors?: string[];
  palette_match_pct?: number;
  transcript?: string;
  duration_seconds?: number;
  ai_status?: string;
  ai_error?: string | null;
  findings: AuditFinding[];
}

export interface AuditStatusResponse {
  submission_id: number;
  revision_id?: number | null;
  version_number?: number | null;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  current_step: string;
  verdict?: string | null;
  compliance_score?: number | null;
  ai_status?: string;
  ai_error?: string | null;
  findings?: AuditFinding[];
  dimension_results?: Record<string, DimensionResult>;
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

export interface AdminQueueItem {
  id: number;
  title: string;
  brand_id: number;
  brand_name: string;
  campaign_id?: number | null;
  campaign_name?: string | null;
  content_format: string;
  platform?: string | null;
  status: string;
  verdict?: string | null;
  compliance_score?: number | null;
  current_version: number;
  creator_name: string;
  created_at: string;
  updated_at: string;
  open_critical_count: number;
  open_warning_count: number;
}

export interface AdminQueueResponse {
  items: AdminQueueItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GuidelineOverrideStat {
  guideline_id: number;
  section_reference: string;
  rule_category: string;
  times_triggered: number;
  times_overridden: number;
  override_rate: number;
}

export interface AdminStatsResponse {
  total_submissions: number;
  total_reviews_completed: number;
  agreement_rate_pct: number;
  verdict_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  total_overrides: number;
  override_rate_by_guideline: GuidelineOverrideStat[];
}

export interface UserProfileResponse {
  user_id: string;
  user_name: string;
  email?: string | null;
  role: string;
  tenant_id: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfileResponse;
}

export interface DemoUserItem {
  email: string;
  user_name: string;
  role: string;
  default_password: string;
  description: string;
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
