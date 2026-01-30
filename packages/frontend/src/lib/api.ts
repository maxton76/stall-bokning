/**
 * API Client for EquiDuty Backend
 * Handles all HTTP requests to the Fastify API Gateway
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5003";
const API_VERSION = import.meta.env.VITE_API_VERSION || "v1";

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

class ApiClient {
  private baseUrl: string;
  private version: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL, version: string = API_VERSION) {
    this.baseUrl = baseUrl;
    this.version = version;
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Build full API URL
   */
  private buildUrl(endpoint: string): string {
    const path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/api/${this.version}/${path}`;
  }

  /**
   * Get default headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      // Handle 204 No Content
      if (response.status === 204) {
        return { data: undefined as T };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          error: {
            error: data.error || "Unknown Error",
            message: data.message || "An unexpected error occurred",
            statusCode: response.status,
            details: data.details,
          },
        };
      }

      return { data };
    } catch (error) {
      console.error("API request failed:", error);
      return {
        error: {
          error: "Network Error",
          message:
            error instanceof Error ? error.message : "Failed to connect to API",
          statusCode: 0,
        },
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
    const url = `${this.baseUrl}/health`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: {
          error: "Health Check Failed",
          message:
            error instanceof Error ? error.message : "Unable to reach API",
          statusCode: 0,
        },
      };
    }
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export typed API methods for specific resources
export const stables = {
  getAll: () => api.get("/stables"),
  getById: (id: string) => api.get(`/stables/${id}`),
  create: (data: unknown) => api.post("/stables", data),
  update: (id: string, data: unknown) => api.patch(`/stables/${id}`, data),
  delete: (id: string) => api.delete(`/stables/${id}`),
};

export const schedules = {
  getAll: () => api.get("/schedules"),
  getByStable: (stableId: string) => api.get(`/schedules/stable/${stableId}`),
  create: (data: unknown) => api.post("/schedules", data),
  update: (id: string, data: unknown) => api.patch(`/schedules/${id}`, data),
  cancel: (id: string) => api.delete(`/schedules/${id}`),
};
