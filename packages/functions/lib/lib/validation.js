"use strict";
/**
 * Validation Utilities for Cloud Functions
 *
 * Provides common validation helpers used across multiple
 * Cloud Functions for input sanitization and bounds checking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateNumber = validateNumber;
exports.isValidEmail = isValidEmail;
exports.isValidChatId = isValidChatId;
exports.isValidString = isValidString;
exports.isValidUserId = isValidUserId;
/**
 * Safely convert a value to a number with bounds checking
 *
 * @param value - The value to convert
 * @param defaultValue - Value to use if conversion fails
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validated number within bounds
 */
function validateNumber(value, defaultValue, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}
/**
 * Email validation using RFC 5322 simplified pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email) {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}
/**
 * Validate Telegram chat ID format
 * Chat IDs are numeric, can be negative for groups
 */
const CHAT_ID_REGEX = /^-?\d+$/;
function isValidChatId(chatId) {
  return CHAT_ID_REGEX.test(chatId) && chatId.length <= 20;
}
/**
 * Validate that a string value is non-empty and within length bounds
 */
function isValidString(value, minLength = 1, maxLength = 1000) {
  return (
    typeof value === "string" &&
    value.length >= minLength &&
    value.length <= maxLength
  );
}
/**
 * Validate that a value is a valid user ID (non-empty string)
 */
function isValidUserId(value) {
  return isValidString(value, 1, 128);
}
//# sourceMappingURL=validation.js.map
