import { createCrudService } from './firestoreCrud'
import { where } from 'firebase/firestore'
import type { Facility, CreateFacilityData, UpdateFacilityData } from '@/types/facility'

// Create CRUD service with stable parent
const facilityCrud = createCrudService<Facility>({
  collectionName: 'facilities',
  timestampsEnabled: true,
  parentField: { field: 'stableId', required: true }
})

/**
 * Create a new facility
 */
export async function createFacility(
  stableId: string,
  facilityData: CreateFacilityData,
  userId: string
): Promise<string> {
  const dataWithStableId = {
    ...facilityData,
    stableId
  }
  return facilityCrud.create(userId, dataWithStableId, stableId)
}

/**
 * Get facility by ID
 */
export async function getFacility(facilityId: string): Promise<Facility | null> {
  return facilityCrud.getById(facilityId)
}

/**
 * Get all facilities for a stable
 */
export async function getFacilitiesByStable(stableId: string): Promise<Facility[]> {
  if (!facilityCrud.getByParent) {
    throw new Error('getByParent not available')
  }
  return facilityCrud.getByParent(stableId)
}

/**
 * Get active facilities for a stable
 */
export async function getActiveFacilities(stableId: string): Promise<Facility[]> {
  return facilityCrud.query([
    where('stableId', '==', stableId),
    where('status', '==', 'active')
  ])
}

/**
 * Update facility
 */
export async function updateFacility(
  facilityId: string,
  updates: UpdateFacilityData,
  userId: string
): Promise<void> {
  return facilityCrud.update(facilityId, userId, updates)
}

/**
 * Delete facility (soft delete by setting status)
 */
export async function deleteFacility(
  facilityId: string,
  userId: string
): Promise<void> {
  return facilityCrud.update(facilityId, userId, { status: 'inactive' })
}

/**
 * Hard delete facility
 */
export async function hardDeleteFacility(facilityId: string): Promise<void> {
  return facilityCrud.delete(facilityId)
}
