import { updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ============================================================================
// Types
// ============================================================================

export interface AssignmentOptions {
  /**
   * Optional name field to cache alongside the assignment
   * Example: When assigning to group, also store groupName
   */
  nameField?: string
  nameValue?: string

  /**
   * Additional fields to update during assignment
   */
  additionalFields?: Record<string, unknown>
}

// ============================================================================
// Core Assignment Utilities
// ============================================================================

/**
 * Assign a value to an array field
 * @param collectionName - Firestore collection name
 * @param documentId - Document ID
 * @param fieldName - Array field name
 * @param value - Value to add to array
 * @param options - Optional name caching and additional fields
 * @returns Promise that resolves when assignment is complete
 *
 * @example
 * ```typescript
 * // Assign horse to stable (with array)
 * await assignToArray('horses', horseId, 'assignedStableIds', stableId)
 *
 * // Assign with cached name
 * await assignToArray('horses', horseId, 'groupId', groupId, {
 *   nameField: 'groupName',
 *   nameValue: 'Training Group A'
 * })
 * ```
 */
export async function assignToArray(
  collectionName: string,
  documentId: string,
  fieldName: string,
  value: string,
  options?: AssignmentOptions
): Promise<void> {
  const docRef = doc(db, collectionName, documentId)

  const updates: Record<string, unknown> = {
    [fieldName]: arrayUnion(value)
  }

  // Add optional name field
  if (options?.nameField && options?.nameValue) {
    updates[options.nameField] = options.nameValue
  }

  // Add any additional fields
  if (options?.additionalFields) {
    Object.assign(updates, options.additionalFields)
  }

  await updateDoc(docRef, updates)
}

/**
 * Unassign a value from an array field
 * @param collectionName - Firestore collection name
 * @param documentId - Document ID
 * @param fieldName - Array field name
 * @param value - Value to remove from array
 * @param options - Optional name field to clear and additional fields
 * @returns Promise that resolves when unassignment is complete
 *
 * @example
 * ```typescript
 * // Unassign horse from stable
 * await unassignFromArray('horses', horseId, 'assignedStableIds', stableId)
 *
 * // Unassign with name field clearing
 * await unassignFromArray('horses', horseId, 'groupId', groupId, {
 *   nameField: 'groupName',
 *   nameValue: null
 * })
 * ```
 */
export async function unassignFromArray(
  collectionName: string,
  documentId: string,
  fieldName: string,
  value: string,
  options?: AssignmentOptions
): Promise<void> {
  const docRef = doc(db, collectionName, documentId)

  const updates: Record<string, unknown> = {
    [fieldName]: arrayRemove(value)
  }

  // Clear optional name field
  if (options?.nameField) {
    updates[options.nameField] = options?.nameValue ?? null
  }

  // Add any additional fields
  if (options?.additionalFields) {
    Object.assign(updates, options.additionalFields)
  }

  await updateDoc(docRef, updates)
}

/**
 * Assign a single value to a field (not array)
 * @param collectionName - Firestore collection name
 * @param documentId - Document ID
 * @param fieldName - Field name
 * @param value - Value to assign
 * @param options - Optional name caching and additional fields
 * @returns Promise that resolves when assignment is complete
 *
 * @example
 * ```typescript
 * // Assign horse to group
 * await assignToField('horses', horseId, 'horseGroupId', groupId, {
 *   nameField: 'horseGroupName',
 *   nameValue: 'Training Group A'
 * })
 * ```
 */
export async function assignToField(
  collectionName: string,
  documentId: string,
  fieldName: string,
  value: string | null,
  options?: AssignmentOptions
): Promise<void> {
  const docRef = doc(db, collectionName, documentId)

  const updates: Record<string, unknown> = {
    [fieldName]: value
  }

  // Add optional name field
  if (options?.nameField) {
    updates[options.nameField] = options?.nameValue ?? null
  }

  // Add any additional fields
  if (options?.additionalFields) {
    Object.assign(updates, options.additionalFields)
  }

  await updateDoc(docRef, updates)
}

/**
 * Unassign a single value from a field (set to null)
 * @param collectionName - Firestore collection name
 * @param documentId - Document ID
 * @param fieldName - Field name
 * @param options - Optional name field to clear and additional fields
 * @returns Promise that resolves when unassignment is complete
 *
 * @example
 * ```typescript
 * // Unassign horse from group
 * await unassignFromField('horses', horseId, 'horseGroupId', {
 *   nameField: 'horseGroupName'
 * })
 * ```
 */
export async function unassignFromField(
  collectionName: string,
  documentId: string,
  fieldName: string,
  options?: AssignmentOptions
): Promise<void> {
  return assignToField(collectionName, documentId, fieldName, null, options)
}

// ============================================================================
// Specialized Assignment Helpers
// ============================================================================

/**
 * Pre-configured assignment helpers for common use cases
 */
export const assignments = {
  /**
   * Horse-to-Stable assignments
   */
  horseToStable: {
    /**
     * Assign a horse to a stable (adds to assignedStableIds array)
     */
    assign: (horseId: string, stableId: string, stableName?: string) =>
      assignToArray('horses', horseId, 'assignedStableIds', stableId, {
        nameField: stableName ? 'currentStableName' : undefined,
        nameValue: stableName
      }),

    /**
     * Unassign a horse from a stable (removes from assignedStableIds array)
     */
    unassign: (horseId: string, stableId: string) =>
      unassignFromArray('horses', horseId, 'assignedStableIds', stableId)
  },

  /**
   * Horse-to-Group assignments
   */
  horseToGroup: {
    /**
     * Assign a horse to a group
     */
    assign: (horseId: string, groupId: string, groupName?: string) =>
      assignToField('horses', horseId, 'horseGroupId', groupId, {
        nameField: groupName ? 'horseGroupName' : undefined,
        nameValue: groupName
      }),

    /**
     * Unassign a horse from its group
     */
    unassign: (horseId: string) =>
      unassignFromField('horses', horseId, 'horseGroupId', {
        nameField: 'horseGroupName'
      })
  },

  /**
   * Horse-to-Vaccination-Rule assignments
   */
  horseToVaccinationRule: {
    /**
     * Assign a vaccination rule to a horse
     */
    assign: (horseId: string, ruleId: string, ruleName?: string) =>
      assignToField('horses', horseId, 'vaccinationRuleId', ruleId, {
        nameField: ruleName ? 'vaccinationRuleName' : undefined,
        nameValue: ruleName
      }),

    /**
     * Unassign a vaccination rule from a horse
     */
    unassign: (horseId: string) =>
      unassignFromField('horses', horseId, 'vaccinationRuleId', {
        nameField: 'vaccinationRuleName'
      })
  },

  /**
   * User-to-Organization assignments
   */
  userToOrganization: {
    /**
     * Assign a user to an organization (adds to organizationIds array)
     */
    assign: (userId: string, organizationId: string) =>
      assignToArray('users', userId, 'organizationIds', organizationId),

    /**
     * Unassign a user from an organization (removes from organizationIds array)
     */
    unassign: (userId: string, organizationId: string) =>
      unassignFromArray('users', userId, 'organizationIds', organizationId)
  },

  /**
   * Member-to-Stable assignments
   */
  memberToStable: {
    /**
     * Assign a member to a stable (adds to stableIds array)
     */
    assign: (memberId: string, stableId: string) =>
      assignToArray('organizationMembers', memberId, 'assignedStableIds', stableId),

    /**
     * Unassign a member from a stable (removes from stableIds array)
     */
    unassign: (memberId: string, stableId: string) =>
      unassignFromArray('organizationMembers', memberId, 'assignedStableIds', stableId)
  }
}
