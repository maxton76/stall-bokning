/**
 * CurrentTimeIndicator Component
 * Shows a red line indicating the current time on the timeline
 */

import { memo, useMemo, useEffect, useState } from "react";
import { format, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeSlot {
  time: Date;
  label: string;
  isHour: boolean;
}

interface CurrentTimeIndicatorProps {
  timeSlots: TimeSlot[];
  slotMinTime: string;
  selectedDate: Date;
  orientation?: "horizontal" | "vertical";
}

export const CurrentTimeIndicator = memo(function CurrentTimeIndicator({
  timeSlots,
  slotMinTime,
  selectedDate,
  orientation = "horizontal",
}: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate position
  const position = useMemo(() => {
    const now = new Date();

    // Check if current time is on the selected date
    const isToday =
      now.getFullYear() === selectedDate.getFullYear() &&
      now.getMonth() === selectedDate.getMonth() &&
      now.getDate() === selectedDate.getDate();

    if (!isToday) return null;

    // Parse min time
    const [minHour, minMinute] = slotMinTime.split(":").map(Number);
    const dayStart = new Date(selectedDate);
    dayStart.setHours(minHour ?? 0, minMinute ?? 0, 0, 0);

    // Calculate minutes from day start
    const minutesFromStart = differenceInMinutes(now, dayStart);

    if (minutesFromStart < 0) return null;

    // Calculate position as percentage
    const totalMinutes = timeSlots.length * 15; // Assuming 15-minute slots
    const percentage = (minutesFromStart / totalMinutes) * 100;

    if (percentage > 100) return null;

    return {
      percentage,
      time: format(now, "HH:mm"),
    };
  }, [currentTime, timeSlots, slotMinTime, selectedDate]);

  if (!position) return null;

  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "absolute left-0 right-0 z-30 pointer-events-none",
          "border-t-2 border-destructive",
        )}
        style={{
          top: `calc(60px + ${position.percentage}%)`,
          gridColumn: "1 / -1",
        }}
        role="presentation"
        aria-label={`Current time: ${position.time}`}
      >
        {/* Time label */}
        <div className="absolute -top-3 left-2 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded">
          {position.time}
        </div>
      </div>
    );
  }

  // Original horizontal implementation
  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 z-30 pointer-events-none",
        "border-l-2 border-destructive",
      )}
      style={{
        left: `calc(200px + ${position.percentage}%)`,
      }}
      role="presentation"
      aria-label={`Current time: ${position.time}`}
    >
      {/* Time label */}
      <div className="absolute -top-5 -left-8 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded">
        {position.time}
      </div>
    </div>
  );
});
