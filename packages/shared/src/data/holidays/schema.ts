/**
 * Holiday Calendar Schema Types
 * Defines the structure for country-specific holiday calendars
 */

/**
 * Individual holiday entry
 */
export interface Holiday {
  /** Date in "YYYY-MM-DD" format for specific year, or "MM-DD" for recurring */
  date: string;
  /** Holiday name in native language (Swedish for SE) */
  name: string;
  /** Holiday name in English */
  nameEn: string;
  /** Translation key for i18n lookup */
  nameKey: string;
  /** Fixed date vs calculated (Easter-dependent) */
  type: "fixed" | "moving";
  /** Röd dag - official public holiday */
  isPublicHoliday: boolean;
  /** Half working day (e.g., Christmas Eve, Midsummer Eve) */
  isHalfDay?: boolean;
}

/**
 * Holiday calendar for a specific country
 */
export interface HolidayCalendar {
  /** ISO 3166-1 alpha-2 country code (e.g., "SE") */
  country: string;
  /** Country name in English */
  countryName: string;
  /** Country name in native language */
  countryNameNative: string;
  /** Year-specific holidays (moving holidays resolved to exact dates) */
  years: {
    [year: string]: Holiday[];
  };
  /** Fixed-date holidays that repeat yearly */
  recurringHolidays: Holiday[];
}

/**
 * Supported country codes
 */
export type SupportedCountryCode = "SE";

/**
 * Holiday calendar settings for an organization
 */
export interface HolidayCalendarSettings {
  /** Country code for holiday calendar (default: "SE") */
  countryCode: SupportedCountryCode;
  /** Show holidays in calendars (default: true) */
  enableHolidayDisplay: boolean;
  /** Apply multiplier to shift points on holidays (default: true) */
  enableHolidayMultiplier: boolean;
  /** Holiday point multiplier (default: 1.5) */
  holidayMultiplier: number;
  /** Block bookings on holidays (default: false) */
  enableSchedulingRestrictions: boolean;
  /** Specific holidays to restrict (empty = all if restrictions enabled) */
  restrictedHolidays?: string[];
}

/**
 * Default holiday calendar settings
 */
export const DEFAULT_HOLIDAY_SETTINGS: HolidayCalendarSettings = {
  countryCode: "SE",
  enableHolidayDisplay: true,
  enableHolidayMultiplier: true,
  holidayMultiplier: 1.5,
  enableSchedulingRestrictions: false,
  restrictedHolidays: [],
};
