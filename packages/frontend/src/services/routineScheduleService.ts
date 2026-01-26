import { apiClient } from "@/lib/apiClient";
import type {
  RoutineSchedule,
  CreateRoutineScheduleInput,
  UpdateRoutineScheduleInput,
} from "@shared/types";

// ==================== Routine Schedules CRUD ====================

/**
 * Get all routine schedules for a stable
 */
export async function getRoutineSchedules(
  stableId: string,
  options?: {
    templateId?: string;
    isEnabled?: boolean;
    limit?: number;
    offset?: number;
  },
): Promise<RoutineSchedule[]> {
  const params: Record<string, string> = { stableId };
  if (options?.templateId) params.templateId = options.templateId;
  if (options?.isEnabled !== undefined)
    params.isEnabled = String(options.isEnabled);
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);

  const response = await apiClient.get<{ schedules: RoutineSchedule[] }>(
    "/routine-schedules",
    params,
  );

  return response.schedules;
}

/**
 * Get a single routine schedule by ID
 */
export async function getRoutineSchedule(id: string): Promise<RoutineSchedule> {
  return apiClient.get<RoutineSchedule>(`/routine-schedules/${id}`);
}

/**
 * Create a new routine schedule
 */
export async function createRoutineSchedule(
  data: CreateRoutineScheduleInput,
): Promise<RoutineSchedule> {
  return apiClient.post<RoutineSchedule>("/routine-schedules", data);
}

/**
 * Update a routine schedule
 */
export async function updateRoutineSchedule(
  id: string,
  data: UpdateRoutineScheduleInput,
): Promise<RoutineSchedule> {
  return apiClient.put<RoutineSchedule>(`/routine-schedules/${id}`, data);
}

/**
 * Delete a routine schedule
 */
export async function deleteRoutineSchedule(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete<{ success: boolean; message: string }>(
    `/routine-schedules/${id}`,
  );
}

/**
 * Toggle routine schedule enabled state
 */
export async function toggleRoutineScheduleEnabled(
  id: string,
  isEnabled: boolean,
): Promise<RoutineSchedule> {
  return apiClient.post<RoutineSchedule>(`/routine-schedules/${id}/toggle`, {
    isEnabled,
  });
}
