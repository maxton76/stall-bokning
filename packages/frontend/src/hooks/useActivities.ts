/**
 * Activity data hooks with cold-start-aware configuration.
 *
 * These hooks provide TanStack Query wrappers for activity data with
 * consistent error handling, retry logic, and QueryBoundary integration.
 */

import { useApiQuery } from "./useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import {
  getActivitiesByPeriod,
  getActivitiesByPeriodMultiStable,
} from "@/services/activityService";
import type { ActivityEntry, PeriodType } from "@/types/activity";

/**
 * Hook for fetching activities by period for a single stable.
 *
 * Uses TanStack Query for automatic caching, retries, and cold-start handling.
 * Pair with QueryBoundary for consistent loading/error states.
 *
 * @param stableId - Stable ID to fetch activities for
 * @param date - Date for the period
 * @param periodType - Period type (day, week, month)
 * @returns Query result with activities array
 *
 * @example
 * ```tsx
 * function ActivitiesPage() {
 *   const { activities, loading, query } = useActivitiesByPeriod(stableId, new Date(), "day");
 *
 *   return (
 *     <QueryBoundary query={query}>
 *       {(activities) => <ActivityList data={activities} />}
 *     </QueryBoundary>
 *   );
 * }
 * ```
 */
export function useActivitiesByPeriod(
  stableId: string | undefined,
  date: Date,
  periodType: PeriodType,
) {
  const dateString = date.toISOString().split("T")[0];

  const query = useApiQuery<ActivityEntry[]>(
    queryKeys.activities.byPeriod(stableId || "", dateString || "", periodType),
    () => getActivitiesByPeriod(stableId!, date, periodType),
    { enabled: !!stableId },
  );

  // Legacy API compatibility
  return {
    activities: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    reload: query.refetch,
    // For optimistic updates
    setData: (data: ActivityEntry[]) => {
      // Note: This would need queryClient.setQueryData for proper implementation
      // For now, just refetch
    },
    // Full query object for QueryBoundary
    query,
  };
}

/**
 * Hook for fetching activities by period for multiple stables.
 *
 * Uses TanStack Query for automatic caching, retries, and cold-start handling.
 * Pair with QueryBoundary for consistent loading/error states.
 *
 * @param stableIds - Array of stable IDs to fetch activities for
 * @param date - Date for the period
 * @param periodType - Period type (day, week, month)
 * @returns Query result with activities array from all stables
 *
 * @example
 * ```tsx
 * function AllActivitiesPage() {
 *   const stableIds = stables.map(s => s.id);
 *   const { activities, query } = useActivitiesByPeriodMultiStable(stableIds, new Date(), "day");
 *
 *   return (
 *     <QueryBoundary query={query}>
 *       {(activities) => <ActivityList data={activities} />}
 *     </QueryBoundary>
 *   );
 * }
 * ```
 */
export function useActivitiesByPeriodMultiStable(
  stableIds: string[],
  date: Date,
  periodType: PeriodType,
) {
  const dateString = date.toISOString().split("T")[0];
  // Create a stable key from the stableIds array
  const stableIdsKey = stableIds.sort().join(",");

  const query = useApiQuery<ActivityEntry[]>(
    [
      ...queryKeys.activities.lists(),
      "multi",
      { stableIdsKey, dateString, periodType },
    ] as const,
    () => getActivitiesByPeriodMultiStable(stableIds, date, periodType),
    { enabled: stableIds.length > 0 },
  );

  // Legacy API compatibility
  return {
    activities: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    reload: query.refetch,
    setData: (data: ActivityEntry[]) => {
      // Note: This would need queryClient.setQueryData for proper implementation
    },
    // Full query object for QueryBoundary
    query,
  };
}

/**
 * Combined hook for fetching activities by period, handling both single and multi-stable cases.
 *
 * @param selectedStableId - Selected stable ID ("all" for all stables, or specific stable ID)
 * @param stables - Array of all available stables
 * @param date - Date for the period
 * @param periodType - Period type (day, week, month)
 * @returns Query result with activities array
 */
export function useActivitiesForPeriod(
  selectedStableId: string,
  stables: Array<{ id: string }>,
  date: Date,
  periodType: PeriodType,
) {
  const isAllStables = selectedStableId === "all";
  const stableIds = stables.map((s) => s.id);
  const dateString = date.toISOString().split("T")[0];

  const query = useApiQuery<ActivityEntry[]>(
    isAllStables
      ? ([
          ...queryKeys.activities.lists(),
          "multi",
          { stableIds: stableIds.sort().join(","), dateString, periodType },
        ] as const)
      : queryKeys.activities.byPeriod(
          selectedStableId,
          dateString || "",
          periodType,
        ),
    async () => {
      if (stables.length === 0) return [];
      if (isAllStables) {
        return getActivitiesByPeriodMultiStable(stableIds, date, periodType);
      }
      return getActivitiesByPeriod(selectedStableId, date, periodType);
    },
    { enabled: stables.length > 0 && !!selectedStableId },
  );

  // Legacy API compatibility
  return {
    activities: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    reload: query.refetch,
    setData: (data: ActivityEntry[]) => {
      // Note: This would need queryClient.setQueryData for proper implementation
    },
    // Full query object for QueryBoundary
    query,
  };
}
