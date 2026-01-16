import type {
  FeedType,
  CreateFeedTypeData,
  UpdateFeedTypeData,
} from "@shared/types";

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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const params = new URLSearchParams();
  if (activeOnly !== undefined) {
    params.append("activeOnly", String(activeOnly));
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ feedTypes: FeedType[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/feed-types/stable/${stableId}${queryString}`,
    { method: "GET" },
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
    const { authFetchJSON } = await import("@/utils/authFetch");

    const response = await authFetchJSON<FeedType>(
      `${import.meta.env.VITE_API_URL}/api/v1/feed-types/${id}`,
      { method: "GET" },
    );

    return response;
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/feed-types`,
    {
      method: "POST",
      body: JSON.stringify({ ...data, stableId }),
    },
  );

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
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/feed-types/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );
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
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/feed-types/${id}`,
    { method: "DELETE" },
  );
}
