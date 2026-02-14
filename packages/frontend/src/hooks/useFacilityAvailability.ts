/**
 * Hook for checking real-time facility availability
 * Provides visual indicators and slot suggestions
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addMinutes, startOfDay, isSameDay } from "date-fns";
import { queryKeys } from "@/lib/queryClient";
import { getAvailableSlots } from "@/services/facilityService";
import type { Facility, TimeBlock } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";

export interface AvailabilitySlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
  available: boolean;
  conflictCount: number;
}

interface UseFacilityAvailabilityOptions {
  facility?: Facility;
  date: Date;
  reservations: FacilityReservation[];
  enabled?: boolean;
}

interface UseFacilityAvailabilityReturn {
  availableSlots: AvailabilitySlot[];
  isLoading: boolean;
  isAvailable: (startTime: string, endTime: string) => boolean;
  getNextAvailableSlot: (duration: number) => AvailabilitySlot | null;
  availabilityStatus: "available" | "limited" | "full" | "closed";
}

/**
 * Check if a time range is available for booking
 */
export function useFacilityAvailability({
  facility,
  date,
  reservations,
  enabled = true,
}: UseFacilityAvailabilityOptions): UseFacilityAvailabilityReturn {
  // Fetch facility availability schedule
  const { data: availabilitySchedule, isLoading } = useQuery({
    queryKey: queryKeys.facilities.detail(facility?.id || ""),
    queryFn: () =>
      getAvailableSlots(facility?.id || "", format(date, "yyyy-MM-dd")),
    enabled: enabled && !!facility,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate available time slots
  const availableSlots = useMemo<AvailabilitySlot[]>(() => {
    if (!facility || !availabilitySchedule) {
      return [];
    }

    const slots: AvailabilitySlot[] = [];
    const slotDuration = facility.minTimeSlotDuration || 30; // minutes

    // Get time blocks for the day
    const timeBlocks = availabilitySchedule?.timeBlocks || [];

    timeBlocks.forEach((block: TimeBlock) => {
      const [startHour, startMin] = block.from.split(":").map(Number);
      const [endHour, endMin] = block.to.split(":").map(Number);

      const blockStartMinutes = (startHour ?? 0) * 60 + (startMin ?? 0);
      const blockEndMinutes = (endHour ?? 0) * 60 + (endMin ?? 0);

      // Generate slots within this block
      for (
        let minutes = blockStartMinutes;
        minutes < blockEndMinutes;
        minutes += slotDuration
      ) {
        const slotStart = minutes;
        const slotEnd = Math.min(minutes + slotDuration, blockEndMinutes);

        const startHr = Math.floor(slotStart / 60);
        const startMn = slotStart % 60;
        const endHr = Math.floor(slotEnd / 60);
        const endMn = slotEnd % 60;

        const startTime = `${String(startHr).padStart(2, "0")}:${String(startMn).padStart(2, "0")}`;
        const endTime = `${String(endHr).padStart(2, "0")}:${String(endMn).padStart(2, "0")}`;

        // Check for conflicts
        const conflictCount = getConflictCount(
          facility,
          date,
          startTime,
          endTime,
          reservations,
        );

        // Note: capacity field removed from Facility type - assuming single booking per slot
        const maxCapacity = 1;

        slots.push({
          start: startTime,
          end: endTime,
          available: conflictCount < maxCapacity,
          conflictCount,
        });
      }
    });

    return slots;
  }, [facility, date, availabilitySchedule, reservations]);

  // Check if a specific time range is available
  const isAvailable = (startTime: string, endTime: string): boolean => {
    if (!facility) return false;

    const conflictCount = getConflictCount(
      facility,
      date,
      startTime,
      endTime,
      reservations,
    );
    // Note: capacity field removed from Facility type - assuming single booking per slot
    const maxCapacity = 1;

    return conflictCount < maxCapacity;
  };

  // Get next available slot of given duration
  const getNextAvailableSlot = (
    durationMinutes: number,
  ): AvailabilitySlot | null => {
    const now = new Date();
    const isToday = isSameDay(date, now);
    const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

    for (const slot of availableSlots) {
      if (!slot.available) continue;

      const [startHr, startMn] = slot.start.split(":").map(Number);
      const slotStartMinutes = (startHr ?? 0) * 60 + (startMn ?? 0);

      // Skip past slots if checking for today
      if (isToday && slotStartMinutes <= currentMinutes) continue;

      // Check if we can get the required duration
      const endMinutes = slotStartMinutes + durationMinutes;
      const endHr = Math.floor(endMinutes / 60);
      const endMn = endMinutes % 60;
      const endTime = `${String(endHr).padStart(2, "0")}:${String(endMn).padStart(2, "0")}`;

      // Verify the entire duration is available
      if (isAvailable(slot.start, endTime)) {
        return {
          start: slot.start,
          end: endTime,
          available: true,
          conflictCount: 0,
        };
      }
    }

    return null;
  };

  // Calculate overall availability status
  const availabilityStatus = useMemo<
    "available" | "limited" | "full" | "closed"
  >(() => {
    if (availableSlots.length === 0) return "closed";

    const availableCount = availableSlots.filter((s) => s.available).length;
    const totalCount = availableSlots.length;

    if (availableCount === 0) return "full";
    if (availableCount === totalCount) return "available";
    return "limited";
  }, [availableSlots]);

  return {
    availableSlots,
    isLoading,
    isAvailable,
    getNextAvailableSlot,
    availabilityStatus,
  };
}

/**
 * Count conflicts for a given time range
 */
function getConflictCount(
  facility: Facility,
  date: Date,
  startTime: string,
  endTime: string,
  reservations: FacilityReservation[],
): number {
  const [startHr, startMn] = startTime.split(":").map(Number);
  const [endHr, endMn] = endTime.split(":").map(Number);

  const checkStart = new Date(date);
  checkStart.setHours(startHr ?? 0, startMn ?? 0, 0, 0);

  const checkEnd = new Date(date);
  checkEnd.setHours(endHr ?? 0, endMn ?? 0, 0, 0);

  // Count overlapping reservations
  return reservations.filter((res) => {
    if (res.facilityId !== facility.id) return false;
    if (res.status === "cancelled") return false;

    const resStart = toDate(res.startTime);
    const resEnd = toDate(res.endTime);

    if (!resStart || !resEnd) return false;
    if (!isSameDay(resStart, date)) return false;

    // Check for overlap
    return resStart < checkEnd && resEnd > checkStart;
  }).length;
}
