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
} from "date-fns";

/**
 * Create activity (horse-related)
 */
export async function createActivity(
  userId: string,
  stableId: string,
  activityData: CreateActivityData,
  stableName: string,
): Promise<string> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const data = {
    ...activityData,
    type: "activity" as const,
    stableId,
    stableName,
    status: "pending" as const,
  };

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activities`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const data = {
    ...taskData,
    type: "task" as const,
    stableId,
    stableName,
    status: "pending" as const,
  };

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activities`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const data = {
    ...messageData,
    type: "message" as const,
    stableId,
    stableName,
    status: "pending" as const,
  };

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activities`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response.id;
}

/**
 * Get all entries for a stable with optional date range filtering
 */
export async function getStableActivities(
  stableId: string,
  startDate?: Date,
  endDate?: Date,
  typeFilter?: EntryType[],
): Promise<ActivityEntry[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  // Build query parameters
  const params = new URLSearchParams();
  if (startDate) {
    params.append("startDate", startOfDay(startDate).toISOString());
  }
  if (endDate) {
    params.append("endDate", endOfDay(endDate).toISOString());
  }
  if (typeFilter && typeFilter.length > 0) {
    params.append("types", typeFilter.join(","));
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ activities: ActivityEntry[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activities/stable/${stableId}${queryString}`,
    { method: "GET" },
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

  // Use getStableActivities which now calls the API
  return getStableActivities(stableId, startDate, endDate);
}

/**
 * Get care-focused activities (for Care page)
 * @param stableIds - Array of stable IDs or single stable ID. If empty array, returns empty results.
 */
export async function getCareActivities(
  stableIds: string | string[],
): Promise<Activity[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  // Normalize to array
  const stableIdArray = Array.isArray(stableIds) ? stableIds : [stableIds];

  // Return empty if no stables provided
  if (stableIdArray.length === 0) return [];

  // Call API endpoint
  const response = await authFetchJSON<{ activities: Activity[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activities/care?stableIds=${stableIdArray.join(",")}`,
    { method: "GET" },
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ activities: ActivityEntry[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activities/my/${userId}?stableId=${stableId}`,
    { method: "GET" },
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/activities/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );
}

/**
 * Delete any entry
 */
export async function deleteActivity(id: string): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/activities/${id}`,
    { method: "DELETE" },
  );
}

/**
 * Mark entry as completed
 */
export async function completeActivity(
  id: string,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/activities/${id}/complete`,
    { method: "PATCH" },
  );
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ activities: Activity[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activities/horse/${horseId}?limit=${limitCount}`,
    { method: "GET" },
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ activities: Activity[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activities/horse/${horseId}/unfinished`,
    { method: "GET" },
  );

  return response.activities;
}
