import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { sv } from "date-fns/locale";

interface ScheduleSlot {
  id: string;
  title: string;
  time: string;
  assignee?: string;
  type: "feeding" | "cleaning" | "routine" | "other";
}

interface DaySchedule {
  date: Date;
  slots: ScheduleSlot[];
}

/**
 * Schedule Week Page - Weekly calendar view
 *
 * Shows the weekly schedule with:
 * - Day columns for the week
 * - Shift slots and assignments
 * - Booking actions
 */
export default function ScheduleWeekPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  // Generate week days
  const weekDays: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(currentWeekStart, i),
    slots: [
      {
        id: `${i}-1`,
        title: "Morgonfoder",
        time: "07:00",
        assignee: i < 2 ? "Anna S." : undefined,
        type: "feeding",
      },
      {
        id: `${i}-2`,
        title: "Mockning",
        time: "09:00",
        assignee: i % 2 === 0 ? "Erik J." : undefined,
        type: "cleaning",
      },
      {
        id: `${i}-3`,
        title: "Eftermiddagsfoder",
        time: "14:00",
        type: "feeding",
      },
      {
        id: `${i}-4`,
        title: "Kvällsfoder",
        time: "18:00",
        type: "feeding",
      },
    ],
  }));

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getSlotTypeColor = (type: ScheduleSlot["type"]) => {
    switch (type) {
      case "feeding":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "cleaning":
        return "bg-green-100 text-green-800 border-green-200";
      case "routine":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("common:schedule.week.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("common:schedule.week.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/schedule/month">
              {t("common:navigation.scheduleMonth")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/schedule/distribution">
              {t("common:navigation.scheduleDistribution")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t("common:time.today")}
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(currentWeekStart, "d MMMM", { locale: sv })} -{" "}
          {format(addDays(currentWeekStart, 6), "d MMMM yyyy", { locale: sv })}
        </h2>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2 overflow-x-auto">
        {weekDays.map((day) => (
          <Card
            key={day.date.toISOString()}
            className={isToday(day.date) ? "border-primary" : ""}
          >
            <CardHeader className="p-3 pb-2">
              <CardTitle
                className={`text-sm ${isToday(day.date) ? "text-primary" : ""}`}
              >
                <div className="font-medium">
                  {format(day.date, "EEEE", { locale: sv })}
                </div>
                <div
                  className={`text-2xl ${isToday(day.date) ? "font-bold" : "font-normal"}`}
                >
                  {format(day.date, "d")}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1.5">
              {day.slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-2 rounded-md border text-xs ${getSlotTypeColor(slot.type)}`}
                >
                  <div className="font-medium truncate">{slot.title}</div>
                  <div className="text-[10px] opacity-75">{slot.time}</div>
                  {slot.assignee ? (
                    <Badge
                      variant="secondary"
                      className="mt-1 text-[10px] py-0"
                    >
                      {slot.assignee}
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-5 text-[10px] p-0 hover:bg-transparent"
                    >
                      <Plus className="h-3 w-3 mr-0.5" />
                      Boka
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
