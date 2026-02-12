import { apiClient } from "@/lib/apiClient";
import type {
  RoutineTemplate,
  RoutineInstance,
  DailyNotes,
  HorseDailyNote,
  HorseStepProgress,
  CreateRoutineTemplateInput,
  UpdateRoutineTemplateInput,
  UpdateStepProgressInput,
  UpdateHorseProgressInput,
  CreateOwnerHorseNoteInput,
  UpdateOwnerHorseNoteInput,
} from "@shared/types";

// Local interface for creating routine instances
interface CreateRoutineInstanceInput {
  templateId: string;
  stableId: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledStartTime?: string;
  assignedTo?: string;
}

// ==================== Routine Templates ====================

/**
 * Get all routine templates for an organization
 */
export async function getRoutineTemplates(
  organizationId: string,
  stableId?: string,
  activeOnly: boolean = true,
): Promise<RoutineTemplate[]> {
  const params: Record<string, string> = { organizationId };
  if (stableId) params.stableId = stableId;
  if (activeOnly) params.activeOnly = "true";

  const response = await apiClient.get<{ templates: RoutineTemplate[] }>(
    "/routines/templates",
    params,
  );

  return response.templates;
}

/**
 * Get a single routine template by ID
 */
export async function getRoutineTemplate(
  templateId: string,
): Promise<RoutineTemplate> {
  const response = await apiClient.get<{ template: RoutineTemplate }>(
    `/routines/templates/${templateId}`,
  );

  return response.template;
}

/**
 * Create a new routine template
 */
export async function createRoutineTemplate(
  data: CreateRoutineTemplateInput,
): Promise<string> {
  const response = await apiClient.post<{ id: string }>(
    "/routines/templates",
    data,
  );

  return response.id;
}

/**
 * Update an existing routine template
 */
export async function updateRoutineTemplate(
  templateId: string,
  data: UpdateRoutineTemplateInput,
): Promise<void> {
  await apiClient.put(`/routines/templates/${templateId}`, data);
}

/**
 * Delete a routine template
 */
export async function deleteRoutineTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`/routines/templates/${templateId}`);
}

// ==================== Routine Instances ====================

/**
 * Get a single routine instance by ID
 */
export async function getRoutineInstance(
  instanceId: string,
): Promise<RoutineInstance> {
  return apiClient.get<RoutineInstance>(`/routines/instances/${instanceId}`);
}

/**
 * Get routine instances for a stable on a specific date
 */
export async function getRoutineInstances(
  stableId: string,
  date?: Date,
): Promise<RoutineInstance[]> {
  const params: Record<string, string> = { stableId };
  if (date) {
    const dateStr = date.toISOString().split("T")[0];
    if (dateStr) {
      params.date = dateStr;
    }
  }

  const response = await apiClient.get<{ instances: RoutineInstance[] }>(
    "/routines/instances",
    params,
  );

  return response.instances;
}

/**
 * Actionable statuses for routine instances (can be started or continued)
 */
export const ACTIONABLE_ROUTINE_STATUSES: string[] = [
  "scheduled",
  "started",
  "in_progress",
];

/**
 * Get scheduled/actionable routine instances for a stable
 * Fetches routines with scheduledDate >= today and filters client-side for actionable statuses
 */
export async function getScheduledRoutineInstances(
  stableId: string,
): Promise<RoutineInstance[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const params: Record<string, string> = {
    startDate: todayStr!,
    limit: "50",
  };

  const response = await apiClient.get<{
    routineInstances: RoutineInstance[];
  }>(`/routines/instances/stable/${stableId}`, params);

  // Filter client-side for actionable statuses (API only supports single status)
  return response.routineInstances.filter((instance) =>
    ACTIONABLE_ROUTINE_STATUSES.includes(instance.status),
  );
}

/**
 * Get today's routine instances assigned to a specific user
 * Filters to today only and only shows routines assigned to the user
 */
export async function getTodaysUserRoutineInstances(
  stableId: string,
  userId: string,
): Promise<RoutineInstance[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const params: Record<string, string> = {
    startDate: todayStr!,
    endDate: todayStr!, // Only today
    assignedTo: userId, // Only user's routines
    limit: "50",
  };

  const response = await apiClient.get<{
    routineInstances: RoutineInstance[];
  }>(`/routines/instances/stable/${stableId}`, params);

  // Filter client-side for actionable statuses
  return response.routineInstances.filter((instance) =>
    ACTIONABLE_ROUTINE_STATUSES.includes(instance.status),
  );
}

/**
 * Create a new routine instance from a template
 */
export async function createRoutineInstance(
  data: CreateRoutineInstanceInput,
): Promise<string> {
  const response = await apiClient.post<{ id: string }>(
    "/routines/instances",
    data,
  );

  return response.id;
}

/**
 * Bulk create routine instances
 */
export interface BulkCreateRoutineInstancesInput {
  templateId: string;
  stableId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  repeatDays?: number[]; // 0=Sunday, 1=Monday, etc.
  includeHolidays?: boolean;
  scheduledStartTime?: string;
  assignmentMode: "auto" | "manual" | "unassigned";
}

export interface BulkCreateRoutineInstancesResponse {
  success: boolean;
  createdCount: number;
  instanceIds: string[];
}

export async function bulkCreateRoutineInstances(
  data: BulkCreateRoutineInstancesInput,
): Promise<BulkCreateRoutineInstancesResponse> {
  const response = await apiClient.post<BulkCreateRoutineInstancesResponse>(
    "/routines/instances/bulk",
    data,
  );

  return response;
}

/**
 * Assign a routine instance to a user
 */
export async function assignRoutineInstance(
  instanceId: string,
  assignedTo: string,
  assignedToName: string,
): Promise<RoutineInstance> {
  const response = await apiClient.post<{ instance: RoutineInstance }>(
    `/routines/instances/${instanceId}/assign`,
    { assignedTo, assignedToName },
  );

  return response.instance;
}

/**
 * Start a routine instance
 */
export async function startRoutineInstance(
  instanceId: string,
  dailyNotesAcknowledged: boolean = true,
): Promise<RoutineInstance> {
  const response = await apiClient.post<{ instance: RoutineInstance }>(
    `/routines/instances/${instanceId}/start`,
    { instanceId, dailyNotesAcknowledged },
  );

  return response.instance;
}

/**
 * Update routine progress (step or horse completion)
 */
export async function updateRoutineProgress(
  instanceId: string,
  update: Omit<UpdateStepProgressInput, "instanceId">,
): Promise<RoutineInstance> {
  const response = await apiClient.put<{ instance: RoutineInstance }>(
    `/routines/instances/${instanceId}/progress`,
    { ...update, instanceId },
  );

  return response.instance;
}

/**
 * Complete a routine instance
 */
export async function completeRoutineInstance(
  instanceId: string,
  notes?: string,
): Promise<RoutineInstance> {
  const response = await apiClient.post<{ instance: RoutineInstance }>(
    `/routines/instances/${instanceId}/complete`,
    { notes },
  );

  return response.instance;
}

/**
 * Cancel a routine instance
 */
export async function cancelRoutineInstance(
  instanceId: string,
  reason?: string,
): Promise<RoutineInstance> {
  const response = await apiClient.post<{ instance: RoutineInstance }>(
    `/routines/instances/${instanceId}/cancel`,
    { reason },
  );

  return response.instance;
}

/**
 * Delete a routine instance (hard delete)
 */
export async function deleteRoutineInstance(instanceId: string): Promise<void> {
  await apiClient.delete(`/routines/instances/${instanceId}`);
}

/**
 * Restart a cancelled routine instance
 */
export async function restartRoutineInstance(
  instanceId: string,
): Promise<RoutineInstance> {
  const response = await apiClient.post<{ instance: RoutineInstance }>(
    `/routines/instances/${instanceId}/restart`,
  );

  return response.instance;
}

/**
 * Update horse step progress within a routine
 */
export async function updateHorseStepProgress(
  instanceId: string,
  stepId: string,
  horseId: string,
  progress: Partial<HorseStepProgress>,
): Promise<RoutineInstance> {
  return updateRoutineProgress(instanceId, {
    stepId,
    horseUpdates: [
      {
        horseId,
        ...progress,
      },
    ],
  });
}

// ==================== Daily Notes ====================

/**
 * Get daily notes for a stable on a specific date
 */
export async function getDailyNotes(
  stableId: string,
  date?: Date,
): Promise<DailyNotes | null> {
  const dateStr = date
    ? date.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  try {
    const response = await apiClient.get<{ notes: DailyNotes }>(
      `/daily-notes/${stableId}`,
      { date: dateStr },
    );

    return response.notes;
  } catch (error: any) {
    // Return null if no notes exist for this date
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Update daily notes for a stable
 */
export async function updateDailyNotes(
  stableId: string,
  date: Date,
  notes: {
    generalNotes?: string;
    weatherNotes?: string;
  },
): Promise<DailyNotes> {
  const response = await apiClient.put<{ notes: DailyNotes }>(
    `/daily-notes/${stableId}`,
    { date: date.toISOString().split("T")[0], ...notes },
  );

  return response.notes;
}

/**
 * Add a horse-specific note
 */
export async function addHorseNote(
  stableId: string,
  horseNote: {
    horseId: string;
    note: string;
    priority: "info" | "warning" | "critical";
    category?: string;
  },
): Promise<DailyNotes> {
  const response = await apiClient.post<{ notes: DailyNotes }>(
    `/daily-notes/${stableId}/horse-notes`,
    horseNote,
  );

  return response.notes;
}

/**
 * Remove a horse note
 */
export async function removeHorseNote(
  stableId: string,
  horseId: string,
): Promise<DailyNotes> {
  const response = await apiClient.delete<{ notes: DailyNotes }>(
    `/daily-notes/${stableId}/horse-notes/${horseId}`,
  );

  return response.notes;
}

/**
 * Add a daily alert
 */
export async function addDailyAlert(
  stableId: string,
  alert: {
    title: string;
    message: string;
    priority: "info" | "warning" | "critical";
    affectedHorses?: string[];
  },
): Promise<DailyNotes> {
  const response = await apiClient.post<{ notes: DailyNotes }>(
    `/daily-notes/${stableId}/alerts`,
    alert,
  );

  return response.notes;
}

/**
 * Remove a daily alert
 */
export async function removeDailyAlert(
  stableId: string,
  alertId: string,
): Promise<DailyNotes> {
  const response = await apiClient.delete<{ notes: DailyNotes }>(
    `/daily-notes/${stableId}/alerts/${alertId}`,
  );

  return response.notes;
}

// ==================== Owner Horse Notes ====================

/**
 * Create an owner horse note spanning a date range
 */
export async function createOwnerHorseNote(
  stableId: string,
  data: CreateOwnerHorseNoteInput,
): Promise<{ rangeGroupId: string; datesAffected: string[] }> {
  return apiClient.post<{ rangeGroupId: string; datesAffected: string[] }>(
    `/daily-notes/stable/${stableId}/owner-note`,
    data,
  );
}

/**
 * Update an owner horse note across all days in its range
 */
export async function updateOwnerHorseNote(
  stableId: string,
  rangeGroupId: string,
  startDate: string,
  endDate: string,
  data: UpdateOwnerHorseNoteInput,
): Promise<{ success: boolean; datesUpdated: number }> {
  return apiClient.put<{ success: boolean; datesUpdated: number }>(
    `/daily-notes/stable/${stableId}/owner-note/${rangeGroupId}?startDate=${startDate}&endDate=${endDate}`,
    data,
  );
}

/**
 * Delete an owner horse note from all days in its range
 */
export async function deleteOwnerHorseNote(
  stableId: string,
  rangeGroupId: string,
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; datesUpdated: number }> {
  return apiClient.delete<{ success: boolean; datesUpdated: number }>(
    `/daily-notes/stable/${stableId}/owner-note/${rangeGroupId}?startDate=${startDate}&endDate=${endDate}`,
  );
}

/**
 * List owner notes for a stable (deduplicated by rangeGroupId)
 */
export async function listOwnerHorseNotes(
  stableId: string,
  params?: { horseId?: string; from?: string; to?: string },
): Promise<HorseDailyNote[]> {
  const response = await apiClient.get<{ ownerNotes: HorseDailyNote[] }>(
    `/daily-notes/stable/${stableId}/owner-notes`,
    params as Record<string, string>,
  );
  return response.ownerNotes;
}
