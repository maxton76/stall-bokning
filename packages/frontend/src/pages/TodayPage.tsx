import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Play,
  Clock,
  CheckCircle2,
  ListChecks,
  ClipboardList,
  ChevronRight as ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useDialog } from "@/hooks/useDialog";
import { useCRUD } from "@/hooks/useCRUD";
import { useUserStables } from "@/hooks/useUserStables";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useActivityTypes } from "@/hooks/useActivityTypes";
import {
  useStablePlanningMembers,
  formatMembersForSelection,
} from "@/hooks/useOrganizationMembers";
import {
  useRoutineTemplates,
  useRoutineInstancesForStable,
} from "@/hooks/useRoutines";
import { useActivitiesForPeriod } from "@/hooks/useActivities";
import { useMyHorses } from "@/hooks/useHorses";
import { ActivityFormDialog } from "@/components/ActivityFormDialog";
import { ActivityFilterPopover } from "@/components/activities/ActivityFilterPopover";
import { AssigneeAvatar } from "@/components/activities/AssigneeAvatar";
import { SpecialInstructionsPopover } from "@/components/activities/SpecialInstructionsPopover";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toDate } from "@/utils/timestampUtils";
import {
  createActivity,
  createTask,
  createMessage,
  updateActivity,
  deleteActivity,
  completeActivity,
} from "@/services/activityService";
import {
  restartRoutineInstance,
  createRoutineInstance,
} from "@/services/routineService";
import type {
  ActivityEntry,
  ActivityFilters,
  PeriodType,
} from "@/types/activity";
import type { Horse } from "@/types/roles";
import type { RoutineInstance } from "@shared/types";
import { ACTIVITY_TYPES as ACTIVITY_TYPE_CONFIG } from "@/types/activity";
import { useToast } from "@/hooks/use-toast";
import {
  ROUTINE_STATUS_COLORS,
  ROUTINE_STATUS_ICONS,
} from "@/constants/routineStyles";
import { StepCounter } from "@/components/routines";
import {
  format,
  isSameDay,
  isSameWeek,
  isSameMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  addYears,
  subYears,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
} from "date-fns";

type ViewMode = "all" | "activities" | "routines";

export default function TodayPage() {
  const { t } = useTranslation(["activities", "routines", "common"]);
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Parse date from URL query parameter, fallback to today
  const getInitialDate = (): Date => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (isValid(parsed)) {
        return parsed;
      }
    }
    return new Date();
  };

  const PERIOD_TYPES: Array<{ value: PeriodType; label: string }> = [
    { value: "day", label: t("activities:actionList.period.day") },
    { value: "week", label: t("activities:actionList.period.week") },
    { value: "month", label: t("activities:actionList.period.month") },
  ];
  const { toast } = useToast();
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [currentDate, setCurrentDate] = useState<Date>(getInitialDate);
  const [selectedStableId, setSelectedStableId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [filters, setFilters] = useState<ActivityFilters>({
    groupBy: "none",
    forMe: false,
    showFinished: true,
    entryTypes: ["activity", "task", "message"],
  });
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  // Navigation handlers
  const handleNext = () => {
    setCurrentDate((current) => {
      const now = new Date();
      const oneYearAhead = addYears(now, 1);
      let newDate: Date;
      switch (periodType) {
        case "day":
          newDate = addDays(current, 1);
          break;
        case "week":
          newDate = addWeeks(current, 1);
          break;
        case "month":
          newDate = addMonths(current, 1);
          break;
        default:
          return current;
      }
      return newDate <= oneYearAhead ? newDate : current;
    });
  };

  const handlePrevious = () => {
    setCurrentDate((current) => {
      const now = new Date();
      const oneYearBehind = subYears(now, 1);
      let newDate: Date;
      switch (periodType) {
        case "day":
          newDate = subDays(current, 1);
          break;
        case "week":
          newDate = subWeeks(current, 1);
          break;
        case "month":
          newDate = subMonths(current, 1);
          break;
        default:
          return current;
      }
      return newDate >= oneYearBehind ? newDate : current;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeLabel = (date: Date, type: PeriodType): string => {
    const now = new Date();
    switch (type) {
      case "day":
        if (isSameDay(date, now))
          return t("activities:actionList.dateLabels.today");
        if (isSameDay(date, addDays(now, 1)))
          return t("activities:actionList.dateLabels.tomorrow");
        return format(date, "MMMM d, yyyy");
      case "week":
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        if (isSameWeek(date, now, { weekStartsOn: 1 }))
          return t("activities:actionList.dateLabels.thisWeek");
        if (isSameWeek(date, addWeeks(now, 1), { weekStartsOn: 1 }))
          return t("activities:actionList.dateLabels.nextWeek");
        return `${t("activities:actionList.dateLabels.weekOf")} ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      case "month":
        if (isSameMonth(date, now))
          return t("activities:actionList.dateLabels.thisMonth");
        if (isSameMonth(date, addMonths(now, 1)))
          return t("activities:actionList.dateLabels.nextMonth");
        return format(date, "MMMM yyyy");
    }
  };

  const now = new Date();
  const oneYearAhead = addYears(now, 1);
  const oneYearBehind = subYears(now, 1);
  const isNextDisabled = currentDate >= oneYearAhead;
  const isPreviousDisabled = currentDate <= oneYearBehind;

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Get active stable ID for queries
  const activeStableId =
    selectedStableId === "all" ? stables[0]?.id : selectedStableId;
  const stableIdForQuery = activeStableId || undefined;

  // Load activities for selected stable and period using new hook
  const {
    activities: activitiesData,
    loading: activitiesLoading,
    refetch: reloadActivities,
  } = useActivitiesForPeriod(
    selectedStableId,
    stables,
    currentDate,
    periodType,
  );

  // Load routine instances for selected stable or all stables using new hook
  const {
    instances: routineInstances,
    loading: routinesLoading,
    refetch: reloadRoutines,
    createInstance: createRoutineInstanceHook,
  } = useRoutineInstancesForStable(selectedStableId, stables, currentDate);

  // Function to create a new routine instance
  const createInstance = async (templateId: string, scheduledDate: Date) => {
    const targetStableId =
      selectedStableId === "all" ? stableIdForQuery : selectedStableId;
    if (!targetStableId) throw new Error("No stable selected");

    const id = await createRoutineInstanceHook(
      targetStableId,
      templateId,
      scheduledDate,
    );
    return id;
  };

  // Load templates for creating new routines
  const { templates } = useRoutineTemplates(
    currentOrganizationId ?? undefined,
    stableIdForQuery,
  );

  // Group routine instances by status
  const groupedRoutineInstances = useMemo(() => {
    const groups = {
      active: [] as RoutineInstance[],
      scheduled: [] as RoutineInstance[],
      completed: [] as RoutineInstance[],
    };

    routineInstances.forEach((instance) => {
      if (instance.status === "completed" || instance.status === "cancelled") {
        groups.completed.push(instance);
      } else if (
        instance.status === "started" ||
        instance.status === "in_progress"
      ) {
        groups.active.push(instance);
      } else {
        groups.scheduled.push(instance);
      }
    });

    return groups;
  }, [routineInstances]);

  // Load horses for activity form
  const { horses: horsesData, loading: horsesLoading } = useMyHorses();

  // Load activity types for selected stable
  const activityTypes = useActivityTypes(selectedStableId, true);

  // Note: Activities and horses are now loaded automatically by their hooks
  // No need for manual useEffect - TanStack Query handles refetching on dependency changes

  // Filter and group activities
  const { filteredActivities, groupedActivities, temporalSections } =
    useActivityFilters(activitiesData, filters, user?.uid, periodType);

  // Dialog state
  const formDialog = useDialog<ActivityEntry>();

  // CRUD operations
  const { create, update, remove } = useCRUD<ActivityEntry>({
    createFn: async (data: any) => {
      if (!selectedStableId || !user) throw new Error("Missing required data");
      const stable = stables.find((s) => s.id === selectedStableId);
      if (!stable) throw new Error("Stable not found");

      if (data.type === "activity") {
        return await createActivity(
          user.uid,
          selectedStableId,
          data,
          stable.name,
        );
      } else if (data.type === "task") {
        return await createTask(user.uid, selectedStableId, data, stable.name);
      } else {
        return await createMessage(
          user.uid,
          selectedStableId,
          data,
          stable.name,
        );
      }
    },
    updateFn: async (id, data) => {
      if (!user) throw new Error("User not authenticated");
      await updateActivity(id, user.uid, data);
    },
    deleteFn: async (id) => {
      await deleteActivity(id);
    },
    onSuccess: async () => {
      await reloadActivities();
    },
    successMessages: {
      create: t("activities:messages.createSuccess"),
      update: t("activities:messages.updateSuccess"),
      delete: t("activities:messages.deleteSuccess"),
    },
  });

  // Handlers
  const handleAddEntry = () => {
    formDialog.openDialog();
  };

  const handleEditEntry = (entry: ActivityEntry) => {
    formDialog.openDialog(entry);
  };

  const handleDeleteEntry = async (entry: ActivityEntry) => {
    const entryTitle =
      entry.type === "activity"
        ? `${entry.horseName} - ${ACTIVITY_TYPE_CONFIG.find((t) => t.value === entry.activityType)?.label}`
        : entry.title;

    if (
      confirm(t("activities:messages.confirmDelete", { title: entryTitle }))
    ) {
      await remove(entry.id);
    }
  };

  const handleCompleteEntry = async (entry: ActivityEntry) => {
    if (!user || entry.status === "completed") return;

    setCompletingIds((prev) => new Set(prev).add(entry.id));

    try {
      await completeActivity(entry.id, user.uid);

      toast({
        title: t("activities:actionList.completed"),
        description: t("activities:actionList.entryCompleted"),
      });

      await reloadActivities();
    } catch (error) {
      console.error("Failed to complete:", error);
      await reloadActivities();
      toast({
        title: t("common:messages.error"),
        description: t("activities:messages.completeError"),
        variant: "destructive",
      });
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const handleSaveEntry = async (data: any) => {
    try {
      if (formDialog.data) {
        await update(formDialog.data.id, data);
      } else {
        await create(data);
      }
      formDialog.closeDialog();
    } catch (error) {
      console.error("Failed to save entry:", error);
      toast({
        title: t("common:messages.error"),
        description: t("activities:messages.saveError"),
        variant: "destructive",
      });
    }
  };

  const handleStartRoutine = (instance: RoutineInstance) => {
    navigate(`/routines/flow/${instance.id}`);
  };

  const handleRestartRoutine = async (instance: RoutineInstance) => {
    try {
      await restartRoutineInstance(instance.id);
      toast({
        title: t("routines:notifications.routineRestarted"),
        description: instance.templateName,
      });
      // Refresh the routine instances
      await reloadRoutines();
    } catch (error) {
      console.error("Failed to restart routine:", error);
      toast({
        title: t("common:errors.genericError"),
        description: t("routines:errors.restartFailed"),
        variant: "destructive",
      });
    }
  };

  const handleCreateFromTemplate = async (
    templateId: string,
    dates?: Date | Date[],
  ) => {
    try {
      // Handle array of dates or single date
      const datesArray = Array.isArray(dates) ? dates : [dates || currentDate];

      // Create routine instances for all dates
      let firstId: string | undefined;
      for (const scheduledDate of datesArray) {
        const id = await createInstance(templateId, scheduledDate);
        if (!firstId) firstId = id;
      }

      // Navigate to the first created routine
      if (firstId) {
        navigate(`/routines/flow/${firstId}`);
      }
    } catch (error) {
      console.error("Error creating routine:", error);
    }
  };

  // Fetch organization members for assignment dropdown (filtered by stable access)
  const { data: organizationMembers = [] } = useStablePlanningMembers(
    currentOrganizationId,
    selectedStableId,
  );

  // Format members for the ActivityFormDialog
  const stableMembers = useMemo(
    () => formatMembersForSelection(organizationMembers),
    [organizationMembers],
  );

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">
          {t("activities:stable.loading")}
        </p>
      </div>
    );
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t("activities:emptyState.noStables.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("activities:emptyState.noStables.description")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Counts for badges
  const activityCount = filteredActivities.length;
  const routineCount =
    groupedRoutineInstances.active.length +
    groupedRoutineInstances.scheduled.length +
    (filters.showFinished ? groupedRoutineInstances.completed.length : 0);
  const totalCount = activityCount + routineCount;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("activities:today.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("activities:today.description")}
          </p>
        </div>
        <Button
          onClick={handleAddEntry}
          disabled={!selectedStableId || selectedStableId === "all"}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("activities:actionList.addEntry")}
        </Button>
      </div>

      {/* Combined Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Top Row: Stable Selector + Period Tabs + Filter */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Stable Selector */}
            <div className="w-full md:w-64">
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("activities:stable.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("activities:stable.all")}
                  </SelectItem>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Type Selection */}
            <Tabs
              value={periodType}
              onValueChange={(v) => setPeriodType(v as PeriodType)}
              className="flex-1"
            >
              <TabsList className="grid w-full md:w-[300px] grid-cols-3">
                {PERIOD_TYPES.map((type) => (
                  <TabsTrigger key={type.value} value={type.value}>
                    {type.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Filter Button */}
            <ActivityFilterPopover
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Navigation Controls + Date Range */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-muted-foreground order-2 sm:order-1">
              {t("activities:actionList.navigation.showing")}:{" "}
              {getDateRangeLabel(currentDate, periodType)}
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={isPreviousDisabled}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                {t("activities:actionList.navigation.today")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={isNextDisabled}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all" className="gap-2">
                {t("activities:today.viewAll")}
                {totalCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {totalCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activities" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                {t("common:navigation.activities")}
                {activityCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activityCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="routines" className="gap-2">
                <ListChecks className="h-4 w-4" />
                {t("common:navigation.routines")}
                {routineCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {routineCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="border-b my-4"></div>

            {/* All View */}
            <TabsContent value="all" className="space-y-6">
              {/* Active Routines - Show at top when there are any */}
              {groupedRoutineInstances.active.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">
                      {t("routines:status.in_progress")}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {groupedRoutineInstances.active.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {groupedRoutineInstances.active.map((instance) => (
                      <RoutineCard
                        key={instance.id}
                        instance={instance}
                        onStart={handleStartRoutine}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled Routines */}
              {groupedRoutineInstances.scheduled.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold">
                      {t("routines:status.scheduled")}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {groupedRoutineInstances.scheduled.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {groupedRoutineInstances.scheduled.map((instance) => (
                      <RoutineCard
                        key={instance.id}
                        instance={instance}
                        onStart={handleStartRoutine}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Routines - only show when showFinished is enabled */}
              {filters.showFinished &&
                groupedRoutineInstances.completed.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <h3 className="text-sm font-semibold">
                        {t("routines:status.completed")}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {groupedRoutineInstances.completed.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {groupedRoutineInstances.completed.map((instance) => (
                        <RoutineCard
                          key={instance.id}
                          instance={instance}
                          onStart={handleStartRoutine}
                          onRestart={handleRestartRoutine}
                          t={t}
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* Activities */}
              <ActivityList
                activities={filteredActivities}
                temporalSections={temporalSections}
                groupedActivities={groupedActivities}
                filters={filters}
                loading={activitiesLoading}
                activityTypes={activityTypes.data || []}
                horses={horsesData}
                completingIds={completingIds}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
                onComplete={handleCompleteEntry}
                t={t}
              />
            </TabsContent>

            {/* Activities Only View */}
            <TabsContent value="activities">
              <ActivityList
                activities={filteredActivities}
                temporalSections={temporalSections}
                groupedActivities={groupedActivities}
                filters={filters}
                loading={activitiesLoading}
                activityTypes={activityTypes.data || []}
                horses={horsesData}
                completingIds={completingIds}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
                onComplete={handleCompleteEntry}
                t={t}
              />
            </TabsContent>

            {/* Routines Only View */}
            <TabsContent value="routines" className="space-y-6">
              {routinesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t("common:labels.loading")}
                  </p>
                </div>
              ) : routineInstances.length === 0 ? (
                <div className="text-center py-8">
                  <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {t("routines:empty.noRoutines")}
                  </p>

                  {/* Quick Create from Templates */}
                  {templates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("routines:actions.quickStart")}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {templates.slice(0, 3).map((template) => (
                          <Button
                            key={template.id}
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCreateFromTemplate(template.id)
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {template.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Active Routines */}
                  {groupedRoutineInstances.active.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Play className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">
                          {t("routines:status.in_progress")}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {groupedRoutineInstances.active.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {groupedRoutineInstances.active.map((instance) => (
                          <RoutineCard
                            key={instance.id}
                            instance={instance}
                            onStart={handleStartRoutine}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scheduled Routines */}
                  {groupedRoutineInstances.scheduled.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold">
                          {t("routines:status.scheduled")}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {groupedRoutineInstances.scheduled.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {groupedRoutineInstances.scheduled.map((instance) => (
                          <RoutineCard
                            key={instance.id}
                            instance={instance}
                            onStart={handleStartRoutine}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Routines */}
                  {groupedRoutineInstances.completed.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <h3 className="text-sm font-semibold">
                          {t("routines:status.completed")}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {groupedRoutineInstances.completed.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {groupedRoutineInstances.completed.map((instance) => (
                          <RoutineCard
                            key={instance.id}
                            instance={instance}
                            onStart={handleStartRoutine}
                            onRestart={handleRestartRoutine}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ActivityFormDialog
        open={formDialog.open}
        onOpenChange={formDialog.closeDialog}
        entry={formDialog.data || undefined}
        onSave={handleSaveEntry}
        horses={horsesData.map((h) => ({ id: h.id, name: h.name }))}
        stableMembers={stableMembers}
        activityTypes={activityTypes.data || []}
        routineTemplates={templates}
        onCreateRoutine={handleCreateFromTemplate}
      />
    </div>
  );
}

// Activity List Component
interface ActivityListProps {
  activities: ActivityEntry[];
  temporalSections: any;
  groupedActivities: Record<string, ActivityEntry[]>;
  filters: ActivityFilters;
  loading: boolean;
  activityTypes: any[];
  horses: Array<{ id: string; name: string }>;
  completingIds: Set<string>;
  onEdit: (entry: ActivityEntry) => void;
  onDelete: (entry: ActivityEntry) => void;
  onComplete: (entry: ActivityEntry) => void;
  t: (key: string, options?: any) => string;
}

function ActivityList({
  activities,
  temporalSections,
  groupedActivities,
  filters,
  loading,
  activityTypes,
  horses,
  completingIds,
  onEdit,
  onDelete,
  onComplete,
  t,
}: ActivityListProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {t("activities:actionList.loading")}
        </p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {t("activities:actionList.noActivities")}
        </p>
      </div>
    );
  }

  if (temporalSections) {
    return (
      <div className="space-y-6">
        {temporalSections.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-red-600">
                {t("activities:actionList.sections.overdue")}
              </h3>
              <Badge variant="destructive" className="text-xs">
                {temporalSections.overdue.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {temporalSections.overdue.map((entry: ActivityEntry) => (
                <ActivityCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => onEdit(entry)}
                  onDelete={() => onDelete(entry)}
                  onComplete={() => onComplete(entry)}
                  isCompleting={completingIds.has(entry.id)}
                  activityTypes={activityTypes}
                  horses={horses}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {temporalSections.today.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">
                {t("activities:actionList.sections.today")}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {temporalSections.today.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {temporalSections.today.map((entry: ActivityEntry) => (
                <ActivityCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => onEdit(entry)}
                  onDelete={() => onDelete(entry)}
                  onComplete={() => onComplete(entry)}
                  isCompleting={completingIds.has(entry.id)}
                  activityTypes={activityTypes}
                  horses={horses}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {temporalSections.upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("activities:actionList.sections.upcoming")}
              </h3>
              <Badge variant="outline" className="text-xs">
                {temporalSections.upcoming.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {temporalSections.upcoming.map((entry: ActivityEntry) => (
                <ActivityCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => onEdit(entry)}
                  onDelete={() => onDelete(entry)}
                  onComplete={() => onComplete(entry)}
                  isCompleting={completingIds.has(entry.id)}
                  activityTypes={activityTypes}
                  horses={horses}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (filters.groupBy === "none") {
    return (
      <div className="space-y-1">
        {activities.map((entry) => (
          <ActivityCard
            key={entry.id}
            entry={entry}
            onEdit={() => onEdit(entry)}
            onDelete={() => onDelete(entry)}
            onComplete={() => onComplete(entry)}
            isCompleting={completingIds.has(entry.id)}
            activityTypes={activityTypes}
            horses={horses}
            t={t}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedActivities).map(([groupKey, entries]) => (
        <div key={groupKey}>
          <h3 className="text-sm font-semibold mb-3">{groupKey}</h3>
          <div className="space-y-1">
            {entries.map((entry) => (
              <ActivityCard
                key={entry.id}
                entry={entry}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry)}
                onComplete={() => onComplete(entry)}
                isCompleting={completingIds.has(entry.id)}
                activityTypes={activityTypes}
                horses={horses}
                t={t}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Routine Card Component
interface RoutineCardProps {
  instance: RoutineInstance;
  onStart: (instance: RoutineInstance) => void;
  onRestart?: (instance: RoutineInstance) => void;
  t: (key: string, options?: any) => string;
  readonly?: boolean;
}

function RoutineCard({
  instance,
  onStart,
  onRestart,
  t,
  readonly,
}: RoutineCardProps) {
  const StatusIcon = ROUTINE_STATUS_ICONS[instance.status] ?? Clock;
  const progress = instance.progress;
  const progressPercent =
    progress.stepsTotal > 0
      ? Math.round((progress.stepsCompleted / progress.stepsTotal) * 100)
      : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-colors",
        !readonly && "hover:bg-muted/50 cursor-pointer",
      )}
      onClick={() => !readonly && onStart(instance)}
    >
      {/* Status Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          ROUTINE_STATUS_COLORS[instance.status],
        )}
      >
        <StatusIcon className="h-5 w-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">
            {instance.templateName || t("routines:types.custom")}
          </h3>
          <Badge
            variant="outline"
            className={ROUTINE_STATUS_COLORS[instance.status]}
          >
            {t(`routines:status.${instance.status}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {instance.scheduledStartTime}
          </span>
          {progress.stepsTotal > 0 && (
            <StepCounter
              current={progress.stepsCompleted}
              total={progress.stepsTotal}
            />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {instance.status !== "scheduled" && (
        <div className="w-24">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                instance.status === "completed"
                  ? "bg-green-500"
                  : "bg-amber-500",
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {progressPercent}%
          </p>
        </div>
      )}

      {/* Action */}
      {!readonly && instance.status === "cancelled" && onRestart && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onRestart(instance);
          }}
        >
          {t("routines:actions.restart")}
        </Button>
      )}
      {!readonly && instance.status !== "cancelled" && (
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

// Activity Card Component
interface ActivityCardProps {
  entry: ActivityEntry;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  isCompleting: boolean;
  activityTypes: Array<any>;
  horses: Array<{ id: string; name: string }>;
  t: (key: string) => string;
}

function getEntryTitle(
  entry: ActivityEntry,
  activityTypes: any[],
  horses: Array<{ id: string; name: string }>,
): string {
  if (entry.type === "activity") {
    const typeConfig = activityTypes.find(
      (t) => t.id === entry.activityTypeConfigId,
    );
    const typeName = typeConfig?.name || "Activity";

    let horseName = entry.horseName;
    if (!horseName && entry.horseId) {
      const horse = horses.find((h) => h.id === entry.horseId);
      horseName = horse?.name || "Unknown Horse";
    } else if (!horseName) {
      horseName = "Unknown Horse";
    }

    return `${horseName} - ${typeName}`;
  }
  return entry.title;
}

function isOverdue(entry: ActivityEntry): boolean {
  if (entry.status === "completed") return false;
  const entryDate = toDate(entry.date);
  return entryDate ? entryDate < new Date() : false;
}

function formatActivityDate(
  timestamp: Timestamp,
  t: (key: string) => string,
): string {
  const date = toDate(timestamp);
  if (!date) return t("common:labels.noData");
  const today = new Date();

  if (isSameDay(date, today))
    return t("activities:actionList.dateLabels.today");
  if (isSameDay(date, addDays(today, 1)))
    return t("activities:actionList.dateLabels.tomorrow");
  return format(date, "MMM d, yyyy");
}

function getBadge(entry: ActivityEntry, activityTypes: any[]): string | null {
  if (entry.type === "activity") {
    const typeConfig = activityTypes.find(
      (t) => t.id === entry.activityTypeConfigId,
    );
    return typeConfig?.category || null;
  }
  return entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
}

function getAssigneeName(entry: ActivityEntry): string | null {
  return entry.type === "activity" || entry.type === "task"
    ? entry.assignedToName || null
    : null;
}

function ActivityCard({
  entry,
  onComplete,
  onEdit,
  onDelete,
  activityTypes,
  horses,
  isCompleting,
  t,
}: ActivityCardProps) {
  const badge = getBadge(entry, activityTypes);
  const assigneeName = getAssigneeName(entry);

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2 border rounded-md hover:bg-accent/30 transition-colors cursor-pointer"
      onClick={onEdit}
    >
      {/* Checkbox - Left */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={entry.status === "completed"}
          onCheckedChange={() => onComplete()}
          disabled={entry.status === "completed" || isCompleting}
          className="shrink-0"
        />
      </div>

      {/* Content - Center */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {getEntryTitle(entry, activityTypes, horses)}
        </p>

        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={cn(
              "text-xs",
              isOverdue(entry)
                ? "text-red-600 font-medium"
                : "text-muted-foreground",
            )}
          >
            {formatActivityDate(entry.date, t)}
          </span>
          {badge && (
            <>
              <span className="text-muted-foreground">•</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {badge}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Special Instructions Bell */}
      {"horseHasSpecialInstructions" in entry &&
        entry.horseHasSpecialInstructions &&
        "horseId" in entry &&
        entry.horseId && (
          <div onClick={(e) => e.stopPropagation()}>
            <SpecialInstructionsPopover
              horseId={entry.horseId}
              horseName={
                "horseName" in entry ? entry.horseName || "Horse" : "Horse"
              }
            />
          </div>
        )}

      {/* Avatar + Context Menu - Right */}
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <AssigneeAvatar name={assigneeName} size="sm" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("common:buttons.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t("common:buttons.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
