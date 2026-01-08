import { orderBy } from 'firebase/firestore'
import type { HorseGroup } from '@/types/roles'
import { createCrudService } from './firestoreCrud'

// ============================================================================
// CRUD Service
// ============================================================================

/**
 * Horse Group CRUD service using the standardized factory
 */
const horseGroupCrud = createCrudService<HorseGroup>({
  collectionName: 'horseGroups',
  timestampsEnabled: true,
  parentField: {
    field: 'organizationId',
    required: true
  }
})

// ============================================================================
// Exported Operations
// ============================================================================

/**
 * Create a new horse group
 * @param organizationId - ID of the organization this group belongs to
 * @param userId - ID of the user creating the group
 * @param groupData - Group data (excluding auto-generated fields)
 * @returns Promise with the created group ID
 */
export async function createHorseGroup(
  organizationId: string,
  userId: string,
  groupData: Omit<HorseGroup, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>
): Promise<string> {
  return horseGroupCrud.create(userId, groupData as any, organizationId)
}

/**
 * Get a single horse group by ID
 * @param groupId - Group ID
 * @returns Promise with group data or null if not found
 */
export async function getHorseGroup(groupId: string): Promise<HorseGroup | null> {
  return horseGroupCrud.getById(groupId)
}

/**
 * Update an existing horse group
 * @param groupId - Group ID
 * @param userId - ID of user making the update
 * @param updates - Partial group data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateHorseGroup(
  groupId: string,
  userId: string,
  updates: Partial<Omit<HorseGroup, 'id' | 'organizationId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  return horseGroupCrud.update(groupId, userId, updates)
}

/**
 * Delete a horse group
 * @param groupId - Group ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteHorseGroup(groupId: string): Promise<void> {
  return horseGroupCrud.delete(groupId)
}

/**
 * Get all horse groups for an organization
 * @param organizationId - Organization ID
 * @returns Promise with array of horse groups
 */
export async function getOrganizationHorseGroups(organizationId: string): Promise<HorseGroup[]> {
  if (!horseGroupCrud.getByParent) {
    throw new Error('getByParent not available')
  }
  return horseGroupCrud.getByParent(organizationId, [orderBy('createdAt', 'desc')])
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
