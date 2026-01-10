import type { Timestamp } from "firebase/firestore";

/**
 * Type guard to check if a value is a Firestore Timestamp
 */
function isTimestamp(value: any): value is Timestamp {
  return (
    value && typeof value === "object" && typeof value.toDate === "function"
  );
}

/**
 * Convert a timestamp value to a JavaScript Date object
 * Handles both Firestore Timestamp objects (from direct Firestore queries)
 * and ISO date strings (from API responses)
 *
 * @param timestamp - Firestore Timestamp, ISO string, or Date object
 * @returns JavaScript Date object or null if invalid
 */
export function toDate(
  timestamp: Timestamp | string | Date | null | undefined,
): Date | null {
  if (!timestamp) {
    return null;
  }

  // Already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Firestore Timestamp with toDate() method
  if (isTimestamp(timestamp)) {
    return timestamp.toDate();
  }

  // ISO date string from API
  if (typeof timestamp === "string") {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

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
  const date = toDate(timestamp);
  if (!date) {
    return "";
  }

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
  return formatDate(timestamp, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
