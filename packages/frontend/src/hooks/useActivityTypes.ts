import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { getActivityTypesByStable } from "@/services/activityTypeService";
import type { ActivityTypeConfig } from "@/types/activity";

/**
 * Hook for loading activity types for a specific stable
 *
 * Centralizes the pattern of loading activity types with proper loading states
 * and automatic reloading when stable changes.
 *
 * @param stableId - Stable ID to load types for (null if no stable selected)
 * @param activeOnly - Filter to only active types (default: true)
 * @returns Activity types data with loading/error states and control functions
 *
 * @example
 * ```tsx
 * // Before: Manual useAsyncData setup with useEffect
 * const activityTypes = useAsyncData<ActivityTypeConfig[]>({
 *   loadFn: async () => {
 *     if (!selectedStableId) return []
 *     return await getActivityTypesByStable(selectedStableId, true)
 *   },
 * })
 *
 * useEffect(() => {
 *   if (selectedStableId) {
 *     activityTypes.load()
 *   }
 * }, [selectedStableId])
 *
 * // After: Single hook call with automatic reloading
 * const activityTypes = useActivityTypes(selectedStableId, true)
 * ```
 */
export function useActivityTypes(
  stableId: string | null,
  activeOnly: boolean = true,
) {
  // "all" is a special value meaning multiple stables - can't load types for that
  const isValidStableId = stableId && stableId !== "all";

  const activityTypesQuery = useApiQuery<ActivityTypeConfig[]>(
    queryKeys.activityTypes.byStable(stableId || "", activeOnly),
    () => getActivityTypesByStable(stableId!, activeOnly),
    {
      enabled: !!isValidStableId,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Return object that matches the expected interface (compatible with useAsyncData)
  return {
    data: activityTypesQuery.data || [],
    loading: activityTypesQuery.isLoading,
    isLoading: activityTypesQuery.isLoading,
    error: activityTypesQuery.error,
    load: activityTypesQuery.refetch,
    reload: activityTypesQuery.refetch,
    reset: () => {}, // No-op since query handles this
  };
}
