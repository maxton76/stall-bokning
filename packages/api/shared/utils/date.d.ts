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
export declare function getWeekNumber(date: Date): number;
/**
 * Parse shift time string to get start time
 * @example parseShiftStartTime("06:00-09:00") => "06:00"
 */
export declare function parseShiftStartTime(timeRange: string): string;
/**
 * Convert Firestore Timestamp to Date
 * Works with both Firebase client and Firebase Admin timestamps
 */
export declare function timestampToDate(timestamp: FirebaseTimestamp): Date;
/**
 * Format date to YYYY-MM-DD string
 */
export declare function formatDateString(date: Date): string;
/**
 * Create a date threshold for historical queries
 */
export declare function createDateThreshold(daysBack: number): Date;
/**
 * Check if two dates are in the same week
 */
export declare function isSameWeek(date1: Date, date2: Date): boolean;
/**
 * Check if two dates are in the same month
 */
export declare function isSameMonth(date1: Date, date2: Date): boolean;
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
export declare function toDate(value: unknown): Date;
export {};
//# sourceMappingURL=date.d.ts.map
