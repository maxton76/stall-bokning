/**
 * Holiday Service - Consolidated holiday logic for frontend and backend
 * Provides methods to check holidays, get holiday info, and apply multipliers
 */

import type {
  Holiday,
  HolidayCalendar,
  SupportedCountryCode,
} from "../data/holidays/schema.js";

// Import calendar data
import seCalendar from "../data/holidays/se.json" with { type: "json" };

/**
 * Format a date as YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a date as MM-DD string for recurring holiday matching
 */
function formatMonthDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

/**
 * Holiday Service Class
 * Manages holiday calendars and provides holiday lookup functionality
 */
class HolidayServiceImpl {
  private calendars: Map<string, HolidayCalendar> = new Map();
  private holidayCache: Map<string, Holiday | null> = new Map();

  constructor() {
    // Pre-load Sweden calendar
    this.loadCalendar("SE");
  }

  /**
   * Load a country's holiday calendar
   */
  loadCalendar(countryCode: SupportedCountryCode): void {
    if (this.calendars.has(countryCode)) {
      return;
    }

    switch (countryCode) {
      case "SE":
        this.calendars.set("SE", seCalendar as HolidayCalendar);
        break;
      default:
        console.warn(`Unknown country code: ${countryCode}`);
    }
  }

  /**
   * Get the calendar for a country
   */
  private getCalendar(
    countryCode: SupportedCountryCode,
  ): HolidayCalendar | undefined {
    this.loadCalendar(countryCode);
    return this.calendars.get(countryCode);
  }

  /**
   * Check if a date is a holiday
   */
  isHoliday(date: Date, countryCode: SupportedCountryCode = "SE"): boolean {
    return this.getHoliday(date, countryCode) !== null;
  }

  /**
   * Check if a date is a public holiday (röd dag)
   */
  isPublicHoliday(
    date: Date,
    countryCode: SupportedCountryCode = "SE",
  ): boolean {
    const holiday = this.getHoliday(date, countryCode);
    return holiday?.isPublicHoliday ?? false;
  }

  /**
   * Get holiday information for a specific date
   */
  getHoliday(
    date: Date,
    countryCode: SupportedCountryCode = "SE",
  ): Holiday | null {
    const dateStr = formatDateString(date);
    const cacheKey = `${countryCode}:${dateStr}`;

    // Check cache first
    if (this.holidayCache.has(cacheKey)) {
      return this.holidayCache.get(cacheKey) ?? null;
    }

    const calendar = this.getCalendar(countryCode);
    if (!calendar) {
      return null;
    }

    const year = String(date.getFullYear());
    const monthDay = formatMonthDay(date);

    // Check year-specific holidays (moving holidays)
    const yearHolidays = calendar.years[year] || [];
    const movingHoliday = yearHolidays.find((h) => h.date === dateStr);
    if (movingHoliday) {
      this.holidayCache.set(cacheKey, movingHoliday);
      return movingHoliday;
    }

    // Check recurring holidays (fixed dates)
    const recurringHoliday = calendar.recurringHolidays.find(
      (h) => h.date === monthDay,
    );
    if (recurringHoliday) {
      // Return a copy with the full date
      const holiday: Holiday = {
        ...recurringHoliday,
        date: dateStr,
      };
      this.holidayCache.set(cacheKey, holiday);
      return holiday;
    }

    this.holidayCache.set(cacheKey, null);
    return null;
  }

  /**
   * Get all holidays in a date range
   */
  getHolidaysInRange(
    start: Date,
    end: Date,
    countryCode: SupportedCountryCode = "SE",
  ): Holiday[] {
    const holidays: Holiday[] = [];
    const calendar = this.getCalendar(countryCode);
    if (!calendar) {
      return holidays;
    }

    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    // Iterate through each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const holiday = this.getHoliday(currentDate, countryCode);
      if (holiday) {
        holidays.push(holiday);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return holidays;
  }

  /**
   * Get holiday name with locale support
   */
  getHolidayName(
    date: Date,
    countryCode: SupportedCountryCode = "SE",
    locale: "sv" | "en" = "sv",
  ): string | null {
    const holiday = this.getHoliday(date, countryCode);
    if (!holiday) {
      return null;
    }
    return locale === "en" ? holiday.nameEn : holiday.name;
  }

  /**
   * Apply holiday multiplier to base points
   */
  applyHolidayMultiplier(
    basePoints: number,
    isHoliday: boolean,
    multiplier: number = 1.5,
  ): number {
    return isHoliday ? Math.round(basePoints * multiplier) : basePoints;
  }

  /**
   * Get supported countries
   */
  getSupportedCountries(): Array<{
    code: SupportedCountryCode;
    name: string;
    nameNative: string;
  }> {
    return [
      {
        code: "SE",
        name: "Sweden",
        nameNative: "Sverige",
      },
    ];
  }

  /**
   * Get all holidays for a specific year
   */
  getHolidaysForYear(
    year: number,
    countryCode: SupportedCountryCode = "SE",
  ): Holiday[] {
    const calendar = this.getCalendar(countryCode);
    if (!calendar) {
      return [];
    }

    const holidays: Holiday[] = [];

    // Add year-specific holidays (moving)
    const yearHolidays = calendar.years[String(year)] || [];
    holidays.push(...yearHolidays);

    // Add recurring holidays with full dates
    for (const recurring of calendar.recurringHolidays) {
      holidays.push({
        ...recurring,
        date: `${year}-${recurring.date}`,
      });
    }

    // Sort by date
    holidays.sort((a, b) => a.date.localeCompare(b.date));

    return holidays;
  }

  /**
   * Check if a date falls on a weekend (Saturday or Sunday)
   */
  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Check if a date is a holiday or weekend
   */
  isHolidayOrWeekend(
    date: Date,
    countryCode: SupportedCountryCode = "SE",
  ): boolean {
    return this.isWeekend(date) || this.isHoliday(date, countryCode);
  }

  /**
   * Clear the holiday cache
   */
  clearCache(): void {
    this.holidayCache.clear();
  }
}

// Export singleton instance
export const holidayService = new HolidayServiceImpl();

// Export class for testing
export { HolidayServiceImpl };

// Re-export types
export type { Holiday, HolidayCalendar, SupportedCountryCode };
export { DEFAULT_HOLIDAY_SETTINGS } from "../data/holidays/schema.js";
export type { HolidayCalendarSettings } from "../data/holidays/schema.js";
