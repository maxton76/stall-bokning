/**
 * BookingTrendChart Component
 * Line chart showing booking trends over time
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";

interface BookingTrendChartProps {
  reservations: FacilityReservation[];
  days?: number; // Number of days to show, default 30
}

export function BookingTrendChart({
  reservations,
  days = 30,
}: BookingTrendChartProps) {
  const { t } = useTranslation(["facilities", "common"]);

  // Calculate daily booking counts
  const data = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);

    // Generate all dates in range
    const allDates = eachDayOfInterval({ start: startDate, end: endDate });

    // Count bookings per day
    const dailyCounts = allDates.map((date) => {
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const bookingsThisDay = reservations.filter((r) => {
        const startTime = toDate(r.startTime);
        if (!startTime) return false;

        return startTime >= dayStart && startTime <= dayEnd;
      });

      const confirmed = bookingsThisDay.filter(
        (r) => r.status === "confirmed",
      ).length;
      const completed = bookingsThisDay.filter(
        (r) => r.status === "completed",
      ).length;
      const cancelled = bookingsThisDay.filter(
        (r) => r.status === "cancelled",
      ).length;

      return {
        date: format(date, "MMM dd"),
        fullDate: date,
        total: bookingsThisDay.length,
        confirmed,
        completed,
        cancelled,
      };
    });

    return dailyCounts;
  }, [reservations, days]);

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        {t("facilities:analytics.noData")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
        <YAxis
          label={{
            value: t("facilities:analytics.metrics.totalBookings"),
            angle: -90,
            position: "insideLeft",
            className: "fill-muted-foreground",
          }}
          className="text-xs fill-muted-foreground"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length || !payload[0])
              return null;

            const data = payload[0].payload;
            return (
              <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-medium mb-2">{data.date}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Total: {data.total}</p>
                  <p className="text-green-600">
                    {t("constants:reservationStatus.confirmed")}:{" "}
                    {data.confirmed}
                  </p>
                  <p className="text-blue-600">
                    {t("constants:reservationStatus.completed")}:{" "}
                    {data.completed}
                  </p>
                  <p className="text-red-600">
                    {t("constants:reservationStatus.cancelled")}:{" "}
                    {data.cancelled}
                  </p>
                </div>
              </div>
            );
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--primary))"
          name={t("common:labels.total")}
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))", r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="confirmed"
          stroke="hsl(142 76% 36%)"
          name={t("constants:reservationStatus.confirmed")}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="completed"
          stroke="hsl(221 83% 53%)"
          name={t("constants:reservationStatus.completed")}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
