/**
 * Date Utilities
 * Consolidated from frontend/src/utils/dateHelpers.ts
 *
 * Provides date formatting, manipulation, and comparison utilities
 * for Firebase client SDK (frontend/shared contexts).
 */

import type { Timestamp } from "firebase/firestore";

/**
 * Firebase Timestamp type (client SDK)
 */
type FirebaseTimestamp = Timestamp;

/**
 * Calculate which ISO week number a date belongs to
 */
export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Parse shift time string to get start time
 * @example parseShiftStartTime("06:00-09:00") => "06:00"
 */
export function parseShiftStartTime(timeRange: string): string {
  return timeRange.split("-")[0]?.trim() || "";
}

/**
 * Convert Firestore Timestamp to Date
 * Works with both Firebase client and Firebase Admin timestamps
 */
export function timestampToDate(timestamp: FirebaseTimestamp): Date {
  return timestamp.toDate();
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Create a date threshold for historical queries
 */
export function createDateThreshold(daysBack: number): Date {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysBack);
  return threshold;
}

/**
 * Check if two dates are in the same week
 */
export function isSameWeek(date1: Date, date2: Date): boolean {
  return getWeekNumber(date1) === getWeekNumber(date2);
}

/**
 * Check if two dates are in the same month
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

/**
 * Convert various timestamp formats to Date
 * Handles:
 * - Date objects (returned as-is)
 * - Firebase Timestamps (client or admin SDK with toDate method)
 * - ISO strings
 * - Unix timestamps (milliseconds)
 *
 * This utility addresses the DRY violation found in multiple frontend components
 * where timestamp conversion was duplicated.
 *
 * @param value - The value to convert to a Date
 * @returns Date object
 */
export function toDate(value: unknown): Date {
  // Already a Date
  if (value instanceof Date) {
    return value;
  }

  // Firebase Timestamp (has toDate method)
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  // ISO string or other string format
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Unix timestamp (number)
  if (typeof value === "number") {
    return new Date(value);
  }

  // Fallback to current date if value is invalid
  return new Date();
}
