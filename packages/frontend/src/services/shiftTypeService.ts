import type { ShiftType } from "@/types/schedule";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// API-First Service - All writes go through the API
// ============================================================================

/**
 * Create a new shift type via API
 * @param stableId - ID of the stable this shift type belongs to
 * @param shiftTypeData - Shift type data (excluding auto-generated fields)
 * @param _userId - ID of the user creating the shift type (passed to API via auth token)
 * @returns Promise with the created shift type ID
 */
export async function createShiftType(
  stableId: string,
  shiftTypeData: Omit<
    ShiftType,
    | "id"
    | "stableId"
    | "createdAt"
    | "updatedAt"
    | "lastModifiedBy"
    | "createdBy"
  >,
  _userId: string,
): Promise<string> {
  const response = await apiClient.post<ShiftType & { id: string }>(
    "/shift-types",
    {
      stableId,
      ...shiftTypeData,
    },
  );
  return response.id;
}

/**
 * Get all shift types for a stable via API
 * @param stableId - Stable ID
 * @returns Promise with array of shift types
 */
export async function getShiftTypesByStable(
  stableId: string,
): Promise<ShiftType[]> {
  const response = await apiClient.get<{ shiftTypes: ShiftType[] }>(
    `/shift-types/stable/${stableId}`,
  );
  return response.shiftTypes;
}

/**
 * Get a single shift type by ID via API
 * @param shiftTypeId - Shift type ID
 * @returns Promise with shift type data or null if not found
 */
export async function getShiftType(
  shiftTypeId: string,
): Promise<ShiftType | null> {
  try {
    return await apiClient.get<ShiftType>(`/shift-types/${shiftTypeId}`);
  } catch (error) {
    // Return null if not found (404)
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Update an existing shift type via API
 * @param shiftTypeId - Shift type ID
 * @param updates - Partial shift type data to update
 * @param _userId - ID of user making the update (passed to API via auth token)
 * @returns Promise that resolves when update is complete
 */
export async function updateShiftType(
  shiftTypeId: string,
  updates: Partial<
    Omit<
      ShiftType,
      "id" | "stableId" | "createdAt" | "lastModifiedBy" | "createdBy"
    >
  >,
  _userId: string,
): Promise<void> {
  await apiClient.patch(`/shift-types/${shiftTypeId}`, updates);
}

/**
 * Delete a shift type via API
 * @param shiftTypeId - Shift type ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteShiftType(shiftTypeId: string): Promise<void> {
  await apiClient.delete(`/shift-types/${shiftTypeId}`);
}
