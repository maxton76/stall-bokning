/**
 * Date Helper Utilities for Backend
 * Ported from packages/frontend/src/utils/dateHelpers.ts
 */

/**
 * Calculate which ISO week number a date belongs to
 */
export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
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
 * Parse shift time string to get start time
 * @example parseShiftStartTime("06:00-09:00") => "06:00"
 */
export function parseShiftStartTime(timeRange: string): string {
  return timeRange.split("-")[0]?.trim() || "";
}

/**
 * Parse shift time string to get end time
 * @example parseShiftEndTime("06:00-09:00") => "09:00"
 */
export function parseShiftEndTime(timeRange: string): string {
  return timeRange.split("-")[1]?.trim() || "";
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
  return (
    getWeekNumber(date1) === getWeekNumber(date2) &&
    getWeekYear(date1) === getWeekYear(date2)
  );
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
