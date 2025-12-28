import {
  collection,
  doc,
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
 * Create a new location history entry
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
 * Close a location history entry by setting the departure date
 * @param horseId - Horse ID
 * @param stableId - Stable ID to close
 * @param userId - User ID making the change
 * @param departureDate - When horse left (defaults to now)
 */
export async function closeLocationHistoryEntry(
  horseId: string,
  stableId: string,
  userId: string,
  departureDate?: Timestamp
): Promise<void> {
  // Find the open entry for this stable
  const historyRef = collection(db, 'horses', horseId, 'locationHistory')
  const q = query(
    historyRef,
    where('stableId', '==', stableId),
    where('departureDate', '==', null)
  )

  const snapshot = await getDocs(q)

  if (!snapshot.empty) {
    // Should only be one open entry per stable
    const entryDoc = snapshot.docs[0]
    await updateDoc(entryDoc.ref, {
      departureDate: departureDate || Timestamp.now(),
      lastModifiedBy: userId
    })
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
  return {
    id: doc.id,
    ...doc.data()
  } as LocationHistory
}

/**
 * Get all location history for horses owned by a user
 * Uses collectionGroup to query across all horses
 * @param userId - User ID
 * @returns Promise with array of location history entries
 */
export async function getUserHorseLocationHistory(userId: string): Promise<LocationHistory[]> {
  // First, we need to get all horses owned by the user
  // Then query their location history
  // Note: This requires getting horse IDs first, then querying each subcollection
  // For better performance, consider denormalizing or using a separate collection

  // Using collectionGroup for all locationHistory entries
  const q = query(
    collectionGroup(db, 'locationHistory'),
    orderBy('arrivalDate', 'desc')
  )

  const snapshot = await getDocs(q)
  return mapDocsToObjects<LocationHistory>(snapshot)
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
