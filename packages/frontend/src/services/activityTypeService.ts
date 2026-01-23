import type {
  ActivityTypeConfig,
  CreateActivityTypeData,
  UpdateActivityTypeData,
} from "@/types/activity";
import { apiClient } from "@/lib/apiClient";

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
  const response = await apiClient.post<{ id: string }>("/activity-types", {
    ...data,
    stableId,
  });

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
  const response = await apiClient.get<{ activityTypes: ActivityTypeConfig[] }>(
    `/activity-types/stable/${stableId}`,
    { activeOnly },
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
  await apiClient.put(`/activity-types/${id}`, updates);
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
  await apiClient.delete(`/activity-types/${id}`);
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
    return await apiClient.get<ActivityTypeConfig & { id: string }>(
      `/activity-types/${id}`,
    );
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
 * Calls the backend seed endpoint which creates all 16 standard activity types
 * in a single batch operation.
 *
 * @param stableId - Stable ID to seed types for
 * @param _userId - User ID for audit trail (passed via auth token)
 * @returns Promise with the number of types created
 */
export async function seedStandardActivityTypes(
  stableId: string,
  _userId: string,
): Promise<{ count: number }> {
  const response = await apiClient.post<{
    success: boolean;
    count: number;
    message: string;
  }>(`/activity-types/seed/${stableId}`, {});

  return { count: response.count };
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
