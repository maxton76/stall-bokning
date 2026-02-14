/**
 * UtilizationBarChart Component
 * Bar chart showing utilization percentage by facility
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";

interface UtilizationBarChartProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
}

export function UtilizationBarChart({
  facilities,
  reservations,
}: UtilizationBarChartProps) {
  const { t } = useTranslation(["facilities", "common"]);

  // Calculate utilization data
  const data = useMemo(() => {
    return facilities.map((facility) => {
      const facilityReservations = reservations.filter(
        (r) => r.facilityId === facility.id,
      );

      // Calculate total possible hours (8 hours/day * 30 days)
      const hoursPerDay = 8;
      const days = 30;
      const totalPossibleHours = hoursPerDay * days;

      // Calculate booked hours
      const bookedHours = facilityReservations.reduce((total, reservation) => {
        const start = toDate(reservation.startTime);
        const end = toDate(reservation.endTime);
        if (!start || !end) return total;

        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);

      const utilization = (bookedHours / totalPossibleHours) * 100;

      return {
        name: facility.name,
        utilization: Math.round(utilization * 10) / 10,
        bookings: facilityReservations.length,
      };
    });
  }, [facilities, reservations]);

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        {t("facilities:analytics.noData")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          className="text-xs fill-muted-foreground"
        />
        <YAxis
          label={{
            value: t("facilities:analytics.metrics.utilizationPercentage"),
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
                <p className="font-medium">{data.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t("facilities:analytics.utilizationRate")}:{" "}
                  {data.utilization}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("facilities:analytics.metrics.totalBookings")}:{" "}
                  {data.bookings}
                </p>
              </div>
            );
          }}
        />
        <Legend />
        <Bar
          dataKey="utilization"
          fill="hsl(var(--primary))"
          name={t("facilities:analytics.utilizationRate")}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
