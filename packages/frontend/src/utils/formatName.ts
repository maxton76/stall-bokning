/**
 * Format a full name to first name + last initial.
 * "Anna Andersson" → "Anna A."
 * "Anna" → "Anna"
 */
export function formatAssigneeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0] ?? fullName;
  const firstName = parts[0] ?? "";
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase() || "";
  return `${firstName} ${lastInitial}.`;
}
