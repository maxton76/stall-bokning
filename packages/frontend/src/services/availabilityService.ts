import type {
  LeaveRequest,
  LeaveRequestDisplay,
  LeaveType,
  LeaveStatus,
  WorkSchedule,
  WorkScheduleDisplay,
  TimeBalance,
  TimeBalanceDisplay,
  DaySchedule,
  StaffAvailabilityMatrix,
  StaffAvailabilityRow,
  CalendarLeaveStatus,
} from "@stall-bokning/shared";
import { format, differenceInDays } from "date-fns";
import { authFetchJSON } from "@/utils/authFetch";

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
  const response = await authFetchJSON<{ balance: TimeBalance }>(
    `${API_URL}/api/v1/availability/admin/balance/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  return transformTimeBalance(response.balance);
}

// ============================================================================
// STAFF MATRIX API
// ============================================================================

/**
 * Member with schedule data from API
 */
interface MemberWithSchedule {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role?: string;
  workSchedule: WorkSchedule | null;
  timeBalance: TimeBalance | null;
}

/**
 * Get organization members with schedules (admin)
 */
export async function getOrganizationMembersWithSchedules(
  organizationId: string,
): Promise<MemberWithSchedule[]> {
  const response = await authFetchJSON<{ members: MemberWithSchedule[] }>(
    `${API_URL}/api/v1/availability/admin/members-with-schedules?organizationId=${organizationId}`,
    { method: "GET" },
  );

  return response.members;
}

/**
 * Generate date array between start and end dates
 */
function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(format(current, "yyyy-MM-dd"));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get default work hours for a day of week (Mon-Fri = 8h, Sat-Sun = 0h)
 */
function getDefaultWorkHours(dayOfWeek: number): number {
  return dayOfWeek >= 1 && dayOfWeek <= 5 ? 8 : 0;
}

/**
 * Check if a date falls within a leave request period
 */
function isDateInLeaveRequest(
  dateStr: string,
  leaveRequest: LeaveRequest,
): boolean {
  const date = new Date(dateStr);
  const firstDay = toDate(leaveRequest.firstDay);
  const lastDay = toDate(leaveRequest.lastDay);

  // Normalize dates to midnight for comparison
  date.setHours(0, 0, 0, 0);
  firstDay.setHours(0, 0, 0, 0);
  lastDay.setHours(0, 0, 0, 0);

  return date >= firstDay && date <= lastDay;
}

/**
 * Get leave status for a date based on leave requests
 */
function getLeaveStatusForDate(
  dateStr: string,
  leaveRequests: LeaveRequest[],
): {
  status: CalendarLeaveStatus;
  leaveType?: LeaveType;
  isPartial: boolean;
} {
  for (const request of leaveRequests) {
    if (isDateInLeaveRequest(dateStr, request)) {
      let status: CalendarLeaveStatus = "none";

      if (request.status === "approved") {
        status = request.isPartialDay ? "partial" : "approved";
      } else if (request.status === "pending") {
        status = "pending";
      }

      if (status !== "none") {
        return {
          status,
          leaveType: request.type,
          isPartial: request.isPartialDay || false,
        };
      }
    }
  }

  return { status: "none", isPartial: false };
}

/**
 * Build staff availability matrix from members and leave requests
 */
export async function getStaffAvailabilityMatrix(
  organizationId: string,
  startDate: Date,
  endDate: Date,
): Promise<StaffAvailabilityMatrix> {
  // Get members with schedules
  const members = await getOrganizationMembersWithSchedules(organizationId);

  // Get all leave requests for the organization within the date range
  const leaveRequests = await getOrganizationLeaveRequests(organizationId);

  // Generate date range
  const dateRange = generateDateRange(startDate, endDate);

  // Build staff availability rows
  const staffAvailability: StaffAvailabilityRow[] = members.map((member) => {
    const weeklySchedule = member.workSchedule?.weeklySchedule || [];

    const days = dateRange.map((dateStr) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();

      // Get scheduled hours from work schedule or use default
      const daySchedule = weeklySchedule.find(
        (d: DaySchedule) => d.dayOfWeek === dayOfWeek,
      );
      const scheduledHours = daySchedule?.isWorkDay
        ? daySchedule.hours
        : getDefaultWorkHours(dayOfWeek);

      // Filter leave requests for this user
      const userLeaveRequests = leaveRequests
        .filter((lr) => lr.id && member.userId)
        .map((lr) => ({
          ...lr,
          firstDay: {
            toDate: () => lr.firstDay,
          } as unknown as import("firebase/firestore").Timestamp,
          lastDay: {
            toDate: () => lr.lastDay,
          } as unknown as import("firebase/firestore").Timestamp,
        })) as unknown as LeaveRequest[];

      // Get leave status for this date
      const leaveInfo = getLeaveStatusForDate(dateStr, userLeaveRequests);

      // Calculate available hours
      let availableHours = scheduledHours;
      let isAvailable = scheduledHours > 0;

      if (leaveInfo.status === "approved") {
        availableHours = 0;
        isAvailable = false;
      } else if (leaveInfo.status === "partial") {
        availableHours = scheduledHours / 2;
        isAvailable = true;
      } else if (leaveInfo.status === "pending") {
        // Pending leave doesn't affect availability yet
        isAvailable = scheduledHours > 0;
      }

      return {
        date: dateStr,
        availableHours,
        isAvailable,
        leaveStatus: leaveInfo.status,
        hasConstraints: false, // TODO: Integrate constraints
        assignmentCount: 0, // TODO: Integrate activity assignments
      };
    });

    // Calculate row summary
    const totalAvailableHours = days.reduce(
      (sum, d) => sum + d.availableHours,
      0,
    );
    const totalScheduledHours = days.reduce((sum, d) => {
      const date = new Date(d.date);
      const dayOfWeek = date.getDay();
      const daySchedule = weeklySchedule.find(
        (ds: DaySchedule) => ds.dayOfWeek === dayOfWeek,
      );
      return (
        sum +
        (daySchedule?.isWorkDay
          ? daySchedule.hours
          : getDefaultWorkHours(dayOfWeek))
      );
    }, 0);

    const availabilityPercentage =
      totalScheduledHours > 0
        ? Math.round((totalAvailableHours / totalScheduledHours) * 100)
        : 100;

    return {
      userId: member.userId,
      userName: member.userName || member.userEmail || "Unknown",
      userEmail: member.userEmail,
      role: member.role,
      days,
      totalAvailableHours,
      totalScheduledHours,
      availabilityPercentage,
    };
  });

  // Build team summary
  const teamSummary = dateRange.map((dateStr) => {
    const dayData = staffAvailability.map((staff) => {
      const day = staff.days.find((d) => d.date === dateStr);
      return day || { availableHours: 0, isAvailable: false };
    });

    const totalStaff = staffAvailability.length;
    const availableStaff = dayData.filter((d) => d.isAvailable).length;
    const totalAvailableHours = dayData.reduce(
      (sum, d) => sum + d.availableHours,
      0,
    );
    const coverageScore =
      totalStaff > 0 ? Math.round((availableStaff / totalStaff) * 100) : 0;

    // Simple shortage check: if less than 50% of staff available
    const hasShortage = coverageScore < 50;

    return {
      date: dateStr,
      totalStaff,
      availableStaff,
      totalAvailableHours,
      coverageScore,
      hasShortage,
    };
  });

  // Calculate overall summary
  const totalDays = teamSummary.length;
  const averageDailyAvailability =
    totalDays > 0
      ? Math.round(
          teamSummary.reduce((sum, d) => sum + d.coverageScore, 0) / totalDays,
        )
      : 0;
  const shortageCount = teamSummary.filter((d) => d.hasShortage).length;
  const minimumStaffingMet = shortageCount === 0;

  return {
    organizationId,
    dateRange: {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
    },
    staffAvailability,
    teamSummary,
    averageDailyAvailability,
    minimumStaffingMet,
    shortageCount,
  };
}
