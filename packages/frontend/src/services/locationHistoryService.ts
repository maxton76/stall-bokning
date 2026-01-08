import {
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  collectionGroup
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { LocationHistory } from '@/types/roles'
import { mapDocsToObjects } from '@/utils/firestoreHelpers'

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new location history entry for stable assignments
 * @param horseId - Horse ID
 * @param horseName - Horse name (cached)
 * @param stableId - Stable ID
 * @param stableName - Stable name (cached)
 * @param userId - User ID creating the entry
 * @param arrivalDate - When horse arrived (defaults to now)
 * @returns Promise with the created entry ID
 */
export async function createLocationHistoryEntry(
  horseId: string,
  horseName: string,
  stableId: string,
  stableName: string,
  userId: string,
  arrivalDate?: Timestamp
): Promise<string> {
  const historyRef = collection(db, 'horses', horseId, 'locationHistory')

  const entryData = {
    horseId,
    horseName,
    locationType: 'stable' as const,
    stableId,
    stableName,
    arrivalDate: arrivalDate || Timestamp.now(),
    departureDate: null, // null = currently at this location
    createdAt: Timestamp.now(),
    createdBy: userId,
    lastModifiedBy: userId
  }

  const docRef = await addDoc(historyRef, entryData)
  return docRef.id
}

/**
 * Create a location history entry for external moves
 * @param horseId - Horse ID
 * @param horseName - Horse name (cached)
 * @param externalLocation - Location name (from contact or manual entry)
 * @param moveType - Type of external move ('temporary' | 'permanent')
 * @param departureDate - When horse departed for external location
 * @param userId - User ID creating the entry
 * @param contactId - Optional contact ID reference
 * @param moveReason - Optional reason for permanent moves
 * @returns Promise with the created entry ID
 */
export async function createExternalLocationHistoryEntry(
  horseId: string,
  horseName: string,
  externalLocation: string,
  moveType: 'temporary' | 'permanent',
  departureDate: Timestamp,
  userId: string,
  contactId?: string,
  moveReason?: string
): Promise<string> {
  const historyRef = collection(db, 'horses', horseId, 'locationHistory')

  const entryData = {
    horseId,
    horseName,
    locationType: 'external' as const,
    externalLocation,
    externalMoveType: moveType,
    arrivalDate: departureDate, // Arrival at external location = departure from stable
    departureDate: null, // null = currently at external location
    createdAt: Timestamp.now(),
    createdBy: userId,
    lastModifiedBy: userId,
    ...(contactId && { externalContactId: contactId }),
    ...(moveReason && { externalMoveReason: moveReason })
  }

  const docRef = await addDoc(historyRef, entryData)
  return docRef.id
}

/**
 * Close a location history entry by setting the departure date
 * Works for both stable and external locations
 * @param horseId - Horse ID
 * @param locationType - Type of location ('stable' | 'external')
 * @param locationId - Stable ID (if stable) or null (if external)
 * @param userId - User ID making the change
 * @param departureDate - When horse left (defaults to now)
 */
export async function closeLocationHistoryEntry(
  horseId: string,
  locationType: 'stable' | 'external',
  locationId: string | null,
  userId: string,
  departureDate?: Timestamp
): Promise<void> {
  const historyRef = collection(db, 'horses', horseId, 'locationHistory')

  // Build query based on location type
  let snapshot
  if (locationType === 'stable' && locationId) {
    // Find the open entry for this specific stable
    // First try with locationType filter (new entries)
    const q = query(
      historyRef,
      where('locationType', '==', 'stable'),
      where('stableId', '==', locationId),
      where('departureDate', '==', null)
    )
    snapshot = await getDocs(q)

    // If not found, try without locationType filter (backward compatibility for old entries)
    if (snapshot.empty) {
      const qLegacy = query(
        historyRef,
        where('stableId', '==', locationId),
        where('departureDate', '==', null)
      )
      snapshot = await getDocs(qLegacy)
    }
  } else if (locationType === 'external') {
    // Find the open external location entry
    const q = query(
      historyRef,
      where('locationType', '==', 'external'),
      where('departureDate', '==', null)
    )
    snapshot = await getDocs(q)
  } else {
    // Invalid parameters
    return
  }

  if (!snapshot.empty) {
    // Should only be one open entry
    const entryDoc = snapshot.docs[0]
    if (entryDoc) {
      await updateDoc(entryDoc.ref, {
        departureDate: departureDate || Timestamp.now(),
        lastModifiedBy: userId
      })
    }
  }
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get location history for a specific horse
 * @param horseId - Horse ID
 * @returns Promise with array of location history entries
 */
export async function getHorseLocationHistory(horseId: string): Promise<LocationHistory[]> {
  const historyRef = collection(db, 'horses', horseId, 'locationHistory')
  const q = query(historyRef, orderBy('arrivalDate', 'desc'))
  const snapshot = await getDocs(q)
  return mapDocsToObjects<LocationHistory>(snapshot)
}

/**
 * Get the current location for a horse (entry with no departure date)
 * @param horseId - Horse ID
 * @returns Promise with current location or null
 */
export async function getCurrentLocation(horseId: string): Promise<LocationHistory | null> {
  const historyRef = collection(db, 'horses', horseId, 'locationHistory')
  const q = query(
    historyRef,
    where('departureDate', '==', null),
    orderBy('arrivalDate', 'desc')
  )

  const snapshot = await getDocs(q)

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  if (!doc) return null

  return {
    id: doc.id,
    ...doc.data()
  } as LocationHistory
}

/**
 * Get all location history for horses owned by a user
 * First gets user's horses, then queries their location history
 * @param userId - User ID to filter by horse ownership
 * @returns Promise with array of location history entries
 */
export async function getUserHorseLocationHistory(userId: string): Promise<LocationHistory[]> {
  if (!userId) {
    console.warn('getUserHorseLocationHistory called without userId')
    return []
  }

  // Step 1: Get all horses owned by the user
  const horsesRef = collection(db, 'horses')
  const horsesQuery = query(horsesRef, where('ownerId', '==', userId))
  const horsesSnapshot = await getDocs(horsesQuery)

  if (horsesSnapshot.empty) {
    console.log('📍 No horses found for user:', userId)
    return []
  }

  // Step 2: Query location history for each horse
  const allHistory: LocationHistory[] = []

  for (const horseDoc of horsesSnapshot.docs) {
    const horseId = horseDoc.id
    const historyRef = collection(db, 'horses', horseId, 'locationHistory')
    const historyQuery = query(historyRef, orderBy('arrivalDate', 'desc'))
    const historySnapshot = await getDocs(historyQuery)

    const horseHistory = mapDocsToObjects<LocationHistory>(historySnapshot)
    allHistory.push(...horseHistory)
  }

  // Sort combined results by arrival date (newest first)
  allHistory.sort((a, b) => {
    const aTime = a.arrivalDate.toDate().getTime()
    const bTime = b.arrivalDate.toDate().getTime()
    return bTime - aTime
  })

  console.log('📍 Found location history entries:', allHistory.length, 'for', horsesSnapshot.docs.length, 'horses')

  return allHistory
}

// ============================================================================
// Migration & Utility
// ============================================================================

/**
 * Backfill location history for an existing horse with current assignment
 * Used for migrating existing horses to the location history system
 * @param horseId - Horse ID
 * @param horseName - Horse name
 * @param currentStableId - Current stable ID
 * @param currentStableName - Current stable name
 * @param assignedAt - When horse was assigned to current stable
 * @param userId - User ID for the migration
 */
export async function backfillLocationHistory(
  horseId: string,
  horseName: string,
  currentStableId: string,
  currentStableName: string,
  assignedAt: Timestamp,
  userId: string
): Promise<void> {
  // Check if entry already exists
  const existing = await getCurrentLocation(horseId)

  if (existing && existing.stableId === currentStableId) {
    // Already has current location entry
    return
  }

  // Create history entry for current location
  await createLocationHistoryEntry(
    horseId,
    horseName,
    currentStableId,
    currentStableName,
    userId,
    assignedAt
  )
}
