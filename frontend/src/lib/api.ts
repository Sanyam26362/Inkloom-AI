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
} from "./types";

function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (!envUrl) {
    return "http://127.0.0.1:8000/api/v1";
  }
  // Auto-append /api/v1 if the user provided the base domain without it
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
  const { userRole = "CREATOR", userId = "user_creator_01", userName = "Alex Rivera", headers = {}, ...rest } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
    "x-user-role": userRole,
    "x-user-id": userId,
    "x-user-name": userName,
  };

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

  // Submissions
  async listSubmissions(brandId: number, statusFilter?: string, options?: RequestOptions): Promise<Submission[]> {
    const query = statusFilter
      ? `/submissions?brand_id=${brandId}&status_filter=${encodeURIComponent(statusFilter)}`
      : `/submissions?brand_id=${brandId}`;
    return fetchJson<Submission[]>(query, options);
  },

  async getSubmission(id: number, options?: RequestOptions): Promise<Submission> {
    return fetchJson<Submission>(`/submissions/${id}`, options);
  },

  async createSubmission(
    payload: {
      brand_id: number;
      title: string;
      content_format: string;
      initial_content: string;
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

  async auditSubmission(submissionId: number, options?: RequestOptions, event?: string): Promise<AuditExecutionResponse> {
    const query = event ? `?event=${encodeURIComponent(event)}` : "";
    return fetchJson<AuditExecutionResponse>(`/submissions/${submissionId}/audit${query}`, {
      ...options,
      method: "POST",
    });
  },

  async uploadImage(
    submissionId: number,
    file: File,
    options?: RequestOptions,
    event?: string
  ): Promise<AuditExecutionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const query = event ? `?event=${encodeURIComponent(event)}` : "";
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
    event?: string
  ): Promise<AuditExecutionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const query = event ? `?event=${encodeURIComponent(event)}` : "";
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
    event?: string
  ): Promise<AuditExecutionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const query = event ? `?event=${encodeURIComponent(event)}` : "";
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

  // Analytics
  async getAnalytics(brandId: number, options?: RequestOptions): Promise<GovernanceAnalytics> {
    return fetchJson<GovernanceAnalytics>(`/analytics/${brandId}`, options);
  },
};
