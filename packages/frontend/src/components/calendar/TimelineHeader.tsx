/**
 * TimelineHeader Component
 * Sticky header showing time slots for the multi-resource timeline
 * Displays hour labels and minute markers
 */

import { memo } from "react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  time: Date;
  label: string;
  isHour: boolean;
}

interface TimelineHeaderProps {
  timeSlots: TimeSlot[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export const TimelineHeader = memo(function TimelineHeader({
  timeSlots,
  orientation = "horizontal",
  className,
}: TimelineHeaderProps) {
  if (orientation === "vertical") {
    return (
      <>
        {/* Time column header (row 1, col 1) */}
        <div
          className={cn(
            "sticky left-0 top-0 z-20 flex items-center justify-center",
            "bg-muted/30 border-b border-r border-border",
            "px-4 py-3 font-semibold text-sm text-foreground",
            className,
          )}
          style={{
            gridRow: 1,
            gridColumn: 1,
          }}
        >
          Time
        </div>

        {/* Time slot labels (rows 2-N, col 1) */}
        {timeSlots.map((slot, index) => (
          <div
            key={index}
            className={cn(
              "sticky left-0 z-10 flex items-start justify-end",
              "bg-muted/30 border-b border-r border-border",
              "px-3 pt-1 pb-2 text-xs",
              slot.isHour
                ? "font-semibold text-foreground border-t"
                : "font-normal text-muted-foreground",
            )}
            style={{
              gridRow: index + 2, // +2 for header row
              gridColumn: 1,
            }}
          >
            {slot.isHour ? slot.label : ""}
          </div>
        ))}
      </>
    );
  }

  // Original horizontal implementation
  return (
    <>
      {/* Resource column header */}
      <div
        className={cn(
          "sticky left-0 top-0 z-20 flex items-center justify-center",
          "bg-muted/30 border-b border-r border-border",
          "px-4 py-3 font-semibold text-sm text-foreground",
          className,
        )}
      >
        Facility
      </div>

      {/* Time slot headers */}
      {timeSlots.map((slot, index) => (
        <div
          key={index}
          className={cn(
            "sticky top-0 z-10 flex items-center justify-center",
            "bg-muted/30 border-b border-border",
            "px-1 py-3 text-xs",
            slot.isHour
              ? "font-semibold text-foreground border-l border-border"
              : "font-normal text-muted-foreground",
          )}
        >
          {slot.isHour ? slot.label : ""}
        </div>
      ))}
    </>
  );
});
