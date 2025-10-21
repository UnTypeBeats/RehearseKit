// Smart API URL - adapts to environment
export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // HTTPS → use same origin (Cloudflare proxies /api)
    if (window.location.protocol === 'https:') {
      const url = window.location.origin;
      console.log('[API] HTTPS mode, using origin:', url);
      return url;
    }
    
    // HTTP → calculate API port from frontend port
    const frontendPort = parseInt(window.location.port || '80');
    console.log('[API] Frontend port detected:', frontendPort);
    
    // For standard ports (3000, 30070, etc), API is typically frontend_port + 1
    // Or use configured offset/mapping
    let apiPort: number;
    
    if (frontendPort === 3000) {
      apiPort = 8000; // Local dev convention
    } else if (frontendPort >= 30000) {
      apiPort = frontendPort + 1; // TrueNAS convention (30070 → 30071)
    } else {
      apiPort = frontendPort + 1; // Default: next port
    }
    
    const url = `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
    console.log('[API] Calculated API URL:', url);
    return url;
  }
  
  // Fallback (SSR)
  const fallback = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  console.log('[API] Fallback (SSR):', fallback);
  return fallback;
};

// Getter function - evaluates at runtime, not build time
const getAPI_URL = () => getApiUrl();

export interface Job {
  id: string;
  status: JobStatus;
  input_type: "upload" | "youtube";
  input_url?: string;
  project_name: string;
  quality_mode: "fast" | "high";
  detected_bpm?: number;
  manual_bpm?: number;
  trim_start?: number;
  trim_end?: number;
  progress_percent: number;
  error_message?: string;
  source_file_path?: string;
  stems_folder_path?: string;
  package_path?: string;
  created_at: string;
  completed_at?: string;
}

export type JobStatus =
  | "PENDING"
  | "CONVERTING"
  | "ANALYZING"
  | "SEPARATING"
  | "FINALIZING"
  | "PACKAGING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface CreateJobRequest {
  project_name: string;
  quality_mode: "fast" | "high";
  input_type: "upload" | "youtube";
  input_url?: string;
  youtube_preview_id?: string;
  manual_bpm?: number;
  trim_start?: number;
  trim_end?: number;
}

export interface YouTubePreviewRequest {
  url: string;
}

export interface YouTubePreviewResponse {
  preview_id: string;
  preview_url: string;
  title: string;
  duration: number;
  thumbnail?: string;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  page_size: number;
}

class ApiClient {
  private getBaseUrl: () => string;

  constructor(getBaseUrl: () => string) {
    this.getBaseUrl = getBaseUrl;
    console.log('[ApiClient] Initialized with URL getter');
  }

  private get baseUrl(): string {
    const url = this.getBaseUrl();
    console.log('[ApiClient] baseUrl getter called, returning:', url);
    return url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Import auth headers dynamically to avoid circular dependency
    let authHeaders = {};
    if (typeof window !== 'undefined') {
      try {
        const { getAuthHeaders } = require('./auth');
        authHeaders = getAuthHeaders();
      } catch (e) {
        // Auth module not loaded yet, continue without auth
      }
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = "An error occurred";
      try {
        const errorData = await response.json();
        // Handle FastAPI validation errors (422)
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Validation errors are arrays
            errorMessage = errorData.detail.map((err: { loc?: string[]; msg: string }) => 
              `${err.loc?.join('.') || 'Field'}: ${err.msg}`
            ).join(', ');
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else {
          errorMessage = errorData.message || JSON.stringify(errorData);
        }
      } catch {
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async createJob(data: CreateJobRequest, file?: File): Promise<Job> {
    // Backend expects FormData for all requests
    const formData = new FormData();
    formData.append("project_name", data.project_name);
    formData.append("quality_mode", data.quality_mode);
    
    if (data.input_type === "upload" && file) {
      formData.append("file", file);
    } else if (data.input_type === "youtube") {
      if (data.input_url) {
        formData.append("input_url", data.input_url);
      }
      if (data.youtube_preview_id) {
        formData.append("youtube_preview_id", data.youtube_preview_id);
      }
    }
    
    if (data.manual_bpm) {
      formData.append("manual_bpm", data.manual_bpm.toString());
    }
    
    if (data.trim_start !== undefined) {
      formData.append("trim_start", data.trim_start.toString());
    }
    
    if (data.trim_end !== undefined) {
      formData.append("trim_end", data.trim_end.toString());
    }

    // Get auth headers if available
    let authHeaders = {};
    if (typeof window !== 'undefined') {
      try {
        const { getAuthHeaders } = require('./auth');
        authHeaders = getAuthHeaders();
      } catch (e) {
        // Auth module not loaded yet, continue without auth
      }
    }

    const response = await fetch(`${this.baseUrl}/api/jobs/create`, {
      method: "POST",
      body: formData,
      headers: authHeaders, // Include auth headers for FormData too
      // Don't set Content-Type - browser will set it with boundary for FormData
    });

    if (!response.ok) {
      let errorMessage = "Failed to create job";
      try {
        const errorData = await response.json();
        // Handle FastAPI validation errors (422)
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: { loc?: string[]; msg: string }) => 
              `${err.loc?.join('.') || 'Field'}: ${err.msg}`
            ).join(', ');
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else {
          errorMessage = errorData.message || JSON.stringify(errorData);
        }
      } catch {
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getJobs(page = 1, pageSize = 20): Promise<JobListResponse> {
    return this.request<JobListResponse>(
      `/api/jobs?page=${page}&page_size=${pageSize}`
    );
  }

  async getJob(jobId: string): Promise<Job> {
    return this.request<Job>(`/api/jobs/${jobId}`);
  }

  async deleteJob(jobId: string): Promise<void> {
    return this.request<void>(`/api/jobs/${jobId}`, {
      method: "DELETE",
    });
  }

  async getDownloadUrl(jobId: string): Promise<{ url: string }> {
    return this.request<{ url: string }>(`/api/jobs/${jobId}/download`);
  }

  async healthCheck(): Promise<{ status: string; [key: string]: string }> {
    return this.request<{ status: string; [key: string]: string }>("/api/health");
  }

  async createYouTubePreview(url: string): Promise<YouTubePreviewResponse> {
    return this.request<YouTubePreviewResponse>("/api/youtube/preview", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }
}

export const apiClient = new ApiClient(getAPI_URL);

