import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getUserStables } from "@/services/stableService";

/**
 * Stable data interface
 */
interface Stable {
  id: string;
  name: string;
  address?: string;
  ownerId?: string;
  organizationId?: string;
  boxes?: string[];
  paddocks?: string[];
  createdAt?: any;
}

/**
 * Hook for fetching user's stables with cold-start awareness.
 *
 * Uses TanStack Query for automatic caching, retries, and cold-start handling.
 * Pair with QueryBoundary for consistent loading/error states.
 *
 * @param userId - ID of the user whose stables to load
 * @returns Stables array, loading state, and query object for QueryBoundary
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { stables, loading } = useUserStables(user?.uid);
 *
 * // With QueryBoundary for cold-start handling
 * const { stables, query } = useUserStables(user?.uid);
 * <QueryBoundary query={query}>
 *   {(data) => <StableList stables={data} />}
 * </QueryBoundary>
 * ```
 */
export function useUserStables(userId: string | undefined) {
  const query = useApiQuery<Stable[]>(
    queryKeys.userStables.byUser(userId || ""),
    async () => {
      if (!userId) return [];
      // Use API instead of direct Firestore queries
      // The API properly handles organization membership authorization
      return getUserStables();
    },
    { enabled: !!userId },
  );

  // Legacy API compatibility - return stables and loading alongside query
  return {
    stables: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Full query object for QueryBoundary
    query,
  };
}
