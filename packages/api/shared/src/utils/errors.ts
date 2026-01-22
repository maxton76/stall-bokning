/**
 * Error Utilities
 *
 * Provides standardized error formatting and handling utilities
 * for consistent error messages across the application.
 */

/**
 * Format an unknown error value to a string message
 *
 * This utility addresses the DRY violation where the pattern:
 * `error instanceof Error ? error.message : String(error)`
 * was repeated 16+ times across the codebase.
 *
 * @param error - Unknown error value (Error object, string, or other)
 * @returns Formatted error message string
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   logger.error({ error: formatErrorMessage(error) }, "Operation failed");
 * }
 * ```
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Format error with additional context
 *
 * @param error - Unknown error value
 * @param context - Additional context to prepend
 * @returns Formatted error message with context
 *
 * @example
 * ```typescript
 * formatErrorWithContext(error, "Failed to process user")
 * // Returns: "Failed to process user: <error message>"
 * ```
 */
export function formatErrorWithContext(
  error: unknown,
  context: string,
): string {
  return `${context}: ${formatErrorMessage(error)}`;
}

/**
 * Check if an error is a specific type based on message content
 *
 * @param error - Error to check
 * @param patterns - Array of string patterns to match
 * @returns true if any pattern matches the error message
 */
export function errorMatchesPatterns(
  error: unknown,
  patterns: string[],
): boolean {
  const message = formatErrorMessage(error).toLowerCase();
  return patterns.some((pattern) => message.includes(pattern.toLowerCase()));
}
