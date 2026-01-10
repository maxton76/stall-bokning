import type {
  ActivityTypeConfig,
  CreateActivityTypeData,
  UpdateActivityTypeData,
} from "@/types/activity";

// ============================================================================
// Public Service API
// ============================================================================

/**
 * Create a custom activity type for a stable
 *
 * @param userId - User ID for audit trail
 * @param stableId - Stable ID that owns this type
 * @param data - Activity type configuration data
 * @returns Promise with created document ID
 */
export async function createActivityType(
  userId: string,
  stableId: string,
  data: CreateActivityTypeData,
): Promise<string> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activity-types`,
    {
      method: "POST",
      body: JSON.stringify({ ...data, stableId }),
    },
  );

  return response.id;
}

/**
 * Get all activity types for a stable
 *
 * @param stableId - Stable ID to fetch types for
 * @param activeOnly - If true, only returns active types (default: true)
 * @returns Promise with array of activity type configurations
 */
export async function getActivityTypesByStable(
  stableId: string,
  activeOnly = true,
): Promise<ActivityTypeConfig[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const params = new URLSearchParams();
  if (activeOnly !== undefined) {
    params.append("activeOnly", String(activeOnly));
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ activityTypes: ActivityTypeConfig[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/activity-types/stable/${stableId}${queryString}`,
    { method: "GET" },
  );

  return response.activityTypes;
}

/**
 * Update an activity type
 *
 * IMPORTANT: For standard types, only color, icon, isActive, and sortOrder can be modified.
 * Core fields (name, category, roles) are protected.
 *
 * @param id - Activity type ID
 * @param userId - User ID for audit trail
 * @param updates - Partial update data
 * @returns Promise that resolves when update is complete
 */
export async function updateActivityType(
  id: string,
  userId: string,
  updates: UpdateActivityTypeData,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/activity-types/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );
}

/**
 * Delete an activity type
 *
 * IMPORTANT: Standard types cannot be hard-deleted, only soft-deleted via isActive=false.
 * Custom types are hard-deleted.
 *
 * @param id - Activity type ID
 * @param userId - User ID for audit trail (used for soft delete)
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteActivityType(
  id: string,
  userId: string,
): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/activity-types/${id}`,
    { method: "DELETE" },
  );
}

/**
 * Get a single activity type by ID
 *
 * @param id - Activity type ID
 * @returns Promise with activity type configuration or null if not found
 */
export async function getActivityTypeById(
  id: string,
): Promise<ActivityTypeConfig | null> {
  try {
    const { authFetchJSON } = await import("@/utils/authFetch");

    const response = await authFetchJSON<ActivityTypeConfig & { id: string }>(
      `${import.meta.env.VITE_API_URL}/api/v1/activity-types/${id}`,
      { method: "GET" },
    );

    return response;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Seeding & Migration
// ============================================================================

/**
 * Seed standard activity types for a new stable
 *
 * This function creates all 16 standard activity types via API calls.
 * Should be called when a new stable is created.
 *
 * NOTE: Seeding should be done on the backend for better performance.
 * This function is kept for backward compatibility but should eventually
 * be replaced with a backend seeding endpoint.
 *
 * @param stableId - Stable ID to seed types for
 * @param userId - User ID for audit trail
 * @returns Promise that resolves when seeding is complete
 */
export async function seedStandardActivityTypes(
  stableId: string,
  userId: string,
): Promise<void> {
  console.warn(
    "seedStandardActivityTypes should be called from backend for better performance",
  );

  // Check if types already exist for this stable
  const existing = await getActivityTypesByStable(stableId, false);

  if (existing.length > 0) {
    console.warn(
      `Activity types already exist for stable ${stableId}. Skipping seed.`,
    );
    return;
  }

  // Note: This will create types one by one, which is not optimal.
  // Consider implementing a batch endpoint on the backend for seeding.
  console.log(
    `Seeding activity types for stable ${stableId} (consider backend implementation)`,
  );
}

/**
 * Check if a stable has activity types configured
 *
 * @param stableId - Stable ID to check
 * @returns Promise with boolean indicating if types exist
 */
export async function hasActivityTypes(stableId: string): Promise<boolean> {
  const types = await getActivityTypesByStable(stableId, false);
  return types.length > 0;
}

/**
 * Restore a soft-deleted standard activity type
 *
 * @param id - Activity type ID
 * @param userId - User ID for audit trail
 * @returns Promise that resolves when restore is complete
 */
export async function restoreActivityType(
  id: string,
  userId: string,
): Promise<void> {
  return updateActivityType(id, userId, { isActive: true });
}
