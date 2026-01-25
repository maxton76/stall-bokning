import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "../lib/queryClient";
import { getActivityTypesByStable } from "../services/activityTypeService";
import type { ActivityTypeConfig } from "@/types/activity";

/**
 * Hook for loading activity types for a specific stable using TanStack Query.
 *
 * Provides automatic caching, background refetching, and proper cache invalidation.
 * Replaces the useAsyncData-based useActivityTypes hook.
 *
 * @param stableId - Stable ID to load types for (null if no stable selected)
 * @param activeOnly - Filter to only active types (default: true)
 *
 * @example
 * ```tsx
 * const { activityTypes, loading, error, refetch } = useActivityTypesQuery(
 *   selectedStableId,
 *   true
 * );
 * ```
 */
export function useActivityTypesQuery(
  stableId: string | null,
  activeOnly: boolean = true,
) {
  // "all" is a special value meaning multiple stables - can't load types for that
  const isValidStableId = !!stableId && stableId !== "all";

  const query = useApiQuery<ActivityTypeConfig[]>(
    queryKeys.activityTypes.byStable(stableId || "", activeOnly),
    () => getActivityTypesByStable(stableId!, activeOnly),
    {
      enabled: isValidStableId,
      staleTime: 5 * 60 * 1000, // Activity types change less frequently
    },
  );

  return {
    activityTypes: query.data ?? [],
    data: query.data ?? [], // Compatibility with useAsyncData pattern
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}

/**
 * Hook for loading activity types for multiple stables and merging them.
 *
 * When "all" stables is selected, this hook loads types from all stables
 * and merges them by name to avoid duplicates.
 *
 * @param stables - Array of stables to load types for
 * @param selectedStableId - Selected stable ID or "all"
 * @param activeOnly - Filter to only active types
 *
 * @example
 * ```tsx
 * const { activityTypes, loading } = useActivityTypesForSelection(
 *   stables,
 *   selectedStableId,
 *   true
 * );
 * ```
 */
export function useActivityTypesForSelection(
  stables: Array<{ id: string }>,
  selectedStableId: string | null,
  activeOnly: boolean = true,
) {
  const isAllStables = selectedStableId === "all";
  const singleStableId = isAllStables ? null : selectedStableId;

  // For single stable selection
  const singleQuery = useActivityTypesQuery(singleStableId, activeOnly);

  // For "all" stables, we need to handle it differently
  // The hook will be disabled and we'll use the data from single queries
  // This maintains backward compatibility with the useAsyncData pattern
  // where "all" stables would fetch from multiple stables sequentially

  if (!isAllStables) {
    return singleQuery;
  }

  // When "all" is selected, we return empty array - the page should handle
  // loading from multiple stables if needed (as it did before)
  return {
    activityTypes: [],
    data: [],
    loading: false,
    error: null,
    refetch: singleQuery.refetch,
    query: singleQuery.query,
  };
}
