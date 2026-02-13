/**
 * Timestamp Utilities
 *
 * Re-exports toDate from shared package and provides frontend-specific
 * date formatting functions.
 */

// Re-export toDate from shared package for consistency
export { toDate } from "@equiduty/shared";

import { toDate } from "@equiduty/shared";
import type { Timestamp } from "firebase/firestore";

/**
 * Format a timestamp value to a localized date string
 *
 * @param timestamp - Firestore Timestamp, ISO string, or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(
  timestamp: Timestamp | string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  if (!timestamp) {
    return "";
  }

  const date = toDate(timestamp);
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Format a timestamp value to a localized datetime string
 *
 * @param timestamp - Firestore Timestamp, ISO string, or Date object
 * @returns Formatted datetime string or empty string if invalid
 */
export function formatDateTime(
  timestamp: Timestamp | string | Date | null | undefined,
): string {
  if (!timestamp) {
    return "";
  }

  return formatDate(timestamp, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Round a date to exact minutes (zero out seconds and milliseconds)
 * Prevents off-by-one errors in time slot calculations
 *
 * @param date - Date object to round
 * @returns New Date object with seconds and milliseconds set to zero
 */
export function roundToMinute(date: Date): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  return rounded;
}
