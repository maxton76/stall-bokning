import type {
  LeaveRequest,
  LeaveRequestDisplay,
  LeaveType,
  WorkSchedule,
  WorkScheduleDisplay,
  TimeBalance,
  TimeBalanceDisplay,
  DaySchedule,
} from "@stall-bokning/shared";
import { format, differenceInDays } from "date-fns";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Convert Timestamp-like object to Date
 */
function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "object" && "_seconds" in value) {
    return new Date((value as { _seconds: number })._seconds * 1000);
  }
  return new Date();
}

/**
 * Format period display string for leave requests.
 * Handles various date range scenarios for compact display.
 */
export function formatPeriodDisplay(firstDay: Date, lastDay: Date): string {
  const sameYear = firstDay.getFullYear() === lastDay.getFullYear();
  const sameMonth = firstDay.getMonth() === lastDay.getMonth();

  if (sameYear && sameMonth && firstDay.getDate() === lastDay.getDate()) {
    return format(firstDay, "MMM d, yyyy");
  }

  if (sameYear && sameMonth) {
    return `${format(firstDay, "MMM d")} - ${format(lastDay, "d, yyyy")}`;
  }

  if (sameYear) {
    return `${format(firstDay, "MMM d")} - ${format(lastDay, "MMM d, yyyy")}`;
  }

  return `${format(firstDay, "MMM d, yyyy")} - ${format(lastDay, "MMM d, yyyy")}`;
}

/**
 * Transform LeaveRequest to LeaveRequestDisplay
 */
function transformLeaveRequest(request: LeaveRequest): LeaveRequestDisplay {
  const firstDay = toDate(request.firstDay);
  const lastDay = toDate(request.lastDay);

  return {
    ...request,
    firstDay,
    lastDay,
    requestedAt: toDate(request.requestedAt),
    reviewedAt: request.reviewedAt ? toDate(request.reviewedAt) : undefined,
    cancelledAt: request.cancelledAt ? toDate(request.cancelledAt) : undefined,
    createdAt: toDate(request.createdAt),
    updatedAt: toDate(request.updatedAt),
    periodDisplay: formatPeriodDisplay(firstDay, lastDay),
    durationDays: differenceInDays(lastDay, firstDay) + 1,
  };
}

/**
 * Transform WorkSchedule to WorkScheduleDisplay
 */
function transformWorkSchedule(schedule: WorkSchedule): WorkScheduleDisplay {
  const effectiveFrom = toDate(schedule.effectiveFrom);
  const effectiveUntil = schedule.effectiveUntil
    ? toDate(schedule.effectiveUntil)
    : undefined;
  const now = new Date();

  return {
    ...schedule,
    effectiveFrom,
    effectiveUntil,
    createdAt: toDate(schedule.createdAt),
    updatedAt: toDate(schedule.updatedAt),
    totalWeeklyHours: schedule.weeklySchedule.reduce(
      (sum, day) => sum + (day.isWorkDay ? day.hours : 0),
      0,
    ),
    isCurrentlyActive:
      effectiveFrom <= now && (!effectiveUntil || effectiveUntil >= now),
  };
}

/**
 * Transform TimeBalance to TimeBalanceDisplay
 */
function transformTimeBalance(
  balance: TimeBalance,
  monthsRemaining: number = 0,
): TimeBalanceDisplay {
  const currentBalance =
    balance.carryoverFromPreviousYear +
    balance.buildUpHours +
    balance.corrections -
    balance.approvedLeave;

  // Project based on remaining months and monthly accrual (default 2.5h/month)
  const monthlyAccrual =
    balance.customAccrualConfig?.monthlyAccrualHours ?? 2.5;
  const endOfYearProjection = currentBalance + monthsRemaining * monthlyAccrual;

  return {
    ...balance,
    updatedAt: toDate(balance.updatedAt),
    lastAccrualDate: balance.lastAccrualDate
      ? toDate(balance.lastAccrualDate)
      : undefined,
    currentBalance,
    endOfYearProjection,
  };
}

// ============================================================================
// LEAVE REQUESTS API
// ============================================================================

/**
 * Create a new leave request
 */
export async function createLeaveRequest(data: {
  organizationId: string;
  firstDay: string; // ISO date string YYYY-MM-DD
  lastDay: string; // ISO date string YYYY-MM-DD
  note?: string;
}): Promise<LeaveRequestDisplay> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ leaveRequest: LeaveRequest }>(
    `${API_URL}/api/v1/availability/leave-requests`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "vacation" as LeaveType,
        ...data,
      }),
    },
  );

  return transformLeaveRequest(response.leaveRequest);
}

/**
 * Report sick leave (simplified flow)
 */
export async function reportSickLeave(data: {
  organizationId: string;
  firstSickDay: string; // ISO date string YYYY-MM-DD
  note?: string;
}): Promise<LeaveRequestDisplay> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ leaveRequest: LeaveRequest }>(
    `${API_URL}/api/v1/availability/sick-leave`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return transformLeaveRequest(response.leaveRequest);
}

/**
 * Get user's leave requests
 */
export async function getLeaveRequests(
  organizationId: string,
): Promise<LeaveRequestDisplay[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ leaveRequests: LeaveRequest[] }>(
    `${API_URL}/api/v1/availability/leave-requests?organizationId=${organizationId}`,
    { method: "GET" },
  );

  return response.leaveRequests.map(transformLeaveRequest);
}

/**
 * Update a leave request
 */
export async function updateLeaveRequest(
  id: string,
  updates: {
    note?: string;
    status?: "cancelled";
  },
): Promise<LeaveRequestDisplay> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ leaveRequest: LeaveRequest }>(
    `${API_URL}/api/v1/availability/leave-requests/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );

  return transformLeaveRequest(response.leaveRequest);
}

/**
 * Cancel a leave request
 */
export async function cancelLeaveRequest(
  id: string,
): Promise<LeaveRequestDisplay> {
  return updateLeaveRequest(id, { status: "cancelled" });
}

/**
 * Delete a leave request
 */
export async function deleteLeaveRequest(id: string): Promise<void> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  await authFetchJSON(`${API_URL}/api/v1/availability/leave-requests/${id}`, {
    method: "DELETE",
  });
}

// ============================================================================
// WORK SCHEDULE API
// ============================================================================

/**
 * Get user's work schedule
 */
export async function getWorkSchedule(
  organizationId: string,
): Promise<WorkScheduleDisplay | null> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  try {
    const response = await authFetchJSON<{ schedule: WorkSchedule | null }>(
      `${API_URL}/api/v1/availability/schedule?organizationId=${organizationId}`,
      { method: "GET" },
    );

    return response.schedule ? transformWorkSchedule(response.schedule) : null;
  } catch {
    return null;
  }
}

// ============================================================================
// TIME BALANCE API
// ============================================================================

/**
 * Get user's time balance
 */
export async function getTimeBalance(
  organizationId: string,
  year?: number,
): Promise<TimeBalanceDisplay | null> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  try {
    const currentYear = year ?? new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const monthsRemaining = 12 - currentMonth - 1;

    const response = await authFetchJSON<{ balance: TimeBalance | null }>(
      `${API_URL}/api/v1/availability/balance?organizationId=${organizationId}&year=${currentYear}`,
      { method: "GET" },
    );

    return response.balance
      ? transformTimeBalance(response.balance, monthsRemaining)
      : null;
  } catch {
    return null;
  }
}

// ============================================================================
// ADMIN API
// ============================================================================

/**
 * Get all leave requests for an organization (admin)
 */
export async function getOrganizationLeaveRequests(
  organizationId: string,
  options?: {
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  },
): Promise<LeaveRequestDisplay[]> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const params = new URLSearchParams({ organizationId });
  if (options?.status) params.append("status", options.status);
  if (options?.userId) params.append("userId", options.userId);
  if (options?.startDate) params.append("startDate", options.startDate);
  if (options?.endDate) params.append("endDate", options.endDate);

  const response = await authFetchJSON<{ leaveRequests: LeaveRequest[] }>(
    `${API_URL}/api/v1/availability/admin/leave-requests?${params.toString()}`,
    { method: "GET" },
  );

  return response.leaveRequests.map(transformLeaveRequest);
}

/**
 * Review a leave request (approve/reject)
 */
export async function reviewLeaveRequest(
  id: string,
  data: {
    status: "approved" | "rejected";
    reviewNote?: string;
  },
): Promise<LeaveRequestDisplay> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ leaveRequest: LeaveRequest }>(
    `${API_URL}/api/v1/availability/admin/leave-requests/${id}/review`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  return transformLeaveRequest(response.leaveRequest);
}

/**
 * Set user's work schedule (admin)
 */
export async function setWorkSchedule(
  userId: string,
  data: {
    organizationId: string;
    weeklySchedule: DaySchedule[];
    effectiveFrom: string; // ISO date string
    effectiveUntil?: string; // ISO date string
  },
): Promise<WorkScheduleDisplay> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ schedule: WorkSchedule }>(
    `${API_URL}/api/v1/availability/admin/schedules/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );

  return transformWorkSchedule(response.schedule);
}

/**
 * Adjust user's time balance (admin)
 */
export async function adjustTimeBalance(
  userId: string,
  data: {
    organizationId: string;
    year: number;
    corrections: number;
    reason: string;
  },
): Promise<TimeBalanceDisplay> {
  const { authFetchJSON } = await import("@/utils/authFetch");

  const response = await authFetchJSON<{ balance: TimeBalance }>(
    `${API_URL}/api/v1/availability/admin/balance/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  return transformTimeBalance(response.balance);
}
