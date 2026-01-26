import type {
  RoutineSchedule,
  CreateRoutineScheduleInput,
  UpdateRoutineScheduleInput,
} from "@shared/types";
import {
  getRoutineSchedules,
  createRoutineSchedule,
  updateRoutineSchedule,
  deleteRoutineSchedule,
  toggleRoutineScheduleEnabled,
} from "@/services/routineScheduleService";
import { useApiQuery } from "./useApiQuery";
import { useApiMutation } from "./useApiMutation";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";

/**
 * Hook for managing routine schedules
 *
 * Uses TanStack Query for automatic caching, retries, and background refetching.
 *
 * @example
 * ```tsx
 * const {
 *   schedules,
 *   loading,
 *   createSchedule,
 *   updateSchedule,
 *   deleteSchedule,
 *   toggleEnabled,
 * } = useRoutineSchedules(stableId);
 * ```
 */
export function useRoutineSchedules(stableId: string | undefined) {
  const query = useApiQuery<RoutineSchedule[]>(
    queryKeys.routineSchedules.byStable(stableId ?? ""),
    () => getRoutineSchedules(stableId!),
    { enabled: !!stableId },
  );

  const createMutation = useApiMutation(
    (data: CreateRoutineScheduleInput) => createRoutineSchedule(data),
    {
      successMessage: "Schema skapat",
      onSuccess: () => {
        cacheInvalidation.routineSchedules.byStable(stableId ?? "");
      },
    },
  );

  const updateMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateRoutineScheduleInput }) =>
      updateRoutineSchedule(id, data),
    {
      successMessage: "Schema uppdaterat",
      onSuccess: () => {
        cacheInvalidation.routineSchedules.byStable(stableId ?? "");
      },
    },
  );

  const deleteMutation = useApiMutation(
    (id: string) => deleteRoutineSchedule(id),
    {
      successMessage: "Schema borttaget",
      onSuccess: () => {
        cacheInvalidation.routineSchedules.byStable(stableId ?? "");
      },
    },
  );

  const toggleMutation = useApiMutation(
    ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      toggleRoutineScheduleEnabled(id, isEnabled),
    {
      onSuccess: () => {
        cacheInvalidation.routineSchedules.byStable(stableId ?? "");
      },
    },
  );

  return {
    // Query state
    schedules: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Full query object for QueryBoundary
    query,

    // Create
    createSchedule: async (data: CreateRoutineScheduleInput) => {
      return createMutation.mutateAsync(data);
    },
    createMutation,

    // Update
    updateSchedule: async (id: string, data: UpdateRoutineScheduleInput) => {
      return updateMutation.mutateAsync({ id, data });
    },
    updateMutation,

    // Delete
    deleteSchedule: async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    deleteMutation,

    // Toggle enabled
    toggleEnabled: async (id: string, isEnabled: boolean) => {
      return toggleMutation.mutateAsync({ id, isEnabled });
    },
    toggleMutation,
  };
}

/**
 * Hook for managing routine schedules across multiple stables
 */
export function useRoutineSchedulesMultiStable(stables: Array<{ id: string }>) {
  const stableIds = stables.map((s) => s.id);
  const stableIdsKey = stableIds.sort().join(",");

  const query = useApiQuery<RoutineSchedule[]>(
    [...queryKeys.routineSchedules.all, "multi", { stableIdsKey }] as const,
    async () => {
      if (stables.length === 0) return [];
      const allSchedules = await Promise.all(
        stables.map((stable) => getRoutineSchedules(stable.id)),
      );
      return allSchedules.flat();
    },
    { enabled: stables.length > 0 },
  );

  return {
    schedules: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}

/**
 * Combined hook for fetching routine schedules, handling both single and multi-stable cases.
 */
export function useRoutineSchedulesForStable(
  selectedStableId: string,
  stables: Array<{ id: string }>,
) {
  const isAllStables = selectedStableId === "all";
  const stableIds = stables.map((s) => s.id);
  const stableIdsKey = stableIds.sort().join(",");

  const query = useApiQuery<RoutineSchedule[]>(
    isAllStables
      ? ([
          ...queryKeys.routineSchedules.all,
          "multi",
          { stableIdsKey },
        ] as const)
      : queryKeys.routineSchedules.byStable(selectedStableId),
    async () => {
      if (stables.length === 0) return [];
      if (isAllStables) {
        const allSchedules = await Promise.all(
          stables.map((stable) => getRoutineSchedules(stable.id)),
        );
        return allSchedules.flat();
      }
      return getRoutineSchedules(selectedStableId);
    },
    { enabled: stables.length > 0 && !!selectedStableId },
  );

  return {
    schedules: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
  };
}
