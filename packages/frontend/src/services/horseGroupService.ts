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
    field: 'stableId',
    required: true
  }
})

// ============================================================================
// Exported Operations
// ============================================================================

/**
 * Create a new horse group
 * @param stableId - ID of the stable this group belongs to
 * @param userId - ID of the user creating the group
 * @param groupData - Group data (excluding auto-generated fields)
 * @returns Promise with the created group ID
 */
export async function createHorseGroup(
  stableId: string,
  userId: string,
  groupData: Omit<HorseGroup, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>
): Promise<string> {
  return horseGroupCrud.create(userId, groupData as any, stableId)
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
  updates: Partial<Omit<HorseGroup, 'id' | 'stableId' | 'createdAt' | 'createdBy'>>
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
 * Get all horse groups for a stable
 * @param stableId - Stable ID
 * @returns Promise with array of horse groups
 */
export async function getStableHorseGroups(stableId: string): Promise<HorseGroup[]> {
  if (!horseGroupCrud.getByParent) {
    throw new Error('getByParent not available')
  }
  return horseGroupCrud.getByParent(stableId, [orderBy('createdAt', 'desc')])
}
