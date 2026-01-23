/**
 * API Client
 *
 * Centralized HTTP client for API communication.
 * Eliminates repeated `${import.meta.env.VITE_API_URL}/api/v1/...` patterns.
 *
 * @example
 * ```typescript
 * // URL builders (existing)
 * apiV1('/horses') // => 'https://api.example.com/api/v1/horses'
 *
 * // HTTP methods (new)
 * const horse = await apiClient.get<Horse>('/horses/123');
 * await apiClient.post('/horses', { name: 'Spirit' });
 * await apiClient.patch('/horses/123', { name: 'Updated' });
 * await apiClient.delete('/horses/123');
 * ```
 */

import { authFetch, authFetchJSON } from "@/utils/authFetch";

/**
 * Base API URL from environment
 */
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Construct a full API URL from a path
 */
export function api(path: string): string {
  if (!path.startsWith("/")) {
    console.warn(`API path should start with /: ${path}`);
  }
  return `${API_URL}${path}`;
}

/**
 * API v1 URL builder for the most common case
 */
export function apiV1(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_URL}/api/v1${path}`;
}

/**
 * Build a URL with query parameters
 */
export function withParams(
  baseUrl: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Construct API v1 URL with query parameters
 */
export function apiV1WithParams(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  return withParams(apiV1(endpoint), params);
}

// =============================================================================
// HTTP Client Methods
// =============================================================================

type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Centralized API client with typed HTTP methods
 *
 * @example
 * ```typescript
 * // GET request
 * const horses = await apiClient.get<Horse[]>('/horses', { stableId: '123' });
 *
 * // POST request
 * const id = await apiClient.post<{ id: string }>('/horses', horseData);
 *
 * // PATCH request
 * await apiClient.patch('/horses/123', { name: 'Updated' });
 *
 * // DELETE request
 * await apiClient.delete('/horses/123');
 * ```
 */
export const apiClient = {
  /**
   * GET request with automatic JSON parsing
   * @param path - API path (e.g., '/horses', '/users/me')
   * @param params - Optional query parameters
   */
  async get<T>(path: string, params?: QueryParams): Promise<T> {
    const url = params ? apiV1WithParams(path, params) : apiV1(path);
    return authFetchJSON<T>(url, { method: "GET" });
  },

  /**
   * POST request with automatic JSON parsing
   * @param path - API path
   * @param body - Request body (will be JSON stringified)
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return authFetchJSON<T>(apiV1(path), {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request with automatic JSON parsing
   * @param path - API path
   * @param body - Request body (will be JSON stringified)
   */
  async put<T>(path: string, body: unknown): Promise<T> {
    return authFetchJSON<T>(apiV1(path), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  /**
   * PATCH request with automatic JSON parsing
   * @param path - API path
   * @param body - Request body (will be JSON stringified)
   */
  async patch<T>(path: string, body: unknown): Promise<T> {
    return authFetchJSON<T>(apiV1(path), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request with automatic JSON parsing
   * @param path - API path
   * @param params - Optional query parameters
   */
  async delete<T = void>(path: string, params?: QueryParams): Promise<T> {
    const url = params ? apiV1WithParams(path, params) : apiV1(path);
    return authFetchJSON<T>(url, { method: "DELETE" });
  },

  /**
   * Raw fetch for cases needing Response object (e.g., file downloads)
   * @param path - API path
   * @param options - Fetch options
   */
  async raw(path: string, options?: RequestInit): Promise<Response> {
    return authFetch(apiV1(path), options);
  },
};

/**
 * Public API client for unauthenticated endpoints
 * (e.g., invite details lookup by token)
 */
export const publicApiClient = {
  /**
   * GET request without authentication
   */
  async get<T>(path: string, params?: QueryParams): Promise<T> {
    const url = params ? apiV1WithParams(path, params) : apiV1(path);
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Request failed with status ${response.status}`,
      );
    }

    return response.json();
  },

  /**
   * POST request without authentication
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(apiV1(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || `Request failed with status ${response.status}`,
      );
    }

    return response.json();
  },
};

export type ApiClient = typeof apiClient;
export type PublicApiClient = typeof publicApiClient;
