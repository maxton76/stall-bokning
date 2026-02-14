/**
 * ResourceRow Component
 * Displays one facility's timeline row with booking blocks
 * Includes droppable zone for drag-and-drop and click-and-drag selection
 */

import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isBefore, isAfter, isSameMinute } from "date-fns";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import { BookingBlock } from "./BookingBlock";
import { SelectionOverlay } from "./SelectionOverlay";
import { CALENDAR_DEFAULTS } from "./constants";
import {
  getEffectiveTimeBlocks,
  createDefaultSchedule,
} from "@equiduty/shared";
import { cn } from "@/lib/utils";

interface TimeSlot {
  time: Date;
  label: string;
  isHour: boolean;
}

interface ResourceRowProps {
  facility: Facility;
  facilityIndex: number;
  timeSlots: TimeSlot[];
  reservations: FacilityReservation[];
  onReservationClick: (reservation: FacilityReservation) => void;
  onSelectionStart: (facilityId: string, time: Date) => void;
  onSelectionEnd: (facilityId: string, time: Date) => void;
  onSelectionCancel: () => void;
  selectionStart: Date | null;
  editable?: boolean;
  slotDuration?: number;
  slotMinTime?: string;
  orientation?: "horizontal" | "vertical";
}

export const ResourceRow = memo(function ResourceRow({
  facility,
  facilityIndex,
  timeSlots,
  reservations,
  onReservationClick,
  onSelectionStart,
  onSelectionEnd,
  onSelectionCancel,
  selectionStart,
  editable = true,
  slotDuration = CALENDAR_DEFAULTS.SLOT_DURATION_MINUTES,
  slotMinTime = CALENDAR_DEFAULTS.SLOT_MIN_TIME,
  orientation = "horizontal",
}: ResourceRowProps) {
  // Make row droppable for drag-and-drop
  const { setNodeRef, isOver } = useDroppable({
    id: `resource-${facility.id}`,
    data: {
      facilityId: facility.id,
      type: "resource",
    },
  });

  // Get business hours for this facility
  const businessHours = useMemo(() => {
    const schedule = facility.availabilitySchedule || createDefaultSchedule();
    const today = timeSlots[0]?.time || new Date();
    return getEffectiveTimeBlocks(schedule, today);
  }, [facility.availabilitySchedule, timeSlots]);

  // Check if a time slot is available (within business hours)
  const isTimeSlotAvailable = (time: Date): boolean => {
    const timeStr = format(time, "HH:mm");

    return businessHours.some((block) => {
      return timeStr >= block.from && timeStr < block.to;
    });
  };

  if (orientation === "vertical") {
    return (
      <>
        {/* Facility name header (row 1, col facilityIndex+2) */}
        <div
          className={cn(
            "sticky top-0 z-10 flex items-center justify-center",
            "bg-background border-b border-r border-border",
            "px-4 py-3 font-medium text-sm text-center",
          )}
          style={{
            gridRow: 1,
            gridColumn: facilityIndex + 2, // +2 for time column
          }}
        >
          <div className="truncate">{facility.name}</div>
        </div>

        {/* Time slot cells (rows 2-N, col facilityIndex+2) */}
        <div
          ref={setNodeRef}
          className={cn(
            "relative grid grid-rows-subgrid border-r border-border",
            isOver && "bg-primary/5",
          )}
          style={{
            gridRow: `2 / -1`,
            gridColumn: facilityIndex + 2,
          }}
        >
          {/* Time slot background cells */}
          {timeSlots.map((slot, index) => {
            const isAvailable = isTimeSlotAvailable(slot.time);

            return (
              <div
                key={index}
                className={cn(
                  "relative w-full border-border",
                  slot.isHour && "border-t",
                  !isAvailable && "bg-muted/20",
                )}
                style={{ gridRow: index + 1 }}
              />
            );
          })}

          {/* Selection overlay */}
          {editable && (
            <SelectionOverlay
              facilityId={facility.id}
              facilityIndex={facilityIndex}
              timeSlots={timeSlots}
              onSelectionStart={onSelectionStart}
              onSelectionEnd={onSelectionEnd}
              onSelectionCancel={onSelectionCancel}
              selectionStart={selectionStart}
              businessHours={businessHours}
              slotDuration={slotDuration}
              orientation="vertical"
            />
          )}

          {/* Booking blocks */}
          {reservations.map((reservation) => (
            <BookingBlock
              key={reservation.id}
              reservation={reservation}
              facilityIndex={facilityIndex}
              slotDuration={slotDuration}
              slotMinTime={slotMinTime}
              editable={editable}
              onReservationClick={onReservationClick}
              orientation="vertical"
            />
          ))}
        </div>
      </>
    );
  }

  // Original horizontal implementation
  return (
    <>
      {/* Resource name column */}
      <div
        className={cn(
          "sticky left-0 z-10 flex items-center",
          "bg-background border-b border-r border-border",
          "px-4 py-3 font-medium text-sm",
        )}
      >
        <div className="truncate">{facility.name}</div>
      </div>

      {/* Time slots and booking blocks */}
      <div
        ref={setNodeRef}
        className={cn(
          "relative",
          "col-start-2 col-end-[-1]",
          "grid grid-cols-subgrid",
          "border-b border-border",
          isOver && "bg-primary/5",
        )}
        style={{
          gridColumn: `2 / -1`,
        }}
      >
        {/* Time slot background cells */}
        {timeSlots.map((slot, index) => {
          const isAvailable = isTimeSlotAvailable(slot.time);

          return (
            <div
              key={index}
              className={cn(
                "relative h-20 border-border",
                slot.isHour && "border-l",
                !isAvailable && "bg-muted/20",
              )}
            />
          );
        })}

        {/* Selection overlay for click-and-drag booking */}
        {editable && (
          <SelectionOverlay
            facilityId={facility.id}
            facilityIndex={facilityIndex}
            timeSlots={timeSlots}
            onSelectionStart={onSelectionStart}
            onSelectionEnd={onSelectionEnd}
            onSelectionCancel={onSelectionCancel}
            selectionStart={selectionStart}
            businessHours={businessHours}
            slotDuration={slotDuration}
          />
        )}

        {/* Booking blocks */}
        {reservations.map((reservation) => (
          <BookingBlock
            key={reservation.id}
            reservation={reservation}
            slotDuration={slotDuration}
            slotMinTime={slotMinTime}
            editable={editable}
            onReservationClick={onReservationClick}
          />
        ))}
      </div>
    </>
  );
});
