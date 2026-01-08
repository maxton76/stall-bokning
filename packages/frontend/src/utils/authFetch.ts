import { getAuth } from 'firebase/auth'

/**
 * Authenticated fetch utility
 *
 * Automatically handles Firebase Authentication token retrieval and
 * adds Authorization header to requests.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, etc.)
 * @returns Fetch Response object
 * @throws Error if user is not authenticated
 *
 * @example
 * ```typescript
 * // GET request
 * const response = await authFetch('/api/users/me')
 * const data = await response.json()
 *
 * // POST request
 * const response = await authFetch('/api/invites/accept', {
 *   method: 'POST',
 *   body: JSON.stringify({ token })
 * })
 * ```
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('User not authenticated')
  }

  const idToken = await user.getIdToken()

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Authenticated fetch with automatic JSON parsing and error handling
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, etc.)
 * @returns Parsed JSON response
 * @throws Error with server error message or generic error
 *
 * @example
 * ```typescript
 * const data = await authFetchJSON('/api/users/me')
 * ```
 */
export async function authFetchJSON<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authFetch(url, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Request failed with status ${response.status}`)
  }

  return await response.json()
}
