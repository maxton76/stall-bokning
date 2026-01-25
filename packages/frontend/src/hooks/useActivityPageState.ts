import { useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import { getCareActivities } from "@/services/activityService";
import { getStableHorses } from "@/services/horseService";
import { getActivityTypesByStable } from "@/services/activityTypeService";
import { getOrganizationHorseGroups } from "@/services/horseGroupService";
import type { Activity, ActivityTypeConfig } from "@/types/activity";
import type { Horse, HorseGroup } from "@/types/roles";

interface UseActivityPageStateProps {
  user: { uid: string } | null;
  stables: Array<{ id: string; name: string }>;
  organizationId?: string;
  activityLoader?: (stableIds: string | string[]) => Promise<Activity[]>;
  includeGroups?: boolean;
}

/**
 * Shared hook for activity page state management using TanStack Query.
 *
 * Provides stable selection, activities, activity types, horses, and horse groups
 * with automatic caching, background refetching, and cache invalidation.
 *
 * @example
 * ```tsx
 * const {
 *   selectedStableId,
 *   setSelectedStableId,
 *   activities,
 *   activityTypes,
 *   horses,
 *   horseGroups,
 * } = useActivityPageState({
 *   user,
 *   stables,
 *   activityLoader: getCareActivities,
 * });
 * ```
 */
export function useActivityPageState({
  user,
  stables,
  organizationId,
  activityLoader = getCareActivities,
  includeGroups = true,
}: UseActivityPageStateProps) {
  const [selectedStableId, setSelectedStableId] = useState<string>("all");

  // Get stable IDs for multi-stable queries
  const stableIds = stables.map((s) => s.id);

  // Load activities for selected stable(s)
  const activitiesQuery = useApiQuery<Activity[]>(
    queryKeys.activities.care(
      selectedStableId === "all" ? stableIds : selectedStableId,
    ),
    async () => {
      if (!selectedStableId) return [];

      // If "all" is selected, get activities from all stables
      if (selectedStableId === "all") {
        return await activityLoader(stableIds);
      }

      // Otherwise get activities for specific stable
      return await activityLoader(selectedStableId);
    },
    {
      enabled: !!selectedStableId && stables.length > 0,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );

  // Load activity types for selected stable(s)
  const activityTypesQuery = useApiQuery<ActivityTypeConfig[]>(
    queryKeys.activityTypes.byStable(
      selectedStableId === "all"
        ? stableIds.sort().join(",")
        : selectedStableId || "",
      true,
    ),
    async () => {
      if (!selectedStableId) return [];

      // If "all" is selected, get activity types from all stables and merge them
      if (selectedStableId === "all") {
        const allTypes: ActivityTypeConfig[] = [];
        const seenNames = new Set<string>();

        for (const stable of stables) {
          const types = await getActivityTypesByStable(stable.id, true);
          // Add unique types by NAME (not ID) since each stable has its own copies
          types.forEach((type) => {
            if (!seenNames.has(type.name)) {
              seenNames.add(type.name);
              allTypes.push(type);
            }
          });
        }

        return allTypes;
      }

      // Otherwise get activity types for specific stable
      return await getActivityTypesByStable(selectedStableId, true);
    },
    {
      enabled: !!selectedStableId && stables.length > 0,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Load horses for selected stable(s) - gets ALL horses in stable, not just user's
  const horsesQuery = useApiQuery<Horse[]>(
    queryKeys.horses.list({
      stableId: selectedStableId,
      context: "activities",
    }),
    async () => {
      if (!selectedStableId || !user) return [];

      // If "all" is selected, get horses from all stables
      if (selectedStableId === "all") {
        const allHorses: Horse[] = [];
        for (const stable of stables) {
          const stableHorses = await getStableHorses(stable.id);
          allHorses.push(...stableHorses);
        }
        // Remove duplicates by horse ID
        return Array.from(new Map(allHorses.map((h) => [h.id, h])).values());
      }

      // Otherwise get horses for specific stable
      return await getStableHorses(selectedStableId);
    },
    {
      enabled: !!selectedStableId && !!user && stables.length > 0,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Load horse groups for filtering (optional) - now organization-wide
  const horseGroupsQuery = useApiQuery<HorseGroup[]>(
    queryKeys.horseGroups.list(organizationId || ""),
    () => getOrganizationHorseGroups(organizationId!),
    {
      enabled: includeGroups && !!organizationId,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Backward-compatible return structure that matches useAsyncData interface
  return {
    selectedStableId,
    setSelectedStableId,
    activities: {
      data: activitiesQuery.data ?? [],
      loading: activitiesQuery.isLoading,
      error: activitiesQuery.error,
      load: activitiesQuery.refetch,
      reload: async () => {
        await cacheInvalidation.activities.lists();
      },
    },
    activityTypes: {
      data: activityTypesQuery.data ?? [],
      loading: activityTypesQuery.isLoading,
      error: activityTypesQuery.error,
      load: activityTypesQuery.refetch,
      reload: async () => {
        await cacheInvalidation.activityTypes.lists();
      },
    },
    horses: {
      data: horsesQuery.data ?? [],
      loading: horsesQuery.isLoading,
      error: horsesQuery.error,
      load: horsesQuery.refetch,
      reload: async () => {
        await cacheInvalidation.horses.lists();
      },
    },
    horseGroups: {
      data: horseGroupsQuery.data ?? [],
      loading: horseGroupsQuery.isLoading,
      error: horseGroupsQuery.error,
      load: horseGroupsQuery.refetch,
      reload: async () => {
        await cacheInvalidation.horseGroups.lists();
      },
    },
  };
}
