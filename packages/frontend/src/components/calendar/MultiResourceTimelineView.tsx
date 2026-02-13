/**
 * MultiResourceTimelineView Component
 * Custom MIT-licensed calendar replacing FullCalendar's resource-timegrid
 * Displays multiple facilities in horizontal timeline rows with drag-and-drop booking
 */

import { useState, useRef, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMinutes,
  differenceInMinutes,
  isSameDay,
  startOfDay,
} from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import { BookingBlock } from "./BookingBlock";
import { SelectionOverlay } from "./SelectionOverlay";
import { TimelineHeader } from "./TimelineHeader";
import { ResourceRow } from "./ResourceRow";
import {
  getEffectiveTimeBlocks,
  createDefaultSchedule,
  isTimeRangeAvailable,
} from "@equiduty/shared";
import { toDate } from "@/utils/timestampUtils";
import { cn } from "@/lib/utils";

interface MultiResourceTimelineViewProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onReservationClick: (reservation: FacilityReservation) => void;
  onDateSelect: (facilityId: string, start: Date, end: Date) => void;
  onReservationDrop?: (
    reservationId: string,
    newFacilityId: string,
    newStart: Date,
    newEnd: Date,
  ) => void;
  editable?: boolean;
  slotDuration?: number; // minutes per slot (default: 15)
  slotMinTime?: string; // HH:mm format (default: "06:00")
  slotMaxTime?: string; // HH:mm format (default: "22:00")
  className?: string;
}

interface TimeSlot {
  time: Date;
  label: string;
  isHour: boolean;
}

export function MultiResourceTimelineView({
  facilities,
  reservations,
  selectedDate,
  onDateChange,
  onReservationClick,
  onDateSelect,
  onReservationDrop,
  editable = true,
  slotDuration = 15,
  slotMinTime = "06:00",
  slotMaxTime = "22:00",
  className,
}: MultiResourceTimelineViewProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === "sv" ? sv : enUS;

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<{
    facilityId: string;
    time: Date;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse time range
  const [minHour, minMinute] = slotMinTime.split(":").map(Number);
  const [maxHour, maxMinute] = slotMaxTime.split(":").map(Number);

  const startTime = new Date(selectedDate);
  startTime.setHours(minHour, minMinute, 0, 0);

  const endTime = new Date(selectedDate);
  endTime.setHours(maxHour, maxMinute, 0, 0);

  // Generate time slots
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const isHour = currentTime.getMinutes() === 0;
      slots.push({
        time: new Date(currentTime),
        label: format(currentTime, "HH:mm", { locale }),
        isHour,
      });
      currentTime = addMinutes(currentTime, slotDuration);
    }

    return slots;
  }, [startTime, endTime, slotDuration, locale]);

  // Group reservations by facility
  const reservationsByFacility = useMemo(() => {
    const grouped = new Map<string, FacilityReservation[]>();

    facilities.forEach((facility) => {
      grouped.set(facility.id, []);
    });

    reservations.forEach((reservation) => {
      const startDate = toDate(reservation.startTime);
      const endDate = toDate(reservation.endTime);

      // Only show reservations for selected date
      if (startDate && isSameDay(startDate, selectedDate)) {
        const facilityReservations = grouped.get(reservation.facilityId) || [];
        facilityReservations.push(reservation);
        grouped.set(reservation.facilityId, facilityReservations);
      }
    });

    return grouped;
  }, [facilities, reservations, selectedDate]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Handle drag start
  const handleDragStart = useCallback((event: any) => {
    setActiveDragId(event.active.id);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: any) => {
      const { active, over } = event;

      if (over && onReservationDrop) {
        const reservationId = active.id;
        const overData = over.data.current;

        if (overData?.facilityId && overData?.time) {
          const reservation = reservations.find((r) => r.id === reservationId);
          if (reservation) {
            const originalStart = toDate(reservation.startTime);
            const originalEnd = toDate(reservation.endTime);
            const duration =
              originalStart && originalEnd
                ? differenceInMinutes(originalEnd, originalStart)
                : 60;

            const newStart = new Date(overData.time);
            const newEnd = addMinutes(newStart, duration);

            onReservationDrop(
              reservationId,
              overData.facilityId,
              newStart,
              newEnd,
            );
          }
        }
      }

      setActiveDragId(null);
    },
    [reservations, onReservationDrop],
  );

  // Handle selection overlay
  const handleSelectionStart = useCallback(
    (facilityId: string, time: Date) => {
      if (!editable) return;
      setSelectionStart({ facilityId, time });
    },
    [editable],
  );

  const handleSelectionEnd = useCallback(
    (facilityId: string, time: Date) => {
      if (!editable || !selectionStart) return;

      // Calculate start and end times
      const start = selectionStart.time < time ? selectionStart.time : time;
      const end = selectionStart.time < time ? time : selectionStart.time;

      // Round to slot duration
      const roundedEnd = addMinutes(end, slotDuration);

      // Validate business hours
      const facility = facilities.find((f) => f.id === facilityId);
      if (facility) {
        const schedule =
          facility.availabilitySchedule || createDefaultSchedule();
        const effectiveBlocks = getEffectiveTimeBlocks(schedule, start);

        const startTimeStr = format(start, "HH:mm");
        const endTimeStr = format(roundedEnd, "HH:mm");

        if (isTimeRangeAvailable(effectiveBlocks, startTimeStr, endTimeStr)) {
          onDateSelect(facilityId, start, roundedEnd);
        }
      }

      setSelectionStart(null);
    },
    [selectionStart, facilities, editable, slotDuration, onDateSelect],
  );

  const handleSelectionCancel = useCallback(() => {
    setSelectionStart(null);
  }, []);

  // Calculate grid columns (1 column per time slot)
  const gridTemplateColumns = `200px repeat(${timeSlots.length}, minmax(60px, 1fr))`;

  // Get dragging reservation for overlay
  const draggingReservation = activeDragId
    ? reservations.find((r) => r.id === activeDragId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        className={cn(
          "bg-card rounded-lg border shadow-sm overflow-hidden",
          className,
        )}
      >
        {/* Date Navigation */}
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={() => onDateChange(addDays(selectedDate, -7))}
            className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            ← Previous Week
          </button>

          <h2 className="text-lg font-semibold">
            {format(selectedDate, "EEEE, MMMM d, yyyy", { locale })}
          </h2>

          <button
            onClick={() => onDateChange(addDays(selectedDate, 7))}
            className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            Next Week →
          </button>
        </div>

        {/* Timeline Grid */}
        <div className="overflow-x-auto">
          <div
            className="min-w-full"
            style={{
              display: "grid",
              gridTemplateColumns,
            }}
          >
            {/* Header */}
            <TimelineHeader timeSlots={timeSlots} />

            {/* Resource Rows */}
            {facilities.map((facility) => (
              <ResourceRow
                key={facility.id}
                facility={facility}
                timeSlots={timeSlots}
                reservations={reservationsByFacility.get(facility.id) || []}
                onReservationClick={onReservationClick}
                onSelectionStart={handleSelectionStart}
                onSelectionEnd={handleSelectionEnd}
                onSelectionCancel={handleSelectionCancel}
                selectionStart={
                  selectionStart?.facilityId === facility.id
                    ? selectionStart.time
                    : null
                }
                editable={editable}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggingReservation && (
          <BookingBlock
            reservation={draggingReservation}
            isDragging={true}
            onReservationClick={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
