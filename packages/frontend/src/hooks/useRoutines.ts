import { useState, useEffect, useCallback } from "react";
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

/**
 * Hook for managing routine templates
 */
export function useRoutineTemplates(
  organizationId: string | undefined,
  stableId?: string,
) {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!organizationId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getRoutineTemplates(organizationId, stableId);
      setTemplates(data);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading routine templates:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, stableId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const create = async (data: CreateRoutineTemplateInput) => {
    const id = await createRoutineTemplate(data);
    await loadTemplates();
    return id;
  };

  const update = async (id: string, data: UpdateRoutineTemplateInput) => {
    await updateRoutineTemplate(id, data);
    await loadTemplates();
  };

  const remove = async (id: string) => {
    await deleteRoutineTemplate(id);
    await loadTemplates();
  };

  return {
    templates,
    loading,
    error,
    refetch: loadTemplates,
    create,
    update,
    remove,
  };
}

/**
 * Hook for managing routine instances for a specific date
 */
export function useRoutineInstances(stableId: string | undefined, date?: Date) {
  const [instances, setInstances] = useState<RoutineInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadInstances = useCallback(async () => {
    if (!stableId) {
      setInstances([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getRoutineInstances(stableId, date);
      setInstances(data);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading routine instances:", err);
    } finally {
      setLoading(false);
    }
  }, [stableId, date]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const createInstance = async (templateId: string, scheduledDate: Date) => {
    if (!stableId) throw new Error("No stable selected");

    const id = await createRoutineInstance({
      templateId,
      stableId,
      scheduledDate: scheduledDate.toISOString(),
    });
    await loadInstances();
    return id;
  };

  return {
    instances,
    loading,
    error,
    refetch: loadInstances,
    createInstance,
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
    ? (instance as any).templateSnapshot?.steps?.[currentStepIndex]
    : undefined;

  // Calculate if all horses in current step are completed
  const currentStepProgress =
    instance?.progress.stepProgress[currentStep?.id ?? ""];

  const isCurrentStepComplete =
    currentStepProgress?.status === "completed" ||
    currentStepProgress?.status === "skipped";

  const start = useCallback(async () => {
    if (!instanceId) return;

    try {
      setLoading(true);
      setError(null);
      const updated = await startRoutineInstance(instanceId);
      setInstance(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

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
          stepStatus: status,
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
    markHorseDone,
    skipHorse,
    confirmMedication,
    setBlanketAction,
  };
}

/**
 * Hook for daily notes
 */
export function useDailyNotes(stableId: string | undefined, date?: Date) {
  const [notes, setNotes] = useState<DailyNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!stableId) {
      setNotes(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getDailyNotes(stableId, date);
      setNotes(data);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading daily notes:", err);
    } finally {
      setLoading(false);
    }
  }, [stableId, date]);

  useEffect(() => {
    loadNotes();
    setAcknowledged(false); // Reset acknowledgment when date changes
  }, [loadNotes]);

  const acknowledge = useCallback(() => {
    setAcknowledged(true);
  }, []);

  const hasAlerts = notes?.alerts && notes.alerts.length > 0;

  const hasCriticalAlerts =
    notes?.alerts?.some((a) => a.priority === "critical") ?? false;

  const hasHorseNotes = notes?.horseNotes && notes.horseNotes.length > 0;

  return {
    notes,
    loading,
    error,
    refetch: loadNotes,
    acknowledged,
    acknowledge,
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
        const templateSnapshot = (instance as any).templateSnapshot;
        const type = templateSnapshot?.type ?? "custom";

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
