import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "../lib/queryClient";
import { getFeedingTimesByStable } from "../services/feedingTimeService";
import type { FeedingTime } from "@shared/types";

/**
 * Hook for loading feeding times for a stable using TanStack Query.
 *
 * Provides automatic caching, background refetching, and proper cache invalidation.
 * Feeding times are stable-scoped.
 *
 * @param stableId - Stable ID to load feeding times for
 * @param includeInactive - Include inactive feeding times (default: false for active only)
 *
 * @example
 * ```tsx
 * const { feedingTimes, loading, error, refetch } = useFeedingTimesQuery(
 *   stableId,
 *   false // activeOnly
 * );
 * ```
 */
export function useFeedingTimesQuery(
  stableId: string | undefined,
  includeInactive: boolean = false,
) {
  const query = useApiQuery<FeedingTime[]>(
    queryKeys.feedingTimes.byStable(stableId || "", includeInactive),
    () => getFeedingTimesByStable(stableId!, !includeInactive),
    {
      enabled: !!stableId,
      staleTime: 5 * 60 * 1000, // Feeding times change infrequently
    },
  );

  return {
    feedingTimes: query.data ?? [],
    data: query.data ?? [], // Compatibility with useAsyncData pattern
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
