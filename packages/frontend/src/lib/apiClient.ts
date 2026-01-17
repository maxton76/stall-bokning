/**
 * API Client Utilities
 *
 * Provides centralized API URL construction and request helpers.
 * Use these utilities instead of manually constructing URLs with VITE_API_URL.
 */

/**
 * Base API URL from environment
 */
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Construct a full API URL from a path
 *
 * @param path - API path (should start with /)
 * @returns Full API URL
 *
 * @example
 * api('/api/v1/horses') // => 'https://api.example.com/api/v1/horses'
 * api('/api/v1/horses/123') // => 'https://api.example.com/api/v1/horses/123'
 */
export function api(path: string): string {
  if (!path.startsWith("/")) {
    console.warn(`API path should start with /: ${path}`);
  }
  return `${API_URL}${path}`;
}

/**
 * API v1 URL builder for the most common case
 *
 * @param endpoint - Endpoint path (without /api/v1 prefix)
 * @returns Full API URL
 *
 * @example
 * apiV1('/horses') // => 'https://api.example.com/api/v1/horses'
 * apiV1('/horses/123') // => 'https://api.example.com/api/v1/horses/123'
 */
export function apiV1(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_URL}/api/v1${path}`;
}

/**
 * Build a URL with query parameters
 *
 * @param baseUrl - Base URL
 * @param params - Query parameters object
 * @returns URL with query string
 *
 * @example
 * withParams('/api/v1/horses', { stableId: '123', active: true })
 * // => '/api/v1/horses?stableId=123&active=true'
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
 *
 * @param endpoint - Endpoint path (without /api/v1 prefix)
 * @param params - Query parameters object
 * @returns Full API URL with query string
 *
 * @example
 * apiV1WithParams('/horses', { stableId: '123', active: true })
 * // => 'https://api.example.com/api/v1/horses?stableId=123&active=true'
 */
export function apiV1WithParams(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  return withParams(apiV1(endpoint), params);
}
