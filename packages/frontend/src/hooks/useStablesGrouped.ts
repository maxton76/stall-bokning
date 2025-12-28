import { useEffect } from 'react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getUserOwnedStables, getUserMemberStables } from '@/lib/firestoreQueries'

export interface StableListItem {
  id: string
  name: string
  role: 'owner' | 'manager' | 'member'
  icon: 'crown' | 'shield' | 'users'
}

interface UseStablesGroupedResult {
  myStables: StableListItem[]
  managedStables: StableListItem[]
  loading: boolean
  refresh: () => void
}

interface GroupedStables {
  myStables: StableListItem[]
  managedStables: StableListItem[]
}

/**
 * Hook to load and group user's stables by role
 * - myStables: stables where user is a member
 * - managedStables: stables where user is owner or manager
 *
 * Uses shared Firestore query utilities and useAsyncData for consistent patterns
 */
export function useStablesGrouped(userId: string | undefined): UseStablesGroupedResult {
  const stablesData = useAsyncData<GroupedStables>({
    loadFn: async () => {
      if (!userId) {
        return { myStables: [], managedStables: [] }
      }

      const [ownedSnapshot, memberSnapshot] = await Promise.all([
        getUserOwnedStables(userId),
        getUserMemberStables(userId)
      ])

      // Process owned stables
      const owned: StableListItem[] = ownedSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        role: 'owner' as const,
        icon: 'crown' as const
      }))

      // Process member stables
      const members: StableListItem[] = memberSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: data.stableId,
          name: data.stableName || 'Unknown Stable',
          role: data.role as 'manager' | 'member',
          icon: data.role === 'manager' ? ('shield' as const) : ('users' as const)
        }
      })

      // Group by role
      return {
        myStables: members.filter(m => m.role === 'member'),
        managedStables: [...owned, ...members.filter(m => m.role === 'manager')]
      }
    },
    errorMessage: 'Failed to load stables'
  })

  useEffect(() => {
    stablesData.load()
  }, [userId])

  return {
    myStables: stablesData.data?.myStables || [],
    managedStables: stablesData.data?.managedStables || [],
    loading: stablesData.loading,
    refresh: stablesData.reload
  }
}
