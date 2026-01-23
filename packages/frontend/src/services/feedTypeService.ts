import type {
  FeedType,
  CreateFeedTypeData,
  UpdateFeedTypeData,
} from "@shared/types";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// Public Service API
// ============================================================================

/**
 * Get all feed types for a stable
 *
 * @param stableId - Stable ID to fetch types for
 * @param activeOnly - If true, only returns active types (default: true)
 * @returns Promise with array of feed types
 */
export async function getFeedTypesByStable(
  stableId: string,
  activeOnly = true,
): Promise<FeedType[]> {
  const params: Record<string, string> = {};
  if (activeOnly !== undefined) {
    params.activeOnly = String(activeOnly);
  }

  const response = await apiClient.get<{ feedTypes: FeedType[] }>(
    `/feed-types/stable/${stableId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.feedTypes;
}

/**
 * Get a single feed type by ID
 *
 * @param id - Feed type ID
 * @returns Promise with feed type or null if not found
 */
export async function getFeedTypeById(id: string): Promise<FeedType | null> {
  try {
    return await apiClient.get<FeedType>(`/feed-types/${id}`);
  } catch (error) {
    return null;
  }
}

/**
 * Create a new feed type for a stable
 *
 * @param stableId - Stable ID that owns this type
 * @param data - Feed type data
 * @returns Promise with created document ID
 */
export async function createFeedType(
  stableId: string,
  data: CreateFeedTypeData,
): Promise<string> {
  const response = await apiClient.post<{ id: string }>("/feed-types", {
    ...data,
    stableId,
  });

  return response.id;
}

/**
 * Update a feed type
 *
 * @param id - Feed type ID
 * @param updates - Partial update data
 * @returns Promise that resolves when update is complete
 */
export async function updateFeedType(
  id: string,
  updates: UpdateFeedTypeData,
): Promise<void> {
  await apiClient.put(`/feed-types/${id}`, updates);
}

/**
 * Delete a feed type
 *
 * Note: If the feed type is in use, it will be soft-deleted (isActive=false).
 * Otherwise, it will be hard-deleted.
 *
 * @param id - Feed type ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFeedType(id: string): Promise<void> {
  await apiClient.delete(`/feed-types/${id}`);
}
