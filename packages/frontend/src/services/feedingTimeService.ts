import type {
  FeedingTime,
  CreateFeedingTimeData,
  UpdateFeedingTimeData,
} from "@shared/types";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// Public Service API
// ============================================================================

/**
 * Get all feeding times for a stable
 *
 * @param stableId - Stable ID to fetch times for
 * @param activeOnly - If true, only returns active times (default: true)
 * @returns Promise with array of feeding times
 */
export async function getFeedingTimesByStable(
  stableId: string,
  activeOnly = true,
): Promise<FeedingTime[]> {
  const params: Record<string, string> = {};
  if (activeOnly !== undefined) {
    params.activeOnly = String(activeOnly);
  }

  const response = await apiClient.get<{ feedingTimes: FeedingTime[] }>(
    `/feeding-times/stable/${stableId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.feedingTimes;
}

/**
 * Get a single feeding time by ID
 *
 * @param id - Feeding time ID
 * @returns Promise with feeding time or null if not found
 */
export async function getFeedingTimeById(
  id: string,
): Promise<FeedingTime | null> {
  try {
    return await apiClient.get<FeedingTime>(`/feeding-times/${id}`);
  } catch (error) {
    return null;
  }
}

/**
 * Create a new feeding time for a stable
 *
 * @param stableId - Stable ID that owns this time
 * @param data - Feeding time data (name and time in HH:mm format)
 * @returns Promise with created document ID
 */
export async function createFeedingTime(
  stableId: string,
  data: CreateFeedingTimeData,
): Promise<string> {
  const response = await apiClient.post<{ id: string }>("/feeding-times", {
    ...data,
    stableId,
  });

  return response.id;
}

/**
 * Update a feeding time
 *
 * @param id - Feeding time ID
 * @param updates - Partial update data
 * @returns Promise that resolves when update is complete
 */
export async function updateFeedingTime(
  id: string,
  updates: UpdateFeedingTimeData,
): Promise<void> {
  await apiClient.put(`/feeding-times/${id}`, updates);
}

/**
 * Delete a feeding time
 *
 * Note: If the feeding time is in use, it will be soft-deleted (isActive=false).
 * Otherwise, it will be hard-deleted.
 *
 * @param id - Feeding time ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFeedingTime(id: string): Promise<void> {
  await apiClient.delete(`/feeding-times/${id}`);
}
