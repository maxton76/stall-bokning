import type {
  Schedule,
  Shift,
  CreateScheduleData,
  ShiftType,
} from "@/types/schedule";
import { Timestamp } from "firebase/firestore";
import { parseShiftStartTime, createDateThreshold } from "@/utils/dateHelpers";
import {
  isSwedishHoliday,
  applyHolidayMultiplier,
} from "@/utils/holidayHelpers";
import {
  createTrackingContext,
  updateMemberTracking,
  type MemberTrackingState,
} from "@/utils/shiftTracking";
import { toDate } from "@/utils/timestampUtils";
import { authFetchJSON } from "@/utils/authFetch";

// ============= Schedules =============

export async function createSchedule(
  data: CreateScheduleData,
  userId: string,
): Promise<string> {
  const scheduleData = {
    name: data.name,
    stableId: data.stableId,
    stableName: data.stableName,
    startDate: data.startDate.toISOString(),
    endDate: data.endDate.toISOString(),
    useAutoAssignment: data.useAutoAssignment,
    notifyMembers: data.notifyMembers,
    userId,
  };

  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/schedules`,
    {
      method: "POST",
      body: JSON.stringify(scheduleData),
    },
  );

  return response.id;
}

export async function publishSchedule(
  scheduleId: string,
  userId: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/schedules/${scheduleId}/publish`,
    {
      method: "PUT",
      body: JSON.stringify({ userId }),
    },
  );
}

// ============= Auto-Assignment =============

interface MemberWithPoints extends MemberTrackingState {
  userId: string;
  displayName: string;
  email: string;
  historicalPoints: number;
  availability?: {
    neverAvailable?: {
      dayOfWeek: number;
      timeSlots: { start: string; end: string }[];
    }[];
    preferredTimes?: {
      dayOfWeek: number;
      timeSlots: { start: string; end: string }[];
    }[];
  };
  limits?: {
    maxShiftsPerWeek?: number;
    minShiftsPerWeek?: number;
    maxShiftsPerMonth?: number;
    minShiftsPerMonth?: number;
  };
}

// Helper: Check if member is available for a shift
function isMemberAvailable(member: MemberWithPoints, shift: Shift): boolean {
  if (!member.availability?.neverAvailable) return true;

  const shiftDate = toDate(shift.date);
  if (!shiftDate) return true; // If date can't be parsed, assume available
  const shiftDay = shiftDate.getDay();
  const shiftTime = parseShiftStartTime(shift.time);

  for (const restriction of member.availability.neverAvailable) {
    if (restriction.dayOfWeek === shiftDay) {
      // Check if shift time overlaps with restricted time slots
      for (const slot of restriction.timeSlots) {
        if (shiftTime >= slot.start && shiftTime < slot.end) {
          return false; // Member is not available
        }
      }
    }
  }

  return true;
}

// Helper: Check if member has reached their limits
function hasReachedLimits(member: MemberWithPoints): boolean {
  if (!member.limits) return false;

  if (
    member.limits.maxShiftsPerWeek &&
    member.shiftsThisWeek >= member.limits.maxShiftsPerWeek
  ) {
    return true;
  }

  if (
    member.limits.maxShiftsPerMonth &&
    member.shiftsThisMonth >= member.limits.maxShiftsPerMonth
  ) {
    return true;
  }

  return false;
}

// Helper: Calculate historical points for all members from past schedules
export async function calculateHistoricalPoints(
  stableId: string,
  memberIds: string[],
  memoryHorizonDays: number = 90,
): Promise<Map<string, number>> {
  const historicalPoints = new Map<string, number>();
  memberIds.forEach((id) => historicalPoints.set(id, 0));

  const threshold = createDateThreshold(memoryHorizonDays);

  // Get all published schedules for this stable within the memory horizon
  const params = new URLSearchParams({
    stableId,
    status: "published",
    endDate: threshold.toISOString(),
  });

  const scheduleResponse = await authFetchJSON<{ schedules: Schedule[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/schedules/stable/${stableId}?${params.toString()}`,
    { method: "GET" },
  );

  const scheduleIds = scheduleResponse.schedules
    .map((s) => s.id)
    .filter(Boolean) as string[];

  if (scheduleIds.length === 0) {
    return historicalPoints;
  }

  // Get all completed shifts from those schedules
  for (const scheduleId of scheduleIds) {
    const shiftParams = new URLSearchParams({
      scheduleId,
      status: "assigned",
      startDate: threshold.toISOString(),
    });

    const shiftResponse = await authFetchJSON<{ shifts: Shift[] }>(
      `${import.meta.env.VITE_API_URL}/api/v1/shifts?${shiftParams.toString()}`,
      { method: "GET" },
    );

    // Sum up points per member
    shiftResponse.shifts.forEach((shift) => {
      if (shift.assignedTo && historicalPoints.has(shift.assignedTo)) {
        const current = historicalPoints.get(shift.assignedTo)!;
        historicalPoints.set(shift.assignedTo, current + shift.points);
      }
    });
  }

  return historicalPoints;
}

export async function autoAssignShifts(
  scheduleId: string,
  _stableId: string, // Reserved for future use
  members: {
    id: string;
    displayName: string;
    email: string;
    availability?: any;
    limits?: any;
  }[],
  historicalPoints?: Map<string, number>,
  _triggeredByUserId?: string,
): Promise<number> {
  const historicalPointsObj = historicalPoints
    ? Object.fromEntries(historicalPoints.entries())
    : undefined;

  const response = await authFetchJSON<{ assignedCount: number }>(
    `${import.meta.env.VITE_API_URL}/api/v1/schedules/${scheduleId}/auto-assign`,
    {
      method: "POST",
      body: JSON.stringify({
        members,
        historicalPoints: historicalPointsObj,
      }),
    },
  );

  return response.assignedCount;
}

export async function getSchedule(
  scheduleId: string,
): Promise<Schedule | null> {
  try {
    const response = await authFetchJSON<Schedule & { id: string }>(
      `${import.meta.env.VITE_API_URL}/api/v1/schedules/${scheduleId}`,
      { method: "GET" },
    );

    return response;
  } catch (error) {
    return null;
  }
}

export async function getSchedulesByStable(
  stableId: string,
): Promise<Schedule[]> {
  const response = await authFetchJSON<{ schedules: Schedule[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/schedules/stable/${stableId}`,
    { method: "GET" },
  );

  return response.schedules;
}

export async function getAllSchedulesForUser(
  userId: string,
): Promise<Schedule[]> {
  const response = await authFetchJSON<{ schedules: Schedule[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/schedules/user/${userId}`,
    { method: "GET" },
  );

  return response.schedules;
}

// ============= Shifts =============

export async function createShifts(
  _scheduleId: string, // Included for API consistency
  shifts: Omit<Shift, "id">[],
): Promise<void> {
  // Convert Timestamp dates to ISO strings for API
  const shiftsData = shifts.map((shift) => ({
    ...shift,
    date:
      shift.date instanceof Timestamp
        ? shift.date.toDate().toISOString()
        : typeof shift.date === "string"
          ? shift.date
          : new Date(shift.date).toISOString(),
  }));

  await authFetchJSON(`${import.meta.env.VITE_API_URL}/api/v1/shifts/batch`, {
    method: "POST",
    body: JSON.stringify({
      scheduleId: shifts[0]?.scheduleId,
      shifts: shiftsData,
    }),
  });
}

export async function getShiftsBySchedule(
  scheduleId: string,
): Promise<Shift[]> {
  const params = new URLSearchParams({ scheduleId });

  const response = await authFetchJSON<{ shifts: Shift[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts?${params.toString()}`,
    { method: "GET" },
  );

  return response.shifts;
}

export async function getShiftsByDateRange(
  stableId: string,
  startDate: Date,
  endDate: Date,
): Promise<Shift[]> {
  const params = new URLSearchParams({
    stableId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const response = await authFetchJSON<{ shifts: Shift[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts?${params.toString()}`,
    { method: "GET" },
  );

  return response.shifts;
}

export async function getUnassignedShifts(stableId?: string): Promise<Shift[]> {
  const params = new URLSearchParams();
  if (stableId) {
    params.append("stableId", stableId);
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ shifts: Shift[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts/unassigned${queryString}`,
    { method: "GET" },
  );

  return response.shifts;
}

export async function assignShift(
  shiftId: string,
  userId: string,
  userName: string,
  userEmail: string,
  assignerId?: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts/${shiftId}/assign`,
    {
      method: "PATCH",
      body: JSON.stringify({
        userId,
        userName,
        userEmail,
        assignerId,
      }),
    },
  );
}

export async function unassignShift(
  shiftId: string,
  unassignerId?: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts/${shiftId}/unassign`,
    {
      method: "PATCH",
      body: JSON.stringify({
        unassignerId,
      }),
    },
  );
}

export async function deleteShift(shiftId: string): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts/${shiftId}`,
    { method: "DELETE" },
  );
}

// ============= Shift Completion =============

/**
 * Mark a shift as completed
 */
export async function completeShift(
  shiftId: string,
  notes?: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts/${shiftId}/complete`,
    {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    },
  );
}

/**
 * Cancel a shift with a reason
 */
export async function cancelShift(
  shiftId: string,
  reason: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts/${shiftId}/cancel`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    },
  );
}

/**
 * Mark a shift as missed (managers only)
 */
export async function markShiftMissed(
  shiftId: string,
  reason?: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts/${shiftId}/missed`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    },
  );
}

export async function deleteScheduleAndShifts(
  scheduleId: string,
): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/schedules/${scheduleId}`,
    { method: "DELETE" },
  );
}

// ============= Helper Functions =============

export function generateShifts(
  scheduleId: string,
  stableId: string,
  stableName: string,
  startDate: Date,
  endDate: Date,
  shiftTypes: ShiftType[],
): Omit<Shift, "id">[] {
  const shifts: Omit<Shift, "id">[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString("en-US", {
      weekday: "short",
    });

    shiftTypes.forEach((shiftType) => {
      if (shiftType.daysOfWeek.includes(dayName)) {
        shifts.push({
          scheduleId,
          stableId,
          stableName,
          date: Timestamp.fromDate(new Date(currentDate)),
          shiftTypeId: shiftType.id,
          shiftTypeName: shiftType.name,
          time: shiftType.time,
          points: shiftType.points,
          status: "unassigned",
          assignedTo: null,
          assignedToName: null,
          assignedToEmail: null,
        });
      }
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return shifts;
}

/**
 * Get all published shifts for multiple stables
 * Combines schedule + shift queries for efficiency
 * Used by SchedulePage to show all shifts across user's stables
 */
export async function getPublishedShiftsForStables(
  stableIds: string[],
): Promise<Shift[]> {
  const response = await authFetchJSON<{ shifts: Shift[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/shifts?` +
      `stableIds=${stableIds.join(",")}&status=published`,
    { method: "GET" },
  );

  return response.shifts;
}

/**
 * Get published shifts for a single stable
 * Used by StableSchedulePage to show all shifts for one stable
 */
export async function getPublishedShiftsForStable(
  stableId: string,
): Promise<Shift[]> {
  return getPublishedShiftsForStables([stableId]);
}
