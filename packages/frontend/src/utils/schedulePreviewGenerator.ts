/**
 * Schedule Preview Generator
 *
 * Generates a list of dates/instances that will be created from schedule config.
 * Used by the assignment preview modal to show what will be created.
 */

import type { RoutineScheduleRepeatPattern } from "@shared/types";
import { holidayService } from "@equiduty/shared";
import type { AssignmentSuggestion } from "@/services/fairnessService";

/**
 * Preview instance representing a routine that will be created
 */
export interface PreviewInstance {
  date: Date;
  dateKey: string; // YYYY-MM-DD format
  dayOfWeek: number; // 0-6, Sunday-Saturday
  scheduledTime: string;
  suggestedAssignee?: string; // userId from fairness algorithm
  suggestedAssigneeName?: string;
}

/**
 * Format a date as YYYY-MM-DD for use as a key
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date should have an instance generated based on repeat pattern
 */
function shouldGenerateForDate(
  date: Date,
  repeatPattern: RoutineScheduleRepeatPattern,
  repeatDays?: number[],
  includeHolidays?: boolean,
): boolean {
  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday

  switch (repeatPattern) {
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
    case "custom": {
      const matchesDay = repeatDays?.includes(dayOfWeek) ?? false;
      return (
        matchesDay ||
        (includeHolidays === true && holidayService.isHoliday(date))
      );
    }
    default:
      return false;
  }
}

/**
 * Generate all dates from startDate to endDate that match the repeat pattern
 */
function generateScheduledDates(
  startDate: Date,
  endDate: Date,
  repeatPattern: RoutineScheduleRepeatPattern,
  repeatDays?: number[],
  includeHolidays?: boolean,
): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  // Normalize to midnight for consistent comparison
  currentDate.setHours(0, 0, 0, 0);
  const normalizedEndDate = new Date(endDate);
  normalizedEndDate.setHours(23, 59, 59, 999);

  while (currentDate <= normalizedEndDate) {
    if (
      shouldGenerateForDate(
        currentDate,
        repeatPattern,
        repeatDays,
        includeHolidays,
      )
    ) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Generate schedule preview with all instances that will be created
 */
export function generateSchedulePreview(
  startDateStr: string,
  endDateStr: string,
  repeatPattern: RoutineScheduleRepeatPattern,
  repeatDays: number[] | undefined,
  scheduledTime: string,
  suggestions?: AssignmentSuggestion[],
  includeHolidays?: boolean,
): PreviewInstance[] {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  // Generate all dates that match the pattern
  const dates = generateScheduledDates(
    startDate,
    endDate,
    repeatPattern,
    repeatDays,
    includeHolidays,
  );

  // Build suggestion map for round-robin assignment
  const suggestionsList = suggestions || [];

  // Generate preview instances with round-robin fairness-based suggestions
  return dates.map((date, index) => {
    const suggestion =
      suggestionsList.length > 0
        ? suggestionsList[index % suggestionsList.length]
        : undefined;

    return {
      date,
      dateKey: formatDateKey(date),
      dayOfWeek: date.getDay(),
      scheduledTime,
      suggestedAssignee: suggestion?.userId,
      suggestedAssigneeName: suggestion?.displayName,
    };
  });
}

/**
 * Apply fairness-based suggestions to instances using round-robin
 */
export function applyFairnessSuggestions(
  instances: PreviewInstance[],
  suggestions: AssignmentSuggestion[],
): PreviewInstance[] {
  if (suggestions.length === 0) {
    return instances;
  }

  // Sort suggestions by priority (higher priority = should get more assignments)
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => b.priority - a.priority,
  );

  return instances.map((instance, index) => {
    const suggestionIndex = index % sortedSuggestions.length;
    const suggestion = sortedSuggestions[suggestionIndex];
    // We already checked suggestions.length > 0, so suggestion is guaranteed to exist
    if (!suggestion) return instance;
    return {
      ...instance,
      suggestedAssignee: suggestion.userId,
      suggestedAssigneeName: suggestion.displayName,
    };
  });
}

/**
 * Get day name from day of week
 */
export function getDayName(
  dayOfWeek: number,
  locale: "sv" | "en" = "sv",
): string {
  const dayNames: readonly string[] =
    locale === "sv"
      ? (["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"] as const)
      : (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const);

  // Ensure dayOfWeek is within bounds (0-6)
  const safeIndex = Math.max(0, Math.min(6, dayOfWeek));
  const dayName = dayNames[safeIndex];
  return dayName ?? "?";
}

/**
 * Format date for display
 */
export function formatPreviewDate(
  date: Date,
  locale: "sv" | "en" = "sv",
): string {
  const dayName = getDayName(date.getDay(), locale);
  const day = date.getDate();
  const monthNames =
    locale === "sv"
      ? [
          "jan",
          "feb",
          "mar",
          "apr",
          "maj",
          "jun",
          "jul",
          "aug",
          "sep",
          "okt",
          "nov",
          "dec",
        ]
      : [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
  const month = monthNames[date.getMonth()];

  return `${dayName} ${day} ${month}`;
}
