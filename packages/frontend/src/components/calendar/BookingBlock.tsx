/**
 * BookingBlock Component
 * Visual representation of a facility reservation on the timeline
 * Supports drag-and-drop using @dnd-kit
 */

import { memo, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, differenceInMinutes } from "date-fns";
import { useTranslation } from "react-i18next";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";
import { cn } from "@/lib/utils";
import { getHorses, getHorseCount } from "@/utils/reservationHelpers";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Status colors using Tailwind palette with WCAG AA contrast (4.5:1 minimum)
const STATUS_COLORS = {
  pending: {
    bg: "bg-amber-500",
    border: "border-amber-600",
    text: "text-white",
  },
  confirmed: {
    bg: "bg-emerald-500",
    border: "border-emerald-600",
    text: "text-white",
  },
  cancelled: {
    bg: "bg-gray-500",
    border: "border-gray-600",
    text: "text-white",
  },
  completed: {
    bg: "bg-blue-500",
    border: "border-blue-600",
    text: "text-white",
  },
  no_show: {
    bg: "bg-red-500",
    border: "border-red-600",
    text: "text-white",
  },
} as const;

interface BookingBlockProps {
  reservation: FacilityReservation;
  facilityIndex?: number; // For vertical mode
  slotDuration?: number; // minutes per slot
  slotMinTime?: string; // HH:mm format
  isDragging?: boolean;
  editable?: boolean;
  orientation?: "horizontal" | "vertical";
  onReservationClick: (reservation: FacilityReservation) => void;
}

export const BookingBlock = memo(function BookingBlock({
  reservation,
  facilityIndex,
  slotDuration = 15,
  slotMinTime = "06:00",
  isDragging = false,
  editable = true,
  orientation = "horizontal",
  onReservationClick,
}: BookingBlockProps) {
  const { t } = useTranslation("facilities");
  const startTime = toDate(reservation.startTime);
  const endTime = toDate(reservation.endTime);

  // Null check: Don't render if times are invalid
  if (!startTime || !endTime) {
    console.error("Invalid reservation times:", reservation);
    return null;
  }

  // Get horse information
  const horses = getHorses(reservation);
  const horseCount = getHorseCount(reservation);

  // Format horse display text
  const horseDisplayText = useMemo(() => {
    if (horseCount === 0) return "";
    if (horseCount === 1) return horses[0]?.name || "";
    return t("horses", { count: horseCount });
  }, [horses, horseCount, t]);

  // Calculate grid position
  const gridPosition = useMemo(() => {
    if (!startTime || !endTime) return null;

    // Parse min time with validation
    const timeParts = slotMinTime.split(":").map(Number);
    const minHour = timeParts[0] ?? 0;
    const minMinute = timeParts[1] ?? 0;
    const dayStart = new Date(startTime);
    dayStart.setHours(minHour, minMinute, 0, 0);

    // Calculate minutes from day start
    const minutesFromStart = differenceInMinutes(startTime, dayStart);
    const duration = differenceInMinutes(endTime, startTime);

    // Fix grid calculation: Use consistent Math.floor for both
    const startSlot = Math.floor(minutesFromStart / slotDuration);
    // Calculate end slot properly: floor of total minutes, ensure minimum width of 1 slot
    const totalMinutes = minutesFromStart + duration;
    const endSlot = Math.max(
      Math.floor(totalMinutes / slotDuration),
      startSlot + 1, // Ensure minimum width of 1 slot
    );

    if (orientation === "vertical") {
      return {
        gridRowStart: startSlot + 2, // +2 for header row
        gridRowEnd: endSlot + 2,
        gridColumn: (facilityIndex ?? 0) + 2, // +2 for time column
      };
    }

    return {
      gridColumnStart: startSlot + 2, // +2 to account for resource name column
      gridColumnEnd: endSlot + 2,
    };
  }, [
    startTime,
    endTime,
    slotDuration,
    slotMinTime,
    orientation,
    facilityIndex,
  ]);

  // Drag handlers
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDndDragging,
  } = useDraggable({
    id: reservation.id,
    disabled: !editable || isDragging,
    data: {
      reservation,
      type: "booking",
    },
  });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    ...(orientation === "vertical"
      ? {
          gridRowStart: gridPosition?.gridRowStart,
          gridRowEnd: gridPosition?.gridRowEnd,
          gridColumn: gridPosition?.gridColumn,
        }
      : {
          gridColumnStart: gridPosition?.gridColumnStart,
          gridColumnEnd: gridPosition?.gridColumnEnd,
        }),
    opacity: isDndDragging ? 0.5 : 1,
  };

  const statusColor =
    STATUS_COLORS[reservation.status as keyof typeof STATUS_COLORS] ||
    STATUS_COLORS.pending;

  if (!gridPosition) return null;

  // Sanitize and truncate user-facing display fields
  const userDisplay = (
    reservation.userFullName ||
    reservation.userEmail ||
    "Unknown"
  ).substring(0, 50);
  const statusLabel = reservation.status.replace(/_/g, " ");
  const ariaLabel = `Booking for ${userDisplay}, ${format(startTime, "HH:mm")} to ${format(endTime, "HH:mm")}, status: ${statusLabel}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            className={cn(
              "absolute top-1 bottom-1 rounded-md border-l-4",
              "px-2 py-1 overflow-hidden",
              "cursor-pointer transition-all duration-200",
              "hover:shadow-md hover:-translate-y-0.5",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              statusColor.bg,
              statusColor.border,
              statusColor.text,
              isDragging && "opacity-50",
              editable && "cursor-move",
            )}
            onClick={() => onReservationClick(reservation)}
            aria-label={ariaLabel}
            {...(editable ? listeners : {})}
            {...(editable ? attributes : {})}
          >
            <div className="text-xs font-medium truncate">{userDisplay}</div>
            <div className="text-xs opacity-90">
              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
            </div>
            {horseDisplayText && (
              <div className="text-xs opacity-80 truncate mt-0.5">
                {reservation.facilityName} • {horseDisplayText}
              </div>
            )}
          </div>
        </TooltipTrigger>
        {horseCount > 1 && (
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{userDisplay}</p>
              <p className="text-sm">
                {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
              </p>
              <div className="text-sm">
                <p className="font-medium">{t("reservation.labels.horses")}:</p>
                <ul className="list-disc list-inside">
                  {horses.map((horse) => (
                    <li key={horse.id}>{horse.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
});
