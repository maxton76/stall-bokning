import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getLeaveRequests,
  createLeaveRequest,
  reportSickLeave,
  updateLeaveRequest,
  cancelLeaveRequest,
  deleteLeaveRequest,
  getWorkSchedule,
  getTimeBalance,
  getOrganizationLeaveRequests,
  reviewLeaveRequest,
  setWorkSchedule,
  adjustTimeBalance,
} from "@/services/availabilityService";
import type {
  LeaveRequestDisplay,
  WorkScheduleDisplay,
  TimeBalanceDisplay,
  DaySchedule,
} from "@equiduty/shared";

// ============================================================================
// USER HOOKS
// ============================================================================

/**
 * Hook to fetch user's leave requests
 */
export function useLeaveRequests(organizationId: string | null) {
  return useApiQuery(
    queryKeys.leaveRequests.list(organizationId ?? ""),
    () => getLeaveRequests(organizationId!),
    { enabled: !!organizationId },
  );
}

/**
 * Hook to fetch user's work schedule
 */
export function useWorkSchedule(organizationId: string | null) {
  return useApiQuery(
    queryKeys.workSchedules.byUser(organizationId ?? ""),
    () => getWorkSchedule(organizationId!),
    { enabled: !!organizationId },
  );
}

/**
 * Hook to fetch user's time balance
 */
export function useTimeBalance(organizationId: string | null, year?: number) {
  return useApiQuery(
    queryKeys.timeBalances.byUser(organizationId ?? "", year),
    () => getTimeBalance(organizationId!, year),
    { enabled: !!organizationId },
  );
}

/**
 * Hook to create a leave request
 */
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      organizationId: string;
      firstDay: string;
      lastDay: string;
      note?: string;
    }) => createLeaveRequest(data),
    onSuccess: (_, variables) => {
      // Invalidate leave requests list
      queryClient.invalidateQueries({
        queryKey: queryKeys.leaveRequests.list(variables.organizationId),
      });
      // Also invalidate time balance as tentative leave changes
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeBalances.byUser(variables.organizationId),
      });
    },
  });
}

/**
 * Hook to report sick leave
 */
export function useReportSickLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      organizationId: string;
      firstSickDay: string;
      note?: string;
    }) => reportSickLeave(data),
    onSuccess: (_, variables) => {
      // Invalidate leave requests list
      queryClient.invalidateQueries({
        queryKey: queryKeys.leaveRequests.list(variables.organizationId),
      });
      // Also invalidate time balance
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeBalances.byUser(variables.organizationId),
      });
    },
  });
}

/**
 * Hook to cancel a leave request
 */
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; organizationId: string }) =>
      cancelLeaveRequest(data.id),
    onSuccess: (_, variables) => {
      cacheInvalidation.leaveRequests.lists();
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeBalances.byUser(variables.organizationId),
      });
    },
  });
}

/**
 * Hook to delete a leave request
 */
export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; organizationId: string }) =>
      deleteLeaveRequest(data.id),
    onSuccess: (_, variables) => {
      cacheInvalidation.leaveRequests.lists();
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeBalances.byUser(variables.organizationId),
      });
    },
  });
}

// ============================================================================
// ADMIN HOOKS
// ============================================================================

/**
 * Hook to fetch all leave requests for an organization (admin)
 */
export function useOrganizationLeaveRequests(
  organizationId: string | null,
  options?: {
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  },
) {
  return useApiQuery(
    queryKeys.leaveRequests.adminList(organizationId ?? "", options),
    () => getOrganizationLeaveRequests(organizationId!, options),
    { enabled: !!organizationId },
  );
}

/**
 * Hook to review (approve/reject) a leave request
 */
export function useReviewLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      organizationId: string;
      status: "approved" | "rejected";
      reviewNote?: string;
    }) =>
      reviewLeaveRequest(data.id, {
        status: data.status,
        reviewNote: data.reviewNote,
      }),
    onSuccess: (_, variables) => {
      // Invalidate both admin and user lists
      cacheInvalidation.leaveRequests.all();
      // Invalidate time balances for the affected user
      cacheInvalidation.timeBalances.all();
    },
  });
}

/**
 * Hook to set a user's work schedule (admin)
 */
export function useSetWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      userId: string;
      organizationId: string;
      weeklySchedule: DaySchedule[];
      effectiveFrom: string;
      effectiveUntil?: string;
    }) =>
      setWorkSchedule(data.userId, {
        organizationId: data.organizationId,
        weeklySchedule: data.weeklySchedule,
        effectiveFrom: data.effectiveFrom,
        effectiveUntil: data.effectiveUntil,
      }),
    onSuccess: () => {
      cacheInvalidation.workSchedules.all();
    },
  });
}

/**
 * Hook to adjust a user's time balance (admin)
 */
export function useAdjustTimeBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      userId: string;
      organizationId: string;
      year: number;
      corrections: number;
      reason: string;
    }) =>
      adjustTimeBalance(data.userId, {
        organizationId: data.organizationId,
        year: data.year,
        corrections: data.corrections,
        reason: data.reason,
      }),
    onSuccess: () => {
      cacheInvalidation.timeBalances.all();
    },
  });
}

// ============================================================================
// COMBINED HOOKS
// ============================================================================

/**
 * Hook to get all availability data for a user
 * Combines leave requests, work schedule, and time balance
 */
export function useAvailabilityData(organizationId: string | null) {
  const leaveRequests = useLeaveRequests(organizationId);
  const workSchedule = useWorkSchedule(organizationId);
  const timeBalance = useTimeBalance(organizationId);

  return {
    leaveRequests,
    workSchedule,
    timeBalance,
    isLoading:
      leaveRequests.isLoading ||
      workSchedule.isLoading ||
      timeBalance.isLoading,
    isError:
      leaveRequests.isError || workSchedule.isError || timeBalance.isError,
  };
}
