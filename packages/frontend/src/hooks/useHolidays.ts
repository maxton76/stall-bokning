/**
 * useHolidays Hook
 *
 * Provides holiday data for calendar components based on organization settings.
 * Handles date range filtering and organization-level configuration.
 */

import { useMemo } from "react";
import {
  holidayService,
  type Holiday,
  type HolidayCalendarSettings,
  DEFAULT_HOLIDAY_SETTINGS,
} from "@equiduty/shared";

interface UseHolidaysOptions {
  /** Start date for the holiday range */
  startDate: Date;
  /** End date for the holiday range */
  endDate: Date;
  /** Organization holiday settings (if not provided, uses defaults) */
  settings?: Partial<HolidayCalendarSettings>;
}

interface UseHolidaysResult {
  /** Array of holidays in the specified date range */
  holidays: Holiday[];
  /** Whether holiday display is enabled */
  showHolidays: boolean;
  /** Whether holiday multiplier is enabled */
  enableMultiplier: boolean;
  /** The holiday multiplier value */
  multiplier: number;
  /** Whether scheduling restrictions are enabled */
  enableRestrictions: boolean;
  /** Check if a specific date is a holiday */
  isHoliday: (date: Date) => boolean;
  /** Get holiday for a specific date (if any) */
  getHoliday: (date: Date) => Holiday | null;
}

/**
 * Hook for accessing holiday data with organization-level settings
 */
export function useHolidays({
  startDate,
  endDate,
  settings = {},
}: UseHolidaysOptions): UseHolidaysResult {
  // Merge with default settings
  const mergedSettings: HolidayCalendarSettings = useMemo(
    () => ({
      ...DEFAULT_HOLIDAY_SETTINGS,
      ...settings,
    }),
    [settings],
  );

  // Get holidays in the specified date range
  const holidays = useMemo(() => {
    if (!mergedSettings.enableHolidayDisplay) return [];
    return holidayService.getHolidaysInRange(
      startDate,
      endDate,
      mergedSettings.countryCode,
    );
  }, [
    startDate,
    endDate,
    mergedSettings.countryCode,
    mergedSettings.enableHolidayDisplay,
  ]);

  // Helper to check if a date is a holiday
  const isHoliday = useMemo(() => {
    return (date: Date) =>
      holidayService.isHoliday(date, mergedSettings.countryCode);
  }, [mergedSettings.countryCode]);

  // Helper to get holiday for a date
  const getHoliday = useMemo(() => {
    return (date: Date) =>
      holidayService.getHoliday(date, mergedSettings.countryCode);
  }, [mergedSettings.countryCode]);

  return {
    holidays,
    showHolidays: mergedSettings.enableHolidayDisplay,
    enableMultiplier: mergedSettings.enableHolidayMultiplier,
    multiplier: mergedSettings.holidayMultiplier,
    enableRestrictions: mergedSettings.enableSchedulingRestrictions,
    isHoliday,
    getHoliday,
  };
}

/**
 * Convenience hook for getting holidays for the current month
 */
export function useMonthHolidays(
  month: Date,
  settings?: Partial<HolidayCalendarSettings>,
): UseHolidaysResult {
  const startDate = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    return start;
  }, [month]);

  const endDate = useMemo(() => {
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return end;
  }, [month]);

  return useHolidays({ startDate, endDate, settings });
}

/**
 * Convenience hook for getting holidays for a date range with buffer
 * Useful for calendar views that may show days from adjacent months
 */
export function useCalendarHolidays(
  month: Date,
  settings?: Partial<HolidayCalendarSettings>,
): UseHolidaysResult {
  // Add buffer days before and after the month for calendar views
  const startDate = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    start.setDate(start.getDate() - 7); // 7 days buffer before
    return start;
  }, [month]);

  const endDate = useMemo(() => {
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    end.setDate(end.getDate() + 7); // 7 days buffer after
    return end;
  }, [month]);

  return useHolidays({ startDate, endDate, settings });
}
