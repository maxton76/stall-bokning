import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { RoutineInstance } from "@shared/types";
import {
  cancelRoutineInstance,
  deleteRoutineInstance,
} from "@/services/routineService";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
} from "date-fns";

// ==================== Query Keys ====================

export const scheduledRoutinesKeys = {
  all: ["scheduledRoutines"] as const,
  byStable: (stableId: string) =>
    [...scheduledRoutinesKeys.all, "stable", stableId] as const,
  byDateRange: (stableId: string, startDate: Date, endDate: Date) =>
    [
      ...scheduledRoutinesKeys.byStable(stableId),
      "dateRange",
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd"),
    ] as const,
  byWeek: (stableId: string, weekStart: Date) =>
    [
      ...scheduledRoutinesKeys.byStable(stableId),
      "week",
      format(weekStart, "yyyy-MM-dd"),
    ] as const,
};

// ==================== API Functions ====================

interface GetScheduledRoutinesParams {
  stableId: string;
  startDate: Date;
  endDate: Date;
}

async function getScheduledRoutinesByDateRange({
  stableId,
  startDate,
  endDate,
}: GetScheduledRoutinesParams): Promise<RoutineInstance[]> {
  const params: Record<string, string> = {
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    limit: "100",
  };

  const response = await apiClient.get<{ routineInstances: RoutineInstance[] }>(
    `/routines/instances/stable/${stableId}`,
    params,
  );

  return response.routineInstances;
}

// ==================== Types ====================

export interface ScheduleSlot {
  id: string;
  title: string;
  time: string;
  assignee?: string;
  assigneeId?: string;
  type: "feeding" | "cleaning" | "routine" | "other";
  status: RoutineInstance["status"];
  templateId: string;
  templateType?: string;
  templateIcon?: string;
  templateColor?: string;
  pointsValue: number;
  progress: {
    stepsCompleted: number;
    stepsTotal: number;
    percentComplete: number;
  };
  instance: RoutineInstance;
}

export interface DaySchedule {
  date: Date;
  dateStr: string;
  slots: ScheduleSlot[];
}

export interface WeekSchedule {
  weekStart: Date;
  weekEnd: Date;
  days: DaySchedule[];
  totalRoutines: number;
  completedRoutines: number;
  assignedRoutines: number;
  unassignedRoutines: number;
  cancelledRoutines: number;
}

// ==================== Helper Functions ====================

/**
 * Map routine type to slot type for display
 */
function mapRoutineTypeToSlotType(
  routineType?: string,
  stepCategory?: string,
): ScheduleSlot["type"] {
  if (
    routineType === "morning" ||
    routineType === "evening" ||
    routineType === "midday"
  ) {
    // Check if it's primarily feeding-based
    if (stepCategory === "feeding") return "feeding";
    if (stepCategory === "mucking" || stepCategory === "cleaning")
      return "cleaning";
    return "routine";
  }
  return "routine";
}

/**
 * Convert RoutineInstance to ScheduleSlot
 */
function instanceToSlot(instance: RoutineInstance): ScheduleSlot {
  const template = (instance as any).template;

  return {
    id: instance.id,
    title: instance.templateName || template?.name || "Rutin",
    time: instance.scheduledStartTime || template?.defaultStartTime || "00:00",
    assignee: instance.assignedToName,
    assigneeId: instance.assignedTo,
    type: mapRoutineTypeToSlotType(template?.type),
    status: instance.status,
    templateId: instance.templateId,
    templateType: template?.type,
    templateIcon: template?.icon,
    templateColor: template?.color,
    pointsValue: instance.pointsValue,
    progress: {
      stepsCompleted: instance.progress?.stepsCompleted || 0,
      stepsTotal: instance.progress?.stepsTotal || 0,
      percentComplete: instance.progress?.percentComplete || 0,
    },
    instance,
  };
}

/**
 * Group routine instances by date
 */
function groupInstancesByDate(
  instances: RoutineInstance[],
  weekStart: Date,
  weekEnd: Date,
): Map<string, ScheduleSlot[]> {
  const grouped = new Map<string, ScheduleSlot[]>();

  // Initialize all dates in range
  let currentDate = weekStart;
  while (currentDate <= weekEnd) {
    grouped.set(format(currentDate, "yyyy-MM-dd"), []);
    currentDate = addDays(currentDate, 1);
  }

  // Group instances by scheduledDate
  for (const instance of instances) {
    // scheduledDate can be string (from JSON), Date, or Firestore Timestamp
    const scheduledDate = instance.scheduledDate as unknown;
    let dateStr: string | undefined;

    // Handle different date formats
    if (typeof scheduledDate === "string") {
      dateStr = scheduledDate.split("T")[0];
    } else if (
      scheduledDate &&
      typeof (scheduledDate as any).toDate === "function"
    ) {
      dateStr = format((scheduledDate as any).toDate(), "yyyy-MM-dd");
    } else if (scheduledDate instanceof Date) {
      dateStr = format(scheduledDate, "yyyy-MM-dd");
    }

    if (!dateStr) {
      continue;
    }

    const slots = grouped.get(dateStr) || [];
    slots.push(instanceToSlot(instance));
    grouped.set(dateStr, slots);
  }

  // Sort slots by time within each day
  for (const [dateStr, slots] of grouped) {
    slots.sort((a, b) => a.time.localeCompare(b.time));
    grouped.set(dateStr, slots);
  }

  return grouped;
}

/**
 * Build week schedule from grouped instances
 */
function buildWeekSchedule(
  groupedSlots: Map<string, ScheduleSlot[]>,
  weekStart: Date,
): WeekSchedule {
  const days: DaySchedule[] = [];
  let totalRoutines = 0;
  let completedRoutines = 0;
  let assignedRoutines = 0;
  let unassignedRoutines = 0;
  let cancelledRoutines = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const slots = groupedSlots.get(dateStr) || [];

    days.push({
      date,
      dateStr,
      slots,
    });

    // Update counters
    totalRoutines += slots.length;
    completedRoutines += slots.filter((s) => s.status === "completed").length;
    assignedRoutines += slots.filter((s) => s.assigneeId).length;
    unassignedRoutines += slots.filter((s) => !s.assigneeId).length;
    cancelledRoutines += slots.filter((s) => s.status === "cancelled").length;
  }

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    days,
    totalRoutines,
    completedRoutines,
    assignedRoutines,
    unassignedRoutines,
    cancelledRoutines,
  };
}

// ==================== Hooks ====================

/**
 * Hook to fetch scheduled routines for a week
 * Includes retry logic for Cloud Run cold starts
 */
export function useWeekScheduledRoutines(
  stableId: string | undefined,
  weekStart: Date,
) {
  const weekEnd = addDays(weekStart, 6);

  return useQuery({
    queryKey: scheduledRoutinesKeys.byWeek(stableId || "", weekStart),
    queryFn: async (): Promise<WeekSchedule> => {
      if (!stableId) {
        throw new Error("stableId is required");
      }

      const instances = await getScheduledRoutinesByDateRange({
        stableId,
        startDate: startOfDay(weekStart),
        endDate: endOfDay(weekEnd),
      });

      const groupedSlots = groupInstancesByDate(instances, weekStart, weekEnd);
      return buildWeekSchedule(groupedSlots, weekStart);
    },
    enabled: !!stableId,
    staleTime: 30 * 1000, // 30 seconds
    // Retry configuration for Cloud Run cold starts
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook to fetch scheduled routines for a date range
 * Includes retry logic for Cloud Run cold starts
 */
export function useScheduledRoutines(
  stableId: string | undefined,
  startDate: Date,
  endDate: Date,
) {
  return useQuery({
    queryKey: scheduledRoutinesKeys.byDateRange(
      stableId || "",
      startDate,
      endDate,
    ),
    queryFn: async (): Promise<RoutineInstance[]> => {
      if (!stableId) {
        throw new Error("stableId is required");
      }

      return getScheduledRoutinesByDateRange({
        stableId,
        startDate,
        endDate,
      });
    },
    enabled: !!stableId,
    staleTime: 30 * 1000,
    // Retry configuration for Cloud Run cold starts
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook to assign a routine instance to a user
 */
export function useAssignRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instanceId,
      assignedTo,
      assignedToName,
    }: {
      instanceId: string;
      assignedTo: string;
      assignedToName: string;
    }): Promise<RoutineInstance> => {
      // Note: This requires an assignment endpoint to be added
      const response = await apiClient.post<{ instance: RoutineInstance }>(
        `/routines/instances/${instanceId}/assign`,
        { assignedTo, assignedToName },
      );
      return response.instance;
    },
    onSuccess: () => {
      // Invalidate all scheduled routines queries
      queryClient.invalidateQueries({ queryKey: scheduledRoutinesKeys.all });
    },
  });
}

/**
 * Hook to cancel a scheduled routine instance
 */
export function useCancelScheduledRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instanceId,
      reason,
    }: {
      instanceId: string;
      reason?: string;
    }): Promise<RoutineInstance> => {
      return cancelRoutineInstance(instanceId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledRoutinesKeys.all });
    },
  });
}

/**
 * Hook to hard delete a routine instance
 */
export function useDeleteScheduledRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string): Promise<void> => {
      return deleteRoutineInstance(instanceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledRoutinesKeys.all });
    },
  });
}
