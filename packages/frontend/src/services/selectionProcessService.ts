import { apiClient } from "@/lib/apiClient";
import type {
  SelectionProcess,
  SelectionProcessWithContext,
  SelectionProcessSummary,
  CreateSelectionProcessInput,
  UpdateSelectionProcessInput,
  ListSelectionProcessesQuery,
  CompleteTurnResult,
} from "@equiduty/shared";

// ==================== Selection Process CRUD ====================

/**
 * List selection processes for a stable
 * Returns summary view with user context (is it their turn, etc.)
 */
export async function listSelectionProcesses(
  params: ListSelectionProcessesQuery,
): Promise<SelectionProcessSummary[]> {
  const queryParams: Record<string, string> = {};

  if (params.stableId) queryParams.stableId = params.stableId;
  if (params.status) queryParams.status = params.status;
  if (params.limit !== undefined) queryParams.limit = String(params.limit);
  if (params.offset !== undefined) queryParams.offset = String(params.offset);

  const response = await apiClient.get<{
    selectionProcesses: SelectionProcessSummary[];
  }>("/selection-processes", queryParams);

  return response.selectionProcesses;
}

/**
 * Get a single selection process with user context
 * Includes information about whether it's the requesting user's turn
 */
export async function getSelectionProcess(
  processId: string,
): Promise<SelectionProcessWithContext> {
  return apiClient.get<SelectionProcessWithContext>(
    `/selection-processes/${processId}`,
  );
}

/**
 * Create a new selection process (admin only)
 * Process is created in draft status
 */
export async function createSelectionProcess(
  input: CreateSelectionProcessInput,
): Promise<SelectionProcess> {
  return apiClient.post<SelectionProcess>("/selection-processes", input);
}

/**
 * Update a draft selection process (admin only)
 * Only draft processes can be updated
 */
export async function updateSelectionProcess(
  processId: string,
  input: UpdateSelectionProcessInput,
): Promise<SelectionProcess> {
  return apiClient.put<SelectionProcess>(
    `/selection-processes/${processId}`,
    input,
  );
}

/**
 * Delete a draft selection process (admin only)
 * Only draft processes can be deleted
 */
export async function deleteSelectionProcess(
  processId: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete<{ success: boolean; message: string }>(
    `/selection-processes/${processId}`,
  );
}

// ==================== Selection Process Actions ====================

/**
 * Start a selection process (admin only)
 * Transitions from draft to active status
 * Activates the first turn in the queue
 */
export async function startSelectionProcess(
  processId: string,
): Promise<SelectionProcess> {
  return apiClient.post<SelectionProcess>(
    `/selection-processes/${processId}/start`,
  );
}

/**
 * Complete the current turn (current turn user only)
 * Advances to the next turn or completes the process if last turn
 */
export async function completeTurn(
  processId: string,
): Promise<CompleteTurnResult> {
  return apiClient.post<CompleteTurnResult>(
    `/selection-processes/${processId}/complete-turn`,
  );
}

/**
 * Cancel a selection process (admin only)
 * Can only cancel draft or active processes
 */
export async function cancelSelectionProcess(
  processId: string,
  reason?: string,
): Promise<SelectionProcess> {
  return apiClient.post<SelectionProcess>(
    `/selection-processes/${processId}/cancel`,
    { reason },
  );
}

/**
 * Update selection process dates (admin only)
 * Can only update dates on active processes
 */
export async function updateSelectionProcessDates(
  processId: string,
  dates: { selectionStartDate?: string; selectionEndDate?: string },
): Promise<SelectionProcess> {
  return apiClient.patch<SelectionProcess>(
    `/selection-processes/${processId}/dates`,
    dates,
  );
}
