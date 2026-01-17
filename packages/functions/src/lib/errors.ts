/**
 * Error Utilities for Cloud Functions
 *
 * Provides standardized error formatting for consistent logging.
 */

/**
 * Format an unknown error value to a string message
 *
 * @param error - Unknown error value (Error object, string, or other)
 * @returns Formatted error message string
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
