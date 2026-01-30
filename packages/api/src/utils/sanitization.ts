/**
 * Input sanitization utilities for user-provided text.
 */

/**
 * Strips HTML tags from a string to prevent stored HTML injection.
 * React auto-escapes JSX output, but raw HTML could be problematic
 * for other consumers (emails, exports, etc.).
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}
