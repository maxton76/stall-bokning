/**
 * FacilityUtilizationDashboard Component
 * Analytics dashboard for stable owners (Persona B)
 * Shows utilization rates, trends, peak hours, and user statistics
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, TrendingUp, Users, Calendar, Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import { BookingAnalytics } from "@/components/BookingAnalytics";
import { CustomerUsageTable } from "@/components/CustomerUsageTable";
import { UtilizationBarChart } from "@/components/charts/UtilizationBarChart";
import { BookingTrendChart } from "@/components/charts/BookingTrendChart";
import { PeakHoursHeatmap } from "@/components/charts/PeakHoursHeatmap";
import { toDate } from "@/utils/timestampUtils";
import { Button } from "@/components/ui/button";
import { exportAnalyticsToCSV, exportAnalyticsToPDF } from "@/utils/exportData";
import { format, subDays } from "date-fns";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { useToast } from "@/hooks/use-toast";

interface FacilityUtilizationDashboardProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
  onExport?: (format: "csv" | "pdf") => void;
}

interface UtilizationMetrics {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  averageUtilization: number;
  peakHour: string;
}

export function FacilityUtilizationDashboard({
  facilities,
  reservations,
  onExport,
}: FacilityUtilizationDashboardProps) {
  const { t } = useTranslation(["facilities", "common"]);
  const { currentOrganizationId } = useOrganization();
  const { hasPermission } = useOrgPermissions(currentOrganizationId);
  const { toast } = useToast();

  const canExport = hasPermission("export_data");

  // Calculate overall metrics
  const metrics = useMemo<UtilizationMetrics>(() => {
    const now = new Date();

    const totalBookings = reservations.length;
    const confirmedBookings = reservations.filter(
      (r) => r.status === "confirmed",
    ).length;
    const completedBookings = reservations.filter(
      (r) => r.status === "completed",
    ).length;
    const cancelledBookings = reservations.filter(
      (r) => r.status === "cancelled",
    ).length;
    const noShows = reservations.filter((r) => r.status === "no_show").length;

    // Calculate utilization by facility
    const facilityUtilizations = facilities.map((facility) => {
      const facilityReservations = reservations.filter(
        (r) => r.facilityId === facility.id,
      );

      // Calculate total possible booking hours (assuming 8 hours/day, 7 days/week)
      const hoursPerDay = 8;
      const daysPerWeek = 7;
      const totalPossibleHours = hoursPerDay * daysPerWeek * 4; // 4 weeks

      // Calculate actual booked hours
      const bookedHours = facilityReservations.reduce((total, reservation) => {
        const start = toDate(reservation.startTime);
        const end = toDate(reservation.endTime);
        if (!start || !end) return total;

        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);

      return (bookedHours / totalPossibleHours) * 100;
    });

    const averageUtilization =
      facilityUtilizations.reduce((sum, util) => sum + util, 0) /
        facilities.length || 0;

    // Find peak booking hour
    const hourCounts = new Map<number, number>();
    reservations.forEach((r) => {
      const start = toDate(r.startTime);
      if (start) {
        const hour = start.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    });

    const peakHourEntry = Array.from(hourCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const peakHour = peakHourEntry ? `${peakHourEntry[0]}:00` : "N/A";

    return {
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      noShows,
      averageUtilization,
      peakHour,
    };
  }, [facilities, reservations]);

  // Calculate no-show rate
  const noShowRate = useMemo(() => {
    const completedAndNoShows = metrics.completedBookings + metrics.noShows;
    if (completedAndNoShows === 0) return 0;
    return (metrics.noShows / completedAndNoShows) * 100;
  }, [metrics]);

  // Calculate facility utilization data
  const facilityUtilizationData = useMemo(() => {
    return facilities.map((facility) => {
      const facilityReservations = reservations.filter(
        (r) => r.facilityId === facility.id,
      );
      const bookedHours = facilityReservations.reduce((total, reservation) => {
        const start = toDate(reservation.startTime);
        const end = toDate(reservation.endTime);
        if (!start || !end) return total;
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      return {
        facilityId: facility.id,
        facilityName: facility.name,
        bookings: facilityReservations.length,
        bookedHours,
      };
    });
  }, [facilities, reservations]);

  // Calculate top users data
  const topUsersData = useMemo(() => {
    const userStats = new Map<
      string,
      { email: string; name?: string; count: number }
    >();

    reservations.forEach((r) => {
      const userId = r.userId;
      if (!userId) return;

      const existing = userStats.get(userId);
      if (existing) {
        existing.count++;
      } else {
        userStats.set(userId, {
          email: r.userEmail || "N/A",
          name: r.userFullName,
          count: 1,
        });
      }
    });

    return Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        userEmail: stats.email,
        userName: stats.name,
        bookingCount: stats.count,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 10);
  }, [reservations]);

  // Handle export with built-in functionality
  const handleExport = (format: "csv" | "pdf") => {
    // Check export permission
    if (!canExport) {
      toast({
        title: t("common:errors.permissionDenied"),
        description: t("common:errors.noExportPermission"),
        variant: "destructive",
      });
      return;
    }

    // Check for empty dataset
    if (metrics.totalBookings === 0) {
      toast({
        title: t("facilities:analytics.noData"),
        description: t("common:messages.noDataToExport"),
        variant: "default",
      });
      return;
    }

    // If custom export handler provided, use it
    if (onExport) {
      onExport(format);
      return;
    }

    // Otherwise, use built-in export functionality
    const peakHourEntry = Array.from(
      reservations.reduce((map, r) => {
        const start = toDate(r.startTime);
        if (start) {
          const hour = start.getHours();
          map.set(hour, (map.get(hour) || 0) + 1);
        }
        return map;
      }, new Map<number, number>()),
    ).sort((a, b) => b[1] - a[1])[0];

    const peakHourNumber = peakHourEntry ? peakHourEntry[0] : null;

    // Calculate average duration
    const totalDuration = reservations.reduce((sum, r) => {
      const start = toDate(r.startTime);
      const end = toDate(r.endTime);
      if (!start || !end) return sum;
      return sum + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);
    const averageDuration =
      reservations.length > 0 ? totalDuration / reservations.length : 0;

    const exportData = {
      metrics: {
        totalBookings: metrics.totalBookings,
        confirmedBookings: metrics.confirmedBookings,
        completedBookings: metrics.completedBookings,
        cancelledBookings: metrics.cancelledBookings,
        noShows: metrics.noShows,
        averageDuration,
        noShowRate,
        peakHour: peakHourNumber,
      },
      facilityUtilization: facilityUtilizationData,
      topUsers: topUsersData,
      dateRange: {
        startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
      },
    };

    if (format === "csv") {
      exportAnalyticsToCSV(exportData);
    } else {
      exportAnalyticsToPDF(exportData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            {t("facilities:analytics.title")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("facilities:views.managerDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            disabled={!canExport}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("pdf")}
            disabled={!canExport}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("facilities:analytics.metrics.totalBookings")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.confirmedBookings}{" "}
              {t("constants:reservationStatus.confirmed").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("facilities:analytics.metrics.utilizationPercentage")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageUtilization.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t("facilities:analytics.utilizationRate").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("facilities:analytics.metrics.peakHourStart")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.peakHour}</div>
            <p className="text-xs text-muted-foreground">
              {t("facilities:analytics.peakHours").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("facilities:analytics.noShowRate")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{noShowRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.noShows}{" "}
              {t("facilities:analytics.metrics.noShows").toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utilization">
            {t("facilities:analytics.utilizationRate")}
          </TabsTrigger>
          <TabsTrigger value="trends">
            {t("facilities:analytics.bookingTrends")}
          </TabsTrigger>
          <TabsTrigger value="peak">
            {t("facilities:analytics.peakHours")}
          </TabsTrigger>
          <TabsTrigger value="users">
            {t("facilities:analytics.topUsers")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="utilization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("facilities:analytics.facilityComparison")}
              </CardTitle>
              <CardDescription>
                {t("facilities:analytics.metrics.utilizationPercentage")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UtilizationBarChart
                facilities={facilities}
                reservations={reservations}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("facilities:analytics.bookingTrends")}</CardTitle>
              <CardDescription>
                {t("facilities:analytics.metrics.totalBookings")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookingTrendChart reservations={reservations} />
            </CardContent>
          </Card>

          <BookingAnalytics reservations={reservations} />
        </TabsContent>

        <TabsContent value="peak" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("facilities:analytics.peakHours")}</CardTitle>
              <CardDescription>
                Heatmap showing busiest hours by day of week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeakHoursHeatmap reservations={reservations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("facilities:analytics.topUsers")}</CardTitle>
              <CardDescription>
                Most active users by booking frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerUsageTable reservations={reservations} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
