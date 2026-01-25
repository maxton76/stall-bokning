import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "../lib/queryClient";
import {
  getActivitiesByPeriod,
  getActivitiesByPeriodMultiStable,
  getCareActivities,
} from "../services/activityService";
import type { ActivityEntry, Activity, PeriodType } from "@/types/activity";

/**
 * Hook for loading activities by period for a single stable or multiple stables.
 *
 * Provides automatic caching, background refetching, and proper cache invalidation
 * through TanStack Query integration.
 *
 * @param selectedStableId - The stable ID or "all" for all stables
 * @param stables - Array of available stables (used when selectedStableId is "all")
 * @param date - The reference date for the period
 * @param periodType - The period type (day, week, month)
 *
 * @example
 * ```tsx
 * const { activities, loading, error, refetch } = useActivitiesByPeriod(
 *   selectedStableId,
 *   stables,
 *   new Date(),
 *   'day'
 * );
 * ```
 */
export function useActivitiesByPeriod(
  selectedStableId: string | null,
  stables: Array<{ id: string }>,
  date: Date,
  periodType: PeriodType,
) {
  const isAllStables = selectedStableId === "all";
  const stableIds = stables.map((s) => s.id);
  const dateString = date.toISOString().split("T")[0] ?? "";

  const query = useApiQuery<ActivityEntry[]>(
    isAllStables
      ? queryKeys.activities.byPeriodMultiStable(
          stableIds,
          dateString,
          periodType,
        )
      : queryKeys.activities.byPeriod(
          selectedStableId || "",
          dateString,
          periodType,
        ),
    async () => {
      if (!selectedStableId || stables.length === 0) return [];
      if (isAllStables) {
        return getActivitiesByPeriodMultiStable(stableIds, date, periodType);
      }
      return getActivitiesByPeriod(selectedStableId, date, periodType);
    },
    {
      enabled: !!selectedStableId && stables.length > 0,
      staleTime: 2 * 60 * 1000, // 2 minutes - activities change frequently
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  );

  return {
    activities: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}

/**
 * Hook for loading care activities for stables.
 *
 * Care activities are a subset of activities specifically for the Care page.
 *
 * @param stableIds - Single stable ID or array of stable IDs
 * @param enabled - Whether the query should be enabled
 *
 * @example
 * ```tsx
 * const { activities, loading, error } = useCareActivities(
 *   selectedStableId === 'all' ? stables.map(s => s.id) : selectedStableId,
 *   stables.length > 0
 * );
 * ```
 */
export function useCareActivities(
  stableIds: string | string[],
  enabled: boolean = true,
) {
  const normalizedIds = Array.isArray(stableIds) ? stableIds : [stableIds];

  const query = useApiQuery<Activity[]>(
    queryKeys.activities.care(normalizedIds),
    () => getCareActivities(normalizedIds),
    {
      enabled: enabled && normalizedIds.length > 0 && normalizedIds[0] !== "",
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );

  return {
    activities: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
