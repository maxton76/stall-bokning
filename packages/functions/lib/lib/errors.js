"use strict";
/**
 * Error Utilities for Cloud Functions
 *
 * Provides standardized error formatting for consistent logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatErrorMessage = formatErrorMessage;
/**
 * Format an unknown error value to a string message
 *
 * @param error - Unknown error value (Error object, string, or other)
 * @returns Formatted error message string
 */
function formatErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
//# sourceMappingURL=errors.js.map
