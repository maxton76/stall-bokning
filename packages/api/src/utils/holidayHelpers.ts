/**
 * Swedish Holiday Detection for Backend
 * Ported from packages/frontend/src/utils/holidayHelpers.ts
 */

import { formatDateString } from "@stall-bokning/shared";

/**
 * Fixed Swedish holidays (month is 1-indexed)
 */
const FIXED_HOLIDAYS = [
  { month: 1, day: 1 }, // New Year's Day
  { month: 1, day: 6 }, // Epiphany
  { month: 5, day: 1 }, // May Day
  { month: 6, day: 6 }, // National Day
  { month: 12, day: 24 }, // Christmas Eve
  { month: 12, day: 25 }, // Christmas Day
  { month: 12, day: 26 }, // Boxing Day
  { month: 12, day: 31 }, // New Year's Eve
];

/**
 * Easter dates by year (simplified)
 * In production, use Computus algorithm or a library
 */
const EASTER_DATES_MAP: { [year: number]: string[] } = {
  2024: ["2024-03-29", "2024-03-30", "2024-03-31", "2024-04-01"], // Good Friday to Easter Monday
  2025: ["2025-04-18", "2025-04-19", "2025-04-20", "2025-04-21"],
  2026: ["2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06"],
  2027: ["2027-03-26", "2027-03-27", "2027-03-28", "2027-03-29"],
  2028: ["2028-04-14", "2028-04-15", "2028-04-16", "2028-04-17"],
  2029: ["2029-03-30", "2029-03-31", "2029-04-01", "2029-04-02"],
  2030: ["2030-04-19", "2030-04-20", "2030-04-21", "2030-04-22"],
};

/**
 * Get Easter-related dates for a given year
 */
function getEasterDates(year: number): string[] {
  return EASTER_DATES_MAP[year] || [];
}

/**
 * Check if date is a fixed Swedish holiday
 */
function isFixedHoliday(month: number, day: number): boolean {
  return FIXED_HOLIDAYS.some((h) => h.month === month && h.day === day);
}

/**
 * Check if date is Midsummer Eve (Friday between June 19-25)
 */
function isMidsummerEve(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  return month === 6 && day >= 19 && day <= 25 && dayOfWeek === 5;
}

/**
 * Check if date is All Saints' Day (Saturday between Oct 31 - Nov 6)
 */
function isAllSaintsDay(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  return (
    ((month === 10 && day === 31) || (month === 11 && day <= 6)) &&
    dayOfWeek === 6
  );
}

/**
 * Check if date is an Easter-related holiday
 */
function isEasterHoliday(date: Date): boolean {
  const dateStr = formatDateString(date);
  const easterDates = getEasterDates(date.getFullYear());
  return easterDates.includes(dateStr);
}

/**
 * Check if date is Ascension Day (39 days after Easter Sunday)
 */
function isAscensionDay(date: Date): boolean {
  const year = date.getFullYear();
  const easterDates = EASTER_DATES_MAP[year];
  if (!easterDates || easterDates.length < 3) return false;

  // Easter Sunday is the third date in the array
  const easterSunday = new Date(easterDates[2]);
  const ascensionDay = new Date(easterSunday);
  ascensionDay.setDate(ascensionDay.getDate() + 39);

  return formatDateString(date) === formatDateString(ascensionDay);
}

/**
 * Check if a date is a Swedish holiday
 */
export function isSwedishHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return (
    isFixedHoliday(month, day) ||
    isMidsummerEve(date) ||
    isAllSaintsDay(date) ||
    isEasterHoliday(date) ||
    isAscensionDay(date)
  );
}

/**
 * Apply holiday multiplier to points
 */
export function applyHolidayMultiplier(
  basePoints: number,
  isHoliday: boolean,
  multiplier: number = 1.5,
): number {
  return isHoliday ? Math.round(basePoints * multiplier) : basePoints;
}

/**
 * Get holiday name for a date (for display purposes)
 */
export function getHolidayName(date: Date): string | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Fixed holidays
  if (month === 1 && day === 1) return "New Year's Day";
  if (month === 1 && day === 6) return "Epiphany";
  if (month === 5 && day === 1) return "May Day";
  if (month === 6 && day === 6) return "National Day";
  if (month === 12 && day === 24) return "Christmas Eve";
  if (month === 12 && day === 25) return "Christmas Day";
  if (month === 12 && day === 26) return "Boxing Day";
  if (month === 12 && day === 31) return "New Year's Eve";

  // Moving holidays
  if (isMidsummerEve(date)) return "Midsummer Eve";
  if (isAllSaintsDay(date)) return "All Saints' Day";
  if (isEasterHoliday(date)) {
    const dateStr = formatDateString(date);
    const easterDates = getEasterDates(date.getFullYear());
    const index = easterDates.indexOf(dateStr);
    if (index === 0) return "Good Friday";
    if (index === 1) return "Easter Eve";
    if (index === 2) return "Easter Sunday";
    if (index === 3) return "Easter Monday";
  }
  if (isAscensionDay(date)) return "Ascension Day";

  return null;
}
