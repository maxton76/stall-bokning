import {
  collection,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
  updateDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Horse, UserHorseInventory } from '@/types/roles'
import { mapDocsToObjects } from '@/utils/firestoreHelpers'
import { createLocationHistoryEntry, closeLocationHistoryEntry } from './locationHistoryService'
import { createCrudService } from './firestoreCrud'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize horse data for external horses
 * External horses should NOT have dateOfArrival, currentStableId, or usage
 */
function sanitizeHorseData(horseData: Partial<Horse>): Partial<Horse> {
  if (horseData.isExternal) {
    return {
      ...horseData,
      dateOfArrival: undefined,
      currentStableId: undefined,
      currentStableName: undefined,
      assignedAt: undefined,
      usage: undefined
    }
  }
  return horseData
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Horse CRUD service using the standardized factory
 */
const horseCrud = createCrudService<Horse>({
  collectionName: 'horses',
  timestampsEnabled: true,
  sanitizeFn: sanitizeHorseData
})

/**
 * Create a new horse
 * @param userId - ID of the user who owns the horse
 * @param horseData - Horse data (excluding auto-generated fields)
 * @returns Promise with the created horse ID
 */
export async function createHorse(
  userId: string,
  horseData: Omit<Horse, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'lastModifiedBy'>
): Promise<string> {
  const dataWithOwner = {
    ...horseData,
    ownerId: userId,
    isExternal: horseData.isExternal ?? false
  } as Omit<Horse, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastModifiedBy'>

  return horseCrud.create(userId, dataWithOwner)
}

/**
 * Get a single horse by ID
 * @param horseId - Horse ID
 * @returns Promise with horse data or null if not found
 */
export async function getHorse(horseId: string): Promise<Horse | null> {
  return horseCrud.getById(horseId)
}

/**
 * Update an existing horse
 * @param horseId - Horse ID
 * @param userId - ID of user making the update
 * @param updates - Partial horse data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateHorse(
  horseId: string,
  userId: string,
  updates: Partial<Omit<Horse, 'id' | 'ownerId' | 'createdAt'>>
): Promise<void> {
  return horseCrud.update(horseId, userId, updates)
}

/**
 * Delete a horse
 * @param horseId - Horse ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteHorse(horseId: string): Promise<void> {
  return horseCrud.delete(horseId)
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all horses owned by a user
 * @param userId - User ID
 * @returns Promise with array of horses
 */
export async function getUserHorses(userId: string): Promise<Horse[]> {
  const q = query(
    collection(db, 'horses'),
    where('ownerId', '==', userId),
    where('status', '==', 'active')
  )
  const snapshot = await getDocs(q)
  return mapDocsToObjects<Horse>(snapshot)
}

/**
 * Get all horses assigned to a stable
 * @param stableId - Stable ID
 * @returns Promise with array of horses
 */
export async function getStableHorses(stableId: string): Promise<Horse[]> {
  const q = query(
    collection(db, 'horses'),
    where('currentStableId', '==', stableId),
    where('status', '==', 'active')
  )
  const snapshot = await getDocs(q)
  return mapDocsToObjects<Horse>(snapshot)
}

/**
 * Get a user's horses that are assigned to a specific stable
 * @param userId - User ID
 * @param stableId - Stable ID
 * @returns Promise with array of horses
 */
export async function getUserHorsesAtStable(
  userId: string,
  stableId: string
): Promise<Horse[]> {
  const q = query(
    collection(db, 'horses'),
    where('ownerId', '==', userId),
    where('currentStableId', '==', stableId),
    where('status', '==', 'active')
  )
  const snapshot = await getDocs(q)
  return mapDocsToObjects<Horse>(snapshot)
}

/**
 * Get all unassigned horses for a user
 * @param userId - User ID
 * @returns Promise with array of unassigned horses
 */
export async function getUnassignedHorses(userId: string): Promise<Horse[]> {
  const allHorses = await getUserHorses(userId)
  return allHorses.filter(horse => !horse.currentStableId)
}

// ============================================================================
// Assignment Operations
// ============================================================================

/**
 * Assign a horse to a stable
 * Uses batched writes for atomicity with location history
 * @param horseId - Horse ID
 * @param stableId - Stable ID
 * @param stableName - Stable name (for caching)
 * @param userId - ID of user making the assignment
 * @returns Promise that resolves when assignment is complete
 */
export async function assignHorseToStable(
  horseId: string,
  stableId: string,
  stableName: string,
  userId: string
): Promise<void> {
  // Get horse to retrieve name for location history
  const horse = await getHorse(horseId)
  if (!horse) throw new Error('Horse not found')

  const batch = writeBatch(db)
  const horseRef = doc(db, 'horses', horseId)

  // Update horse assignment
  batch.update(horseRef, {
    currentStableId: stableId,
    currentStableName: stableName,
    assignedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId
  })

  await batch.commit()

  // Create location history entry (after batch commit)
  await createLocationHistoryEntry(
    horseId,
    horse.name,
    stableId,
    stableName,
    userId
  )
}

/**
 * Unassign a horse from its current stable
 * Uses batched writes for atomicity with location history
 * @param horseId - Horse ID
 * @param userId - ID of user making the unassignment
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignHorseFromStable(
  horseId: string,
  userId: string
): Promise<void> {
  // Get horse to retrieve current stable for location history
  const horse = await getHorse(horseId)
  if (!horse) throw new Error('Horse not found')

  const currentStableId = horse.currentStableId

  const batch = writeBatch(db)
  const horseRef = doc(db, 'horses', horseId)

  // Update horse assignment
  batch.update(horseRef, {
    currentStableId: null,
    currentStableName: null,
    assignedAt: null,
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId
  })

  await batch.commit()

  // Close location history entry (after batch commit)
  if (currentStableId) {
    await closeLocationHistoryEntry(horseId, currentStableId, userId)
  }
}

/**
 * Transfer a horse from one stable to another
 * Uses batched writes for atomicity with location history
 * @param horseId - Horse ID
 * @param fromStableId - Current stable ID (for validation)
 * @param toStableId - New stable ID
 * @param toStableName - New stable name (for caching)
 * @param userId - ID of user making the transfer
 * @returns Promise that resolves when transfer is complete
 */
export async function transferHorse(
  horseId: string,
  fromStableId: string,
  toStableId: string,
  toStableName: string,
  userId: string
): Promise<void> {
  // Verify current assignment matches fromStableId
  const horse = await getHorse(horseId)
  if (!horse || horse.currentStableId !== fromStableId) {
    throw new Error('Horse is not assigned to the specified stable')
  }

  const batch = writeBatch(db)
  const horseRef = doc(db, 'horses', horseId)

  // Update horse assignment
  batch.update(horseRef, {
    currentStableId: toStableId,
    currentStableName: toStableName,
    assignedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId
  })

  await batch.commit()

  // Close old location history entry and create new one (after batch commit)
  await closeLocationHistoryEntry(horseId, fromStableId, userId)
  await createLocationHistoryEntry(
    horseId,
    horse.name,
    toStableId,
    toStableName,
    userId
  )
}

// ============================================================================
// Member Lifecycle
// ============================================================================

/**
 * Unassign all horses owned by a user from a specific stable
 * Called when a member leaves a stable
 * @param userId - User ID
 * @param stableId - Stable ID
 * @returns Promise with the number of horses unassigned
 */
export async function unassignMemberHorses(
  userId: string,
  stableId: string
): Promise<number> {
  const horses = await getUserHorsesAtStable(userId, stableId)

  if (horses.length === 0) return 0

  const batch = writeBatch(db)
  horses.forEach(horse => {
    const horseRef = doc(db, 'horses', horse.id)
    batch.update(horseRef, {
      currentStableId: null,
      currentStableName: null,
      assignedAt: null,
      updatedAt: Timestamp.now(),
      lastModifiedBy: userId
    })
  })

  await batch.commit()
  return horses.length
}

// ============================================================================
// Inventory
// ============================================================================

/**
 * Get a user's complete horse inventory across all stables
 * @param userId - User ID
 * @returns Promise with user's horse inventory data
 */
export async function getUserHorseInventory(
  userId: string
): Promise<UserHorseInventory> {
  const allHorses = await getUserHorses(userId)
  const assignedHorses = allHorses.filter(h => h.currentStableId)
  const unassignedHorses = allHorses.filter(h => !h.currentStableId)

  // Group assigned horses by stable
  const stableMap = new Map<string, { stableName: string; horses: Horse[] }>()

  assignedHorses.forEach(horse => {
    if (!horse.currentStableId) return

    const existing = stableMap.get(horse.currentStableId)
    if (existing) {
      existing.horses.push(horse)
    } else {
      stableMap.set(horse.currentStableId, {
        stableName: horse.currentStableName || 'Unknown Stable',
        horses: [horse]
      })
    }
  })

  const stableAssignments = Array.from(stableMap.entries()).map(([stableId, data]) => ({
    stableId,
    stableName: data.stableName,
    horseCount: data.horses.length,
    horses: data.horses
  }))

  return {
    userId,
    totalHorses: allHorses.length,
    assignedHorses: assignedHorses.length,
    unassignedHorses: unassignedHorses.length,
    stableAssignments
  }
}

// ============================================================================
// Group Assignment Operations
// ============================================================================

/**
 * Assign a horse to a group
 * @param horseId - Horse ID
 * @param groupId - Group ID
 * @param groupName - Group name (for caching)
 * @param userId - ID of user making the assignment
 * @returns Promise that resolves when assignment is complete
 */
export async function assignHorseToGroup(
  horseId: string,
  groupId: string,
  groupName: string,
  userId: string
): Promise<void> {
  const horseRef = doc(db, 'horses', horseId)
  await updateDoc(horseRef, {
    horseGroupId: groupId,
    horseGroupName: groupName,
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId
  })
}

/**
 * Unassign a horse from its current group
 * @param horseId - Horse ID
 * @param userId - ID of user making the unassignment
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignHorseFromGroup(
  horseId: string,
  userId: string
): Promise<void> {
  const horseRef = doc(db, 'horses', horseId)
  await updateDoc(horseRef, {
    horseGroupId: null,
    horseGroupName: null,
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId
  })
}

/**
 * Unassign all horses from a specific group
 * Called when a group is deleted
 * @param groupId - Group ID
 * @param userId - ID of user making the changes
 * @returns Promise with the number of horses unassigned
 */
export async function unassignHorsesFromGroup(
  groupId: string,
  userId: string
): Promise<number> {
  const q = query(
    collection(db, 'horses'),
    where('horseGroupId', '==', groupId),
    where('status', '==', 'active')
  )
  const snapshot = await getDocs(q)

  if (snapshot.empty) return 0

  const batch = writeBatch(db)
  snapshot.docs.forEach(horseDoc => {
    batch.update(horseDoc.ref, {
      horseGroupId: null,
      horseGroupName: null,
      updatedAt: Timestamp.now(),
      lastModifiedBy: userId
    })
  })

  await batch.commit()
  return snapshot.size
}

// ============================================================================
// Vaccination Rule Assignment Operations
// ============================================================================

/**
 * Assign a vaccination rule to a horse
 * @param horseId - Horse ID
 * @param ruleId - Vaccination rule ID
 * @param ruleName - Vaccination rule name (for caching)
 * @param userId - ID of user making the assignment
 * @returns Promise that resolves when assignment is complete
 */
export async function assignVaccinationRuleToHorse(
  horseId: string,
  ruleId: string,
  ruleName: string,
  userId: string
): Promise<void> {
  const horseRef = doc(db, 'horses', horseId)
  await updateDoc(horseRef, {
    vaccinationRuleId: ruleId,
    vaccinationRuleName: ruleName,
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId
  })
}

/**
 * Unassign a vaccination rule from a horse
 * @param horseId - Horse ID
 * @param userId - ID of user making the unassignment
 * @returns Promise that resolves when unassignment is complete
 */
export async function unassignVaccinationRuleFromHorse(
  horseId: string,
  userId: string
): Promise<void> {
  const horseRef = doc(db, 'horses', horseId)
  await updateDoc(horseRef, {
    vaccinationRuleId: null,
    vaccinationRuleName: null,
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId
  })
}

/**
 * Unassign all horses from a specific vaccination rule
 * Called when a vaccination rule is deleted
 * @param ruleId - Vaccination rule ID
 * @param userId - ID of user making the changes
 * @returns Promise with the number of horses unassigned
 */
export async function unassignHorsesFromVaccinationRule(
  ruleId: string,
  userId: string
): Promise<number> {
  const q = query(
    collection(db, 'horses'),
    where('vaccinationRuleId', '==', ruleId),
    where('status', '==', 'active')
  )
  const snapshot = await getDocs(q)

  if (snapshot.empty) return 0

  const batch = writeBatch(db)
  snapshot.docs.forEach(horseDoc => {
    batch.update(horseDoc.ref, {
      vaccinationRuleId: null,
      vaccinationRuleName: null,
      updatedAt: Timestamp.now(),
      lastModifiedBy: userId
    })
  })

  await batch.commit()
  return snapshot.size
}
