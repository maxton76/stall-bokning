/**
 * PeakHoursHeatmap Component
 * Heatmap showing busiest hours by day of week
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";
import { cn } from "@/lib/utils";

interface PeakHoursHeatmapProps {
  reservations: FacilityReservation[];
}

interface HeatmapCell {
  day: string;
  hour: number;
  count: number;
  intensity: number; // 0-1 scale
}

export function PeakHoursHeatmap({ reservations }: PeakHoursHeatmapProps) {
  const { t } = useTranslation(["facilities", "common"]);

  // Days of week
  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  // Hours to display (6 AM to 10 PM)
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6-21

  // Calculate booking counts by day and hour
  const heatmapData = useMemo(() => {
    const data: HeatmapCell[][] = [];
    let maxCount = 0;

    daysOfWeek.forEach((day) => {
      const dayData: HeatmapCell[] = [];

      hours.forEach((hour) => {
        const count = reservations.filter((r) => {
          const start = toDate(r.startTime);
          if (!start) return false;

          const dayOfWeek = format(start, "EEEE").toLowerCase();
          const startHour = start.getHours();

          return dayOfWeek === day && startHour === hour;
        }).length;

        maxCount = Math.max(maxCount, count);

        dayData.push({
          day,
          hour,
          count,
          intensity: 0, // Will be calculated after we know maxCount
        });
      });

      data.push(dayData);
    });

    // Calculate intensity (0-1) based on maxCount
    if (maxCount > 0) {
      data.forEach((dayData) => {
        dayData.forEach((cell) => {
          cell.intensity = cell.count / maxCount;
        });
      });
    }

    return data;
  }, [reservations]);

  // Get cell color based on intensity
  const getCellColor = (intensity: number) => {
    if (intensity === 0) return "bg-muted";
    if (intensity < 0.25) return "bg-green-200 dark:bg-green-950";
    if (intensity < 0.5) return "bg-yellow-200 dark:bg-yellow-950";
    if (intensity < 0.75) return "bg-orange-200 dark:bg-orange-950";
    return "bg-red-200 dark:bg-red-950";
  };

  // Get text color based on intensity
  const getTextColor = (intensity: number) => {
    if (intensity === 0) return "text-muted-foreground";
    if (intensity < 0.5) return "text-foreground";
    return "text-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {t("facilities:analytics.metrics.totalBookings")}:
        </span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted border rounded" />
          <span>0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 dark:bg-green-950 border rounded" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-950 border rounded" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-200 dark:bg-orange-950 border rounded" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 dark:bg-red-950 border rounded" />
          <span>Peak</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-muted-foreground p-2 w-24">
                  {t("common:labels.day")}
                </th>
                {hours.map((hour) => (
                  <th
                    key={hour}
                    className="text-center text-xs font-medium text-muted-foreground p-1"
                  >
                    {hour}:00
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((dayData, dayIndex) => {
                const day = daysOfWeek[dayIndex];
                return (
                  <tr key={day}>
                    <td className="text-sm font-medium p-2">
                      {t(`facilities:daysLong.${day}`)}
                    </td>
                    {dayData.map((cell) => (
                      <td key={cell.hour} className="p-0.5">
                        <div
                          className={cn(
                            "w-full h-10 rounded flex items-center justify-center",
                            "text-xs font-medium border transition-all",
                            "hover:ring-2 hover:ring-primary hover:z-10",
                            getCellColor(cell.intensity),
                            getTextColor(cell.intensity),
                          )}
                          title={`${t(`facilities:daysLong.${day}`)} ${cell.hour}:00 - ${cell.count} bookings`}
                        >
                          {cell.count > 0 && cell.count}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {reservations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("facilities:analytics.noData")}
        </div>
      )}
    </div>
  );
}
