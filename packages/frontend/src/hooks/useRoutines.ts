import { useState, useCallback, useEffect } from "react";
import type {
  RoutineTemplate,
  RoutineInstance,
  DailyNotes,
  RoutineStep,
  HorseStepProgress,
  CreateRoutineTemplateInput,
  UpdateRoutineTemplateInput,
} from "@shared/types";
import {
  getRoutineTemplates,
  getRoutineInstances,
  createRoutineInstance,
  startRoutineInstance,
  updateRoutineProgress,
  completeRoutineInstance,
  cancelRoutineInstance,
  updateHorseStepProgress,
  getDailyNotes,
  createRoutineTemplate,
  updateRoutineTemplate,
  deleteRoutineTemplate,
} from "@/services/routineService";
import { useApiQuery } from "./useApiQuery";
import { useApiMutation } from "./useApiMutation";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";

/**
 * Hook for managing routine templates
 *
 * Uses TanStack Query for automatic caching, retries, and cold-start handling.
 * Pair with QueryBoundary for consistent loading/error states.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useRoutineTemplates(orgId, stableId);
 *
 * // With QueryBoundary
 * <QueryBoundary query={useRoutineTemplates(orgId, stableId)}>
 *   {(templates) => <TemplateList templates={templates} />}
 * </QueryBoundary>
 * ```
 */
export function useRoutineTemplates(
  organizationId: string | undefined,
  stableId?: string,
) {
  const query = useApiQuery<RoutineTemplate[]>(
    queryKeys.routines.templates(organizationId, stableId),
    () => getRoutineTemplates(organizationId!, stableId),
    { enabled: !!organizationId },
  );

  const createMutation = useApiMutation(
    (data: CreateRoutineTemplateInput) => createRoutineTemplate(data),
    {
      successMessage: "Rutinmall skapad",
      onSuccess: () => {
        cacheInvalidation.routines.templates(organizationId, stableId);
      },
    },
  );

  const updateMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateRoutineTemplateInput }) =>
      updateRoutineTemplate(id, data),
    {
      successMessage: "Rutinmall uppdaterad",
      onSuccess: () => {
        cacheInvalidation.routines.templates(organizationId, stableId);
      },
    },
  );

  const deleteMutation = useApiMutation(
    (id: string) => deleteRoutineTemplate(id),
    {
      successMessage: "Rutinmall borttagen",
      onSuccess: () => {
        cacheInvalidation.routines.templates(organizationId, stableId);
      },
    },
  );

  // Legacy API compatibility
  return {
    // Query state
    templates: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Full query object for QueryBoundary
    query,
    // Mutation functions (legacy API)
    create: async (data: CreateRoutineTemplateInput) => {
      const result = await createMutation.mutateAsync(data);
      return result;
    },
    update: async (id: string, data: UpdateRoutineTemplateInput) => {
      await updateMutation.mutateAsync({ id, data });
    },
    remove: async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    // Mutation objects for more control
    createMutation,
    updateMutation,
    deleteMutation,
  };
}

/**
 * Hook for managing routine instances for a specific date
 *
 * Uses TanStack Query for automatic caching, retries, and cold-start handling.
 * Pair with QueryBoundary for consistent loading/error states.
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useRoutineInstances(stableId, new Date());
 *
 * // With QueryBoundary
 * <QueryBoundary query={useRoutineInstances(stableId, date)}>
 *   {(instances) => <InstanceList instances={instances} />}
 * </QueryBoundary>
 * ```
 */
export function useRoutineInstances(stableId: string | undefined, date?: Date) {
  const query = useApiQuery<RoutineInstance[]>(
    queryKeys.routines.instances(stableId, date),
    () => getRoutineInstances(stableId!, date),
    { enabled: !!stableId },
  );

  const createMutation = useApiMutation(
    ({
      templateId,
      scheduledDate,
    }: {
      templateId: string;
      scheduledDate: Date;
    }) =>
      createRoutineInstance({
        templateId,
        stableId: stableId!,
        scheduledDate: scheduledDate.toISOString(),
      }),
    {
      onSuccess: () => {
        cacheInvalidation.routines.instances(stableId, date);
      },
    },
  );

  // Legacy API compatibility
  return {
    // Query state
    instances: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Full query object for QueryBoundary
    query,
    // Mutation function (legacy API)
    createInstance: async (templateId: string, scheduledDate: Date) => {
      if (!stableId) throw new Error("No stable selected");
      const result = await createMutation.mutateAsync({
        templateId,
        scheduledDate,
      });
      return result;
    },
    // Mutation object for more control
    createMutation,
  };
}

/**
 * Hook for managing routine instances across multiple stables.
 *
 * Fetches routine instances from all provided stables in parallel
 * and returns a combined list.
 *
 * @example
 * ```tsx
 * const { instances, loading, query } = useRoutineInstancesMultiStable(stables, new Date());
 *
 * <QueryBoundary query={query}>
 *   {(instances) => <InstanceList instances={instances} />}
 * </QueryBoundary>
 * ```
 */
export function useRoutineInstancesMultiStable(
  stables: Array<{ id: string }>,
  date?: Date,
) {
  const stableIds = stables.map((s) => s.id);
  const stableIdsKey = stableIds.sort().join(",");
  const dateString = date?.toISOString().split("T")[0];

  const query = useApiQuery<RoutineInstance[]>(
    [
      ...queryKeys.routines.all,
      "instances",
      "multi",
      { stableIdsKey, dateString },
    ] as const,
    async () => {
      if (stables.length === 0) return [];
      const allInstances = await Promise.all(
        stables.map((stable) => getRoutineInstances(stable.id, date)),
      );
      return allInstances.flat();
    },
    { enabled: stables.length > 0 },
  );

  const createMutation = useApiMutation(
    ({
      stableId,
      templateId,
      scheduledDate,
    }: {
      stableId: string;
      templateId: string;
      scheduledDate: Date;
    }) =>
      createRoutineInstance({
        templateId,
        stableId,
        scheduledDate: scheduledDate.toISOString(),
      }),
    {
      onSuccess: () => {
        // Invalidate the multi-stable query
        query.refetch();
      },
    },
  );

  // Legacy API compatibility
  return {
    instances: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
    createInstance: async (
      stableId: string,
      templateId: string,
      scheduledDate: Date,
    ) => {
      const result = await createMutation.mutateAsync({
        stableId,
        templateId,
        scheduledDate,
      });
      return result;
    },
    createMutation,
  };
}

/**
 * Combined hook for fetching routine instances, handling both single and multi-stable cases.
 *
 * @param selectedStableId - Selected stable ID ("all" for all stables, or specific stable ID)
 * @param stables - Array of all available stables
 * @param date - Date for fetching instances
 * @returns Query result with routine instances array
 */
export function useRoutineInstancesForStable(
  selectedStableId: string,
  stables: Array<{ id: string }>,
  date?: Date,
) {
  const isAllStables = selectedStableId === "all";
  const stableIds = stables.map((s) => s.id);
  const stableIdsKey = stableIds.sort().join(",");
  const dateString = date?.toISOString().split("T")[0];

  const query = useApiQuery<RoutineInstance[]>(
    isAllStables
      ? ([
          ...queryKeys.routines.all,
          "instances",
          "multi",
          { stableIdsKey, dateString },
        ] as const)
      : queryKeys.routines.instances(selectedStableId, date),
    async () => {
      if (stables.length === 0) return [];
      if (isAllStables) {
        const allInstances = await Promise.all(
          stables.map((stable) => getRoutineInstances(stable.id, date)),
        );
        return allInstances.flat();
      }
      return getRoutineInstances(selectedStableId, date);
    },
    { enabled: stables.length > 0 && !!selectedStableId },
  );

  const createMutation = useApiMutation(
    ({
      stableId,
      templateId,
      scheduledDate,
    }: {
      stableId: string;
      templateId: string;
      scheduledDate: Date;
    }) =>
      createRoutineInstance({
        templateId,
        stableId,
        scheduledDate: scheduledDate.toISOString(),
      }),
    {
      onSuccess: () => {
        query.refetch();
      },
    },
  );

  // Legacy API compatibility
  return {
    instances: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    query,
    createInstance: async (
      stableId: string,
      templateId: string,
      scheduledDate: Date,
    ) => {
      const result = await createMutation.mutateAsync({
        stableId,
        templateId,
        scheduledDate,
      });
      return result;
    },
    createMutation,
  };
}

/**
 * Hook for managing the active routine flow state
 */
export function useRoutineFlow(instanceId: string | undefined) {
  const [instance, setInstance] = useState<RoutineInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current step index from instance
  const currentStepIndex = instance?.progress.stepsCompleted ?? 0;

  // Get current step configuration
  const currentStep: RoutineStep | undefined = instance
    ? (instance as any).template?.steps?.[currentStepIndex]
    : undefined;

  // Calculate if all horses in current step are completed
  const currentStepProgress =
    instance?.progress.stepProgress[currentStep?.id ?? ""];

  const isCurrentStepComplete =
    currentStepProgress?.status === "completed" ||
    currentStepProgress?.status === "skipped";

  const start = useCallback(
    async (dailyNotesAcknowledged: boolean = true) => {
      if (!instanceId) return;

      try {
        setLoading(true);
        setError(null);
        const updated = await startRoutineInstance(
          instanceId,
          dailyNotesAcknowledged,
        );
        setInstance(updated);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [instanceId],
  );

  const updateProgress = useCallback(
    async (
      stepId: string,
      status: "pending" | "in_progress" | "completed" | "skipped",
    ) => {
      if (!instanceId) return;

      try {
        setIsSubmitting(true);
        const updated = await updateRoutineProgress(instanceId, {
          stepId,
          status,
        });
        setInstance(updated);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [instanceId],
  );

  const updateHorseProgress = useCallback(
    async (
      stepId: string,
      horseId: string,
      progress: Partial<HorseStepProgress>,
    ) => {
      if (!instanceId) return;

      try {
        setIsSubmitting(true);
        const updated = await updateHorseStepProgress(
          instanceId,
          stepId,
          horseId,
          progress,
        );
        setInstance(updated);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [instanceId],
  );

  const completeStep = useCallback(
    async (stepId: string) => {
      await updateProgress(stepId, "completed");
    },
    [updateProgress],
  );

  const skipStep = useCallback(
    async (stepId: string) => {
      await updateProgress(stepId, "skipped");
    },
    [updateProgress],
  );

  const complete = useCallback(
    async (notes?: string) => {
      if (!instanceId) return;

      try {
        setIsSubmitting(true);
        const updated = await completeRoutineInstance(instanceId, notes);
        setInstance(updated);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [instanceId],
  );

  const cancel = useCallback(
    async (reason?: string) => {
      if (!instanceId) return;

      try {
        setIsSubmitting(true);
        const updated = await cancelRoutineInstance(instanceId, reason);
        setInstance(updated);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [instanceId],
  );

  const goToNextStep = useCallback(async () => {
    if (!currentStep?.id) return;
    await completeStep(currentStep.id);
  }, [currentStep?.id, completeStep]);

  const goToPreviousStep = useCallback(async () => {
    if (!instance) return;
    if (currentStepIndex <= 0) return; // Can't go back from first step

    // Get the previous step
    const template = (instance as any).template;
    const previousStep = template?.steps?.[currentStepIndex - 1];
    if (!previousStep?.id) return;

    // Mark the previous step as "in_progress" to allow re-doing it
    await updateProgress(previousStep.id, "in_progress");
  }, [instance, currentStepIndex, updateProgress]);

  const markHorseDone = useCallback(
    async (horseId: string, notes?: string) => {
      if (!currentStep?.id) return;
      await updateHorseProgress(currentStep.id, horseId, {
        completed: true,
        notes,
      });
    },
    [currentStep?.id, updateHorseProgress],
  );

  const skipHorse = useCallback(
    async (horseId: string, reason: string) => {
      if (!currentStep?.id) return;
      await updateHorseProgress(currentStep.id, horseId, {
        skipped: true,
        skipReason: reason,
      });
    },
    [currentStep?.id, updateHorseProgress],
  );

  const confirmMedication = useCallback(
    async (horseId: string, given: boolean, skipReason?: string) => {
      if (!currentStep?.id) return;
      await updateHorseProgress(currentStep.id, horseId, {
        medicationGiven: given,
        medicationSkipped: !given,
        skipReason: !given ? skipReason : undefined,
      });
    },
    [currentStep?.id, updateHorseProgress],
  );

  const setBlanketAction = useCallback(
    async (horseId: string, action: "on" | "off" | "unchanged") => {
      if (!currentStep?.id) return;
      await updateHorseProgress(currentStep.id, horseId, {
        blanketAction: action,
      });
    },
    [currentStep?.id, updateHorseProgress],
  );

  return {
    instance,
    setInstance,
    loading,
    error,
    isSubmitting,
    currentStep,
    currentStepIndex,
    currentStepProgress,
    isCurrentStepComplete,
    start,
    updateProgress,
    updateHorseProgress,
    completeStep,
    skipStep,
    complete,
    cancel,
    goToNextStep,
    goToPreviousStep,
    markHorseDone,
    skipHorse,
    confirmMedication,
    setBlanketAction,
  };
}

/**
 * Hook for daily notes
 *
 * Uses TanStack Query for caching with local state for acknowledgment.
 */
export function useDailyNotes(stableId: string | undefined, date?: Date) {
  const [acknowledged, setAcknowledged] = useState(false);

  const query = useApiQuery<DailyNotes | null>(
    queryKeys.routines.dailyNotes(stableId, date),
    () => getDailyNotes(stableId!, date),
    { enabled: !!stableId },
  );

  const acknowledge = useCallback(() => {
    setAcknowledged(true);
  }, []);

  const notes = query.data ?? null;
  const hasAlerts = notes?.alerts && notes.alerts.length > 0;
  const hasCriticalAlerts =
    notes?.alerts?.some((a) => a.priority === "critical") ?? false;
  const hasHorseNotes = notes?.horseNotes && notes.horseNotes.length > 0;

  // Legacy API compatibility
  return {
    // Query state
    notes,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Full query object for QueryBoundary
    query,
    // Local state
    acknowledged,
    acknowledge,
    // Computed values
    hasAlerts,
    hasCriticalAlerts,
    hasHorseNotes,
  };
}

/**
 * Hook for getting horse-specific notes from daily notes
 */
export function useHorseNotes(notes: DailyNotes | null, horseId: string) {
  const horseNote = notes?.horseNotes?.find((n) => n.horseId === horseId);
  const relatedAlerts = notes?.alerts?.filter((a) =>
    a.affectedHorseIds?.includes(horseId),
  );

  return {
    note: horseNote,
    alerts: relatedAlerts ?? [],
    hasNote: !!horseNote,
    hasAlerts: (relatedAlerts?.length ?? 0) > 0,
    priority: horseNote?.priority,
  };
}

/**
 * Hook for scheduling routines with fairness algorithm integration
 */
export function useRoutineScheduling(
  stableId: string | undefined,
  organizationId: string | undefined,
) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const scheduleRoutine = useCallback(
    async (
      templateId: string,
      dates: Date[],
      assignedTo?: string,
      useAutoAssign?: boolean,
    ) => {
      if (!stableId) throw new Error("No stable selected");

      setIsScheduling(true);
      setError(null);

      try {
        const results = await Promise.all(
          dates.map(async (date) => {
            const scheduledDate = date.toISOString().split("T")[0];
            if (!scheduledDate) throw new Error("Invalid date");
            return createRoutineInstance({
              templateId,
              stableId,
              scheduledDate,
              assignedTo: useAutoAssign ? undefined : assignedTo,
            });
          }),
        );
        return results;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsScheduling(false);
      }
    },
    [stableId],
  );

  const scheduleRecurring = useCallback(
    async (
      templateId: string,
      startDate: Date,
      weeksCount: number,
      daysOfWeek: number[], // 0 = Sunday, 1 = Monday, etc.
      assignedTo?: string,
    ) => {
      if (!stableId) throw new Error("No stable selected");

      const dates: Date[] = [];
      const current = new Date(startDate);

      for (let week = 0; week < weeksCount; week++) {
        for (let day = 0; day < 7; day++) {
          if (daysOfWeek.includes(current.getDay())) {
            dates.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }
      }

      return scheduleRoutine(templateId, dates, assignedTo);
    },
    [stableId, scheduleRoutine],
  );

  return {
    scheduleRoutine,
    scheduleRecurring,
    isScheduling,
    error,
  };
}

/**
 * Hook for routine analytics and completion tracking
 */
export function useRoutineAnalytics(
  stableId: string | undefined,
  dateRange?: { start: Date; end: Date },
) {
  const [analytics, setAnalytics] = useState<{
    totalScheduled: number;
    totalCompleted: number;
    totalMissed: number;
    completionRate: number;
    averageDuration: number;
    byType: Record<string, { scheduled: number; completed: number }>;
    byUser: Record<
      string,
      { assigned: number; completed: number; points: number }
    >;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const calculateAnalytics = useCallback(async () => {
    if (!stableId) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // For now, use the default date (today) to get instances
      // In a real implementation, this would fetch data for the date range
      const instances = await getRoutineInstances(stableId, dateRange?.start);

      const stats = {
        totalScheduled: instances.length,
        totalCompleted: instances.filter((i) => i.status === "completed")
          .length,
        totalMissed: instances.filter((i) => i.status === "missed").length,
        completionRate: 0,
        averageDuration: 0,
        byType: {} as Record<string, { scheduled: number; completed: number }>,
        byUser: {} as Record<
          string,
          { assigned: number; completed: number; points: number }
        >,
      };

      if (stats.totalScheduled > 0) {
        stats.completionRate = Math.round(
          (stats.totalCompleted / stats.totalScheduled) * 100,
        );
      }

      // Calculate duration for completed routines
      const completedWithDuration = instances.filter(
        (i) => i.status === "completed" && i.startedAt && i.completedAt,
      );
      if (completedWithDuration.length > 0) {
        const totalDuration = completedWithDuration.reduce((sum, i) => {
          const start = new Date(i.startedAt as unknown as string).getTime();
          const end = new Date(i.completedAt as unknown as string).getTime();
          return sum + (end - start) / 60000; // Convert to minutes
        }, 0);
        stats.averageDuration = Math.round(
          totalDuration / completedWithDuration.length,
        );
      }

      // Group by routine type and user
      instances.forEach((instance) => {
        const template = (instance as any).template;
        const type = template?.type ?? "custom";

        if (!stats.byType[type]) {
          stats.byType[type] = { scheduled: 0, completed: 0 };
        }
        stats.byType[type].scheduled++;
        if (instance.status === "completed") {
          stats.byType[type].completed++;
        }

        if (instance.assignedTo) {
          if (!stats.byUser[instance.assignedTo]) {
            stats.byUser[instance.assignedTo] = {
              assigned: 0,
              completed: 0,
              points: 0,
            };
          }
          const userStats = stats.byUser[instance.assignedTo];
          if (userStats) {
            userStats.assigned++;
            if (instance.status === "completed") {
              userStats.completed++;
              userStats.points += instance.pointsAwarded ?? 0;
            }
          }
        }
      });

      setAnalytics(stats);
    } catch (err) {
      console.error("Error calculating routine analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [stableId, dateRange?.start]);

  useEffect(() => {
    calculateAnalytics();
  }, [calculateAnalytics]);

  return {
    analytics,
    loading,
    refetch: calculateAnalytics,
  };
}
