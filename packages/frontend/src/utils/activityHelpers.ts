import type {
  Activity,
  ActivityStatus,
  ActivityEntry,
  ActivityFilters,
  PeriodType,
} from "@/types/activity";
import { startOfDay, endOfDay } from "date-fns";
import { toDate } from "@/utils/timestampUtils";

/**
 * Find the most recent activity for a specific horse and activity type
 *
 * Consolidates duplicate logic from:
 * - CareMatrixView
 * - CareTableView
 * - ActivitiesCarePage
 *
 * @param activities - Array of all activities
 * @param horseId - ID of the horse
 * @param activityTypeId - ID of the activity type configuration
 * @returns The most recent activity, or undefined if none found
 *
 * @example
 * ```tsx
 * const lastVetVisit = findLastActivity(activities, horse.id, 'vet-checkup')
 * if (lastVetVisit) {
 *   console.log('Last vet visit:', toDate(lastVetVisit.date))
 * }
 * ```
 */
export function findLastActivity(
  activities: Activity[],
  horseId: string,
  activityTypeId: string,
): Activity | undefined {
  return activities
    .filter(
      (a) => a.horseId === horseId && a.activityTypeConfigId === activityTypeId,
    )
    .sort((a, b) => b.date.toMillis() - a.date.toMillis())[0];
}

/**
 * Group activities by horse ID
 *
 * @param activities - Array of all activities
 * @returns Map of horse ID to their activities
 *
 * @example
 * ```tsx
 * const activitiesByHorse = groupActivitiesByHorse(activities)
 * const horseActivities = activitiesByHorse.get(horseId) || []
 * ```
 */
export function groupActivitiesByHorse(
  activities: Activity[],
): Map<string, Activity[]> {
  const grouped = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const existing = grouped.get(activity.horseId) || [];
    grouped.set(activity.horseId, [...existing, activity]);
  });

  return grouped;
}

/**
 * Get color class for activity status
 *
 * @param status - Activity status
 * @returns Tailwind color class
 *
 * @example
 * ```tsx
 * const colorClass = getActivityStatusColor(activity.status)
 * <Badge className={colorClass}>{activity.status}</Badge>
 * ```
 */
export function getActivityStatusColor(status: ActivityStatus): string {
  const colorMap: Record<ActivityStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    "in-progress": "bg-blue-100 text-blue-800",
  };

  return colorMap[status] || colorMap.pending;
}

/**
 * Calculate days since last activity
 *
 * @param activity - The activity to check
 * @returns Number of days since the activity date
 *
 * @example
 * ```tsx
 * const daysSince = getDaysSinceActivity(lastActivity)
 * if (daysSince > 30) {
 *   console.log('Activity is overdue!')
 * }
 * ```
 */
export function getDaysSinceActivity(activity: Activity): number {
  const activityDate = toDate(activity.date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - activityDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if an activity is overdue based on days since
 *
 * @param activity - The activity to check
 * @param maxDays - Maximum days before considering overdue
 * @returns True if activity is overdue
 *
 * @example
 * ```tsx
 * const isOverdue = isActivityOverdue(lastVetVisit, 90)
 * if (isOverdue) {
 *   // Show warning
 * }
 * ```
 */
export function isActivityOverdue(
  activity: Activity,
  maxDays: number,
): boolean {
  return getDaysSinceActivity(activity) > maxDays;
}

/**
 * Temporal sections for organizing activities by time
 */
export interface TemporalSections {
  overdue: ActivityEntry[];
  today: ActivityEntry[];
  upcoming: ActivityEntry[];
}

/**
 * Section activities by time relative to today
 *
 * @param activities - Array of activity entries
 * @returns Sections organized by overdue, today, and upcoming
 *
 * @example
 * ```tsx
 * const sections = sectionActivitiesByTime(activities)
 * console.log(`${sections.overdue.length} overdue activities`)
 * ```
 */
export function sectionActivitiesByTime(
  activities: ActivityEntry[],
): TemporalSections {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const sections: TemporalSections = {
    overdue: [],
    today: [],
    upcoming: [],
  };

  activities.forEach((entry) => {
    const entryDate = toDate(entry.date);

    if (entryDate < todayStart && entry.status !== "completed") {
      sections.overdue.push(entry);
    } else if (entryDate >= todayStart && entryDate <= todayEnd) {
      sections.today.push(entry);
    } else if (entryDate > todayEnd) {
      sections.upcoming.push(entry);
    } else if (entry.status === "completed" && entryDate < todayStart) {
      sections.overdue.push(entry); // Completed overdue items stay in overdue
    }
  });

  return sections;
}

/**
 * Determine if temporal sections should be used based on period and filters
 *
 * @param periodType - The current period type (day, week, month)
 * @param filters - Current activity filters
 * @returns True if temporal sections should be used
 *
 * @example
 * ```tsx
 * if (shouldUseTemporalSections('week', filters)) {
 *   // Use temporal sections
 * }
 * ```
 */
export function shouldUseTemporalSections(
  periodType: PeriodType,
  filters: ActivityFilters,
): boolean {
  // Use temporal sections for week/month views
  // For day view, respect manual grouping
  if (periodType === "day") {
    return filters.groupBy === "none";
  }
  return true;
}
