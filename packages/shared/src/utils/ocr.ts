/**
 * OCR Number Generation Utilities
 *
 * Generates and validates Swedish OCR (Optical Character Recognition) reference
 * numbers for invoices. Uses the Modulus 10 (Luhn) algorithm for check digit
 * calculation, following the Swedish Bankgirot standard.
 *
 * An OCR reference consists of:
 * - The invoice number (base digits)
 * - A Luhn check digit
 * - A length check digit (Luhn digit of all preceding digits including the check digit + length digit itself)
 */

/**
 * Calculates a Luhn (Modulus 10) check digit for a string of digits.
 *
 * Algorithm:
 * 1. Starting from the rightmost digit, double every second digit
 * 2. If a doubled digit exceeds 9, subtract 9
 * 3. Sum all resulting digits
 * 4. Check digit = (10 - (sum % 10)) % 10
 *
 * @param digits - String of numeric characters
 * @returns The Luhn check digit (0-9)
 *
 * @example
 * calculateLuhnCheckDigit("260001") // 4
 */
export function calculateLuhnCheckDigit(digits: string): number {
  let sum = 0;
  let doubleNext = true;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);

    if (doubleNext) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    doubleNext = !doubleNext;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Generates a Swedish OCR reference number from an invoice number.
 *
 * The OCR reference is constructed as:
 * 1. Strip non-numeric characters from the invoice number
 * 2. Calculate and append a Luhn check digit
 * 3. Calculate and append a length check digit (Luhn of the full result including the length digit itself)
 *
 * The resulting OCR must be between 2 and 25 digits (Bankgirot standard).
 *
 * @param invoiceNumber - Invoice number string (e.g., "260001")
 * @returns OCR reference string
 * @throws Error if input is empty or resulting OCR exceeds 25 digits
 *
 * @example
 * generateOCR("260001") // "26000148" (260001 + check digit 4 + length digit 8)
 */
export function generateOCR(invoiceNumber: string): string {
  const stripped = invoiceNumber.replace(/\D/g, "");

  if (stripped.length === 0) {
    throw new Error("Invoice number must contain at least one digit");
  }

  // Step 1: Append Luhn check digit to the base number
  const checkDigit = calculateLuhnCheckDigit(stripped);
  const withCheck = stripped + String(checkDigit);

  // Step 2: Calculate length check digit
  // The total length includes: base + check digit + length digit itself
  const totalLength = withCheck.length + 1;
  const lengthDigit = calculateLuhnCheckDigit(
    withCheck + String(totalLength % 10),
  );
  const ocr = withCheck + String(lengthDigit);

  if (ocr.length < 2 || ocr.length > 25) {
    throw new Error(
      `OCR reference must be between 2 and 25 digits, got ${ocr.length}`,
    );
  }

  return ocr;
}

/**
 * Validates a Swedish OCR reference number.
 *
 * Validates the Luhn check digit on all digits except the last (length check digit).
 * Then validates the complete number including the length check.
 *
 * @param ocr - OCR reference string to validate
 * @returns true if the OCR reference is valid
 *
 * @example
 * validateOCR("26000148") // true
 * validateOCR("26000149") // false
 */
export function validateOCR(ocr: string): boolean {
  if (!/^\d{2,25}$/.test(ocr)) {
    return false;
  }

  // Validate the Luhn check digit (second to last digit)
  // The digits before the last two should produce the second-to-last as check digit
  const baseWithCheck = ocr.slice(0, -1);
  const base = baseWithCheck.slice(0, -1);
  const checkDigit = Number(baseWithCheck[baseWithCheck.length - 1]);

  if (calculateLuhnCheckDigit(base) !== checkDigit) {
    return false;
  }

  // Validate the length check digit (last digit)
  const lengthDigit = Number(ocr[ocr.length - 1]);
  const totalLength = ocr.length;
  const expectedLengthDigit = calculateLuhnCheckDigit(
    baseWithCheck + String(totalLength % 10),
  );

  return lengthDigit === expectedLengthDigit;
}
