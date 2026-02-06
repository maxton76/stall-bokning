import { useState, useMemo } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import { getCareActivities } from "@/services/activityService";
import { getStableHorses, getMyHorses } from "@/services/horseService";
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
  /** When "my", loads only owned horses and filters activities to those horses */
  scope?: "stable" | "my";
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
  scope = "stable",
}: UseActivityPageStateProps) {
  const [selectedStableId, setSelectedStableId] = useState<string>("all");

  // Get stable IDs for multi-stable queries
  const stableIds = stables.map((s) => s.id);

  // --- scope="my": Load owned horses first, derive stableIds from them ---
  const myHorsesQuery = useApiQuery<Horse[]>(
    queryKeys.horses.list({ scope: "my", context: "activities-care" }),
    () => getMyHorses(),
    {
      enabled: scope === "my" && !!user,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Derive stable IDs from owned horses for activity/type loading
  const derivedStableIds = useMemo(() => {
    if (scope !== "my" || !myHorsesQuery.data) return [];
    const ids = new Set<string>();
    for (const horse of myHorsesQuery.data) {
      if (horse.currentStableId) ids.add(horse.currentStableId);
    }
    return Array.from(ids);
  }, [scope, myHorsesQuery.data]);

  const ownedHorseIds = useMemo(() => {
    if (scope !== "my" || !myHorsesQuery.data) return new Set<string>();
    return new Set(myHorsesQuery.data.map((h) => h.id));
  }, [scope, myHorsesQuery.data]);

  // Load activities for selected stable(s)
  const activitiesQuery = useApiQuery<Activity[]>(
    queryKeys.activities.care(
      scope === "my"
        ? ["my", ...derivedStableIds]
        : selectedStableId === "all"
          ? stableIds
          : selectedStableId,
    ),
    async () => {
      if (scope === "my") {
        if (derivedStableIds.length === 0) return [];
        const allActivities = await activityLoader(derivedStableIds);
        // Filter to only owned horses
        return allActivities.filter((a) => ownedHorseIds.has(a.horseId));
      }

      if (!selectedStableId) return [];

      // If "all" is selected, get activities from all stables
      if (selectedStableId === "all") {
        return await activityLoader(stableIds);
      }

      // Otherwise get activities for specific stable
      return await activityLoader(selectedStableId);
    },
    {
      enabled:
        scope === "my"
          ? derivedStableIds.length > 0
          : !!selectedStableId && stables.length > 0,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );

  // Load activity types for selected stable(s)
  const activityTypesQuery = useApiQuery<ActivityTypeConfig[]>(
    queryKeys.activityTypes.byStable(
      scope === "my"
        ? ["my", ...derivedStableIds].sort().join(",")
        : selectedStableId === "all"
          ? stableIds.sort().join(",")
          : selectedStableId || "",
      true,
    ),
    async () => {
      if (scope === "my") {
        if (derivedStableIds.length === 0) return [];
        const allTypes: ActivityTypeConfig[] = [];
        const seenNames = new Set<string>();
        for (const sid of derivedStableIds) {
          const types = await getActivityTypesByStable(sid, true);
          types.forEach((type) => {
            if (!seenNames.has(type.name)) {
              seenNames.add(type.name);
              allTypes.push(type);
            }
          });
        }
        return allTypes;
      }

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
      enabled:
        scope === "my"
          ? derivedStableIds.length > 0
          : !!selectedStableId && stables.length > 0,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Load horses for selected stable(s) - gets ALL horses in stable, not just user's
  // When scope="my", we use myHorsesQuery directly instead
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
      enabled:
        scope !== "my" && !!selectedStableId && !!user && stables.length > 0,
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

  // Select horse data source based on scope
  const effectiveHorsesQuery = scope === "my" ? myHorsesQuery : horsesQuery;

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
      data: effectiveHorsesQuery.data ?? [],
      loading: effectiveHorsesQuery.isLoading,
      error: effectiveHorsesQuery.error,
      load: effectiveHorsesQuery.refetch,
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
