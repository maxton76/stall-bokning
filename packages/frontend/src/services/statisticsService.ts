import { apiClient } from "@/lib/apiClient";
import { RoutineInstance, HorseActivityHistoryEntry } from "@equiduty/shared";

/**
 * Fetch user's routine completions for the last N days
 */
export async function getMyRoutineStats(
  stableId: string,
  userId: string,
  days = 30,
): Promise<RoutineInstance[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return apiClient.get<RoutineInstance[]>(
    `/routines/instances/stable/${stableId}`,
    {
      assignedTo: userId,
      startDate: startDate.toISOString(),
    },
  );
}

/**
 * Fetch user's feeding activities for the last N days
 */
export async function getMyFeedingStats(
  stableId: string,
  userId: string,
  days = 30,
): Promise<HorseActivityHistoryEntry[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return apiClient.get<HorseActivityHistoryEntry[]>(
    `/horse-activity-history/stable/${stableId}`,
    {
      completedBy: userId,
      category: "feeding",
      startDate: startDate.toISOString(),
    },
  );
}

/**
 * Fetch all team routine completions for the last N days (for team contribution %)
 */
export async function getTeamRoutineStats(
  stableId: string,
  days = 30,
): Promise<RoutineInstance[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return apiClient.get<RoutineInstance[]>(
    `/routines/instances/stable/${stableId}`,
    {
      startDate: startDate.toISOString(),
    },
  );
}
