/**
 * Name Utilities
 * Consolidated from frontend/src/lib/nameUtils.ts
 *
 * Provides name formatting, email parsing, and display name generation
 * for User, StableMember, and any object with name fields.
 */
/**
 * Name-related data structure
 * Can be used with User, StableMember, or any object with name fields
 */
export interface NameData {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}
/**
 * Options for name formatting
 */
export interface FormatNameOptions {
  /**
   * Fallback value if name cannot be formatted
   * @default 'Unknown User'
   */
  fallback?: string;
  /**
   * Whether to use email as fallback
   * @default false
   */
  useEmailFallback?: boolean;
  /**
   * Whether to parse email into a friendly name
   * @default false
   */
  parseEmail?: boolean;
}
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
export declare function formatFullName(
  data: NameData,
  options?: Pick<FormatNameOptions, "fallback">,
): string;
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
export declare function formatDisplayName(
  data: NameData,
  options?: FormatNameOptions,
): string;
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
export declare function extractEmailPrefix(
  email: string | null | undefined,
): string | null;
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
export declare function parseEmailToName(
  email: string | null | undefined,
): string | null;
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
export declare function getInitials(data: NameData): string;
//# sourceMappingURL=name.d.ts.map
