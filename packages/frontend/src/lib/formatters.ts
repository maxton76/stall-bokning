/**
 * Shared Formatters
 *
 * Currency and date formatting utilities used across subscription UI.
 */

/**
 * Format an amount in ore (smallest SEK unit) to a human-readable SEK string.
 * @param ore - Amount in ore (e.g. 29900 = 299 SEK)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatSEK(ore: number, decimals = 2): string {
  return `${(ore / 100).toFixed(decimals)} kr`;
}

/**
 * Format an ISO date string using Swedish locale (YYYY-MM-DD).
 */
export function formatDateSV(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE");
}
