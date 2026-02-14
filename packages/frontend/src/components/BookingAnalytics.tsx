/**
 * BookingAnalytics Component
 * Detailed analytics cards showing status distribution and metrics
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";

interface BookingAnalyticsProps {
  reservations: FacilityReservation[];
}

const STATUS_COLORS = {
  pending: "hsl(38 92% 50%)", // warning
  confirmed: "hsl(142 76% 36%)", // success/green
  cancelled: "hsl(240 5% 64%)", // muted/gray
  completed: "hsl(221 83% 53%)", // primary/blue
  no_show: "hsl(0 84% 60%)", // destructive/red
};

export function BookingAnalytics({ reservations }: BookingAnalyticsProps) {
  const { t } = useTranslation(["facilities", "common", "constants"]);

  // Calculate status distribution
  const statusData = useMemo(() => {
    const counts = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      no_show: 0,
    };

    reservations.forEach((r) => {
      if (r.status in counts) {
        counts[r.status as keyof typeof counts]++;
      }
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: t(`constants:reservationStatus.${status}`),
        value: count,
        status,
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
      }));
  }, [reservations, t]);

  // Calculate average duration
  const averageDuration = useMemo(() => {
    if (reservations.length === 0) return 0;

    const totalMinutes = reservations.reduce((total, r) => {
      const start = toDate(r.startTime);
      const end = toDate(r.endTime);
      if (!start || !end) return total;

      const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
      return total + minutes;
    }, 0);

    return Math.round(totalMinutes / reservations.length);
  }, [reservations]);

  // Calculate completion rate
  const completionRate = useMemo(() => {
    const completableStatuses = ["completed", "no_show"];
    const completable = reservations.filter((r) =>
      completableStatuses.includes(r.status),
    ).length;

    if (completable === 0) return 0;

    const completed = reservations.filter(
      (r) => r.status === "completed",
    ).length;
    return (completed / completable) * 100;
  }, [reservations]);

  // Calculate cancellation rate
  const cancellationRate = useMemo(() => {
    if (reservations.length === 0) return 0;

    const cancelled = reservations.filter(
      (r) => r.status === "cancelled",
    ).length;
    return (cancelled / reservations.length) * 100;
  }, [reservations]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Status Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("facilities:analytics.statusDistribution")}</CardTitle>
          <CardDescription>Breakdown by reservation status</CardDescription>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length || !payload[0])
                      return null;

                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.value}{" "}
                          {t("facilities:page.reservationsTitle").toLowerCase()}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              {t("facilities:analytics.noData")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("common:labels.summary")}</CardTitle>
          <CardDescription>Key performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">
                {t("facilities:analytics.metrics.averageBookingDuration")}
              </span>
              <span className="text-lg font-bold">
                {Math.floor(averageDuration / 60)}h {averageDuration % 60}m
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Completion Rate</span>
              <span className="text-lg font-bold text-green-600">
                {completionRate.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Cancellation Rate</span>
              <span className="text-lg font-bold text-red-600">
                {cancellationRate.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">
                {t("facilities:analytics.metrics.totalBookings")}
              </span>
              <span className="text-lg font-bold">{reservations.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
