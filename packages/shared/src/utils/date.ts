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
 * Get ISO week year - handles edge cases where Dec 31 might be week 1 of next year
 */
export function getWeekYear(date: Date): number {
  const week = getWeekNumber(date);
  const month = date.getMonth();

  // If it's December but week 1, it belongs to next year
  if (month === 11 && week === 1) {
    return date.getFullYear() + 1;
  }
  // If it's January but week 52/53, it belongs to previous year
  if (month === 0 && week >= 52) {
    return date.getFullYear() - 1;
  }
  return date.getFullYear();
}

/**
 * Check if two dates are in the same week (handles year boundary correctly)
 */
export function isSameWeek(date1: Date, date2: Date): boolean {
  return (
    getWeekNumber(date1) === getWeekNumber(date2) &&
    getWeekYear(date1) === getWeekYear(date2)
  );
}

/**
 * Parse shift time string to get end time
 * @example parseShiftEndTime("06:00-09:00") => "09:00"
 */
export function parseShiftEndTime(timeRange: string): string {
  return timeRange.split("-")[1]?.trim() || "";
}

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get the start of the month for a given date
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Parse ISO date string or Date to Date object
 */
export function parseDate(
  value: string | Date | { toDate: () => Date },
): Date | null {
  if (!value) return null;

  // Handle Firestore Timestamp
  if (typeof value === "object" && "toDate" in value) {
    return value.toDate();
  }

  // Handle Date object
  if (value instanceof Date) {
    return value;
  }

  // Handle ISO string
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Get day of week (0-6, where 0 = Sunday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Check if a time string falls within a time range
 * @param time Time to check (HH:MM format)
 * @param start Start of range (HH:MM format)
 * @param end End of range (HH:MM format)
 */
export function isTimeInRange(
  time: string,
  start: string,
  end: string,
): boolean {
  return time >= start && time < end;
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

  // Plain object with seconds/nanoseconds (serialized Timestamp from API)
  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: number }).seconds === "number"
  ) {
    const seconds = (value as { seconds: number }).seconds;
    return new Date(seconds * 1000);
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
