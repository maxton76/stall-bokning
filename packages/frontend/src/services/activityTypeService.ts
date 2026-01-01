import { createCrudService } from './firestoreCrud'
import { collection, query, where, orderBy as firestoreOrderBy, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  ActivityTypeConfig,
  CreateActivityTypeData,
  UpdateActivityTypeData
} from '@/types/activity'
import { getStandardTypesForSeeding } from '@/constants/standardActivityTypes'
import { mapDocsToObjects } from '@/utils/firestoreHelpers'

// ============================================================================
// CRUD Service
// ============================================================================

/**
 * Base CRUD service for activity types using factory pattern
 */
const activityTypeCrud = createCrudService<ActivityTypeConfig>({
  collectionName: 'activityTypes',
  timestampsEnabled: true,
  parentField: { field: 'stableId', required: true }
})

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
  data: CreateActivityTypeData
): Promise<string> {
  // Validate that custom types are not marked as standard
  if (data.isStandard) {
    throw new Error('Cannot create custom activity types with isStandard=true')
  }

  return activityTypeCrud.create(userId, data, stableId)
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
  activeOnly = true
): Promise<ActivityTypeConfig[]> {
  const constraints = [
    where('stableId', '==', stableId)
  ]

  if (activeOnly) {
    constraints.push(where('isActive', '==', true))
  }

  // Order by sortOrder for consistent display
  constraints.push(firestoreOrderBy('sortOrder', 'asc'))

  const q = query(
    collection(db, 'activityTypes'),
    ...constraints
  )

  const snapshot = await activityTypeCrud.query(constraints)
  return snapshot
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
  updates: UpdateActivityTypeData
): Promise<void> {
  // Get existing document to check if it's a standard type
  const existing = await activityTypeCrud.getById(id)

  if (!existing) {
    throw new Error(`Activity type ${id} not found`)
  }

  // For standard types, only allow specific field updates
  if (existing.isStandard) {
    const allowedFields = ['color', 'icon', 'isActive', 'sortOrder']
    const attemptedFields = Object.keys(updates)
    const invalidFields = attemptedFields.filter(field => !allowedFields.includes(field))

    if (invalidFields.length > 0) {
      throw new Error(
        `Cannot modify fields [${invalidFields.join(', ')}] on standard activity type. ` +
        `Only [${allowedFields.join(', ')}] can be modified.`
      )
    }
  }

  return activityTypeCrud.update(id, userId, updates)
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
  userId: string
): Promise<void> {
  // Get existing document to check if it's a standard type
  const existing = await activityTypeCrud.getById(id)

  if (!existing) {
    throw new Error(`Activity type ${id} not found`)
  }

  if (existing.isStandard) {
    // Soft delete for standard types
    return activityTypeCrud.update(id, userId, { isActive: false })
  } else {
    // Hard delete for custom types
    return activityTypeCrud.delete(id)
  }
}

/**
 * Get a single activity type by ID
 *
 * @param id - Activity type ID
 * @returns Promise with activity type configuration or null if not found
 */
export async function getActivityTypeById(id: string): Promise<ActivityTypeConfig | null> {
  return activityTypeCrud.getById(id)
}

// ============================================================================
// Seeding & Migration
// ============================================================================

/**
 * Seed standard activity types for a new stable
 *
 * This function creates all 16 standard activity types in a batch operation.
 * Should be called when a new stable is created.
 *
 * @param stableId - Stable ID to seed types for
 * @param userId - User ID for audit trail
 * @returns Promise that resolves when seeding is complete
 */
export async function seedStandardActivityTypes(
  stableId: string,
  userId: string
): Promise<void> {
  // Check if types already exist for this stable
  const existing = await getActivityTypesByStable(stableId, false)

  if (existing.length > 0) {
    console.warn(`Activity types already exist for stable ${stableId}. Skipping seed.`)
    return
  }

  // Use batch write for atomic operation
  const batch = writeBatch(db)
  const standardTypes = getStandardTypesForSeeding()
  const collectionRef = collection(db, 'activityTypes')

  standardTypes.forEach((typeData) => {
    const docRef = doc(collectionRef)

    batch.set(docRef, {
      ...typeData,
      stableId,
      createdBy: userId,
      lastModifiedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  })

  await batch.commit()
  console.log(`Seeded ${standardTypes.length} standard activity types for stable ${stableId}`)
}

/**
 * Check if a stable has activity types configured
 *
 * @param stableId - Stable ID to check
 * @returns Promise with boolean indicating if types exist
 */
export async function hasActivityTypes(stableId: string): Promise<boolean> {
  const types = await getActivityTypesByStable(stableId, false)
  return types.length > 0
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
  userId: string
): Promise<void> {
  const existing = await activityTypeCrud.getById(id)

  if (!existing) {
    throw new Error(`Activity type ${id} not found`)
  }

  if (!existing.isStandard) {
    throw new Error('Only standard activity types can be restored')
  }

  return activityTypeCrud.update(id, userId, { isActive: true })
}
