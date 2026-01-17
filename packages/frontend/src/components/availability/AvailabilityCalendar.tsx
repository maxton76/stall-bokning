import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWeekend,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  isBefore,
  isAfter,
} from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  AvailabilityCalendarDay,
  LeaveRequest,
  AvailabilityConstraint,
} from "@stall-bokning/shared";

interface AvailabilityCalendarProps {
  leaveRequests: LeaveRequest[];
  constraints?: AvailabilityConstraint[];
  workSchedule?: {
    workDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  };
  onDayClick?: (date: Date, dayData: AvailabilityCalendarDay) => void;
  onRequestLeave?: () => void;
  className?: string;
}

export function AvailabilityCalendar({
  leaveRequests,
  constraints = [],
  workSchedule = { workDays: [1, 2, 3, 4, 5] }, // Monday-Friday default
  onDayClick,
  onRequestLeave,
  className,
}: AvailabilityCalendarProps) {
  const { t, i18n } = useTranslation(["availability", "common"]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const locale = i18n.language === "sv" ? sv : enUS;

  // Generate calendar days with availability data
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return days.map((date): AvailabilityCalendarDay => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const isWorkDay = workSchedule.workDays.includes(dayOfWeek);

      // Find leave request for this date
      const leaveRequest = leaveRequests.find((lr) => {
        const startDate =
          lr.firstDay instanceof Date
            ? lr.firstDay
            : new Date((lr.firstDay as any).seconds * 1000);
        const endDate =
          lr.lastDay instanceof Date
            ? lr.lastDay
            : new Date((lr.lastDay as any).seconds * 1000);

        return (
          isWithinInterval(date, { start: startDate, end: endDate }) ||
          isSameDay(date, startDate) ||
          isSameDay(date, endDate)
        );
      });

      // Determine leave status
      let leaveStatus: "none" | "pending" | "approved" | "partial" = "none";
      let leaveType = undefined;

      if (leaveRequest) {
        if (leaveRequest.status === "approved") {
          leaveStatus = leaveRequest.isPartialDay ? "partial" : "approved";
        } else if (leaveRequest.status === "pending") {
          leaveStatus = "pending";
        }
        leaveType = leaveRequest.type;
      }

      // Check constraints for this day
      const hasConstraints = constraints.some((c) => {
        if (c.specificDate) {
          const constraintDate =
            c.specificDate instanceof Date
              ? c.specificDate
              : new Date((c.specificDate as any).seconds * 1000);
          return isSameDay(date, constraintDate);
        }
        if (c.isRecurring && c.dayOfWeek !== undefined) {
          return c.dayOfWeek === dayOfWeek;
        }
        return false;
      });

      return {
        date: dateStr,
        dayOfWeek,
        isWorkDay,
        scheduledHours: isWorkDay ? 8 : 0,
        leaveStatus,
        leaveType,
        hasAssignments: false,
        assignmentCount: 0,
        hasConstraints,
        availableHours: isWorkDay ? 8 : 0,
        isFullyAvailable:
          !hasConstraints && leaveStatus === "none" && isWorkDay,
        isPartiallyAvailable: hasConstraints || leaveStatus === "partial",
        isUnavailable: leaveStatus === "approved" || !isWorkDay,
      };
    });
  }, [currentMonth, leaveRequests, constraints, workSchedule]);

  // Navigation handlers
  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  // Get status color for a day
  const getDayStyles = (day: AvailabilityCalendarDay, date: Date) => {
    const isToday = isSameDay(date, new Date());
    const isCurrentMonth =
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear();

    let bgColor = "";
    let textColor = isCurrentMonth ? "" : "text-muted-foreground";

    if (day.leaveStatus === "approved") {
      bgColor = "bg-green-100 dark:bg-green-900/30";
      textColor = "text-green-800 dark:text-green-200";
    } else if (day.leaveStatus === "partial") {
      bgColor = "bg-amber-100 dark:bg-amber-900/30";
      textColor = "text-amber-800 dark:text-amber-200";
    } else if (day.leaveStatus === "pending") {
      bgColor = "bg-blue-100 dark:bg-blue-900/30";
      textColor = "text-blue-800 dark:text-blue-200";
    } else if (!day.isWorkDay && isCurrentMonth) {
      bgColor = "bg-muted/50";
    }

    if (day.hasConstraints && day.leaveStatus === "none") {
      bgColor = "bg-red-50 dark:bg-red-900/20";
    }

    return cn(
      "h-12 sm:h-16 p-1 border border-border/50 relative cursor-pointer hover:bg-accent/50 transition-colors",
      bgColor,
      textColor,
      isToday && "ring-2 ring-primary ring-inset",
      !isCurrentMonth && "opacity-50",
    );
  };

  // Weekday headers
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekdaysFull = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const weekdayKey = weekdays[i - 1]?.toLowerCase() ?? "mon";
      days.push(t(`common:weekdays.${weekdayKey}`));
    }
    return days;
  }, [t]);

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              {t("common:time.today")}
            </Button>
            <h2 className="text-lg font-semibold ml-2">
              {format(currentMonth, "MMMM yyyy", { locale })}
            </h2>
          </div>

          {onRequestLeave && (
            <Button onClick={onRequestLeave}>
              {t("availability:leave.requestTitle")}
            </Button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border" />
            <span>{t("availability:calendar.dayOff")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/30 border" />
            <span>{t("availability:calendar.partialLeave")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border" />
            <span>{t("availability:calendar.pendingLeave")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted/50 border" />
            <span>{t("availability:calendar.workDay")}</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {weekdaysFull.map((day, i) => (
              <div
                key={day}
                className={cn(
                  "p-2 text-center text-sm font-medium border-b",
                  i >= 5 && "text-muted-foreground",
                )}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarData.map((day, index) => {
              const date = new Date(day.date);
              return (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      className={getDayStyles(day, date)}
                      onClick={() => onDayClick?.(date, day)}
                    >
                      <span className="text-sm font-medium">
                        {format(date, "d")}
                      </span>

                      {/* Status indicators */}
                      <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 justify-center">
                        {day.leaveStatus === "pending" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 bg-blue-50 dark:bg-blue-900/30 border-blue-200"
                          >
                            {t("availability:leave.status.pending")}
                          </Badge>
                        )}
                        {day.leaveStatus === "partial" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 bg-amber-50 dark:bg-amber-900/30 border-amber-200"
                          >
                            ½
                          </Badge>
                        )}
                        {day.hasConstraints && day.leaveStatus === "none" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">
                        {format(date, "EEEE, MMMM d", { locale })}
                      </p>
                      {day.leaveStatus !== "none" && (
                        <p className="text-muted-foreground">
                          {day.leaveStatus === "approved" &&
                            t("availability:leave.status.approved")}
                          {day.leaveStatus === "pending" &&
                            t("availability:leave.status.pending")}
                          {day.leaveStatus === "partial" &&
                            t("availability:calendar.partialLeave")}
                        </p>
                      )}
                      {day.hasConstraints && (
                        <p className="text-red-500">
                          {t("availability:constraints.neverAvailable")}
                        </p>
                      )}
                      {!day.isWorkDay && day.leaveStatus === "none" && (
                        <p className="text-muted-foreground">
                          {t("availability:calendar.dayOff")}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
