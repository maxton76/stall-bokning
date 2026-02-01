/**
 * Frontend money formatting utilities
 * All monetary values in the system are stored in ore (1 SEK = 100 ore).
 * These utilities convert ore to display-friendly SEK values.
 */

/**
 * Convert ore (integer) to SEK (decimal) for display
 */
export function oreToSek(amountInOre: number): number {
  return amountInOre / 100;
}

/**
 * Convert SEK (decimal) to ore (integer) for storage/API calls
 */
export function sekToOre(amountInSek: number): number {
  return Math.round(amountInSek * 100);
}

/**
 * Format an ore amount as a localized currency string
 * @param amountInOre - Amount in ore (integer)
 * @param currency - Currency code (default: "SEK")
 * @param locale - Locale for formatting (default: determined by i18n)
 * @returns Formatted string like "1 234,56 kr"
 */
export function formatOre(
  amountInOre: number,
  currency = "SEK",
  locale = "sv-SE",
): string {
  const majorAmount = amountInOre / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(majorAmount);
}

/**
 * Format an ore amount as a plain number string (no currency symbol)
 * @param amountInOre - Amount in ore
 * @param locale - Locale for formatting
 * @returns Formatted string like "1 234,56"
 */
export function formatOreAsNumber(
  amountInOre: number,
  locale = "sv-SE",
): string {
  const majorAmount = amountInOre / 100;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(majorAmount);
}
