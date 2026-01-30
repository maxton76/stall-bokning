import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  User,
  Lock,
  Loader2,
} from "lucide-react";
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { sv } from "date-fns/locale";
import { cn, toDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useWeekScheduledRoutines,
  type ScheduleSlot,
  type DaySchedule,
} from "@/hooks/useScheduledRoutines";
import type { SelectionProcessWithContext } from "@equiduty/shared";

/**
 * Props for a routine slot in selection mode
 */
interface SelectionSlotProps {
  slot: ScheduleSlot;
  isSelectable: boolean;
  isSelected: boolean;
  isMySelection: boolean;
  onSelect: (slotId: string) => void;
}

/**
 * A single routine slot in selection mode
 */
function SelectionSlot({
  slot,
  isSelectable,
  isSelected,
  isMySelection,
  onSelect,
}: SelectionSlotProps) {
  const { t } = useTranslation("selectionProcess");

  // Get slot color based on state
  const getSlotColor = () => {
    if (isMySelection) {
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    }
    if (slot.assigneeId) {
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    }
    if (isSelectable) {
      return "bg-white text-foreground border-gray-200 hover:border-primary hover:bg-primary/5 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-primary";
    }
    return "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700";
  };

  return (
    <button
      type="button"
      onClick={() => isSelectable && onSelect(slot.id)}
      disabled={!isSelectable}
      className={cn(
        "w-full p-2 rounded-md border text-left text-xs transition-colors",
        getSlotColor(),
        isSelectable && "cursor-pointer",
        !isSelectable && "cursor-not-allowed",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{slot.title}</div>
          <div className="text-[10px] opacity-75">{slot.time}</div>
        </div>
        {isMySelection && (
          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
        )}
        {!isSelectable && slot.assigneeId && (
          <Lock className="h-3 w-3 opacity-50 flex-shrink-0" />
        )}
      </div>
      {slot.assignee && (
        <div className="flex items-center gap-1 mt-1 text-[10px]">
          <User className="h-3 w-3" />
          <span className="truncate">{formatAssigneeName(slot.assignee)}</span>
        </div>
      )}
    </button>
  );
}

/**
 * Format assignee name to first name + last initial
 */
function formatAssigneeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0] ?? fullName;
  const firstName = parts[0] ?? "";
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase() || "";
  return `${firstName} ${lastInitial}.`;
}

/**
 * SelectionWeekView Props
 */
interface SelectionWeekViewProps {
  /** Selection process data with user context */
  process: SelectionProcessWithContext;
  /** Stable ID for fetching routines */
  stableId: string;
  /** Callback when user selects a routine */
  onSelectRoutine: (instanceId: string) => void;
  /** IDs of routines the current user has already selected */
  selectedRoutineIds?: string[];
  /** Whether selection is in progress */
  isSelecting?: boolean;
  /** Optional class name */
  className?: string;
}

/**
 * SelectionWeekView Component
 *
 * A week schedule view for making routine selections during a selection process.
 * Shows available routine instances for the selection period and allows the
 * current turn user to click/select routines to assign themselves.
 * Interactions are disabled if it's not the user's turn.
 *
 * Similar to ScheduleWeekPage but operates in "selection mode" with:
 * - Different color coding for selection states
 * - Click-to-select instead of click-to-view
 * - Disabled state when not user's turn
 *
 * @example
 * ```tsx
 * <SelectionWeekView
 *   process={selectionProcess}
 *   stableId="stable-123"
 *   onSelectRoutine={handleSelectRoutine}
 *   selectedRoutineIds={mySelections}
 * />
 * ```
 */
export function SelectionWeekView({
  process,
  stableId,
  onSelectRoutine,
  selectedRoutineIds = [],
  isSelecting = false,
  className,
}: SelectionWeekViewProps) {
  const { t } = useTranslation(["selectionProcess", "common"]);

  // Determine the selection period dates
  const selectionStartDate = useMemo(() => {
    return toDate(process.selectionStartDate);
  }, [process.selectionStartDate]);

  const selectionEndDate = useMemo(() => {
    return toDate(process.selectionEndDate);
  }, [process.selectionEndDate]);

  // Initialize week to show the start of the selection period
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(selectionStartDate, { weekStartsOn: 1 });
  });

  // Fetch routine instances for the current week
  const {
    data: weekSchedule,
    isLoading,
    isError,
    error,
  } = useWeekScheduledRoutines(stableId, currentWeekStart);

  // Check if user can interact (is their turn and process is active)
  const canSelect = process.isCurrentTurn && process.status === "active";

  // Navigation handlers
  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToSelectionStart = () => {
    setCurrentWeekStart(startOfWeek(selectionStartDate, { weekStartsOn: 1 }));
  };

  // Check if a date is within the selection period
  const isDateInSelectionPeriod = (date: Date): boolean => {
    return isWithinInterval(date, {
      start: selectionStartDate,
      end: selectionEndDate,
    });
  };

  // Check if a slot is selectable
  const isSlotSelectable = (slot: ScheduleSlot, date: Date): boolean => {
    if (!canSelect) return false;
    if (!isDateInSelectionPeriod(date)) return false;
    if (slot.assigneeId) return false; // Already assigned
    return true;
  };

  // Check if we're viewing a week that overlaps with selection period
  const weekEnd = addDays(currentWeekStart, 6);
  const hasSelectionDays =
    isDateInSelectionPeriod(currentWeekStart) ||
    isDateInSelectionPeriod(weekEnd) ||
    (currentWeekStart <= selectionStartDate && weekEnd >= selectionEndDate);

  // Check if today is a selection day
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <p>{t("selectionProcess:messages.errors.loadFailed")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.message}
            </p>
          </div>
        </CardContent>
      </Card>
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

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {isSelecting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common:schedule.week.title")}
          </CardTitle>

          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToSelectionStart}
              className="text-xs"
            >
              {t("common:time.today")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week date range */}
        <p className="text-sm text-muted-foreground">
          {format(currentWeekStart, "d MMMM", { locale: sv })} -{" "}
          {format(addDays(currentWeekStart, 6), "d MMMM yyyy", { locale: sv })}
        </p>

        {/* Selection period indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <Clock className="h-3 w-3" />
          <span>
            {t("selectionProcess:labels.startDate")}:{" "}
            {format(selectionStartDate, "d MMM", { locale: sv })} -{" "}
            {format(selectionEndDate, "d MMM yyyy", { locale: sv })}
          </span>
        </div>

        {/* Not your turn warning */}
        {!canSelect && process.status === "active" && (
          <Badge variant="outline" className="w-fit mt-2">
            <Lock className="h-3 w-3 mr-1" />
            {t("selectionProcess:messages.notYourTurn")}
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {/* Stats Summary */}
        {weekSchedule && weekSchedule.totalRoutines > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
            <span>
              {t("common:schedule.total")}:{" "}
              <strong className="text-foreground">
                {weekSchedule.totalRoutines}
              </strong>
            </span>
            <span>
              {t("common:schedule.available")}:{" "}
              <strong className="text-amber-600">
                {weekSchedule.unassignedRoutines}
              </strong>
            </span>
            <span>
              {t("common:schedule.assigned")}:{" "}
              <strong className="text-blue-600">
                {weekSchedule.assignedRoutines}
              </strong>
            </span>
          </div>
        )}

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2 overflow-x-auto">
          {weekDays.map((day) => {
            const inSelectionPeriod = isDateInSelectionPeriod(day.date);
            const todayHighlight = isToday(day.date);

            return (
              <div
                key={day.dateStr}
                className={cn(
                  "min-w-[100px] rounded-lg border p-2",
                  todayHighlight && "border-primary ring-1 ring-primary",
                  inSelectionPeriod &&
                    !todayHighlight &&
                    "border-green-200 dark:border-green-800",
                  !inSelectionPeriod && "bg-muted/50 opacity-60",
                )}
              >
                {/* Day header */}
                <div
                  className={cn(
                    "mb-2 text-center",
                    todayHighlight && "text-primary",
                  )}
                >
                  <div className="text-xs font-medium">
                    {format(day.date, "EEE", { locale: sv })}
                  </div>
                  <div className={cn("text-lg", todayHighlight && "font-bold")}>
                    {format(day.date, "d")}
                  </div>
                </div>

                {/* Slots */}
                <div className="space-y-1.5">
                  {day.slots.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground text-center py-2">
                      {t("common:schedule.noRoutines")}
                    </div>
                  ) : (
                    day.slots.map((slot) => (
                      <SelectionSlot
                        key={slot.id}
                        slot={slot}
                        isSelectable={isSlotSelectable(slot, day.date)}
                        isSelected={selectedRoutineIds.includes(slot.id)}
                        isMySelection={selectedRoutineIds.includes(slot.id)}
                        onSelect={onSelectRoutine}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-white border border-gray-200" />
            <span>{t("common:schedule.available")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            <span>
              {t("selectionProcess:labels.yourSelection", {
                defaultValue: "Ditt val",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
            <span>{t("common:schedule.assigned")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
            <span>
              {t("common:schedule.unavailable", { defaultValue: "Ej valbar" })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SelectionWeekView;
