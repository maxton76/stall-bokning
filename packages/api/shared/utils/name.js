/**
 * Name Utilities
 * Consolidated from frontend/src/lib/nameUtils.ts
 *
 * Provides name formatting, email parsing, and display name generation
 * for User, StableMember, and any object with name fields.
 */
const DEFAULT_FALLBACK = "Unknown User";
/**
 * Format a full name from firstName and lastName
 * Returns the formatted name or fallback value
 *
 * @example
 * formatFullName({ firstName: 'John', lastName: 'Doe' })
 * // => 'John Doe'
 *
 * formatFullName({ firstName: 'John' })
 * // => 'Unknown User'
 *
 * formatFullName({ firstName: null, lastName: null }, { fallback: 'Guest' })
 * // => 'Guest'
 */
export function formatFullName(data, options) {
  const { firstName, lastName } = data;
  const { fallback = DEFAULT_FALLBACK } = options || {};
  // Both names must be present and non-empty
  if (firstName?.trim() && lastName?.trim()) {
    return `${firstName.trim()} ${lastName.trim()}`;
  }
  return fallback;
}
/**
 * Format a display name with email fallback support
 * Tries: fullName -> emailPrefix -> parsedEmail -> fallback
 *
 * @example
 * formatDisplayName({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john.doe@example.com'
 * })
 * // => 'John Doe'
 *
 * formatDisplayName({
 *   email: 'john.doe@example.com'
 * }, { useEmailFallback: true })
 * // => 'john.doe'
 *
 * formatDisplayName({
 *   email: 'john.doe@example.com'
 * }, { parseEmail: true })
 * // => 'John Doe'
 */
export function formatDisplayName(data, options) {
  const {
    fallback = DEFAULT_FALLBACK,
    useEmailFallback = false,
    parseEmail = false,
  } = options || {};
  // Try full name first
  const fullName = formatFullName(data, { fallback: "" });
  if (fullName) {
    return fullName;
  }
  // Try email fallback strategies if enabled
  if (useEmailFallback || parseEmail) {
    if (parseEmail) {
      const parsedName = parseEmailToName(data.email);
      if (parsedName) {
        return parsedName;
      }
    }
    if (useEmailFallback) {
      const emailPrefix = extractEmailPrefix(data.email);
      if (emailPrefix) {
        return emailPrefix;
      }
    }
  }
  return fallback;
}
/**
 * Extract username from email address
 * Returns the part before @ symbol
 *
 * @example
 * extractEmailPrefix('john.doe@example.com')
 * // => 'john.doe'
 *
 * extractEmailPrefix(null)
 * // => null
 */
export function extractEmailPrefix(email) {
  if (!email?.trim()) {
    return null;
  }
  const parts = email.trim().split("@");
  return parts[0] || null;
}
/**
 * Parse email into a friendly display name
 * Splits on common delimiters, capitalizes each part
 *
 * @example
 * parseEmailToName('john.doe@example.com')
 * // => 'John Doe'
 *
 * parseEmailToName('jane_smith-jones@example.com')
 * // => 'Jane Smith Jones'
 *
 * parseEmailToName(null)
 * // => null
 */
export function parseEmailToName(email) {
  const prefix = extractEmailPrefix(email);
  if (!prefix) {
    return null;
  }
  // Split on common delimiters: . _ -
  const parts = prefix.split(/[._-]/);
  // Capitalize each part
  const capitalizedParts = parts
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    })
    .filter(Boolean);
  return capitalizedParts.length > 0 ? capitalizedParts.join(" ") : null;
}
/**
 * Get initials from name data
 * Returns 1-2 uppercase letters
 *
 * @example
 * getInitials({ firstName: 'John', lastName: 'Doe' })
 * // => 'JD'
 *
 * getInitials({ firstName: 'John' })
 * // => 'JO'
 *
 * getInitials({ email: 'john.doe@example.com' })
 * // => 'JD'
 */
export function getInitials(data) {
  const { firstName, lastName } = data;
  // Try firstName + lastName initials
  if (firstName?.trim() && lastName?.trim()) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  // Try firstName only (first 2 chars)
  if (firstName?.trim()) {
    return firstName.substring(0, 2).toUpperCase();
  }
  // Try lastName only (first 2 chars)
  if (lastName?.trim()) {
    return lastName.substring(0, 2).toUpperCase();
  }
  // Try parsed email
  const parsedName = parseEmailToName(data.email);
  if (parsedName) {
    const parts = parsedName.split(" ");
    const firstPart = parts[0];
    const secondPart = parts[1];
    if (parts.length >= 2 && firstPart && secondPart) {
      return `${firstPart.charAt(0)}${secondPart.charAt(0)}`.toUpperCase();
    }
    return parsedName.substring(0, 2).toUpperCase();
  }
  // Try email prefix
  const emailPrefix = extractEmailPrefix(data.email);
  if (emailPrefix) {
    return emailPrefix.substring(0, 2).toUpperCase();
  }
  return "U?"; // Ultimate fallback
}
