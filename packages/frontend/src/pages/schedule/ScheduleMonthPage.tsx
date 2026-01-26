import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
import { useUserStables } from "@/hooks/useUserStables";
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
} from "date-fns";
import { sv } from "date-fns/locale";
import type { RoutineInstance } from "@shared/types";

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
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStableId, setSelectedStableId] = useState<string>("");

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable if none selected
  const activeStableId = selectedStableId || stables[0]?.id;

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
      <div className="flex items-center justify-between">
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
          <h2 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy", { locale: sv })}
          </h2>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
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

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={`
                    min-h-[80px] p-2 rounded-md border transition-colors cursor-pointer
                    ${isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"}
                    ${isCurrentDay ? "border-primary ring-1 ring-primary" : "border-border"}
                    hover:bg-muted/50
                  `}
                >
                  <div
                    className={`
                      text-sm font-medium mb-1
                      ${isCurrentDay ? "text-primary font-bold" : ""}
                    `}
                  >
                    {format(date, "d")}
                  </div>
                  {isCurrentMonth && routines.length > 0 && (
                    <div className="space-y-0.5 overflow-hidden">
                      {routines.slice(0, 3).map((routine) => (
                        <div
                          key={routine.id}
                          className={`text-[10px] truncate ${
                            routine.status === "completed"
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {routine.templateName || "Rutin"}
                        </div>
                      ))}
                      {routines.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{routines.length - 3} till
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-primary" />
          <span>Idag</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="line-through">Rutin</span>
          <span>= Klar</span>
        </div>
      </div>
    </div>
  );
}
