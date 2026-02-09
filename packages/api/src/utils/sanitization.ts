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

/**
 * Sanitize a user-provided file name for safe storage.
 * Strips path separators, normalizes unicode, and limits length.
 */
export function sanitizeFileName(fileName: string, maxLength = 100): string {
  return fileName
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, maxLength);
}
