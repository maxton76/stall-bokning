import type { HorseGroup } from '@/types/roles'
import { authFetchJSON } from '@/utils/authFetch'

// ============================================================================
// API-First Service - All writes go through the API
// ============================================================================

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/horse-groups`

/**
 * Create a new horse group via API
 * @param organizationId - ID of the organization this group belongs to
 * @param _userId - ID of the user creating the group (passed to API via auth token)
 * @param groupData - Group data (excluding auto-generated fields)
 * @returns Promise with the created group ID
 */
export async function createHorseGroup(
  organizationId: string,
  _userId: string,
  groupData: Omit<HorseGroup, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>
): Promise<string> {
  const response = await authFetchJSON<HorseGroup & { id: string }>(API_BASE, {
    method: 'POST',
    body: JSON.stringify({
      organizationId,
      ...groupData,
    }),
  })
  return response.id
}

/**
 * Get a single horse group by ID via API
 * @param groupId - Group ID
 * @returns Promise with group data or null if not found
 */
export async function getHorseGroup(groupId: string): Promise<HorseGroup | null> {
  try {
    return await authFetchJSON<HorseGroup>(`${API_BASE}/${groupId}`)
  } catch (error) {
    // Return null if not found (404)
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * Update an existing horse group via API
 * @param groupId - Group ID
 * @param _userId - ID of user making the update (passed to API via auth token)
 * @param updates - Partial group data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateHorseGroup(
  groupId: string,
  _userId: string,
  updates: Partial<Omit<HorseGroup, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  await authFetchJSON(`${API_BASE}/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

/**
 * Delete a horse group via API
 * @param groupId - Group ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteHorseGroup(groupId: string): Promise<void> {
  await authFetchJSON(`${API_BASE}/${groupId}`, {
    method: 'DELETE',
  })
}

/**
 * Get all horse groups for an organization via API
 * @param organizationId - Organization ID
 * @returns Promise with array of horse groups
 */
export async function getOrganizationHorseGroups(organizationId: string): Promise<HorseGroup[]> {
  const response = await authFetchJSON<{ horseGroups: HorseGroup[] }>(
    `${API_BASE}/organization/${organizationId}`
  )
  return response.horseGroups
}

/**
 * @deprecated Use getOrganizationHorseGroups instead
 * Get all horse groups for a stable (legacy - now organization-wide)
 * @param _stableId - Stable ID (ignored, use organizationId instead)
 * @returns Promise with array of horse groups
 */
export async function getStableHorseGroups(_stableId: string): Promise<HorseGroup[]> {
  console.warn('getStableHorseGroups is deprecated. Use getOrganizationHorseGroups instead.')
  // For backward compatibility during migration
  return []
}
