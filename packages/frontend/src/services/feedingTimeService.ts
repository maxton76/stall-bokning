import type {
  FeedingTime,
  CreateFeedingTimeData,
  UpdateFeedingTimeData,
} from "@shared/types";
import { authFetchJSON } from "@/utils/authFetch";

// ============================================================================
// Public Service API
// ============================================================================

/**
 * Get all feeding times for a stable
 *
 * Note: If no feeding times exist and the user has management access,
 * default times (morning 07:00, afternoon 13:00, evening 20:00) will be created.
 *
 * @param stableId - Stable ID to fetch times for
 * @param activeOnly - If true, only returns active times (default: true)
 * @returns Promise with array of feeding times
 */
export async function getFeedingTimesByStable(
  stableId: string,
  activeOnly = true,
): Promise<FeedingTime[]> {
  const params = new URLSearchParams();
  if (activeOnly !== undefined) {
    params.append("activeOnly", String(activeOnly));
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ feedingTimes: FeedingTime[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/feeding-times/stable/${stableId}${queryString}`,
    { method: "GET" },
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
    const response = await authFetchJSON<FeedingTime>(
      `${import.meta.env.VITE_API_URL}/api/v1/feeding-times/${id}`,
      { method: "GET" },
    );

    return response;
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
  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/feeding-times`,
    {
      method: "POST",
      body: JSON.stringify({ ...data, stableId }),
    },
  );

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
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/feeding-times/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );
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
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/feeding-times/${id}`,
    { method: "DELETE" },
  );
}
