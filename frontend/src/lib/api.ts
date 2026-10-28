import {
  BrandProfile,
  BrandProfileCreate,
  GuidelineChunk,
  GuidelineSearchResult,
  Submission,
  AuditExecutionResponse,
  SubmissionRevision,
  WorkflowEvent,
  ReviewComment,
  GovernanceAnalytics,
  HealthCheckResponse,
  UserRole,
  AuditFinding,
  Campaign,
  RuleSet,
  PackSummary,
  PackLoadResponse,
  AuditStatusResponse,
  AdminQueueResponse,
  AdminStatsResponse,
  TokenResponse,
  UserProfileResponse,
  DemoUserItem,
} from "./types";

function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (!envUrl) {
    return "http://127.0.0.1:8000/api/v1";
  }
  if (!envUrl.endsWith("/api/v1")) {
    return `${envUrl}/api/v1`;
  }
  return envUrl;
}

const API_BASE_URL = getApiBaseUrl();

export interface RequestOptions extends RequestInit {
  userRole?: UserRole;
  userId?: string;
  userName?: string;
  token?: string;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function fetchJson<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    userRole = "CREATOR",
    userId = "user_creator_01",
    userName = "Alex Rivera",
    token: explicitToken,
    headers = {},
    ...rest
  } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Retrieve JWT from localStorage if client-side
  let token = explicitToken;
  if (!token && typeof window !== "undefined") {
    token = localStorage.getItem("inkloom_token") || undefined;
    if (!token && !endpoint.includes("/auth/login") && !endpoint.includes("/health")) {
      try {
        const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: userRole }),
        });
        if (loginRes.ok) {
          const authData = await loginRes.json();
          if (authData?.access_token) {
            token = authData.access_token;
            localStorage.setItem("inkloom_token", authData.access_token);
            if (authData.user) {
              localStorage.setItem("inkloom_user", JSON.stringify(authData.user));
            }
          }
        }
      } catch {
        // Fallback silently if login endpoint unreachable
      }
    }
  }

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
    "x-user-role": userRole,
    "x-user-id": userId,
    "x-user-name": userName,
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Only add Content-Type if not sending FormData
  if (!(rest.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...(headers as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      `Cannot connect to backend server at ${API_BASE_URL}. Ensure the FastAPI service is running.`,
      0,
      { originalError: errorMsg }
    );
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status} (${response.statusText})`;
    let responseData: Record<string, unknown> | null = null;
    try {
      const parsed = await response.json();
      responseData = parsed as Record<string, unknown>;
      if (responseData?.detail) {
        if (typeof responseData.detail === "string") {
          errorDetail = responseData.detail;
        } else if (Array.isArray(responseData.detail)) {
          errorDetail = (responseData.detail as Array<{ loc?: string[]; msg: string }>)
            .map((e) => `${e.loc?.join(".") || ""}: ${e.msg}`)
            .join("; ");
        }
      }
    } catch {
      // Not JSON
    }
    throw new ApiError(errorDetail, response.status, responseData);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  // System Health
  async getHealth(): Promise<HealthCheckResponse> {
    return fetchJson<HealthCheckResponse>("/health");
  },

  // Auth & Personas
  async clerkSync(payload: {
    clerk_id: string;
    email: string;
    user_name?: string;
    role?: string;
    tenant_id?: string;
  }): Promise<TokenResponse> {
    const res = await fetchJson<TokenResponse>("/auth/clerk-sync", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res?.access_token && typeof window !== "undefined") {
      localStorage.setItem("inkloom_token", res.access_token);
      if (res.user) {
        localStorage.setItem("inkloom_user", JSON.stringify(res.user));
      }
    }
    return res;
  },

  async login(payload: { email?: string; password?: string; role?: string }): Promise<TokenResponse> {
    const res = await fetchJson<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res?.access_token && typeof window !== "undefined") {
      localStorage.setItem("inkloom_token", res.access_token);
      localStorage.setItem("inkloom_user", JSON.stringify(res.user));
    }
    return res;
  },

  async getMe(options?: RequestOptions): Promise<UserProfileResponse> {
    return fetchJson<UserProfileResponse>("/auth/me", options);
  },

  async getDemoUsers(): Promise<DemoUserItem[]> {
    return fetchJson<DemoUserItem[]>("/auth/demo-users");
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("inkloom_token");
      localStorage.removeItem("inkloom_user");
    }
  },

  // Premade Packs
  async listPacks(options?: RequestOptions): Promise<PackSummary[]> {
    return fetchJson<PackSummary[]>("/packs", options);
  },

  async loadPack(packName = "blinkit", brandId?: number, options?: RequestOptions): Promise<PackLoadResponse> {
    const body = brandId ? JSON.stringify({ brand_id: brandId }) : undefined;
    return fetchJson<PackLoadResponse>(`/packs/${packName}/load`, {
      ...options,
      method: "POST",
      body,
    });
  },

  // Brands
  async listBrands(options?: RequestOptions): Promise<BrandProfile[]> {
    return fetchJson<BrandProfile[]>("/brands", options);
  },

  async getBrand(id: number, options?: RequestOptions): Promise<BrandProfile> {
    return fetchJson<BrandProfile>(`/brands/${id}`, options);
  },

  async createBrand(payload: BrandProfileCreate, options?: RequestOptions): Promise<BrandProfile> {
    return fetchJson<BrandProfile>("/brands", {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateBrand(id: number, payload: Partial<BrandProfileCreate>, options?: RequestOptions): Promise<BrandProfile> {
    return fetchJson<BrandProfile>(`/brands/${id}`, {
      ...options,
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteBrand(id: number, options?: RequestOptions): Promise<void> {
    return fetchJson<void>(`/brands/${id}`, {
      ...options,
      method: "DELETE",
    });
  },

  // RuleSets
  async extractRules(
    brandId: number,
    payload?: { guideline_document_id?: number; campaign_id?: number },
    options?: RequestOptions
  ): Promise<RuleSet> {
    return fetchJson<RuleSet>(`/brands/${brandId}/rules/extract`, {
      ...options,
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  async createRuleset(
    brandId: number,
    payload: {
      brand_id?: number;
      decision_rules: Record<string, unknown>;
      dimension_weights?: Record<string, number>;
      campaign_id?: number | null;
      is_active?: boolean;
    },
    options?: RequestOptions
  ): Promise<RuleSet> {
    const fullPayload = {
      brand_id: brandId,
      ...payload,
    };
    return fetchJson<RuleSet>(`/brands/${brandId}/rules`, {
      ...options,
      method: "POST",
      body: JSON.stringify(fullPayload),
    });
  },

  async listRulesets(brandId: number, options?: RequestOptions): Promise<RuleSet[]> {
    return fetchJson<RuleSet[]>(`/brands/${brandId}/rules`, options);
  },

  async getRuleset(brandId: number, rulesetId: number, options?: RequestOptions): Promise<RuleSet> {
    return fetchJson<RuleSet>(`/brands/${brandId}/rules/${rulesetId}`, options);
  },

  async updateRuleset(
    brandId: number,
    rulesetId: number,
    payload: Partial<RuleSet>,
    options?: RequestOptions
  ): Promise<RuleSet> {
    return fetchJson<RuleSet>(`/brands/${brandId}/rules/${rulesetId}`, {
      ...options,
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // Campaigns
  async listCampaigns(brandId: number, options?: RequestOptions): Promise<Campaign[]> {
    return fetchJson<Campaign[]>(`/brands/${brandId}/campaigns`, options);
  },

  async createCampaign(
    brandId: number,
    payload: {
      name: string;
      event_type: string;
      theme?: string;
      required_cues?: string[];
      prohibited_cues?: string[];
      is_active?: boolean;
    },
    options?: RequestOptions
  ): Promise<Campaign> {
    return fetchJson<Campaign>(`/brands/${brandId}/campaigns`, {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCampaign(brandId: number, campaignId: number, options?: RequestOptions): Promise<Campaign> {
    return fetchJson<Campaign>(`/brands/${brandId}/campaigns/${campaignId}`, options);
  },

  async updateCampaign(
    brandId: number,
    campaignId: number,
    payload: Partial<Campaign>,
    options?: RequestOptions
  ): Promise<Campaign> {
    return fetchJson<Campaign>(`/brands/${brandId}/campaigns/${campaignId}`, {
      ...options,
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteCampaign(brandId: number, campaignId: number, options?: RequestOptions): Promise<void> {
    return fetchJson<void>(`/brands/${brandId}/campaigns/${campaignId}`, {
      ...options,
      method: "DELETE",
    });
  },

  // Guidelines
  async listGuidelines(brandId: number, options?: RequestOptions): Promise<GuidelineChunk[]> {
    return fetchJson<GuidelineChunk[]>(`/guidelines?brand_id=${brandId}`, options);
  },

  async createGuideline(
    payload: {
      brand_id: number;
      content_text: string;
      rule_category: string;
      source_document?: string;
      page_number?: number;
      section_reference?: string;
    },
    options?: RequestOptions
  ): Promise<GuidelineChunk> {
    return fetchJson<GuidelineChunk>("/guidelines", {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async uploadGuidelinePdf(brandId: number, file: File, options?: RequestOptions): Promise<GuidelineChunk[]> {
    const formData = new FormData();
    formData.append("brand_id", brandId.toString());
    formData.append("file", file);

    return fetchJson<GuidelineChunk[]>("/guidelines/upload-pdf", {
      ...options,
      method: "POST",
      body: formData,
    });
  },

  async loadPremadeGuidelines(brandId: number, options?: RequestOptions): Promise<GuidelineChunk[]> {
    const formData = new FormData();
    formData.append("brand_id", brandId.toString());
    return fetchJson<GuidelineChunk[]>("/guidelines/load-premade", {
      ...options,
      method: "POST",
      body: formData,
    });
  },

  async searchGuidelines(
    brandId: number,
    query: string,
    limit = 4,
    options?: RequestOptions
  ): Promise<GuidelineSearchResult[]> {
    return fetchJson<GuidelineSearchResult[]>("/guidelines/search", {
      ...options,
      method: "POST",
      body: JSON.stringify({ brand_id: brandId, query, limit }),
    });
  },

  // Submissions & Audits
  async listSubmissions(brandId: number, statusFilter?: string, options?: RequestOptions): Promise<Submission[]> {
    const query = statusFilter
      ? `/submissions?brand_id=${brandId}&status_filter=${encodeURIComponent(statusFilter)}`
      : `/submissions?brand_id=${brandId}`;
    return fetchJson<Submission[]>(query, options);
  },

  async getSubmission(id: number, options?: RequestOptions): Promise<Submission> {
    return fetchJson<Submission>(`/submissions/${id}`, options);
  },

  async getAuditStatus(submissionId: number, options?: RequestOptions): Promise<AuditStatusResponse> {
    return fetchJson<AuditStatusResponse>(`/submissions/${submissionId}/audit-status`, options);
  },

  async createSubmission(
    payload: {
      brand_id: number;
      title: string;
      content_format: string;
      initial_content: string;
      campaign_id?: number | null;
      platform?: string;
      media_urls?: string[];
      alt_text?: string;
    },
    options?: RequestOptions
  ): Promise<Submission> {
    return fetchJson<Submission>("/submissions", {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async auditSubmission(
    submissionId: number,
    options?: RequestOptions,
    event?: string,
    campaignId?: number
  ): Promise<AuditExecutionResponse> {
    const params = new URLSearchParams();
    if (event) params.append("event", event);
    if (campaignId) params.append("campaign_id", campaignId.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJson<AuditExecutionResponse>(`/submissions/${submissionId}/audit${query}`, {
      ...options,
      method: "POST",
    });
  },

  async uploadPost(
    submissionId: number,
    formData: FormData,
    background = false,
    options?: RequestOptions
  ): Promise<AuditExecutionResponse> {
    return fetchJson<AuditExecutionResponse>(
      `/submissions/${submissionId}/upload-post?background=${background}`,
      {
        ...options,
        method: "POST",
        body: formData,
      }
    );
  },

  async uploadImage(
    submissionId: number,
    file: File,
    options?: RequestOptions,
    event?: string,
    background = false
  ): Promise<AuditExecutionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams();
    if (event) params.append("event", event);
    if (background) params.append("background", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJson<AuditExecutionResponse>(`/submissions/${submissionId}/upload-image${query}`, {
      ...options,
      method: "POST",
      body: formData,
    });
  },

  async uploadAudio(
    submissionId: number,
    file: File,
    options?: RequestOptions,
    event?: string,
    background = false
  ): Promise<AuditExecutionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams();
    if (event) params.append("event", event);
    if (background) params.append("background", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJson<AuditExecutionResponse>(`/submissions/${submissionId}/upload-audio${query}`, {
      ...options,
      method: "POST",
      body: formData,
    });
  },

  async uploadVideo(
    submissionId: number,
    file: File,
    options?: RequestOptions,
    event?: string,
    background = false
  ): Promise<AuditExecutionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams();
    if (event) params.append("event", event);
    if (background) params.append("background", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJson<AuditExecutionResponse>(`/submissions/${submissionId}/upload-video${query}`, {
      ...options,
      method: "POST",
      body: formData,
    });
  },

  async createRevision(
    submissionId: number,
    payload: {
      content_body: string;
      change_summary: string;
      media_urls?: string[];
      alt_text?: string;
    },
    options?: RequestOptions
  ): Promise<SubmissionRevision> {
    return fetchJson<SubmissionRevision>(`/submissions/${submissionId}/revisions`, {
      ...options,
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(
    submissionId: number,
    targetStatus: string,
    notes?: string,
    options?: RequestOptions
  ): Promise<Submission> {
    return fetchJson<Submission>(`/submissions/${submissionId}/status`, {
      ...options,
      method: "POST",
      body: JSON.stringify({ target_status: targetStatus, notes }),
    });
  },

  async postComment(
    submissionId: number,
    commentText: string,
    findingId?: number | null,
    options?: RequestOptions
  ): Promise<ReviewComment> {
    return fetchJson<ReviewComment>(`/submissions/${submissionId}/comments`, {
      ...options,
      method: "POST",
      body: JSON.stringify({ comment_text: commentText, finding_id: findingId }),
    });
  },

  async listComments(submissionId: number, options?: RequestOptions): Promise<ReviewComment[]> {
    return fetchJson<ReviewComment[]>(`/submissions/${submissionId}/comments`, options);
  },

  async listWorkflow(submissionId: number, options?: RequestOptions): Promise<WorkflowEvent[]> {
    return fetchJson<WorkflowEvent[]>(`/submissions/${submissionId}/workflow`, options);
  },

  async overrideFinding(findingId: number, reason: string, options?: RequestOptions): Promise<AuditFinding> {
    return fetchJson<AuditFinding>(`/submissions/findings/${findingId}/override`, {
      ...options,
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async resolveFinding(findingId: number, resolutionState = "RESOLVED", options?: RequestOptions): Promise<AuditFinding> {
    return fetchJson<AuditFinding>(`/submissions/findings/${findingId}/resolve`, {
      ...options,
      method: "POST",
      body: JSON.stringify({ resolution_state: resolutionState }),
    });
  },

  // Admin Queue & Stats
  async getAdminQueue(
    params?: {
      page?: number;
      page_size?: number;
      status_filter?: string;
      brand_id?: number;
    },
    options?: RequestOptions
  ): Promise<AdminQueueResponse> {
    const urlParams = new URLSearchParams();
    if (params?.page) urlParams.append("page", params.page.toString());
    if (params?.page_size) urlParams.append("page_size", params.page_size.toString());
    if (params?.status_filter) urlParams.append("status_filter", params.status_filter);
    if (params?.brand_id) urlParams.append("brand_id", params.brand_id.toString());
    const query = urlParams.toString() ? `?${urlParams.toString()}` : "";
    return fetchJson<AdminQueueResponse>(`/admin/queue${query}`, options);
  },

  async getAdminStats(options?: RequestOptions): Promise<AdminStatsResponse> {
    return fetchJson<AdminStatsResponse>("/admin/stats", options);
  },

  // Analytics
  async getAnalytics(brandId: number, options?: RequestOptions): Promise<GovernanceAnalytics> {
    return fetchJson<GovernanceAnalytics>(`/analytics/${brandId}`, options);
  },
};
