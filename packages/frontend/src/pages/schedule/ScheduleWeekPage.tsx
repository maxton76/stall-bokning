import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RoutineCreationModal,
  RoutineInstanceDetailsModal,
} from "@/components/routines";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import {
  useWeekScheduledRoutines,
  type ScheduleSlot,
  type DaySchedule,
} from "@/hooks/useScheduledRoutines";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { sv } from "date-fns/locale";

/**
 * Schedule Week Page - Weekly calendar view
 *
 * Shows the weekly schedule with:
 * - Day columns for the week
 * - Actual routine instances from the database
 * - Booking actions
 */
export default function ScheduleWeekPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initialize week from URL date parameter or default to current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        return startOfWeek(parsedDate, { weekStartsOn: 1 });
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date>(new Date());

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable if none selected
  const activeStableId = selectedStableId || stables[0]?.id;

  // Fetch real routine data
  const {
    data: weekSchedule,
    isLoading,
    isError,
    error,
  } = useWeekScheduledRoutines(activeStableId, currentWeekStart);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getSlotStatusColor = (slot: ScheduleSlot) => {
    // Done/Completed - Green
    if (slot.status === "completed") {
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    }
    // Overdue/Missed - Red
    if (slot.status === "missed") {
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    }
    // Cancelled - Muted gray
    if (slot.status === "cancelled") {
      return "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-900/20 dark:text-gray-500 dark:border-gray-700";
    }
    // In progress / Started - Amber
    if (slot.status === "in_progress" || slot.status === "started") {
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    }
    // Unassigned - Gray
    if (!slot.assigneeId) {
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700";
    }
    // Planned (assigned, active) - Blue
    return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
  };

  const getStatusBadgeVariant = (
    status: ScheduleSlot["status"],
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
      case "started":
        return "secondary";
      case "cancelled":
      case "missed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: ScheduleSlot["status"]) => {
    switch (status) {
      case "completed":
        return t("common:schedule.status.completed");
      case "in_progress":
        return t("common:schedule.status.inProgress");
      case "started":
        return t("common:schedule.status.started");
      case "scheduled":
        return t("common:schedule.status.scheduled");
      case "cancelled":
        return t("common:schedule.status.cancelled");
      case "missed":
        return t("common:schedule.status.missed");
      default:
        return status;
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

  const formatAssigneeName = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return fullName;
    if (parts.length === 1) return parts[0] ?? fullName;
    const firstName = parts[0] ?? "";
    const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase() || "";
    return `${firstName} ${lastInitial}.`;
  };

  const handleSlotClick = (slot: ScheduleSlot, date: Date) => {
    // Open details modal instead of direct navigation
    setSelectedSlot(slot);
    setSelectedSlotDate(date);
    setDetailsModalOpen(true);
  };

  const handleStartRoutine = (instanceId: string) => {
    // Navigate to routine flow page
    navigate(`/routines/flow/${instanceId}`);
  };

  const handleBookSlot = (day: DaySchedule) => {
    // Open routine creation modal with pre-selected date
    setSelectedDate(day.date);
    setModalOpen(true);
  };

  const handleRoutineCreated = (instanceIds: string[]) => {
    // Navigate to the first created routine's flow page
    if (instanceIds.length === 1 && instanceIds[0]) {
      navigate(`/routines/flow/${instanceIds[0]}`);
    }
    // For multiple routines, just stay on the page (data will refresh automatically)
  };

  // Loading state
  if (stablesLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>

        {/* Week Grid Skeleton */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-3 pb-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-8 mt-1" />
              </CardHeader>
              <CardContent className="p-2 space-y-1.5">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // No stables state
  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t("common:schedule.noStables")}
            </h3>
            <p className="text-muted-foreground">
              {t("common:schedule.noStablesDescription")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("common:schedule.loadError")}:{" "}
            {error?.message || t("common:errors.generic")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use real data or empty state
  const weekDays =
    weekSchedule?.days ||
    Array.from({ length: 7 }, (_, i) => ({
      date: addDays(currentWeekStart, i),
      dateStr: format(addDays(currentWeekStart, i), "yyyy-MM-dd"),
      slots: [],
    }));

  const selectedStable = stables.find((s) => s.id === activeStableId);
  const weekDateRange = `${format(currentWeekStart, "d MMMM", { locale: sv })} – ${format(addDays(currentWeekStart, 6), "d MMMM yyyy", { locale: sv })}`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("common:schedule.week.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("common:schedule.week.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stable selector */}
          {stables.length > 1 && (
            <Select value={activeStableId} onValueChange={setSelectedStableId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("common:schedule.selectStable")} />
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
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="no-print"
          >
            <Printer className="h-4 w-4 mr-2" />
            {t("common:buttons.print")}
          </Button>
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

      {/* Stats Summary */}
      {weekSchedule && weekSchedule.totalRoutines > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground no-print">
          <span>
            {t("common:schedule.stats.total")}:{" "}
            <strong className="text-foreground">
              {weekSchedule.totalRoutines}
            </strong>{" "}
            {t("common:schedule.routinesLabel")}
          </span>
          <span>
            {t("common:schedule.stats.completed")}:{" "}
            <strong className="text-green-600">
              {weekSchedule.completedRoutines}
            </strong>
          </span>
          <span>
            {t("common:schedule.stats.assigned")}:{" "}
            <strong className="text-blue-600">
              {weekSchedule.assignedRoutines}
            </strong>
          </span>
          {weekSchedule.unassignedRoutines > 0 && (
            <span>
              {t("common:schedule.stats.unassigned")}:{" "}
              <strong className="text-amber-600">
                {weekSchedule.unassignedRoutines}
              </strong>
            </span>
          )}
          {weekSchedule.cancelledRoutines > 0 && (
            <span>
              {t("common:schedule.stats.cancelled")}:{" "}
              <strong className="text-gray-400">
                {weekSchedule.cancelledRoutines}
              </strong>
            </span>
          )}
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-between no-print">
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

      {/* Printable Area */}
      <div className="printable-area">
        {/* Print-only header */}
        <div className="print-header hidden">
          <h1 className="text-2xl font-bold">{selectedStable?.name}</h1>
          <p className="text-lg">{weekDateRange}</p>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2 overflow-x-auto">
          {weekDays.map((day) => (
            <Card
              key={day.dateStr}
              className={
                isToday(day.date) ? "border-primary ring-1 ring-primary" : ""
              }
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
                {day.slots.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    {t("common:schedule.noRoutines")}
                  </div>
                ) : (
                  day.slots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => handleSlotClick(slot, day.date)}
                      className={`p-2 rounded-md border text-xs cursor-pointer transition-colors hover:opacity-80 ${getSlotStatusColor(slot)}`}
                    >
                      <div
                        className={`font-medium truncate ${slot.status === "cancelled" ? "line-through" : ""}`}
                      >
                        {slot.title}
                      </div>
                      <div className="text-[10px] opacity-75">{slot.time}</div>
                      {slot.assignee ? (
                        <div className="text-[10px] font-bold mt-1">
                          {formatAssigneeName(slot.assignee)}
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {t("common:schedule.status.unassigned")}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {/* Add routine button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground no-print"
                  onClick={() => handleBookSlot(day)}
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  {t("common:schedule.addRoutine")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground no-print">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
          <span>{t("common:schedule.legend.unassigned")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          <span>{t("common:schedule.legend.planned")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
          <span>{t("common:schedule.legend.inProgress")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />
          <span>{t("common:schedule.legend.cancelled")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
          <span>{t("common:schedule.legend.overdue")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span>{t("common:schedule.legend.completed")}</span>
        </div>
      </div>

      {/* Routine Creation Modal */}
      {activeStableId && (
        <RoutineCreationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          stableId={activeStableId}
          initialDate={selectedDate}
          onSuccess={handleRoutineCreated}
        />
      )}

      {/* Routine Instance Details Modal */}
      {activeStableId && (
        <RoutineInstanceDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          slot={selectedSlot}
          stableId={activeStableId}
          scheduledDate={selectedSlotDate}
          onStartRoutine={handleStartRoutine}
          onDeleted={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}
