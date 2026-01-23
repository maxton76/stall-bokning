import type { HorseGroup } from "@/types/roles";
import { apiClient } from "@/lib/apiClient";
import { logger } from "@/utils/logger";

// ============================================================================
// API-First Service - All writes go through the API
// ============================================================================

/**
 * Create a new horse group via API
 */
export async function createHorseGroup(
  organizationId: string,
  _userId: string,
  groupData: Omit<
    HorseGroup,
    | "id"
    | "organizationId"
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "lastModifiedBy"
  >,
): Promise<string> {
  const response = await apiClient.post<HorseGroup & { id: string }>(
    "/horse-groups",
    { organizationId, ...groupData },
  );
  return response.id;
}

/**
 * Get a single horse group by ID via API
 */
export async function getHorseGroup(
  groupId: string,
): Promise<HorseGroup | null> {
  try {
    return await apiClient.get<HorseGroup>(`/horse-groups/${groupId}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Update an existing horse group via API
 */
export async function updateHorseGroup(
  groupId: string,
  _userId: string,
  updates: Partial<
    Omit<HorseGroup, "id" | "organizationId" | "createdAt" | "createdBy">
  >,
): Promise<void> {
  await apiClient.patch(`/horse-groups/${groupId}`, updates);
}

/**
 * Delete a horse group via API
 */
export async function deleteHorseGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/horse-groups/${groupId}`);
}

/**
 * Get all horse groups for an organization via API
 */
export async function getOrganizationHorseGroups(
  organizationId: string,
): Promise<HorseGroup[]> {
  const response = await apiClient.get<{ horseGroups: HorseGroup[] }>(
    `/horse-groups/organization/${organizationId}`,
  );
  return response.horseGroups;
}

/**
 * @deprecated Use getOrganizationHorseGroups instead
 * Get all horse groups for a stable (legacy - now organization-wide)
 * @param _stableId - Stable ID (ignored, use organizationId instead)
 * @returns Promise with array of horse groups
 */
export async function getStableHorseGroups(
  _stableId: string,
): Promise<HorseGroup[]> {
  logger.warn(
    "getStableHorseGroups is deprecated. Use getOrganizationHorseGroups instead.",
  );
  // For backward compatibility during migration
  return [];
}
