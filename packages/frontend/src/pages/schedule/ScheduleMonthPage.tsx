import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
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

/**
 * Schedule Month Page - Monthly calendar view
 *
 * Shows the monthly schedule with:
 * - Calendar grid
 * - Day summaries
 * - Navigation
 */
export default function ScheduleMonthPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const today = new Date();

  // Placeholder data for tasks per day
  const getTasksForDay = (date: Date) => {
    // Random tasks for demo
    const seed = date.getDate();
    return {
      total: (seed % 5) + 2,
      completed: seed % 3,
      myShifts: seed % 2,
    };
  };

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
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: sv })}
        </h2>
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
              const tasks = getTasksForDay(date);

              return (
                <div
                  key={date.toISOString()}
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
                  {isCurrentMonth && (
                    <div className="space-y-0.5">
                      {tasks.myShifts > 0 && (
                        <Badge
                          variant="default"
                          className="text-[10px] py-0 px-1 block truncate"
                        >
                          {tasks.myShifts} mina pass
                        </Badge>
                      )}
                      {tasks.total > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          {tasks.completed}/{tasks.total} klara
                        </div>
                      )}
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
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Mina pass</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-primary" />
          <span>Idag</span>
        </div>
      </div>
    </div>
  );
}
