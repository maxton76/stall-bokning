import { authFetchJSON } from "@/utils/authFetch";
import type {
  RoutineTemplate,
  RoutineInstance,
  DailyNotes,
  HorseStepProgress,
  CreateRoutineTemplateInput,
  UpdateRoutineTemplateInput,
  UpdateStepProgressInput,
  UpdateHorseProgressInput,
} from "@shared/types";

// Local interface for creating routine instances
interface CreateRoutineInstanceInput {
  templateId: string;
  stableId: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledStartTime?: string;
  assignedTo?: string;
}

const API_URL = import.meta.env.VITE_API_URL;

// ==================== Routine Templates ====================

/**
 * Get all routine templates for an organization
 */
export async function getRoutineTemplates(
  organizationId: string,
  stableId?: string,
  activeOnly: boolean = true,
): Promise<RoutineTemplate[]> {
  const params = new URLSearchParams();
  params.append("organizationId", organizationId);
  if (stableId) params.append("stableId", stableId);
  if (activeOnly) params.append("activeOnly", "true");

  const response = await authFetchJSON<{ templates: RoutineTemplate[] }>(
    `${API_URL}/api/v1/routines/templates?${params.toString()}`,
    { method: "GET" },
  );

  return response.templates;
}

/**
 * Get a single routine template by ID
 */
export async function getRoutineTemplate(
  templateId: string,
): Promise<RoutineTemplate> {
  const response = await authFetchJSON<{ template: RoutineTemplate }>(
    `${API_URL}/api/v1/routines/templates/${templateId}`,
    { method: "GET" },
  );

  return response.template;
}

/**
 * Create a new routine template
 */
export async function createRoutineTemplate(
  data: CreateRoutineTemplateInput,
): Promise<string> {
  const response = await authFetchJSON<{ id: string }>(
    `${API_URL}/api/v1/routines/templates`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
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
  await authFetchJSON(`${API_URL}/api/v1/routines/templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a routine template
 */
export async function deleteRoutineTemplate(templateId: string): Promise<void> {
  await authFetchJSON(`${API_URL}/api/v1/routines/templates/${templateId}`, {
    method: "DELETE",
  });
}

// ==================== Routine Instances ====================

/**
 * Get a single routine instance by ID
 */
export async function getRoutineInstance(
  instanceId: string,
): Promise<RoutineInstance> {
  return authFetchJSON<RoutineInstance>(
    `${API_URL}/api/v1/routines/instances/${instanceId}`,
    { method: "GET" },
  );
}

/**
 * Get routine instances for a stable on a specific date
 */
export async function getRoutineInstances(
  stableId: string,
  date?: Date,
): Promise<RoutineInstance[]> {
  const params = new URLSearchParams();
  params.append("stableId", stableId);
  if (date) {
    const dateStr = date.toISOString().split("T")[0];
    if (dateStr) {
      params.append("date", dateStr);
    }
  }

  const response = await authFetchJSON<{ instances: RoutineInstance[] }>(
    `${API_URL}/api/v1/routines/instances?${params.toString()}`,
    { method: "GET" },
  );

  return response.instances;
}

/**
 * Create a new routine instance from a template
 */
export async function createRoutineInstance(
  data: CreateRoutineInstanceInput,
): Promise<string> {
  const response = await authFetchJSON<{ id: string }>(
    `${API_URL}/api/v1/routines/instances`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response.id;
}

/**
 * Start a routine instance
 */
export async function startRoutineInstance(
  instanceId: string,
  dailyNotesAcknowledged: boolean = true,
): Promise<RoutineInstance> {
  const response = await authFetchJSON<{ instance: RoutineInstance }>(
    `${API_URL}/api/v1/routines/instances/${instanceId}/start`,
    {
      method: "POST",
      body: JSON.stringify({
        instanceId,
        dailyNotesAcknowledged,
      }),
    },
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
  const response = await authFetchJSON<{ instance: RoutineInstance }>(
    `${API_URL}/api/v1/routines/instances/${instanceId}/progress`,
    {
      method: "PUT",
      body: JSON.stringify({
        ...update,
        instanceId,
      }),
    },
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
  const response = await authFetchJSON<{ instance: RoutineInstance }>(
    `${API_URL}/api/v1/routines/instances/${instanceId}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
    },
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
  const response = await authFetchJSON<{ instance: RoutineInstance }>(
    `${API_URL}/api/v1/routines/instances/${instanceId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );

  return response.instance;
}

/**
 * Restart a cancelled routine instance
 */
export async function restartRoutineInstance(
  instanceId: string,
): Promise<RoutineInstance> {
  const response = await authFetchJSON<{ instance: RoutineInstance }>(
    `${API_URL}/api/v1/routines/instances/${instanceId}/restart`,
    {
      method: "POST",
    },
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
    const response = await authFetchJSON<{ notes: DailyNotes }>(
      `${API_URL}/api/v1/daily-notes/${stableId}?date=${dateStr}`,
      { method: "GET" },
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
  const response = await authFetchJSON<{ notes: DailyNotes }>(
    `${API_URL}/api/v1/daily-notes/${stableId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        date: date.toISOString().split("T")[0],
        ...notes,
      }),
    },
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
  const response = await authFetchJSON<{ notes: DailyNotes }>(
    `${API_URL}/api/v1/daily-notes/${stableId}/horse-notes`,
    {
      method: "POST",
      body: JSON.stringify(horseNote),
    },
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
  const response = await authFetchJSON<{ notes: DailyNotes }>(
    `${API_URL}/api/v1/daily-notes/${stableId}/horse-notes/${horseId}`,
    { method: "DELETE" },
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
  const response = await authFetchJSON<{ notes: DailyNotes }>(
    `${API_URL}/api/v1/daily-notes/${stableId}/alerts`,
    {
      method: "POST",
      body: JSON.stringify(alert),
    },
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
  const response = await authFetchJSON<{ notes: DailyNotes }>(
    `${API_URL}/api/v1/daily-notes/${stableId}/alerts/${alertId}`,
    { method: "DELETE" },
  );

  return response.notes;
}
