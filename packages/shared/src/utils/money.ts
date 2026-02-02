/**
 * Money Utilities
 *
 * Handles ore-based integer arithmetic for Swedish currency (SEK).
 * All monetary values in the system are stored as integers in ore (1 SEK = 100 ore).
 * This avoids floating-point precision issues common with decimal currency math.
 */

const SUPPORTED_CURRENCIES: Record<string, number> = {
  SEK: 100,
  EUR: 100,
  USD: 100,
};

/**
 * Returns the minor unit multiplier for a given currency.
 *
 * Standard 2-decimal currencies (SEK, EUR, USD) return 100.
 *
 * @param currency - ISO 4217 currency code
 * @returns Minor unit multiplier (e.g., 100 for SEK)
 * @throws Error if currency is not supported
 */
export function getMinorUnitMultiplier(currency: string): number {
  const multiplier = SUPPORTED_CURRENCIES[currency.toUpperCase()];
  if (multiplier === undefined) {
    throw new Error(
      `Unsupported currency: ${currency}. Supported: ${Object.keys(SUPPORTED_CURRENCIES).join(", ")}`,
    );
  }
  return multiplier;
}

/**
 * Converts a major unit amount to minor units (e.g., SEK to ore).
 *
 * Rounds to the nearest integer to handle floating-point imprecision.
 *
 * @param amount - Amount in major units (e.g., 123.45 SEK)
 * @param currency - ISO 4217 currency code (default: "SEK")
 * @returns Amount in minor units (e.g., 12345 ore)
 *
 * @example
 * toMinorUnit(123.45) // 12345
 * toMinorUnit(10)     // 1000
 */
export function toMinorUnit(amount: number, currency: string = "SEK"): number {
  const multiplier = getMinorUnitMultiplier(currency);
  return Math.round(amount * multiplier);
}

/**
 * Converts a minor unit amount to major units (e.g., ore to SEK).
 *
 * @param amountInMinorUnit - Amount in minor units (e.g., 12345 ore)
 * @param currency - ISO 4217 currency code (default: "SEK")
 * @returns Amount in major units (e.g., 123.45 SEK)
 *
 * @example
 * toMajorUnit(12345) // 123.45
 * toMajorUnit(1000)  // 10
 */
export function toMajorUnit(
  amountInMinorUnit: number,
  currency: string = "SEK",
): number {
  const multiplier = getMinorUnitMultiplier(currency);
  return amountInMinorUnit / multiplier;
}

/**
 * Formats a minor unit amount as a localized currency string.
 *
 * Uses Intl.NumberFormat for locale-aware formatting.
 *
 * @param amountInMinorUnit - Amount in minor units (e.g., ore)
 * @param currency - ISO 4217 currency code (default: "SEK")
 * @param locale - BCP 47 locale string (default: "sv-SE")
 * @returns Formatted currency string (e.g., "123,45 kr")
 *
 * @example
 * formatCurrency(12345)             // "123,45 kr" (sv-SE)
 * formatCurrency(12345, "USD", "en-US") // "$123.45"
 */
export function formatCurrency(
  amountInMinorUnit: number,
  currency: string = "SEK",
  locale: string = "sv-SE",
): string {
  const majorAmount = toMajorUnit(amountInMinorUnit, currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(majorAmount);
}

/**
 * Implements oresavrundning (Swedish rounding to nearest whole SEK).
 *
 * Sweden eliminated 1-ore and 2-ore coins, so cash transactions are
 * rounded to the nearest whole krona. The rounded value is always a
 * multiple of 100 ore.
 *
 * Rounding rules:
 * - 1-49 ore rounds down
 * - 50-99 ore rounds up
 *
 * @param amountInOre - Amount in ore
 * @returns Object with rounded amount (in ore, multiple of 100) and the rounding adjustment
 *
 * @example
 * roundToWholeSEK(12345) // { rounded: 12300, roundingAmount: -45 }
 * roundToWholeSEK(12350) // { rounded: 12400, roundingAmount: 50 }
 * roundToWholeSEK(12300) // { rounded: 12300, roundingAmount: 0 }
 */
export function roundToWholeSEK(amountInOre: number): {
  rounded: number;
  roundingAmount: number;
} {
  const rounded = Math.round(amountInOre / 100) * 100;
  return {
    rounded,
    roundingAmount: rounded - amountInOre,
  };
}

/**
 * Calculates VAT amount from an amount excluding VAT.
 *
 * Both input and output are in ore. The result is rounded to the
 * nearest integer to maintain integer arithmetic.
 *
 * @param amountExclVat - Amount excluding VAT in ore
 * @param vatRate - VAT rate as a percentage (e.g., 25 for 25%)
 * @returns VAT amount in ore
 *
 * @example
 * calculateVat(10000, 25) // 2500
 * calculateVat(10000, 12) // 1200
 * calculateVat(10000, 6)  // 600
 */
export function calculateVat(amountExclVat: number, vatRate: number): number {
  return Math.round(amountExclVat * (vatRate / 100));
}

/**
 * Calculates line total in ore with an optional discount percentage.
 *
 * Discount is applied before rounding to preserve precision.
 *
 * @param quantity - Number of units
 * @param unitPriceInOre - Unit price in ore
 * @param discountPercent - Optional discount percentage (0-100)
 * @returns Object with lineTotal and discountAmount, both in ore
 *
 * @example
 * calculateLineTotal(3, 10000)        // { lineTotal: 30000, discountAmount: 0 }
 * calculateLineTotal(3, 10000, 10)    // { lineTotal: 27000, discountAmount: 3000 }
 * calculateLineTotal(2, 15000, 15)    // { lineTotal: 25500, discountAmount: 4500 }
 */
export function calculateLineTotal(
  quantity: number,
  unitPriceInOre: number,
  discountPercent?: number,
): { lineTotal: number; discountAmount: number } {
  const grossTotal = quantity * unitPriceInOre;

  if (!discountPercent || discountPercent === 0) {
    return { lineTotal: grossTotal, discountAmount: 0 };
  }

  const discountAmount = Math.round(grossTotal * (discountPercent / 100));
  const lineTotal = grossTotal - discountAmount;

  return { lineTotal, discountAmount };
}
