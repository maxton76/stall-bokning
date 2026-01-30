import type {
  Schedule,
  Shift,
  CreateScheduleData,
  ShiftType,
} from "@/types/schedule";
import type { RoutineTemplate } from "@shared/types";
import { Timestamp } from "firebase/firestore";
import {
  parseShiftStartTime,
  createDateThreshold,
  holidayService,
} from "@equiduty/shared";
import {
  createTrackingContext,
  updateMemberTracking,
  type MemberTrackingState,
} from "@/utils/shiftTracking";
import { toDate } from "@/utils/timestampUtils";
import { apiClient } from "@/lib/apiClient";

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
    // Note: userId, selectedRoutineTemplates, and daysOfWeek are not part of schedule document
    // - userId is derived from auth context by API
    // - selectedRoutineTemplates and daysOfWeek are only used to generate shifts locally
  };

  const response = await apiClient.post<{ id: string }>(
    "/schedules",
    scheduleData,
  );

  return response.id;
}

export async function publishSchedule(
  scheduleId: string,
  userId: string,
): Promise<void> {
  await apiClient.put(`/schedules/${scheduleId}/publish`, { userId });
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
  const scheduleResponse = await apiClient.get<{ schedules: Schedule[] }>(
    `/schedules/stable/${stableId}`,
    { stableId, status: "published", endDate: threshold.toISOString() },
  );

  const scheduleIds = scheduleResponse.schedules
    .map((s) => s.id)
    .filter(Boolean) as string[];

  if (scheduleIds.length === 0) {
    return historicalPoints;
  }

  // Get all completed shifts from those schedules
  for (const scheduleId of scheduleIds) {
    const shiftResponse = await apiClient.get<{ shifts: Shift[] }>("/shifts", {
      scheduleId,
      status: "assigned",
      startDate: threshold.toISOString(),
    });

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

  const response = await apiClient.post<{ assignedCount: number }>(
    `/schedules/${scheduleId}/auto-assign`,
    { members, historicalPoints: historicalPointsObj },
  );

  return response.assignedCount;
}

export async function getSchedule(
  scheduleId: string,
): Promise<Schedule | null> {
  try {
    return await apiClient.get<Schedule & { id: string }>(
      `/schedules/${scheduleId}`,
    );
  } catch (error) {
    return null;
  }
}

export async function getSchedulesByStable(
  stableId: string,
): Promise<Schedule[]> {
  const response = await apiClient.get<{ schedules: Schedule[] }>(
    `/schedules/stable/${stableId}`,
  );

  return response.schedules;
}

export async function getAllSchedulesForUser(
  userId: string,
): Promise<Schedule[]> {
  const response = await apiClient.get<{ schedules: Schedule[] }>(
    `/schedules/user/${userId}`,
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

  await apiClient.post("/shifts/batch", {
    scheduleId: shifts[0]?.scheduleId,
    shifts: shiftsData,
  });
}

export async function getShiftsBySchedule(
  scheduleId: string,
): Promise<Shift[]> {
  const response = await apiClient.get<{ shifts: Shift[] }>("/shifts", {
    scheduleId,
  });

  return response.shifts;
}

export async function getShiftsByDateRange(
  stableId: string,
  startDate: Date,
  endDate: Date,
): Promise<Shift[]> {
  const response = await apiClient.get<{ shifts: Shift[] }>("/shifts", {
    stableId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  return response.shifts;
}

export async function getUnassignedShifts(stableId?: string): Promise<Shift[]> {
  const response = await apiClient.get<{ shifts: Shift[] }>(
    "/shifts/unassigned",
    stableId ? { stableId } : undefined,
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
  await apiClient.patch(`/shifts/${shiftId}/assign`, {
    userId,
    userName,
    userEmail,
    assignerId,
  });
}

export async function unassignShift(
  shiftId: string,
  unassignerId?: string,
): Promise<void> {
  await apiClient.patch(`/shifts/${shiftId}/unassign`, { unassignerId });
}

export async function deleteShift(shiftId: string): Promise<void> {
  await apiClient.delete(`/shifts/${shiftId}`);
}

// ============= Shift Completion =============

/**
 * Mark a shift as completed
 */
export async function completeShift(
  shiftId: string,
  notes?: string,
): Promise<void> {
  await apiClient.patch(`/shifts/${shiftId}/complete`, { notes });
}

/**
 * Cancel a shift with a reason
 */
export async function cancelShift(
  shiftId: string,
  reason: string,
): Promise<void> {
  await apiClient.patch(`/shifts/${shiftId}/cancel`, { reason });
}

/**
 * Mark a shift as missed (managers only)
 */
export async function markShiftMissed(
  shiftId: string,
  reason?: string,
): Promise<void> {
  await apiClient.patch(`/shifts/${shiftId}/missed`, { reason });
}

/**
 * Start a shift with a linked routine - creates routine instance and links it
 */
export async function startShiftWithRoutine(
  shiftId: string,
  routineInstanceId: string,
): Promise<void> {
  await apiClient.patch(`/shifts/${shiftId}/start-routine`, {
    routineInstanceId,
  });
}

/**
 * Get a single shift by ID
 */
export async function getShift(shiftId: string): Promise<Shift | null> {
  try {
    return await apiClient.get<Shift>(`/shifts/${shiftId}`);
  } catch (error) {
    return null;
  }
}

export async function deleteScheduleAndShifts(
  scheduleId: string,
): Promise<void> {
  await apiClient.delete(`/schedules/${scheduleId}`);
}

// ============= Helper Functions =============

/**
 * Generate shifts from routine templates
 * This is the new way to create shifts - directly from routine templates with selected days
 */
export function generateShiftsFromRoutines(
  scheduleId: string,
  stableId: string,
  stableName: string,
  startDate: Date,
  endDate: Date,
  routineTemplates: RoutineTemplate[],
  daysOfWeek: string[], // e.g., ["Mon", "Tue", "Wed", "Thu", "Fri"]
): Omit<Shift, "id">[] {
  const shifts: Omit<Shift, "id">[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString("en-US", {
      weekday: "short",
    });

    // Check if this day is in the selected days of week
    if (daysOfWeek.includes(dayName)) {
      routineTemplates.forEach((routine) => {
        shifts.push({
          scheduleId,
          stableId,
          stableName,
          date: Timestamp.fromDate(new Date(currentDate)),
          time: routine.defaultStartTime || "08:00",
          points: routine.pointsValue || 10,
          status: "unassigned",
          assignedTo: null,
          assignedToName: null,
          assignedToEmail: null,
          // Direct routine template connection
          routineTemplateId: routine.id,
          routineTemplateName: routine.name,
        });
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return shifts;
}

/**
 * @deprecated Use generateShiftsFromRoutines instead
 * Generate shifts from shift types (legacy function for backwards compatibility)
 */
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
          time: shiftType.time,
          points: shiftType.points,
          status: "unassigned",
          assignedTo: null,
          assignedToName: null,
          assignedToEmail: null,
          // Use routine template if available, otherwise use shift type as fallback
          routineTemplateId: shiftType.routineTemplateId || shiftType.id,
          routineTemplateName: shiftType.routineTemplateName || shiftType.name,
          // Legacy fields
          shiftTypeId: shiftType.id,
          shiftTypeName: shiftType.name,
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
  const response = await apiClient.get<{ shifts: Shift[] }>("/shifts", {
    stableIds: stableIds.join(","),
    status: "published",
  });

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
