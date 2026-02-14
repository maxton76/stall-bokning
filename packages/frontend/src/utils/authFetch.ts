import { getAuth } from "firebase/auth";
import { parseApiError } from "@/lib/apiErrors";

/**
 * Default timeout for API requests (30 seconds)
 * This accounts for Cloud Run cold starts (3-5 seconds) plus actual request processing
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Extended fetch options with timeout support
 */
interface AuthFetchOptions extends RequestInit {
  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Authenticated fetch utility with timeout support
 *
 * Automatically handles Firebase Authentication token retrieval,
 * adds Authorization header to requests, and includes timeout protection
 * to handle Cloud Run cold starts gracefully.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, timeout, etc.)
 * @returns Fetch Response object
 * @throws Error if user is not authenticated
 * @throws Error if request times out
 *
 * @example
 * ```typescript
 * // GET request with default timeout
 * const response = await authFetch('/api/users/me')
 * const data = await response.json()
 *
 * // POST request with custom timeout
 * const response = await authFetch('/api/invites/accept', {
 *   method: 'POST',
 *   body: JSON.stringify({ token }),
 *   timeout: 60000 // 60 seconds
 * })
 * ```
 */
export async function authFetch(
  url: string,
  options: AuthFetchOptions = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated");
  }

  const idToken = await user.getIdToken();

  // Only set Content-Type: application/json when there's a body
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
    Authorization: `Bearer ${idToken}`,
  };

  if (fetchOptions.body) {
    headers["Content-Type"] = "application/json";
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Request timed out. The server may be starting up. Please try again.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Authenticated fetch with automatic JSON parsing and error handling
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, timeout, etc.)
 * @returns Parsed JSON response
 * @throws Error with server error message or generic error
 *
 * @example
 * ```typescript
 * const data = await authFetchJSON('/api/users/me')
 * // With custom timeout
 * const data = await authFetchJSON('/api/long-operation', { timeout: 60000 })
 * ```
 */
export async function authFetchJSON<T = any>(
  url: string,
  options: AuthFetchOptions = {},
): Promise<T> {
  const response = await authFetch(url, options);

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return await response.json();
}
