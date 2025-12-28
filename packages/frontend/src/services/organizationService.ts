import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Organization, CreateOrganizationData } from '../../../shared/src/types/organization'
import { mapDocsToObjects, removeUndefined, createTimestamps, updateTimestamps } from '@/utils/firestoreHelpers'

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new organization
 * @param userId - ID of the user creating the organization (becomes owner)
 * @param organizationData - Organization data
 * @returns Promise with the created organization ID
 */
export async function createOrganization(
  userId: string,
  organizationData: CreateOrganizationData
): Promise<string> {
  const dataToSave = removeUndefined({
    ...organizationData,
    ownerId: userId,
    ownerEmail: organizationData.primaryEmail, // Owner email is same as primary email initially
    subscriptionTier: 'free' as const,
    stats: {
      stableCount: 0,
      totalMemberCount: 0
    },
    ...createTimestamps(userId)
  })

  const orgRef = await addDoc(collection(db, 'organizations'), dataToSave)
  return orgRef.id
}

/**
 * Get a single organization by ID
 * @param organizationId - Organization ID
 * @returns Promise with organization data or null if not found
 */
export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const orgRef = doc(db, 'organizations', organizationId)
  const orgSnap = await getDoc(orgRef)

  if (!orgSnap.exists()) return null

  return {
    id: orgSnap.id,
    ...orgSnap.data()
  } as Organization
}

/**
 * Get all organizations for a specific user (owner or member)
 * @param userId - User ID
 * @returns Promise with array of organizations
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  // Get organizations where user is owner
  const ownerQuery = query(
    collection(db, 'organizations'),
    where('ownerId', '==', userId)
  )
  const ownerSnapshot = await getDocs(ownerQuery)
  const ownerOrgs = mapDocsToObjects<Organization>(ownerSnapshot)

  // Get organizations where user is a member
  const memberQuery = query(
    collection(db, 'organizationMembers'),
    where('userId', '==', userId),
    where('status', '==', 'active')
  )
  const memberSnapshot = await getDocs(memberQuery)
  const memberOrgIds = memberSnapshot.docs.map(doc => doc.data().organizationId)

  // Fetch member organizations in batches (Firestore 'in' supports max 30 items)
  const BATCH_SIZE = 30
  const memberOrgs: Organization[] = []

  for (let i = 0; i < memberOrgIds.length; i += BATCH_SIZE) {
    const batch = memberOrgIds.slice(i, i + BATCH_SIZE)
    const batchQuery = query(
      collection(db, 'organizations'),
      where('__name__', 'in', batch)  // documentId() equivalent
    )
    const snapshot = await getDocs(batchQuery)
    memberOrgs.push(...mapDocsToObjects<Organization>(snapshot))
  }

  // Combine and remove duplicates
  const allOrgs = [...ownerOrgs, ...memberOrgs]
  const uniqueOrgs = Array.from(
    new Map(allOrgs.map(org => [org.id, org])).values()
  )

  return uniqueOrgs
}

/**
 * Update an existing organization
 * @param organizationId - Organization ID
 * @param userId - ID of user making the update
 * @param updates - Partial organization data to update
 * @returns Promise that resolves when update is complete
 */
export async function updateOrganization(
  organizationId: string,
  userId: string,
  updates: Partial<Omit<Organization, 'id' | 'ownerId' | 'createdAt' | 'stats'>>
): Promise<void> {
  const orgRef = doc(db, 'organizations', organizationId)

  const dataToUpdate = removeUndefined({
    ...updates,
    ...updateTimestamps(userId)
  })

  await updateDoc(orgRef, dataToUpdate)
}

/**
 * Delete an organization
 * @param organizationId - Organization ID
 * @returns Promise that resolves when delete is complete
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
  const orgRef = doc(db, 'organizations', organizationId)
  await deleteDoc(orgRef)
}

/**
 * Update organization stats (stableCount, totalMemberCount)
 * @param organizationId - Organization ID
 * @param stats - Stats to update
 * @returns Promise that resolves when update is complete
 */
export async function updateOrganizationStats(
  organizationId: string,
  stats: { stableCount?: number; totalMemberCount?: number }
): Promise<void> {
  const orgRef = doc(db, 'organizations', organizationId)

  const updates: Record<string, number> = {}
  if (stats.stableCount !== undefined) {
    updates['stats.stableCount'] = stats.stableCount
  }
  if (stats.totalMemberCount !== undefined) {
    updates['stats.totalMemberCount'] = stats.totalMemberCount
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(orgRef, updates)
  }
}
