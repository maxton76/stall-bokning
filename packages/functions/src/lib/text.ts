/**
 * Text Escaping Utilities for Cloud Functions
 *
 * Provides text escaping functions for safe content rendering
 * in various output formats (HTML, Markdown, etc.).
 */

/**
 * HTML entity escaping to prevent XSS in email content
 * Escapes the 5 XML entities: &, <, >, ", '
 *
 * @param text - Raw text to escape
 * @returns HTML-safe string
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

/**
 * Escape special characters for Telegram MarkdownV2
 *
 * @param text - Raw text to escape
 * @returns MarkdownV2-safe string
 */
export function escapeMarkdown(text: string): string {
  // Characters that need escaping in MarkdownV2
  const specialChars = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];

  let escaped = text;
  for (const char of specialChars) {
    escaped = escaped.split(char).join(`\\${char}`);
  }

  return escaped;
}
