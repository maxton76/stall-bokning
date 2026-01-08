import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc as firestoreDeleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy as firestoreOrderBy,
  QueryConstraint,
  CollectionReference
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  mapDocsToObjects,
  removeUndefined,
  createTimestamps,
  updateTimestamps
} from '@/utils/firestoreHelpers'

// ============================================================================
// Types
// ============================================================================

export interface CrudFactoryOptions<T> {
  /**
   * Firestore collection name (e.g., 'horses', 'horseGroups')
   */
  collectionName: string

  /**
   * Field name for the document ID in the returned object
   * @default 'id'
   */
  idField?: string

  /**
   * Whether to automatically add createdAt/updatedAt timestamps
   * @default true
   */
  timestampsEnabled?: boolean

  /**
   * Optional parent field configuration for hierarchical data
   * Example: { field: 'stableId', required: true }
   */
  parentField?: {
    field: string
    required: boolean
  }

  /**
   * Optional data sanitization function to apply before create/update
   */
  sanitizeFn?: (data: Partial<T>) => Partial<T>
}

export interface CrudService<T extends { id?: string }> {
  /**
   * Create a new document
   * @param userId - User ID for audit trail
   * @param data - Document data (without id and timestamp fields)
   * @param parentId - Optional parent ID if configured with parentField
   * @returns Promise with created document ID
   */
  create(
    userId: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>,
    parentId?: string
  ): Promise<string>

  /**
   * Get a single document by ID
   * @param id - Document ID
   * @returns Promise with document data or null if not found
   */
  getById(id: string): Promise<T | null>

  /**
   * Get all documents matching a query
   * @param constraints - Firestore query constraints
   * @returns Promise with array of documents
   */
  query(constraints: QueryConstraint[]): Promise<T[]>

  /**
   * Get documents by parent ID (if parentField is configured)
   * @param parentId - Parent document ID
   * @param additionalConstraints - Optional additional query constraints
   * @returns Promise with array of documents
   */
  getByParent?(
    parentId: string,
    additionalConstraints?: QueryConstraint[]
  ): Promise<T[]>

  /**
   * Update an existing document
   * @param id - Document ID
   * @param userId - User ID for audit trail
   * @param updates - Partial document data to update
   * @returns Promise that resolves when update is complete
   */
  update(
    id: string,
    userId: string,
    updates: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<void>

  /**
   * Delete a document
   * @param id - Document ID
   * @returns Promise that resolves when deletion is complete
   */
  delete(id: string): Promise<void>

  /**
   * Get the Firestore collection reference
   * @returns Firestore collection reference
   */
  getCollectionRef(): CollectionReference
}

// ============================================================================
// CRUD Factory
// ============================================================================

/**
 * Create a standardized CRUD service for a Firestore collection
 *
 * @template T - Document type (must have optional 'id' field)
 * @param options - Configuration options for the CRUD service
 * @returns CRUD service with standardized operations
 *
 * @example
 * ```typescript
 * interface HorseGroup {
 *   id?: string
 *   stableId: string
 *   name: string
 *   description?: string
 *   color?: string
 *   createdAt?: Timestamp
 *   updatedAt?: Timestamp
 *   createdBy?: string
 *   lastModifiedBy?: string
 * }
 *
 * const horseGroupCrud = createCrudService<HorseGroup>({
 *   collectionName: 'horseGroups',
 *   timestampsEnabled: true,
 *   parentField: { field: 'stableId', required: true }
 * })
 *
 * // Create a group
 * const groupId = await horseGroupCrud.create(userId, groupData, stableId)
 *
 * // Get all groups for a stable
 * const groups = await horseGroupCrud.getByParent(stableId)
 *
 * // Update a group
 * await horseGroupCrud.update(groupId, userId, { name: 'New Name' })
 *
 * // Delete a group
 * await horseGroupCrud.delete(groupId)
 * ```
 */
export function createCrudService<T extends { id?: string }>(
  options: CrudFactoryOptions<T>
): CrudService<T> {
  const {
    collectionName,
    idField = 'id',
    timestampsEnabled = true,
    parentField,
    sanitizeFn
  } = options

  const collectionRef = collection(db, collectionName) as any

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  /**
   * Create a new document
   */
  const create = async (
    userId: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>,
    parentId?: string
  ): Promise<string> => {
    // Validate parent ID if required
    if (parentField?.required && !parentId) {
      throw new Error(`${parentField.field} is required for creating ${collectionName}`)
    }

    // Apply sanitization if provided
    let processedData = sanitizeFn ? sanitizeFn(data as Partial<T>) : data

    // Add parent ID if configured
    if (parentField && parentId) {
      processedData = {
        ...processedData,
        [parentField.field]: parentId
      } as typeof processedData
    }

    // Build final data object
    const dataToSave = removeUndefined({
      ...processedData,
      ...(timestampsEnabled ? createTimestamps(userId) : {})
    })

    const docRef = await addDoc(collectionRef, dataToSave as any)
    return docRef.id
  }

  /**
   * Get a single document by ID
   */
  const getById = async (id: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) return null

    return {
      [idField]: docSnap.id,
      ...docSnap.data()
    } as T
  }

  /**
   * Execute a query with constraints
   */
  const executeQuery = async (constraints: QueryConstraint[]): Promise<T[]> => {
    const q = query(collectionRef as any, ...constraints)
    const snapshot = await getDocs(q)
    return mapDocsToObjects<T>(snapshot as any)
  }

  /**
   * Get documents by parent ID
   */
  const getByParent = parentField
    ? async (
        parentId: string,
        additionalConstraints: QueryConstraint[] = []
      ): Promise<T[]> => {
        const constraints = [
          where(parentField.field, '==', parentId),
          ...additionalConstraints
        ]
        return executeQuery(constraints)
      }
    : undefined

  /**
   * Update an existing document
   */
  const update = async (
    id: string,
    userId: string,
    updates: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<void> => {
    const docRef = doc(db, collectionName, id)

    // Apply sanitization if provided
    const processedUpdates = sanitizeFn ? sanitizeFn(updates as Partial<T>) : updates

    const dataToUpdate = removeUndefined({
      ...processedUpdates,
      ...(timestampsEnabled ? updateTimestamps(userId) : {})
    }) as Record<string, unknown>

    await updateDoc(docRef, dataToUpdate)
  }

  /**
   * Delete a document
   */
  const deleteDocument = async (id: string): Promise<void> => {
    await firestoreDeleteDoc(doc(db, collectionName, id))
  }

  /**
   * Get the collection reference for custom operations
   */
  const getCollectionRef = (): CollectionReference => {
    return collectionRef
  }

  // ============================================================================
  // Return Service
  // ============================================================================

  const service: CrudService<T> = {
    create,
    getById,
    query: executeQuery,
    update,
    delete: deleteDocument,
    getCollectionRef
  }

  // Add getByParent if parent field is configured
  if (getByParent) {
    service.getByParent = getByParent
  }

  return service
}

// ============================================================================
// Query Builder Helpers
// ============================================================================

/**
 * Common query constraint builders
 */
export const queryHelpers = {
  /**
   * Order by createdAt descending (newest first)
   */
  orderByNewest: () => firestoreOrderBy('createdAt', 'desc'),

  /**
   * Order by createdAt ascending (oldest first)
   */
  orderByOldest: () => firestoreOrderBy('createdAt', 'asc'),

  /**
   * Filter by status field
   */
  whereStatus: (status: string) => where('status', '==', status),

  /**
   * Filter by active status
   */
  whereActive: () => where('status', '==', 'active'),

  /**
   * Filter by owner/user ID
   */
  whereUser: (userId: string, fieldName = 'ownerId') =>
    where(fieldName, '==', userId),

  /**
   * Filter by parent ID
   */
  whereParent: (parentId: string, fieldName: string) =>
    where(fieldName, '==', parentId)
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch update multiple documents in a collection
 *
 * Consolidates duplicate batch update logic across services
 *
 * @template T - Document type
 * @param collectionName - Firestore collection name
 * @param updates - Array of {id, data} objects
 * @param userId - User ID for audit trail
 * @returns Promise that resolves when all updates are complete
 *
 * @example
 * ```tsx
 * await batchUpdateDocuments('horses', [
 *   { id: 'horse1', data: { status: 'inactive' } },
 *   { id: 'horse2', data: { status: 'inactive' } }
 * ], userId)
 * ```
 */
export async function batchUpdateDocuments<T>(
  collectionName: string,
  updates: Array<{ id: string; data: Partial<T> }>,
  userId: string
): Promise<void> {
  const updatePromises = updates.map(({ id, data }) => {
    const docRef = doc(db, collectionName, id)
    const dataToUpdate = removeUndefined({
      ...data,
      ...updateTimestamps(userId)
    }) as Record<string, unknown>
    return updateDoc(docRef, dataToUpdate)
  })

  await Promise.all(updatePromises)
}

/**
 * Batch unassign horses from their current stables
 *
 * Consolidates duplicate logic from horseService.ts:
 * - unassignHorsesFromStable
 * - unassignAllHorsesFromStable
 * - unassignHorseFromStable (single)
 *
 * @param horseIds - Array of horse IDs to unassign
 * @param userId - User ID for audit trail
 * @returns Promise that resolves when all horses are unassigned
 *
 * @example
 * ```tsx
 * // Unassign multiple horses
 * await batchUnassignHorses(['horse1', 'horse2'], userId)
 *
 * // Unassign single horse
 * await batchUnassignHorses([horseId], userId)
 * ```
 */
export async function batchUnassignHorses(
  horseIds: string[],
  userId: string
): Promise<void> {
  const updates = horseIds.map((id) => ({
    id,
    data: {
      currentStableId: null,
      currentStableName: null,
      horseGroupId: null,
      vaccinationRuleId: null,
    }
  }))

  await batchUpdateDocuments('horses', updates, userId)
}
