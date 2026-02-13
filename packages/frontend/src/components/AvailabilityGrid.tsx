/**
 * AvailabilityGrid Component
 * Visual time slot grid showing facility availability with color-coding
 * Green = Available, Yellow = Limited, Red = Full, Gray = Closed
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  addMinutes,
  isSameDay,
  startOfDay,
  isBefore,
  isAfter,
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";
import { cn } from "@/lib/utils";
import {
  getEffectiveTimeBlocks,
  timeToMinutes,
  createDefaultSchedule,
} from "@equiduty/shared";

interface TimeSlot {
  time: Date;
  available: boolean;
  limited: boolean;
  full: boolean;
  closed: boolean;
  reservationCount: number;
  maxCapacity: number;
}

interface AvailabilityGridProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onSlotClick: (facilityId: string, start: Date, end: Date) => void;
  selectedFacilityId?: string | null;
  onFacilitySelect?: (facilityId: string | null) => void;
  slotDuration?: number; // minutes, default 30
}

export function AvailabilityGrid({
  facilities,
  reservations,
  selectedDate,
  onDateChange,
  onSlotClick,
  selectedFacilityId,
  onFacilitySelect,
  slotDuration = 30,
}: AvailabilityGridProps) {
  const { t } = useTranslation(["facilities", "common"]);

  // Filter facilities - show selected or all
  const displayFacilities = useMemo(() => {
    if (selectedFacilityId) {
      return facilities.filter((f) => f.id === selectedFacilityId);
    }
    return facilities;
  }, [facilities, selectedFacilityId]);

  // Generate time slots for the day (6 AM to 10 PM)
  const timeSlots = useMemo(() => {
    const slots: Date[] = [];
    const dayStart = startOfDay(selectedDate);
    dayStart.setHours(6, 0, 0, 0); // Start at 6 AM

    for (let i = 0; i < (16 * 60) / slotDuration; i++) {
      // 6 AM to 10 PM = 16 hours
      slots.push(addMinutes(dayStart, i * slotDuration));
    }

    return slots;
  }, [selectedDate, slotDuration]);

  // Calculate availability for each facility and time slot
  const availabilityData = useMemo(() => {
    const data = new Map<string, TimeSlot[]>();

    displayFacilities.forEach((facility) => {
      const facilitySlots: TimeSlot[] = timeSlots.map((slotTime) => {
        // Get effective time blocks for this date using the availability schedule
        const schedule =
          facility.availabilitySchedule || createDefaultSchedule();
        const effectiveBlocks = getEffectiveTimeBlocks(schedule, selectedDate);

        // If no blocks, facility is closed for this day
        if (effectiveBlocks.length === 0) {
          return {
            time: slotTime,
            available: false,
            limited: false,
            full: false,
            closed: true,
            reservationCount: 0,
            maxCapacity: facility.capacity || 1,
          };
        }

        // Check if this time slot falls within any of the effective time blocks
        const slotStartTime = format(slotTime, "HH:mm");
        const slotEnd = addMinutes(slotTime, slotDuration);
        const slotEndTime = format(slotEnd, "HH:mm");

        const slotStartMinutes = timeToMinutes(slotStartTime);
        const slotEndMinutes = timeToMinutes(slotEndTime);

        const isWithinOperatingHours = effectiveBlocks.some((block) => {
          const blockStart = timeToMinutes(block.from);
          const blockEnd = timeToMinutes(block.to);
          // Check if slot is completely within this block
          return slotStartMinutes >= blockStart && slotEndMinutes <= blockEnd;
        });

        if (!isWithinOperatingHours) {
          return {
            time: slotTime,
            available: false,
            limited: false,
            full: false,
            closed: true,
            reservationCount: 0,
            maxCapacity: facility.capacity || 1,
          };
        }

        // Count overlapping reservations for this slot
        // (slotEnd already defined above)
        const overlappingReservations = reservations.filter((res) => {
          if (res.facilityId !== facility.id) return false;

          const resStart = toDate(res.startTime);
          const resEnd = toDate(res.endTime);
          if (!resStart || !resEnd) return false;

          // Check if reservation overlaps with this time slot
          return (
            isSameDay(resStart, selectedDate) &&
            resStart < slotEnd &&
            resEnd > slotTime
          );
        });

        const reservationCount = overlappingReservations.length;
        const maxCapacity = facility.capacity || 1;

        // Debug logging (uncomment for troubleshooting)
        // if (process.env.NODE_ENV === 'development' && overlappingReservations.length > 0) {
        //   console.log(`Slot ${format(slotTime, 'HH:mm')}-${format(slotEnd, 'HH:mm')}:`, {
        //     overlappingReservations: overlappingReservations.map(r => ({
        //       id: r.id,
        //       start: format(toDate(r.startTime)!, 'HH:mm:ss'),
        //       end: format(toDate(r.endTime)!, 'HH:mm:ss'),
        //     })),
        //     reservationCount,
        //     maxCapacity,
        //     status: reservationCount >= maxCapacity ? 'FULL' : reservationCount > 0 ? 'LIMITED' : 'AVAILABLE',
        //   });
        // }

        return {
          time: slotTime,
          available: reservationCount === 0,
          limited: reservationCount > 0 && reservationCount < maxCapacity,
          full: reservationCount >= maxCapacity,
          closed: false,
          reservationCount,
          maxCapacity,
        };
      });

      data.set(facility.id, facilitySlots);
    });

    return data;
  }, [displayFacilities, timeSlots, reservations, selectedDate, slotDuration]);

  // Get slot color classes
  const getSlotClassName = (slot: TimeSlot) => {
    if (slot.closed) {
      return "bg-muted text-muted-foreground cursor-not-allowed";
    }
    if (slot.full) {
      return "bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 cursor-not-allowed";
    }
    if (slot.limited) {
      return "bg-yellow-100 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100 cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900";
    }
    return "bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900";
  };

  // Get slot tooltip text with enhanced capacity information
  const getSlotTooltip = (slot: TimeSlot) => {
    if (slot.closed) return t("facilities:availability.closed");

    const remaining = slot.maxCapacity - slot.reservationCount;

    if (slot.full) {
      return t("facilities:availability.fullWithCapacity", {
        capacity: slot.maxCapacity,
      });
    }

    if (slot.limited) {
      return t("facilities:availability.limitedWithRemaining", {
        remaining,
        capacity: slot.maxCapacity,
      });
    }

    return t("facilities:availability.availableWithCapacity", {
      capacity: slot.maxCapacity,
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-full sm:w-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            className="rounded-md border mx-auto sm:mx-0"
          />
        </div>

        {/* Facility Filter */}
        {facilities.length > 1 && (
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">
              {t("facilities:reservation.labels.facility")}
            </label>
            <Select
              value={selectedFacilityId || "all"}
              onValueChange={(value) =>
                onFacilitySelect?.(value === "all" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("facilities:filters.allFacilities")}
                </SelectItem>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-950 border border-green-300 rounded" />
          <span>{t("facilities:availability.available")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-950 border border-yellow-300 rounded" />
          <span>{t("facilities:availability.limited")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-950 border border-red-300 rounded" />
          <span>{t("facilities:availability.full")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted border border-border rounded" />
          <span>{t("facilities:availability.closed")}</span>
        </div>
      </div>

      {/* Availability Grid */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[500px] sm:min-w-[600px] space-y-4">
          {displayFacilities.map((facility) => {
            const slots = availabilityData.get(facility.id) || [];

            return (
              <div key={facility.id} className="space-y-2">
                <h4 className="font-medium text-sm">{facility.name}</h4>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
                  {slots.map((slot, index) => {
                    const slotEnd = addMinutes(slot.time, slotDuration);
                    const isClickable = !slot.closed && !slot.full;

                    return (
                      <button
                        key={index}
                        className={cn(
                          "p-2 rounded text-xs font-medium transition-colors",
                          "flex flex-col items-center justify-center",
                          "border",
                          getSlotClassName(slot),
                        )}
                        onClick={() => {
                          if (isClickable) {
                            onSlotClick(facility.id, slot.time, slotEnd);
                          }
                        }}
                        disabled={!isClickable}
                        title={getSlotTooltip(slot)}
                      >
                        <span>{format(slot.time, "HH:mm")}</span>
                        {/* Show capacity for all non-closed slots */}
                        {!slot.closed && (
                          <span className="text-[10px] font-bold mt-0.5">
                            {slot.maxCapacity - slot.reservationCount}/
                            {slot.maxCapacity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {displayFacilities.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("facilities:myReservations.noFacilities")}
        </div>
      )}
    </div>
  );
}
