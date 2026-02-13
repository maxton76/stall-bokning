/**
 * CustomerUsageTable Component
 * Table showing top users by booking frequency
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { FacilityReservation } from "@/types/facilityReservation";

interface CustomerUsageTableProps {
  reservations: FacilityReservation[];
  maxUsers?: number;
}

interface UserStats {
  userId: string;
  userEmail: string;
  userName?: string;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  completionRate: number; // Percentage of bookings that were completed vs no-show
}

export function CustomerUsageTable({
  reservations,
  maxUsers = 10,
}: CustomerUsageTableProps) {
  const { t } = useTranslation(["facilities", "common", "constants"]);

  // Calculate user statistics
  const userStats = useMemo<UserStats[]>(() => {
    const userMap = new Map<string, UserStats>();

    reservations.forEach((r) => {
      const existing = userMap.get(r.userId) || {
        userId: r.userId,
        userEmail: r.userEmail,
        userName: r.userFullName,
        totalBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        noShows: 0,
        completionRate: 0,
      };

      existing.totalBookings++;

      switch (r.status) {
        case "confirmed":
          existing.confirmedBookings++;
          break;
        case "completed":
          existing.completedBookings++;
          break;
        case "cancelled":
          existing.cancelledBookings++;
          break;
        case "no_show":
          existing.noShows++;
          break;
      }

      userMap.set(r.userId, existing);
    });

    // Calculate completion rate
    userMap.forEach((stats) => {
      const completable = stats.completedBookings + stats.noShows;
      stats.completionRate =
        completable > 0 ? (stats.completedBookings / completable) * 100 : 100;
    });

    // Sort by total bookings and take top N
    return Array.from(userMap.values())
      .sort((a, b) => b.totalBookings - a.totalBookings)
      .slice(0, maxUsers);
  }, [reservations, maxUsers]);

  // Get completion rate badge color
  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 75) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (userStats.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("facilities:analytics.noData")}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>{t("common:labels.user")}</TableHead>
            <TableHead className="text-right">
              {t("facilities:analytics.metrics.totalBookings")}
            </TableHead>
            <TableHead className="text-right">
              {t("constants:reservationStatus.confirmed")}
            </TableHead>
            <TableHead className="text-right">
              {t("constants:reservationStatus.completed")}
            </TableHead>
            <TableHead className="text-right">
              {t("constants:reservationStatus.cancelled")}
            </TableHead>
            <TableHead className="text-right">
              {t("facilities:analytics.metrics.noShows")}
            </TableHead>
            <TableHead className="text-right">Completion %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userStats.map((stats, index) => (
            <TableRow key={stats.userId}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {stats.userName || stats.userEmail}
                  </div>
                  {stats.userName && (
                    <div className="text-sm text-muted-foreground">
                      {stats.userEmail}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {stats.totalBookings}
              </TableCell>
              <TableCell className="text-right">
                {stats.confirmedBookings}
              </TableCell>
              <TableCell className="text-right">
                {stats.completedBookings}
              </TableCell>
              <TableCell className="text-right">
                {stats.cancelledBookings}
              </TableCell>
              <TableCell className="text-right">{stats.noShows}</TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="secondary"
                  className={getCompletionRateColor(stats.completionRate)}
                >
                  {stats.completionRate.toFixed(0)}%
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
