import type {
  Activity,
  ActivityEntry,
  EntryType,
  ActivityType,
  CreateActivityData,
  CreateTaskData,
  CreateMessageData,
  UpdateActivityEntryData,
  PeriodType,
  DateTab, // Keep for backward compatibility
} from "@/types/activity";
import {
  startOfDay,
  endOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
} from "date-fns";
import { apiClient } from "@/lib/apiClient";

/**
 * Create activity (horse-related)
 */
export async function createActivity(
  userId: string,
  stableId: string,
  activityData: CreateActivityData,
  stableName: string,
): Promise<string> {
  const data = {
    ...activityData,
    type: "activity" as const,
    stableId,
    stableName,
    status: "pending" as const,
  };

  const response = await apiClient.post<{ id: string }>("/activities", data);

  return response.id;
}

/**
 * Create task (stable chore)
 */
export async function createTask(
  userId: string,
  stableId: string,
  taskData: CreateTaskData,
  stableName: string,
): Promise<string> {
  const data = {
    ...taskData,
    type: "task" as const,
    stableId,
    stableName,
    status: "pending" as const,
  };

  const response = await apiClient.post<{ id: string }>("/activities", data);

  return response.id;
}

/**
 * Create message (communication)
 */
export async function createMessage(
  userId: string,
  stableId: string,
  messageData: CreateMessageData,
  stableName: string,
): Promise<string> {
  const data = {
    ...messageData,
    type: "message" as const,
    stableId,
    stableName,
    status: "pending" as const,
  };

  const response = await apiClient.post<{ id: string }>("/activities", data);

  return response.id;
}

/**
 * Options for fetching stable activities
 */
interface GetStableActivitiesOptions {
  /** Include non-completed activities with dates before startDate */
  includeOverdue?: boolean;
}

/**
 * Get all entries for a stable with optional date range filtering
 */
export async function getStableActivities(
  stableId: string,
  startDate?: Date,
  endDate?: Date,
  typeFilter?: EntryType[],
  options?: GetStableActivitiesOptions,
): Promise<ActivityEntry[]> {
  const paramsObj: Record<string, string | undefined> = {};
  if (startDate) paramsObj.startDate = startOfDay(startDate).toISOString();
  if (endDate) paramsObj.endDate = endOfDay(endDate).toISOString();
  if (typeFilter && typeFilter.length > 0)
    paramsObj.types = typeFilter.join(",");
  if (options?.includeOverdue) paramsObj.includeOverdue = "true";

  const response = await apiClient.get<{ activities: ActivityEntry[] }>(
    `/activities/stable/${stableId}`,
    paramsObj,
  );

  return response.activities;
}

/**
 * Get activities for specific date tab (today, tomorrow, day after tomorrow)
 * @deprecated Use getActivitiesByPeriod instead
 */
export async function getActivitiesByDateTab(
  stableId: string,
  dateTab: DateTab,
): Promise<ActivityEntry[]> {
  const now = new Date();
  let targetDate: Date;

  switch (dateTab) {
    case "today":
      targetDate = now;
      break;
    case "tomorrow":
      targetDate = addDays(now, 1);
      break;
    case "dayAfter":
      targetDate = addDays(now, 2);
      break;
    default:
      // For week, month, all - default to today
      targetDate = now;
      break;
  }

  return getStableActivities(stableId, targetDate, targetDate);
}

/**
 * Get activities for a specific period (day, week, or month)
 * @param stableId - The stable ID to query
 * @param referenceDate - The date to calculate the period from
 * @param periodType - The type of period ('day' | 'week' | 'month')
 * @returns Promise with array of activity entries for the period
 *
 * Note: When viewing today in day mode, automatically includes overdue activities
 */
export async function getActivitiesByPeriod(
  stableId: string,
  referenceDate: Date,
  periodType: PeriodType,
): Promise<ActivityEntry[]> {
  let startDate: Date;
  let endDate: Date;

  switch (periodType) {
    case "day":
      startDate = startOfDay(referenceDate);
      endDate = endOfDay(referenceDate);
      break;

    case "week":
      startDate = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday
      endDate = endOfWeek(referenceDate, { weekStartsOn: 1 }); // Sunday
      break;

    case "month":
      startDate = startOfMonth(referenceDate);
      endDate = endOfMonth(referenceDate);
      break;
  }

  // Auto-include overdue activities when viewing today in day mode
  const isViewingToday =
    periodType === "day" && isSameDay(referenceDate, new Date());
  const options: GetStableActivitiesOptions | undefined = isViewingToday
    ? { includeOverdue: true }
    : undefined;

  // Use getStableActivities which now calls the API
  return getStableActivities(stableId, startDate, endDate, undefined, options);
}

/**
 * Get activities for a specific period across multiple stables
 * @param stableIds - Array of stable IDs to query
 * @param referenceDate - The date to calculate the period from
 * @param periodType - The type of period ('day' | 'week' | 'month')
 * @returns Promise with array of activity entries for the period, merged from all stables
 */
export async function getActivitiesByPeriodMultiStable(
  stableIds: string[],
  referenceDate: Date,
  periodType: PeriodType,
): Promise<ActivityEntry[]> {
  if (stableIds.length === 0) return [];

  // Fetch from all stables in parallel
  const promises = stableIds.map((stableId) =>
    getActivitiesByPeriod(stableId, referenceDate, periodType),
  );

  const results = await Promise.all(promises);

  // Merge and deduplicate by ID
  const mergedActivities: ActivityEntry[] = [];
  const seenIds = new Set<string>();

  for (const activities of results) {
    for (const activity of activities) {
      if (!seenIds.has(activity.id)) {
        seenIds.add(activity.id);
        mergedActivities.push(activity);
      }
    }
  }

  // Sort by date - handle both Timestamp and string formats
  mergedActivities.sort((a, b) => {
    const getTime = (date: any): number => {
      if (typeof date === "string") return new Date(date).getTime();
      if (date && typeof date.toMillis === "function") return date.toMillis();
      if (date instanceof Date) return date.getTime();
      return 0;
    };
    return getTime(a.date) - getTime(b.date);
  });

  return mergedActivities;
}

/**
 * Get care-focused activities (for Care page)
 * @param stableIds - Array of stable IDs or single stable ID. If empty array, returns empty results.
 */
export async function getCareActivities(
  stableIds: string | string[],
): Promise<Activity[]> {
  // Normalize to array
  const stableIdArray = Array.isArray(stableIds) ? stableIds : [stableIds];

  // Return empty if no stables provided
  if (stableIdArray.length === 0) return [];

  const response = await apiClient.get<{ activities: Activity[] }>(
    "/activities/care",
    { stableIds: stableIdArray.join(",") },
  );

  return response.activities;
}

/**
 * Get activities assigned to specific user
 */
export async function getMyActivities(
  stableId: string,
  userId: string,
): Promise<ActivityEntry[]> {
  const response = await apiClient.get<{ activities: ActivityEntry[] }>(
    `/activities/my/${userId}`,
    { stableId },
  );

  return response.activities;
}

/**
 * Update any entry (polymorphic)
 */
export async function updateActivity(
  id: string,
  userId: string,
  updates: UpdateActivityEntryData,
): Promise<void> {
  await apiClient.put(`/activities/${id}`, updates);
}

/**
 * Delete any entry
 */
export async function deleteActivity(id: string): Promise<void> {
  await apiClient.delete(`/activities/${id}`);
}

/**
 * Mark entry as completed
 */
export async function completeActivity(
  id: string,
  userId: string,
): Promise<void> {
  await apiClient.patch(`/activities/${id}/complete`, {});
}

/**
 * Get activities for a specific horse
 * @param horseId - The ID of the horse
 * @param limitCount - Maximum number of activities to return (default: 10)
 * @returns Array of activities sorted by date (most recent first)
 */
export async function getHorseActivities(
  horseId: string,
  limitCount: number = 10,
): Promise<Activity[]> {
  const response = await apiClient.get<{ activities: Activity[] }>(
    `/activities/horse/${horseId}`,
    { limit: limitCount },
  );

  return response.activities;
}

/**
 * Get unfinished activities for a specific horse
 * These are activities that are past due but not completed
 * @param horseId - The ID of the horse
 * @returns Array of unfinished activities sorted by date
 */
export async function getUnfinishedActivities(
  horseId: string,
): Promise<Activity[]> {
  const response = await apiClient.get<{ activities: Activity[] }>(
    `/activities/horse/${horseId}/unfinished`,
  );

  return response.activities;
}
