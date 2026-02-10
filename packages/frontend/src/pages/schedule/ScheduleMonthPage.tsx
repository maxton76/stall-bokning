import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useScheduledRoutines } from "@/hooks/useScheduledRoutines";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isWeekend,
} from "date-fns";
import { sv } from "date-fns/locale";
import type { RoutineInstance } from "@shared/types";
import {
  getDuplicateNames,
  formatMemberDisplayName,
} from "@/utils/memberDisplayName";
import { useOrganizationCalendarHolidays } from "@/hooks/useOrganizationHolidays";

/**
 * Schedule Month Page - Monthly calendar view
 *
 * Shows the monthly schedule with:
 * - Calendar grid with real routine data
 * - Day summaries showing routine counts
 * - Navigation between months
 */
export default function ScheduleMonthPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganization();
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const [showAssignees, setShowAssignees] = useState(() => {
    try {
      return localStorage.getItem("schedule-month-show-assignees") === "true";
    } catch {
      return false;
    }
  });

  const toggleAssignees = () => {
    setShowAssignees((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("schedule-month-show-assignees", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable if none selected
  const activeStableId = selectedStableId || stables[0]?.id;

  // Fetch organization members for proper name formatting with duplicate detection
  const { data: members = [] } = useOrganizationMembers(currentOrganizationId);

  // Detect duplicate display names for disambiguation
  const duplicateNames = useMemo(() => getDuplicateNames(members), [members]);

  // Create member lookup map for efficient assignee name formatting
  const memberMap = useMemo(() => {
    const map = new Map<string, (typeof members)[0]>();
    members.forEach((member) => {
      map.set(member.userId, member);
    });
    return map;
  }, [members]);

  // Holiday data for the current month view
  const { showHolidays, getHoliday } =
    useOrganizationCalendarHolidays(currentMonth);

  // Calculate date range for the visible calendar (including overflow days)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Fetch routine instances for the visible date range
  const { data: routineInstances, isLoading } = useScheduledRoutines(
    activeStableId,
    calendarStart,
    calendarEnd,
  );

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Generate calendar days array
  const calendarDays: Date[] = useMemo(() => {
    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [calendarStart, calendarEnd]);

  const today = new Date();

  // Group routine instances by date
  const routinesByDate = useMemo(() => {
    const grouped = new Map<string, RoutineInstance[]>();

    if (!routineInstances) return grouped;

    for (const instance of routineInstances) {
      // scheduledDate can be string (from JSON), Date, or Firestore Timestamp
      const scheduledDate = instance.scheduledDate as unknown;
      let dateStr: string | undefined;

      if (typeof scheduledDate === "string") {
        dateStr = scheduledDate.split("T")[0];
      } else if (
        scheduledDate &&
        typeof (scheduledDate as any).toDate === "function"
      ) {
        dateStr = format((scheduledDate as any).toDate(), "yyyy-MM-dd");
      } else if (scheduledDate instanceof Date) {
        dateStr = format(scheduledDate, "yyyy-MM-dd");
      }

      if (!dateStr) {
        continue;
      }

      const existing = grouped.get(dateStr) || [];
      existing.push(instance);
      grouped.set(dateStr, existing);
    }

    return grouped;
  }, [routineInstances]);

  // Get routines for a specific day, sorted by scheduled time
  const getRoutinesForDay = (date: Date): RoutineInstance[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const instances = routinesByDate.get(dateStr) || [];

    // Sort by scheduledStartTime (earliest first)
    return [...instances].sort((a, b) => {
      const timeA = a.scheduledStartTime || "00:00";
      const timeB = b.scheduledStartTime || "00:00";
      return timeA.localeCompare(timeB);
    });
  };

  /**
   * Format routine assignee name with duplicate detection
   * Uses assignedTo (userId) to lookup full member data and apply email disambiguation
   */
  const formatRoutineAssigneeName = (routine: RoutineInstance): string => {
    if (!routine.assignedTo) return "";

    // Lookup member by ID for accurate data
    const member = memberMap.get(routine.assignedTo);
    if (member) {
      return formatMemberDisplayName(member, duplicateNames);
    }

    // Fallback to stored name if member not found (shouldn't happen normally)
    return routine.assignedToName || "";
  };

  const handleDayClick = (date: Date) => {
    // Navigate to week view with this day selected
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    navigate(`/schedule/week?date=${format(weekStart, "yyyy-MM-dd")}`);
  };

  // Loading state
  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // No stables state
  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Inga stall</h3>
            <p className="text-muted-foreground">
              Du behöver vara medlem i ett stall för att se månadsöversikten.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedStable = stables.find((s) => s.id === activeStableId);
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: sv });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("common:schedule.month.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("common:schedule.month.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stable selector */}
          {stables.length > 1 && (
            <Select value={activeStableId} onValueChange={setSelectedStableId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Välj stall" />
              </SelectTrigger>
              <SelectContent>
                {stables.map((stable) => (
                  <SelectItem key={stable.id} value={stable.id}>
                    {stable.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant={showAssignees ? "default" : "outline"}
            size="sm"
            onClick={toggleAssignees}
            className="no-print"
          >
            <Users className="h-4 w-4 mr-2" />
            {showAssignees
              ? t("common:schedule.month.hideAssignees")
              : t("common:schedule.month.showAssignees")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="no-print"
          >
            <Printer className="h-4 w-4 mr-2" />
            {t("common:buttons.print")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/schedule/week">
              {t("common:navigation.scheduleWeek")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/schedule/distribution">
              {t("common:navigation.scheduleDistribution")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t("common:time.today")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Printable Area */}
      <div className="printable-area">
        {/* Print-only header */}
        <div className="print-header hidden">
          <h1 className="text-2xl font-bold">{selectedStable?.name}</h1>
          <p className="text-lg capitalize">{monthLabel}</p>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => {
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isCurrentDay = isSameDay(date, today);
                const routines = getRoutinesForDay(date);
                const holiday = showHolidays ? getHoliday(date) : null;
                const isWeekendDay = isWeekend(date);

                // Background classes based on day type
                let dayBg = isCurrentMonth
                  ? "bg-background"
                  : "bg-muted/30 text-muted-foreground";
                if (isCurrentMonth && showHolidays && holiday) {
                  dayBg = holiday.isHalfDay
                    ? "bg-orange-50 dark:bg-orange-950/20"
                    : "bg-red-50 dark:bg-red-950/20";
                } else if (isCurrentMonth && isWeekendDay) {
                  dayBg = "bg-muted/30";
                }

                // Date number text color
                let dateTextColor = "";
                if (isCurrentDay) {
                  dateTextColor = "text-primary font-bold";
                } else if (isCurrentMonth && showHolidays && holiday) {
                  dateTextColor = holiday.isHalfDay
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-red-600 dark:text-red-400";
                } else if (isCurrentMonth && isWeekendDay) {
                  dateTextColor = "text-muted-foreground";
                }

                return (
                  <div
                    key={date.toISOString()}
                    onClick={() => handleDayClick(date)}
                    className={`
                      min-h-[80px] p-2 rounded-md border transition-colors cursor-pointer
                      ${dayBg}
                      ${isCurrentDay ? "border-primary ring-1 ring-primary" : "border-border"}
                      hover:bg-muted/50
                    `}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${dateTextColor}`}
                    >
                      {format(date, "d")}
                    </div>
                    {isCurrentMonth && holiday && showHolidays && (
                      <div
                        className={`text-[9px] truncate mb-0.5 ${
                          holiday.isHalfDay
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {holiday.name}
                      </div>
                    )}
                    {isCurrentMonth && routines.length > 0 && (
                      <div className="space-y-0.5 overflow-hidden">
                        {routines
                          .slice(0, showAssignees ? 3 : 4)
                          .map((routine) => (
                            <div key={routine.id}>
                              <div
                                className={`text-[10px] truncate ${
                                  routine.status === "completed"
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {routine.templateName || "Rutin"}
                              </div>
                              {showAssignees && (
                                <div className="text-[9px] text-muted-foreground pl-1 truncate">
                                  {routine.assignedTo ? (
                                    <>→ {formatRoutineAssigneeName(routine)}</>
                                  ) : (
                                    <span className="italic">
                                      → {t("common:schedule.status.unassigned")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        {routines.length > (showAssignees ? 3 : 4) && (
                          <div className="text-[10px] text-muted-foreground">
                            +{routines.length - (showAssignees ? 3 : 4)} till
                          </div>
                        )}
                      </div>
                    )}
                    {isCurrentMonth && routines.length === 0 && (
                      <div className="text-[10px] text-muted-foreground/50">
                        Inga
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground no-print">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-primary" />
          <span>Idag</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="line-through">Rutin</span>
          <span>= Klar</span>
        </div>
        {showHolidays && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-muted/50 border border-border" />
              <span>{t("common:schedule.legend.weekend")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
              <span>{t("common:schedule.legend.publicHoliday")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
              <span>{t("common:schedule.legend.halfDay")}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
