/**
 * Validation Utilities
 *
 * Provides common validation helpers for input sanitization and bounds checking.
 * Consolidated from packages/functions/src/lib/validation.ts
 */

/**
 * Safely convert a value to a number with bounds checking
 *
 * @param value - The value to convert
 * @param defaultValue - Value to use if conversion fails
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validated number within bounds
 */
export function validateNumber(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * Email validation using RFC 5322 simplified pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

/**
 * Validate Telegram chat ID format
 * Chat IDs are numeric, can be negative for groups
 */
const CHAT_ID_REGEX = /^-?\d+$/;

export function isValidChatId(chatId: string): boolean {
  return CHAT_ID_REGEX.test(chatId) && chatId.length <= 20;
}

/**
 * Validate that a string value is non-empty and within length bounds
 */
export function isValidString(
  value: unknown,
  minLength = 1,
  maxLength = 1000,
): value is string {
  return (
    typeof value === "string" &&
    value.length >= minLength &&
    value.length <= maxLength
  );
}

/**
 * Validate that a value is a valid user ID (non-empty string)
 */
export function isValidUserId(value: unknown): value is string {
  return isValidString(value, 1, 128);
}
