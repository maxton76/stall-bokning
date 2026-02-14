/**
 * API Error Handling Utilities
 *
 * Provides standardized error classes and handling for API responses.
 */

/**
 * HTTP status code categories
 */
export const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Standard API error class with structured error information
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Check if error is a client error (4xx)
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if error is an authentication error
   */
  get isAuthError(): boolean {
    return this.status === HttpStatus.UNAUTHORIZED;
  }

  /**
   * Check if error is a permission error
   */
  get isForbidden(): boolean {
    return this.status === HttpStatus.FORBIDDEN;
  }

  /**
   * Check if error is a not found error
   */
  get isNotFound(): boolean {
    return this.status === HttpStatus.NOT_FOUND;
  }

  /**
   * Check if error is a validation error
   */
  get isValidationError(): boolean {
    return (
      this.status === HttpStatus.BAD_REQUEST ||
      this.status === HttpStatus.UNPROCESSABLE_ENTITY
    );
  }

  /**
   * Check if error is a rate limit error
   */
  get isRateLimited(): boolean {
    return this.status === HttpStatus.TOO_MANY_REQUESTS;
  }
}

/**
 * Parse error response from API
 *
 * @param response - Fetch Response object
 * @returns ApiError with parsed error details
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  let errorData: Record<string, unknown> = {};

  try {
    errorData = await response.json();
  } catch {
    // Response body is not JSON
  }

  const message =
    (errorData.message as string) ||
    (errorData.error as string) ||
    `Request failed with status ${response.status}`;

  const code = errorData.code as string | undefined;

  // Capture all extra fields (suggestedSlots, remainingCapacity, etc.) as details
  const { message: _m, error: _e, code: _c, ...extraFields } = errorData;
  const details = Object.keys(extraFields).length > 0 ? extraFields : undefined;

  return new ApiError(message, response.status, code, details);
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Get user-friendly error message for display
 *
 * @param error - Error object (ApiError or generic Error)
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    // Return specific messages for known error codes
    if (error.isAuthError) {
      return "Your session has expired. Please sign in again.";
    }
    if (error.isForbidden) {
      return "You don't have permission to perform this action.";
    }
    if (error.isRateLimited) {
      return "Too many requests. Please wait a moment and try again.";
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Handle common API error scenarios
 *
 * @param error - Error to handle
 * @param options - Handler options
 */
export function handleApiError(
  error: unknown,
  options: {
    onAuthError?: () => void;
    onForbidden?: () => void;
    onNotFound?: () => void;
    onValidationError?: (details?: Record<string, unknown>) => void;
    onRateLimit?: () => void;
    onServerError?: () => void;
    onUnknown?: (error: unknown) => void;
  } = {},
): void {
  if (!isApiError(error)) {
    options.onUnknown?.(error);
    return;
  }

  if (error.isAuthError && options.onAuthError) {
    options.onAuthError();
  } else if (error.isForbidden && options.onForbidden) {
    options.onForbidden();
  } else if (error.isNotFound && options.onNotFound) {
    options.onNotFound();
  } else if (error.isValidationError && options.onValidationError) {
    options.onValidationError(error.details);
  } else if (error.isRateLimited && options.onRateLimit) {
    options.onRateLimit();
  } else if (error.isServerError && options.onServerError) {
    options.onServerError();
  } else {
    options.onUnknown?.(error);
  }
}
