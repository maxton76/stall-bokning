/**
 * Timezone Utilities
 * Handles timezone conversions between client and facility timezones
 * Requires: date-fns-tz
 */

import { toZonedTime, fromZonedTime, format as formatTz } from "date-fns-tz";

/**
 * Convert client local time to facility timezone
 * @param clientDate - Date in client's local timezone
 * @param facilityTimezone - Facility's timezone (IANA format, e.g. 'Europe/Stockholm')
 * @returns Date in facility timezone
 */
export function convertToFacilityTime(
  clientDate: Date,
  facilityTimezone: string = "Europe/Stockholm",
): Date {
  // Convert client local time to facility timezone
  return toZonedTime(clientDate, facilityTimezone);
}

/**
 * Convert facility time to client timezone
 * @param facilityDate - Date in facility's timezone
 * @param facilityTimezone - Facility's timezone (IANA format)
 * @returns Date in client's local timezone
 */
export function convertToClientTime(
  facilityDate: Date,
  facilityTimezone: string = "Europe/Stockholm",
): Date {
  // Convert facility time to UTC
  return fromZonedTime(facilityDate, facilityTimezone);
}

/**
 * Format a date in the facility's timezone
 * @param date - Date to format
 * @param formatStr - Format string (e.g. 'HH:mm', 'yyyy-MM-dd HH:mm:ss')
 * @param facilityTimezone - Facility's timezone
 * @returns Formatted string in facility timezone
 */
export function formatInFacilityTimezone(
  date: Date,
  formatStr: string,
  facilityTimezone: string = "Europe/Stockholm",
): string {
  return formatTz(toZonedTime(date, facilityTimezone), formatStr, {
    timeZone: facilityTimezone,
  });
}

/**
 * Get current time in facility timezone
 * @param facilityTimezone - Facility's timezone
 * @returns Current date/time in facility timezone
 */
export function nowInFacilityTimezone(
  facilityTimezone: string = "Europe/Stockholm",
): Date {
  return toZonedTime(new Date(), facilityTimezone);
}
