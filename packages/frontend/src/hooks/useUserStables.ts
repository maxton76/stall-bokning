import { useEffect } from 'react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getUserStablesData } from '@/lib/firestoreQueries'

/**
 * Stable data interface
 */
interface Stable {
  id: string
  name: string
  address?: string
  ownerId?: string
  createdAt?: any
}

/**
 * User stables hook with optimized data loading
 * Encapsulates logic for loading user's owned and member stables
 *
 * Uses shared Firestore query utilities and useAsyncData for consistent patterns
 *
 * @param userId - ID of the user whose stables to load
 * @returns Stables array and loading state
 *
 * @example
 * ```tsx
 * const { stables, loading } = useUserStables(user?.uid)
 * ```
 */
export function useUserStables(userId: string | undefined) {
  const stablesData = useAsyncData<Stable[]>({
    loadFn: async () => {
      if (!userId) return []
      return getUserStablesData(userId)
    },
    errorMessage: 'Failed to load stables'
  })

  useEffect(() => {
    stablesData.load()
  }, [userId])

  return {
    stables: stablesData.data || [],
    loading: stablesData.loading
  }
}
