import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { HorseActivityHistoryEntry, RoutineCategory } from "@shared/types";
import {
  getHorseActivityHistory,
  getRoutineActivityHistory,
  getStableActivityHistory,
  type HorseActivityHistoryOptions,
  type HorseActivityHistoryResult,
  type RoutineActivityHistoryResult,
} from "@/services/horseActivityHistoryService";

/**
 * Hook for fetching horse activity history with infinite scroll
 *
 * @param horseId - ID of the horse
 * @param options - Filter options
 * @returns Infinite query result with activities
 *
 * @example
 * const { data, fetchNextPage, hasNextPage, isLoading } = useHorseActivityHistory(horseId);
 *
 * // Get all loaded activities
 * const activities = data?.pages.flatMap(page => page.activities) ?? [];
 *
 * // Filter by category
 * const { data } = useHorseActivityHistory(horseId, { category: 'feeding' });
 */
export function useHorseActivityHistory(
  horseId: string | undefined,
  options?: Omit<HorseActivityHistoryOptions, "cursor">,
) {
  return useInfiniteQuery<HorseActivityHistoryResult>({
    queryKey: ["horseActivityHistory", "horse", horseId, options],
    queryFn: async ({ pageParam }) => {
      if (!horseId) {
        return {
          activities: [],
          hasMore: false,
        };
      }
      return getHorseActivityHistory(horseId, {
        ...options,
        cursor: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!horseId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching routine activity history
 * Returns activities grouped by step for routine summary view
 *
 * @param routineInstanceId - ID of the routine instance
 * @returns Query result with activities grouped by step
 *
 * @example
 * const { data, isLoading } = useRoutineActivityHistory(routineId);
 * const stepActivities = data?.groupedByStep['step-123'] ?? [];
 */
export function useRoutineActivityHistory(
  routineInstanceId: string | undefined,
) {
  return useQuery<RoutineActivityHistoryResult>({
    queryKey: ["horseActivityHistory", "routine", routineInstanceId],
    queryFn: async () => {
      if (!routineInstanceId) {
        return {
          activities: [],
          groupedByStep: {},
          routineInfo: {
            id: "",
            templateName: "",
            status: "",
            scheduledDate: "",
          },
        };
      }
      return getRoutineActivityHistory(routineInstanceId);
    },
    enabled: !!routineInstanceId,
    staleTime: 60 * 1000, // 1 minute - routine history rarely changes
  });
}

/**
 * Hook for fetching stable-wide activity history with infinite scroll
 *
 * @param stableId - ID of the stable
 * @param options - Filter options (includes optional horseId filter)
 * @returns Infinite query result with activities
 */
export function useStableActivityHistory(
  stableId: string | undefined,
  options?: Omit<HorseActivityHistoryOptions, "cursor"> & { horseId?: string },
) {
  return useInfiniteQuery<HorseActivityHistoryResult>({
    queryKey: ["horseActivityHistory", "stable", stableId, options],
    queryFn: async ({ pageParam }) => {
      if (!stableId) {
        return {
          activities: [],
          hasMore: false,
        };
      }
      return getStableActivityHistory(stableId, {
        ...options,
        cursor: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!stableId,
    staleTime: 30 * 1000,
  });
}

/**
 * Helper to flatten paginated activities into a single array
 */
export function flattenActivities(
  data: { pages: HorseActivityHistoryResult[] } | undefined,
): HorseActivityHistoryEntry[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.activities);
}

/**
 * Get category display info (icon, color, label key)
 */
export function getCategoryInfo(category: RoutineCategory): {
  icon: string;
  colorClass: string;
  labelKey: string;
} {
  const categoryMap: Record<
    RoutineCategory,
    { icon: string; colorClass: string; labelKey: string }
  > = {
    preparation: {
      icon: "📋",
      colorClass: "bg-gray-100 text-gray-800",
      labelKey: "routines:categories.preparation",
    },
    feeding: {
      icon: "🍽️",
      colorClass: "bg-amber-100 text-amber-800",
      labelKey: "routines:categories.feeding",
    },
    medication: {
      icon: "💊",
      colorClass: "bg-red-100 text-red-800",
      labelKey: "routines:categories.medication",
    },
    blanket: {
      icon: "🧥",
      colorClass: "bg-purple-100 text-purple-800",
      labelKey: "routines:categories.blanket",
    },
    turnout: {
      icon: "🌳",
      colorClass: "bg-green-100 text-green-800",
      labelKey: "routines:categories.turnout",
    },
    bring_in: {
      icon: "🏠",
      colorClass: "bg-blue-100 text-blue-800",
      labelKey: "routines:categories.bringIn",
    },
    mucking: {
      icon: "🧹",
      colorClass: "bg-yellow-100 text-yellow-800",
      labelKey: "routines:categories.mucking",
    },
    water: {
      icon: "💧",
      colorClass: "bg-cyan-100 text-cyan-800",
      labelKey: "routines:categories.water",
    },
    health_check: {
      icon: "🩺",
      colorClass: "bg-pink-100 text-pink-800",
      labelKey: "routines:categories.healthCheck",
    },
    safety: {
      icon: "🔒",
      colorClass: "bg-indigo-100 text-indigo-800",
      labelKey: "routines:categories.safety",
    },
    cleaning: {
      icon: "✨",
      colorClass: "bg-teal-100 text-teal-800",
      labelKey: "routines:categories.cleaning",
    },
    other: {
      icon: "📝",
      colorClass: "bg-slate-100 text-slate-800",
      labelKey: "routines:categories.other",
    },
  };

  return categoryMap[category] || categoryMap.other;
}
