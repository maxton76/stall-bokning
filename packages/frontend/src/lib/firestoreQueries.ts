import { collection, query, where, getDocs, getDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Get user's owned stables
 * @param userId - User ID to query for owned stables
 * @returns QuerySnapshot of stables where user is owner
 */
export async function getUserOwnedStables(userId: string) {
  const q = query(
    collection(db, 'stables'),
    where('ownerId', '==', userId)
  )
  return getDocs(q)
}

/**
 * Get user's member stables (active memberships)
 * @param userId - User ID to query for stable memberships
 * @returns QuerySnapshot of active stable memberships
 */
export async function getUserMemberStables(userId: string) {
  const q = query(
    collection(db, 'stableMembers'),
    where('userId', '==', userId),
    where('status', '==', 'active')
  )
  return getDocs(q)
}

interface StableData {
  id: string
  name: any
  address: any
  ownerId: any
  createdAt: any
}

/**
 * Get full user stables data (owned + member stables)
 * Returns array with id, name, address, ownerId, createdAt
 * Deduplicates stables if user is both owner and member
 *
 * @param userId - User ID to query for all stables
 * @returns Array of stable objects with full data
 */
export async function getUserStablesData(userId: string): Promise<StableData[]> {
  const [ownedSnapshot, memberSnapshot] = await Promise.all([
    getUserOwnedStables(userId),
    getUserMemberStables(userId)
  ])

  const ownedStables: StableData[] = ownedSnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    address: doc.data().address,
    ownerId: doc.data().ownerId,
    createdAt: doc.data().createdAt
  }))

  const memberStableIds = memberSnapshot.docs.map(doc => doc.data().stableId)
  const memberStablesData: (StableData | null)[] = await Promise.all(
    memberStableIds.map(async (stableId): Promise<StableData | null> => {
      const stableDoc = await getDoc(doc(db, 'stables', stableId))
      if (stableDoc.exists()) {
        const data = stableDoc.data()
        return {
          id: stableDoc.id,
          name: data.name,
          address: data.address,
          ownerId: data.ownerId,
          createdAt: data.createdAt
        }
      }
      return null
    })
  )

  // Combine and deduplicate
  const allStables: StableData[] = [
    ...ownedStables,
    ...memberStablesData.filter((s): s is StableData => s !== null)
  ]

  return Array.from(new Map(allStables.map(s => [s.id, s])).values())
}

/**
 * Get all stables in an organization
 * @param organizationId - Organization ID to query for stables
 * @returns QuerySnapshot of stables in the organization
 */
export async function getOrganizationStables(organizationId: string) {
  const q = query(
    collection(db, 'stables'),
    where('organizationId', '==', organizationId),
    orderBy('createdAt', 'desc')
  )
  return getDocs(q)
}
