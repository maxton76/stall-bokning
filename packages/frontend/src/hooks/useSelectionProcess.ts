import { useQueryClient } from "@tanstack/react-query";
import type {
  SelectionProcess,
  SelectionProcessWithContext,
  SelectionProcessSummary,
  CreateSelectionProcessInput,
  UpdateSelectionProcessInput,
  ListSelectionProcessesQuery,
  CompleteTurnResult,
} from "@equiduty/shared";
import {
  listSelectionProcesses,
  getSelectionProcess,
  createSelectionProcess,
  updateSelectionProcess,
  deleteSelectionProcess,
  startSelectionProcess,
  completeTurn,
  cancelSelectionProcess,
  updateSelectionProcessDates,
} from "@/services/selectionProcessService";
import { useApiQuery } from "./useApiQuery";
import { useApiMutation } from "./useApiMutation";

// ==================== Query Keys ====================

/**
 * Query key factory for selection process queries
 * Provides consistent cache key structure for invalidation
 */
export const selectionProcessKeys = {
  all: ["selectionProcesses"] as const,
  lists: () => [...selectionProcessKeys.all, "list"] as const,
  list: (params: ListSelectionProcessesQuery) =>
    [...selectionProcessKeys.lists(), params] as const,
  byStable: (stableId: string) =>
    [...selectionProcessKeys.lists(), { stableId }] as const,
  details: () => [...selectionProcessKeys.all, "detail"] as const,
  detail: (id: string) => [...selectionProcessKeys.details(), id] as const,
};

// ==================== Query Hooks ====================

/**
 * Hook for fetching selection processes list
 *
 * @param params - Query parameters (stableId, status, limit, offset)
 * @returns Query result with list of selection process summaries
 *
 * @example
 * ```tsx
 * const { processes, loading, error } = useSelectionProcesses({
 *   stableId: 'stable-123',
 *   status: 'active',
 * });
 * ```
 */
export function useSelectionProcesses(params: ListSelectionProcessesQuery) {
  const query = useApiQuery<SelectionProcessSummary[]>(
    selectionProcessKeys.list(params),
    () => listSelectionProcesses(params),
    { enabled: !!params.stableId },
  );

  return {
    // Query state
    processes: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Full query object for QueryBoundary
    query,
  };
}

/**
 * Hook for fetching a single selection process with user context
 *
 * @param processId - Selection process ID
 * @returns Query result with selection process details and user context
 *
 * @example
 * ```tsx
 * const { process, isCurrentTurn, loading } = useSelectionProcess(processId);
 *
 * if (isCurrentTurn) {
 *   // Show selection UI
 * }
 * ```
 */
export function useSelectionProcess(processId: string | undefined) {
  const query = useApiQuery<SelectionProcessWithContext>(
    selectionProcessKeys.detail(processId ?? ""),
    () => getSelectionProcess(processId!),
    { enabled: !!processId },
  );

  return {
    // Query state
    process: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // User context shortcuts
    isCurrentTurn: query.data?.isCurrentTurn ?? false,
    userTurnOrder: query.data?.userTurnOrder ?? null,
    userTurnStatus: query.data?.userTurnStatus ?? null,
    turnsAhead: query.data?.turnsAhead ?? 0,

    // Full query object for QueryBoundary
    query,
  };
}

// ==================== Mutation Hooks ====================

/**
 * Hook for creating a new selection process
 *
 * @example
 * ```tsx
 * const { t } = useTranslation("selectionProcess");
 * const { createProcess, isCreating } = useCreateSelectionProcess({
 *   successMessage: t("messages.successfully.created"),
 *   onSuccess: () => navigate('/selection-processes'),
 * });
 *
 * createProcess({
 *   stableId: 'stable-123',
 *   name: 'December 2024 Rutinval',
 *   selectionStartDate: '2024-12-01',
 *   selectionEndDate: '2024-12-31',
 *   memberOrder: [{ userId: 'user-1', userName: 'Anna', userEmail: 'anna@example.com' }],
 * });
 * ```
 */
export function useCreateSelectionProcess(options?: {
  onSuccess?: (data: SelectionProcess) => void;
  successMessage?: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation(
    (input: CreateSelectionProcessInput) => createSelectionProcess(input),
    {
      successMessage: options?.successMessage,
      onSuccess: (data) => {
        // Invalidate list queries
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.lists(),
        });
        options?.onSuccess?.(data);
      },
    },
  );

  return {
    createProcess: mutation.mutateAsync,
    isCreating: mutation.isPending,
    mutation,
  };
}

/**
 * Hook for updating a draft selection process
 *
 * @example
 * ```tsx
 * const { t } = useTranslation("selectionProcess");
 * const { updateProcess, isUpdating } = useUpdateSelectionProcess(processId, {
 *   successMessage: t("messages.successfully.updated"),
 * });
 *
 * updateProcess({ name: 'Updated Name' });
 * ```
 */
export function useUpdateSelectionProcess(
  processId: string,
  options?: {
    onSuccess?: (data: SelectionProcess) => void;
    successMessage?: string;
  },
) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation(
    (input: UpdateSelectionProcessInput) =>
      updateSelectionProcess(processId, input),
    {
      successMessage: options?.successMessage,
      onSuccess: (data) => {
        // Invalidate specific process and list queries
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.detail(processId),
        });
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.lists(),
        });
        options?.onSuccess?.(data);
      },
    },
  );

  return {
    updateProcess: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    mutation,
  };
}

/**
 * Hook for deleting a draft selection process
 *
 * @example
 * ```tsx
 * const { t } = useTranslation("selectionProcess");
 * const { deleteProcess, isDeleting } = useDeleteSelectionProcess({
 *   successMessage: t("messages.successfully.deleted"),
 *   onSuccess: () => navigate('/selection-processes'),
 * });
 *
 * deleteProcess(processId);
 * ```
 */
export function useDeleteSelectionProcess(options?: {
  onSuccess?: () => void;
  successMessage?: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation(
    (processId: string) => deleteSelectionProcess(processId),
    {
      successMessage: options?.successMessage,
      onSuccess: () => {
        // Invalidate list queries
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.lists(),
        });
        options?.onSuccess?.();
      },
    },
  );

  return {
    deleteProcess: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    mutation,
  };
}

/**
 * Hook for starting a selection process
 *
 * @example
 * ```tsx
 * const { t } = useTranslation("selectionProcess");
 * const { startProcess, isStarting } = useStartSelectionProcess(processId, {
 *   successMessage: t("messages.successfully.started"),
 * });
 *
 * startProcess(); // Activates the first turn
 * ```
 */
export function useStartSelectionProcess(
  processId: string,
  options?: {
    onSuccess?: (data: SelectionProcess) => void;
    successMessage?: string;
  },
) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation(() => startSelectionProcess(processId), {
    successMessage: options?.successMessage,
    onSuccess: (data) => {
      // Invalidate specific process and list queries
      queryClient.invalidateQueries({
        queryKey: selectionProcessKeys.detail(processId),
      });
      queryClient.invalidateQueries({
        queryKey: selectionProcessKeys.lists(),
      });
      options?.onSuccess?.(data);
    },
  });

  return {
    startProcess: mutation.mutateAsync,
    isStarting: mutation.isPending,
    mutation,
  };
}

/**
 * Hook for completing the current turn
 *
 * @example
 * ```tsx
 * const { t } = useTranslation("selectionProcess");
 * const { completeTurn, isCompleting } = useCompleteTurn(processId, {
 *   successMessage: t("messages.turnCompleted"),
 * });
 *
 * const result = await completeTurn();
 * if (result.processCompleted) {
 *   // All turns done
 * } else {
 *   // Next turn started: result.nextTurnUserName
 * }
 * ```
 */
export function useCompleteTurn(
  processId: string,
  options?: {
    onSuccess?: (result: CompleteTurnResult) => void;
    successMessage?: string;
  },
) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation(() => completeTurn(processId), {
    successMessage: options?.successMessage,
    onSuccess: (result) => {
      // Invalidate specific process and list queries
      queryClient.invalidateQueries({
        queryKey: selectionProcessKeys.detail(processId),
      });
      queryClient.invalidateQueries({
        queryKey: selectionProcessKeys.lists(),
      });
      options?.onSuccess?.(result);
    },
  });

  return {
    completeTurn: mutation.mutateAsync,
    isCompleting: mutation.isPending,
    mutation,
  };
}

/**
 * Hook for cancelling a selection process
 *
 * @example
 * ```tsx
 * const { t } = useTranslation("selectionProcess");
 * const { cancelProcess, isCancelling } = useCancelSelectionProcess(processId, {
 *   successMessage: t("messages.successfully.cancelled"),
 * });
 *
 * cancelProcess('Process cancelled due to schedule change');
 * ```
 */
export function useCancelSelectionProcess(
  processId: string,
  options?: {
    onSuccess?: (data: SelectionProcess) => void;
    successMessage?: string;
  },
) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation(
    (reason?: string) => cancelSelectionProcess(processId, reason),
    {
      successMessage: options?.successMessage,
      onSuccess: (data) => {
        // Invalidate specific process and list queries
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.detail(processId),
        });
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.lists(),
        });
        options?.onSuccess?.(data);
      },
    },
  );

  return {
    cancelProcess: mutation.mutateAsync,
    isCancelling: mutation.isPending,
    mutation,
  };
}

/**
 * Hook for updating selection process dates (admin only)
 *
 * @example
 * ```tsx
 * const { t } = useTranslation("selectionProcess");
 * const { updateDates, isUpdatingDates } = useUpdateSelectionProcessDates(processId, {
 *   successMessage: t("messages.datesUpdated"),
 * });
 *
 * updateDates({ selectionEndDate: '2024-02-15' });
 * ```
 */
export function useUpdateSelectionProcessDates(
  processId: string,
  options?: {
    onSuccess?: (data: SelectionProcess) => void;
    successMessage?: string;
  },
) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation(
    (dates: { selectionStartDate?: string; selectionEndDate?: string }) =>
      updateSelectionProcessDates(processId, dates),
    {
      successMessage: options?.successMessage,
      onSuccess: (data) => {
        // Invalidate specific process and list queries
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.detail(processId),
        });
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.lists(),
        });
        options?.onSuccess?.(data);
      },
    },
  );

  return {
    updateDates: mutation.mutateAsync,
    isUpdatingDates: mutation.isPending,
    mutation,
  };
}

// ==================== Combined Hook ====================

/**
 * Combined hook for managing a selection process with all actions
 *
 * @param processId - Selection process ID
 * @param options - Optional configuration including success messages for i18n
 * @returns Query state and all mutation functions
 *
 * @example
 * ```tsx
 * const { t } = useTranslation("selectionProcess");
 * const {
 *   process,
 *   loading,
 *   isCurrentTurn,
 *   startProcess,
 *   completeTurn,
 *   cancelProcess,
 * } = useSelectionProcessWithActions(processId, {
 *   startSuccessMessage: t("messages.successfully.started"),
 *   completeTurnSuccessMessage: t("messages.turnCompleted"),
 *   cancelSuccessMessage: t("messages.successfully.cancelled"),
 * });
 * ```
 */
export function useSelectionProcessWithActions(
  processId: string | undefined,
  options?: {
    startSuccessMessage?: string;
    completeTurnSuccessMessage?: string;
    cancelSuccessMessage?: string;
  },
) {
  const queryClient = useQueryClient();

  // Query
  const query = useApiQuery<SelectionProcessWithContext>(
    selectionProcessKeys.detail(processId ?? ""),
    () => getSelectionProcess(processId!),
    { enabled: !!processId },
  );

  // Mutations
  const startMutation = useApiMutation(
    () => startSelectionProcess(processId!),
    {
      successMessage: options?.startSuccessMessage,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.detail(processId!),
        });
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.lists(),
        });
      },
    },
  );

  const completeTurnMutation = useApiMutation(() => completeTurn(processId!), {
    successMessage: options?.completeTurnSuccessMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: selectionProcessKeys.detail(processId!),
      });
      queryClient.invalidateQueries({
        queryKey: selectionProcessKeys.lists(),
      });
    },
  });

  const cancelMutation = useApiMutation(
    (reason?: string) => cancelSelectionProcess(processId!, reason),
    {
      successMessage: options?.cancelSuccessMessage,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.detail(processId!),
        });
        queryClient.invalidateQueries({
          queryKey: selectionProcessKeys.lists(),
        });
      },
    },
  );

  return {
    // Query state
    process: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // User context shortcuts
    isCurrentTurn: query.data?.isCurrentTurn ?? false,
    userTurnOrder: query.data?.userTurnOrder ?? null,
    userTurnStatus: query.data?.userTurnStatus ?? null,
    turnsAhead: query.data?.turnsAhead ?? 0,

    // Full query object for QueryBoundary
    query,

    // Actions
    startProcess: startMutation.mutateAsync,
    isStarting: startMutation.isPending,

    completeTurn: completeTurnMutation.mutateAsync,
    isCompleting: completeTurnMutation.isPending,

    cancelProcess: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}
