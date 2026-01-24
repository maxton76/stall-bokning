/**
 * API Pre-warming Service
 *
 * Triggers a lightweight request to the API on app startup to initiate
 * Cloud Run instance startup. This helps reduce cold start delays when
 * users navigate to pages that require API data.
 *
 * The warmup request is fire-and-forget - failures are logged but don't
 * affect the app. The actual API calls will retry as needed.
 */

const API_URL = import.meta.env.VITE_API_URL;

/** Track warmup state to avoid duplicate requests */
let warmupPromise: Promise<void> | null = null;
let warmupComplete = false;

/**
 * Pre-warm the API by sending a lightweight health check request.
 *
 * This function is idempotent - it only makes one request per session.
 * Call this on app startup to trigger Cloud Run instance startup early.
 *
 * @returns Promise that resolves when warmup is complete (or failed)
 *
 * @example
 * ```tsx
 * // In App.tsx
 * useEffect(() => {
 *   prewarmApi();
 * }, []);
 * ```
 */
export function prewarmApi(): Promise<void> {
  // Only attempt once per session
  if (warmupPromise) {
    return warmupPromise;
  }

  // Don't attempt if no API URL configured
  if (!API_URL) {
    console.debug("[API Warmup] No API URL configured, skipping warmup");
    warmupComplete = true;
    return Promise.resolve();
  }

  warmupPromise = fetch(`${API_URL}/health`, {
    method: "GET",
    // Short timeout for warmup - we just want to trigger startup
    // AbortSignal.timeout is supported in modern browsers
    signal: AbortSignal.timeout(10000),
  })
    .then(() => {
      console.debug("[API Warmup] Service is ready");
      warmupComplete = true;
    })
    .catch((error: Error) => {
      // Log but don't throw - warmup failures shouldn't break the app
      console.debug(
        "[API Warmup] Initial warmup failed (will retry on first request):",
        error.message,
      );
      // Don't set warmupComplete to true on failure
      // This way we know the API might still be cold
    });

  return warmupPromise;
}

/**
 * Check if the API has been successfully warmed up.
 *
 * @returns true if warmup request has been attempted
 */
export function isApiWarmupAttempted(): boolean {
  return warmupPromise !== null;
}

/**
 * Check if the API warmup was successful.
 *
 * @returns true if the warmup health check succeeded
 */
export function isApiWarmed(): boolean {
  return warmupComplete;
}
