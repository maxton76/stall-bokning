/**
 * SelectionOverlay Component
 * Transparent overlay for click-and-drag time range selection
 * Validates business hours and provides visual feedback
 */

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { format, addMinutes, differenceInMinutes } from "date-fns";
import { isTimeRangeAvailable } from "@equiduty/shared";
import type { TimeBlock } from "@equiduty/shared";
import { cn } from "@/lib/utils";
import { CALENDAR_DEFAULTS } from "./constants";

interface TimeSlot {
  time: Date;
  label: string;
  isHour: boolean;
}

interface SelectionOverlayProps {
  facilityId: string;
  facilityIndex: number;
  timeSlots: TimeSlot[];
  onSelectionStart: (facilityId: string, time: Date) => void;
  onSelectionEnd: (facilityId: string, time: Date) => void;
  onSelectionCancel: () => void;
  selectionStart: Date | null;
  businessHours: TimeBlock[];
  slotDuration?: number;
  orientation?: "horizontal" | "vertical";
}

export const SelectionOverlay = memo(function SelectionOverlay({
  facilityId,
  facilityIndex,
  timeSlots,
  onSelectionStart,
  onSelectionEnd,
  onSelectionCancel,
  selectionStart,
  businessHours,
  slotDuration = CALENDAR_DEFAULTS.SLOT_DURATION_MINUTES,
  orientation = "horizontal",
}: SelectionOverlayProps) {
  const [hoverTime, setHoverTime] = useState<Date | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isSelecting = useRef(false);

  // Find the time slot closest to mouse position (handles both X and Y)
  const getTimeFromPosition = useCallback(
    (clientX: number, clientY: number): Date | null => {
      if (!overlayRef.current) return null;
      const rect = overlayRef.current.getBoundingClientRect();

      if (orientation === "vertical") {
        const relativeY = clientY - rect.top;
        const slotHeight = rect.height / timeSlots.length;
        const slotIndex = Math.floor(relativeY / slotHeight);

        if (slotIndex >= 0 && slotIndex < timeSlots.length) {
          return timeSlots[slotIndex]?.time ?? null;
        }
      } else {
        const relativeX = clientX - rect.left;
        const slotWidth = rect.width / timeSlots.length;
        const slotIndex = Math.floor(relativeX / slotWidth);

        if (slotIndex >= 0 && slotIndex < timeSlots.length) {
          return timeSlots[slotIndex]?.time ?? null;
        }
      }
      return null;
    },
    [timeSlots, orientation],
  );

  // Handle mouse down - start selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const time = getTimeFromPosition(e.clientX, e.clientY);

      if (time) {
        // Validate business hours before starting selection
        const timeStr = format(time, "HH:mm");
        const isAvailable = businessHours.some(
          (block) => timeStr >= block.from && timeStr < block.to,
        );

        if (isAvailable) {
          isSelecting.current = true;
          onSelectionStart(facilityId, time);
        }
      }
    },
    [getTimeFromPosition, businessHours, facilityId, onSelectionStart],
  );

  // Handle mouse move - update hover time
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromPosition(e.clientX, e.clientY);
      setHoverTime(time);
    },
    [getTimeFromPosition],
  );

  // Handle mouse up - complete selection
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting.current || !selectionStart) return;

      const time = getTimeFromPosition(e.clientX, e.clientY);

      if (time) {
        // Snap to slot duration
        const start = selectionStart < time ? selectionStart : time;
        const end = selectionStart < time ? time : selectionStart;
        const snappedEnd = addMinutes(end, slotDuration);

        // Validate the entire time range is within business hours
        const startTimeStr = format(start, "HH:mm");
        const endTimeStr = format(snappedEnd, "HH:mm");

        if (isTimeRangeAvailable(businessHours, startTimeStr, endTimeStr)) {
          onSelectionEnd(facilityId, time);
        } else {
          onSelectionCancel();
        }
      } else {
        onSelectionCancel();
      }

      isSelecting.current = false;
    },
    [
      selectionStart,
      getTimeFromPosition,
      slotDuration,
      businessHours,
      facilityId,
      onSelectionEnd,
      onSelectionCancel,
    ],
  );

  // Handle mouse leave - cancel selection if active
  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
    if (isSelecting.current) {
      onSelectionCancel();
      isSelecting.current = false;
    }
  }, [onSelectionCancel]);

  // Calculate selection visual bounds
  const selectionBounds = useCallback(() => {
    if (!selectionStart || !hoverTime) return null;

    const start = selectionStart < hoverTime ? selectionStart : hoverTime;
    const end = selectionStart < hoverTime ? hoverTime : selectionStart;

    // Find start and end slot indices
    const startIndex = timeSlots.findIndex(
      (slot) => slot.time?.getTime() === start.getTime(),
    );
    const endIndex = timeSlots.findIndex(
      (slot) => slot.time?.getTime() === end.getTime(),
    );

    if (startIndex === -1 || endIndex === -1) return null;

    return {
      startIndex,
      endIndex: endIndex + 1, // Include the end slot
    };
  }, [selectionStart, hoverTime, timeSlots]);

  const bounds = selectionBounds();

  return (
    <>
      {/* Invisible overlay for mouse events */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />

      {/* Visual selection indicator */}
      {bounds && (
        <div
          className={cn(
            "absolute z-20 pointer-events-none rounded-sm animate-pulse",
            "bg-primary/20 border-2 border-dashed border-primary",
            orientation === "vertical" ? "left-0 right-0" : "top-0 bottom-0",
          )}
          style={
            orientation === "vertical"
              ? {
                  top: `${(bounds.startIndex / timeSlots.length) * 100}%`,
                  height: `${((bounds.endIndex - bounds.startIndex) / timeSlots.length) * 100}%`,
                }
              : {
                  left: `${(bounds.startIndex / timeSlots.length) * 100}%`,
                  width: `${((bounds.endIndex - bounds.startIndex) / timeSlots.length) * 100}%`,
                }
          }
        />
      )}
    </>
  );
});
