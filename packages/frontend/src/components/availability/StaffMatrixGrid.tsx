import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, isWeekend } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  User,
  Clock,
  CalendarOff,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  StaffAvailabilityMatrix,
  CalendarLeaveStatus,
} from "@stall-bokning/shared";

interface StaffMatrixGridProps {
  matrix: StaffAvailabilityMatrix;
  showDetails?: boolean;
}

/**
 * Get cell background color based on availability status
 */
function getCellColor(
  isAvailable: boolean,
  leaveStatus: CalendarLeaveStatus,
  isWeekendDay: boolean,
): string {
  if (isWeekendDay) {
    return "bg-muted/50";
  }
  if (leaveStatus === "approved") {
    return "bg-red-100 dark:bg-red-900/30";
  }
  if (leaveStatus === "pending") {
    return "bg-amber-100 dark:bg-amber-900/30";
  }
  if (leaveStatus === "partial") {
    return "bg-amber-50 dark:bg-amber-900/20";
  }
  if (!isAvailable) {
    return "bg-gray-100 dark:bg-gray-800";
  }
  return "bg-green-100 dark:bg-green-900/30";
}

/**
 * Get coverage badge variant based on score
 */
function getCoverageBadgeVariant(
  score: number,
): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 75) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

export function StaffMatrixGrid({
  matrix,
  showDetails = false,
}: StaffMatrixGridProps) {
  const { t, i18n } = useTranslation(["availability", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  // Parse dates from the matrix
  const dates = useMemo(() => {
    return matrix.teamSummary.map((day) => parseISO(day.date));
  }, [matrix.teamSummary]);

  if (matrix.staffAvailability.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">
          {t("availability:staffMatrix.noStaff")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("availability:staffMatrix.noStaffDescription")}
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Date header row */}
            <tr>
              <th className="sticky left-0 z-10 bg-background border-b p-2 text-left min-w-[200px]">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {t("availability:staffMatrix.staff")}
                  </span>
                </div>
              </th>
              {dates.map((date, index) => {
                const isWeekendDay = isWeekend(date);
                const daySummary = matrix.teamSummary[index];

                return (
                  <th
                    key={date.toISOString()}
                    className={cn(
                      "border-b p-1 text-center min-w-[48px]",
                      isWeekendDay && "bg-muted/30",
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground">
                        {format(date, "EEE", { locale })}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isWeekendDay && "text-muted-foreground",
                        )}
                      >
                        {format(date, "d")}
                      </span>
                      {showDetails && daySummary && (
                        <Badge
                          variant={getCoverageBadgeVariant(
                            daySummary.coverageScore,
                          )}
                          className="text-xs mt-1"
                        >
                          {daySummary.coverageScore}%
                        </Badge>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="border-b p-2 text-center min-w-[80px]">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("availability:staffMatrix.totalAvailable")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.staffAvailability.map((staff) => (
              <tr key={staff.userId} className="group hover:bg-muted/50">
                {/* Staff name cell */}
                <td className="sticky left-0 z-10 bg-background group-hover:bg-muted/50 border-b p-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {staff.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {staff.userName}
                      </span>
                      {staff.role && (
                        <span className="text-xs text-muted-foreground">
                          {staff.role}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Day cells */}
                {staff.days.map((day, dayIndex) => {
                  const date = dates[dayIndex];
                  const isWeekendDay = isWeekend(date);

                  return (
                    <td
                      key={day.date}
                      className={cn(
                        "border-b p-1 text-center",
                        getCellColor(
                          day.isAvailable,
                          day.leaveStatus,
                          isWeekendDay,
                        ),
                      )}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center h-8 w-full cursor-default">
                            {day.leaveStatus === "approved" && (
                              <CalendarOff className="h-4 w-4 text-red-600" />
                            )}
                            {day.leaveStatus === "pending" && (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                            {day.leaveStatus === "partial" && (
                              <span className="text-xs font-medium text-amber-600">
                                ½
                              </span>
                            )}
                            {day.leaveStatus === "none" && day.isAvailable && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {day.leaveStatus === "none" && !day.isAvailable && (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-medium">
                              {format(date, "EEEE, MMMM d", { locale })}
                            </p>
                            <p className="text-muted-foreground">
                              {day.isAvailable
                                ? `${day.availableHours} ${t("availability:staffMatrix.hours")}`
                                : t("availability:staffMatrix.unavailable")}
                            </p>
                            {day.leaveStatus !== "none" && (
                              <p className="text-muted-foreground">
                                {t(
                                  `availability:staffMatrix.status.${day.leaveStatus}`,
                                )}
                              </p>
                            )}
                            {day.assignmentCount > 0 && (
                              <p className="text-muted-foreground">
                                {day.assignmentCount}{" "}
                                {t(
                                  "availability:staffMatrix.assignedActivities",
                                )}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}

                {/* Summary cell */}
                <td className="border-b p-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium">
                      {staff.totalAvailableHours}
                      {t("availability:staffMatrix.hoursShort")}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        staff.availabilityPercentage >= 75
                          ? "text-green-600"
                          : staff.availabilityPercentage >= 50
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      {staff.availabilityPercentage}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}

            {/* Team summary row */}
            <tr className="bg-muted/30 font-medium">
              <td className="sticky left-0 z-10 bg-muted/30 border-t-2 p-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span>{t("availability:staffMatrix.summary.title")}</span>
                </div>
              </td>
              {matrix.teamSummary.map((day) => {
                const date = parseISO(day.date);
                const isWeekendDay = isWeekend(date);

                return (
                  <td
                    key={day.date}
                    className={cn(
                      "border-t-2 p-1 text-center",
                      isWeekendDay && "bg-muted/50",
                      day.hasShortage &&
                        !isWeekendDay &&
                        "bg-red-100 dark:bg-red-900/30",
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center cursor-default">
                          <span
                            className={cn(
                              "text-sm",
                              day.hasShortage && "text-red-600 font-medium",
                            )}
                          >
                            {day.availableStaff}/{day.totalStaff}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">
                            {format(date, "EEEE, MMMM d", { locale })}
                          </p>
                          <p>
                            {day.availableStaff} / {day.totalStaff}{" "}
                            {t("availability:staffMatrix.available")}
                          </p>
                          <p>
                            {day.totalAvailableHours}{" "}
                            {t("availability:staffMatrix.hours")}
                          </p>
                          <p>
                            {t("availability:staffMatrix.coverageScore")}:{" "}
                            {day.coverageScore}%
                          </p>
                          {day.hasShortage && (
                            <p className="text-red-600">
                              {t("availability:staffMatrix.shortage")}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                );
              })}
              <td className="border-t-2 p-2 text-center">
                <span
                  className={cn(
                    "text-sm font-medium",
                    matrix.averageDailyAvailability >= 75
                      ? "text-green-600"
                      : matrix.averageDailyAvailability >= 50
                        ? "text-amber-600"
                        : "text-red-600",
                  )}
                >
                  {matrix.averageDailyAvailability}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span className="font-medium">
          {t("availability:staffMatrix.legend")}:
        </span>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-3 w-3 text-green-600" />
          </div>
          <span>{t("availability:staffMatrix.available")}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="h-3 w-3 text-amber-600" />
          </div>
          <span>{t("availability:staffMatrix.pendingLeave")}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <span className="text-xs font-medium text-amber-600">½</span>
          </div>
          <span>{t("availability:staffMatrix.partiallyAvailable")}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <CalendarOff className="h-3 w-3 text-red-600" />
          </div>
          <span>{t("availability:staffMatrix.onLeave")}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded bg-muted/50" />
          <span>{t("common:labels.weekend")}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
