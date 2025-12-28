import type { ShiftType } from '@/types/schedule'
import { createCrudService } from './firestoreCrud'

// ============================================================================
// CRUD Service
// ============================================================================

/**
 * Shift Type CRUD service using the standardized factory
 */
const shiftTypeCrud = createCrudService<ShiftType>({
  collectionName: 'shiftTypes',
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
 * Create a new shift type
 * @param stableId - ID of the stable this shift type belongs to
 * @param shiftTypeData - Shift type data (excluding auto-generated fields)
 * @param userId - ID of the user creating the shift type
 * @returns Promise with the created shift type ID
 */
export async function createShiftType(
  stableId: string,
  shiftTypeData: Omit<ShiftType, 'id' | 'stableId' | 'createdAt' | 'updatedAt' | 'lastModifiedBy' | 'createdBy'>,
  userId: string
): Promise<string> {
  return shiftTypeCrud.create(userId, shiftTypeData as any, stableId)
}

/**
 * Get all shift types for a stable
 * @param stableId - Stable ID
 * @returns Promise with array of shift types
 */
export async function getShiftTypesByStable(stableId: string): Promise<ShiftType[]> {
  if (!shiftTypeCrud.getByParent) {
    throw new Error('getByParent not available')
  }
  return shiftTypeCrud.getByParent(stableId)
}

/**
 * Get a single shift type by ID
 * @param shiftTypeId - Shift type ID
 * @returns Promise with shift type data or null if not found
 */
export async function getShiftType(shiftTypeId: string): Promise<ShiftType | null> {
  return shiftTypeCrud.getById(shiftTypeId)
}

/**
 * Update an existing shift type
 * @param shiftTypeId - Shift type ID
 * @param updates - Partial shift type data to update
 * @param userId - ID of user making the update
 * @returns Promise that resolves when update is complete
 */
export async function updateShiftType(
  shiftTypeId: string,
  updates: Partial<Omit<ShiftType, 'id' | 'stableId' | 'createdAt' | 'lastModifiedBy' | 'createdBy'>>,
  userId: string
): Promise<void> {
  return shiftTypeCrud.update(shiftTypeId, userId, updates)
}

/**
 * Delete a shift type
 * @param shiftTypeId - Shift type ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteShiftType(shiftTypeId: string): Promise<void> {
  return shiftTypeCrud.delete(shiftTypeId)
}
