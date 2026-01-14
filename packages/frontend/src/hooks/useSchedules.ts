import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Schedule, Shift } from "@/types/schedule";
import {
  getAllSchedulesForUser,
  getShiftsBySchedule,
  getShiftsByDateRange,
  getUnassignedShifts,
  assignShift,
  unassignShift,
  completeShift,
  cancelShift,
  markShiftMissed,
} from "@/services/scheduleService";

export function useSchedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    loadSchedules();
  }, [user]);

  const loadSchedules = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getAllSchedulesForUser(user.uid);
      setSchedules(data);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  return { schedules, loading, error, refetch: loadSchedules };
}

export function useShifts(scheduleId?: string) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!scheduleId) {
      setShifts([]);
      setLoading(false);
      return;
    }

    loadShifts();
  }, [scheduleId]);

  const loadShifts = async () => {
    if (!scheduleId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getShiftsBySchedule(scheduleId);
      setShifts(data);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  return { shifts, loading, error, refetch: loadShifts };
}

export function useShiftsByDateRange(
  stableId: string,
  startDate: Date,
  endDate: Date,
) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadShifts();
  }, [stableId, startDate, endDate]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getShiftsByDateRange(stableId, startDate, endDate);
      setShifts(data);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading shifts by date range:", err);
    } finally {
      setLoading(false);
    }
  };

  return { shifts, loading, error, refetch: loadShifts };
}

export function useUnassignedShifts(stableId?: string) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadShifts();
  }, [stableId]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUnassignedShifts(stableId);
      setShifts(data);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading unassigned shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  return { shifts, loading, error, refetch: loadShifts };
}

export function useShiftActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const assign = async (
    shiftId: string,
    userId: string,
    userName: string,
    userEmail: string,
  ) => {
    try {
      setLoading(true);
      setError(null);
      await assignShift(shiftId, userId, userName, userEmail);
    } catch (err) {
      setError(err as Error);
      console.error("Error assigning shift:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unassign = async (shiftId: string) => {
    try {
      setLoading(true);
      setError(null);
      await unassignShift(shiftId);
    } catch (err) {
      setError(err as Error);
      console.error("Error unassigning shift:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const complete = async (shiftId: string, notes?: string) => {
    try {
      setLoading(true);
      setError(null);
      await completeShift(shiftId, notes);
    } catch (err) {
      setError(err as Error);
      console.error("Error completing shift:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (shiftId: string, reason: string) => {
    try {
      setLoading(true);
      setError(null);
      await cancelShift(shiftId, reason);
    } catch (err) {
      setError(err as Error);
      console.error("Error cancelling shift:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markMissed = async (shiftId: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      await markShiftMissed(shiftId, reason);
    } catch (err) {
      setError(err as Error);
      console.error("Error marking shift as missed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { assign, unassign, complete, cancel, markMissed, loading, error };
}
