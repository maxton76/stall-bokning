import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Calendar,
  Wand2,
  Users,
  Check,
  ChevronsUpDown,
  X,
  Clock,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";
import {
  createSchedule,
  createShifts,
  generateShiftsFromRoutines,
} from "@/services/scheduleService";
import { getRoutineTemplates } from "@/services/routineService";
import { getStable } from "@/services/stableService";
import type { RoutineTemplate } from "@shared/types";

// Days of week options
const DAYS_OF_WEEK = [
  { id: "Mon", label: "Mon" },
  { id: "Tue", label: "Tue" },
  { id: "Wed", label: "Wed" },
  { id: "Thu", label: "Thu" },
  { id: "Fri", label: "Fri" },
  { id: "Sat", label: "Sat" },
  { id: "Sun", label: "Sun" },
] as const;

export default function CreateSchedulePage() {
  const { stableId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation(["schedules", "common"]);
  const [isLoading, setIsLoading] = useState(false);

  const [scheduleData, setScheduleData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    useAutoAssignment: true,
    selectedRoutines: [] as string[],
    daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"] as string[],
    notifyMembers: true,
  });

  // Fetch stable info (including organizationId)
  const { data: stable } = useQuery({
    queryKey: queryKeys.stables.detail(stableId || ""),
    queryFn: async () => {
      if (!stableId) return null;
      return await getStable(stableId);
    },
    enabled: !!stableId,
    staleTime: 10 * 60 * 1000,
  });

  const stableName = stable?.name || "";
  const organizationId = stable?.organizationId || "";

  // Fetch routine templates for the organization/stable
  const { data: routineTemplates = [] } = useQuery({
    queryKey: ["routineTemplates", organizationId, stableId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await getRoutineTemplates(organizationId, stableId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // State for dropdown open
  const [routineDropdownOpen, setRoutineDropdownOpen] = useState(false);

  const handleRoutineToggle = (routineId: string) => {
    setScheduleData({
      ...scheduleData,
      selectedRoutines: scheduleData.selectedRoutines.includes(routineId)
        ? scheduleData.selectedRoutines.filter((id) => id !== routineId)
        : [...scheduleData.selectedRoutines, routineId],
    });
  };

  const handleDayToggle = (dayId: string) => {
    setScheduleData({
      ...scheduleData,
      daysOfWeek: scheduleData.daysOfWeek.includes(dayId)
        ? scheduleData.daysOfWeek.filter((id) => id !== dayId)
        : [...scheduleData.daysOfWeek, dayId],
    });
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !stableId) return;

    setIsLoading(true);

    try {
      // Create the schedule
      const scheduleId = await createSchedule(
        {
          name: scheduleData.name,
          stableId,
          stableName,
          startDate: new Date(scheduleData.startDate),
          endDate: new Date(scheduleData.endDate),
          selectedRoutineTemplates: scheduleData.selectedRoutines,
          daysOfWeek: scheduleData.daysOfWeek,
          useAutoAssignment: scheduleData.useAutoAssignment,
          notifyMembers: scheduleData.notifyMembers,
        },
        user.uid,
      );

      // Get selected routine templates
      const selectedTemplates = routineTemplates.filter((rt) =>
        scheduleData.selectedRoutines.includes(rt.id),
      );

      // Generate shifts from routine templates
      const shifts = generateShiftsFromRoutines(
        scheduleId,
        stableId,
        stableName,
        new Date(scheduleData.startDate),
        new Date(scheduleData.endDate),
        selectedTemplates,
        scheduleData.daysOfWeek,
      );

      // Create shifts in Firestore
      await createShifts(scheduleId, shifts);

      // Navigate to schedule editor
      navigate(`/stables/${stableId}/schedules/${scheduleId}/edit`);
    } catch (error) {
      console.error("Error creating schedule:", error);
      alert(t("schedules:createPage.errors.createFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEstimatedShifts = () => {
    if (!scheduleData.startDate || !scheduleData.endDate) return 0;
    if (scheduleData.selectedRoutines.length === 0) return 0;
    if (scheduleData.daysOfWeek.length === 0) return 0;

    const start = new Date(scheduleData.startDate);
    const end = new Date(scheduleData.endDate);
    const days =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Count how many selected days fall within the date range
    let matchingDays = 0;
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayName = currentDate.toLocaleDateString("en-US", {
        weekday: "short",
      });
      if (scheduleData.daysOfWeek.includes(dayName)) {
        matchingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Each matching day has one shift per selected routine
    return matchingDays * scheduleData.selectedRoutines.length;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} ${t("common:time.minutes")}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} ${t("common:time.hours")}`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to={`/stables/${stableId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("schedules:createPage.backButton")}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("schedules:createPage.pageTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("schedules:createPage.pageDescription")}
          </p>
        </div>
      </div>

      <form onSubmit={handleCreateSchedule} className="space-y-6">
        {/* Schedule Basics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              {t("schedules:createPage.scheduleDetails.title")}
            </CardTitle>
            <CardDescription>
              {t("schedules:createPage.scheduleDetails.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {t("schedules:createPage.scheduleDetails.nameLabel")}
              </Label>
              <Input
                id="name"
                value={scheduleData.name}
                onChange={(e) =>
                  setScheduleData({ ...scheduleData, name: e.target.value })
                }
                placeholder={t(
                  "schedules:createPage.scheduleDetails.namePlaceholder",
                )}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  {t("schedules:createPage.scheduleDetails.startDateLabel")}
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={scheduleData.startDate}
                  onChange={(e) =>
                    setScheduleData({
                      ...scheduleData,
                      startDate: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">
                  {t("schedules:createPage.scheduleDetails.endDateLabel")}
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={scheduleData.endDate}
                  onChange={(e) =>
                    setScheduleData({
                      ...scheduleData,
                      endDate: e.target.value,
                    })
                  }
                  min={scheduleData.startDate}
                  required
                />
              </div>
            </div>

            {scheduleData.startDate && scheduleData.endDate && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  <strong>
                    {t("schedules:createPage.scheduleDetails.duration")}
                  </strong>{" "}
                  {Math.ceil(
                    (new Date(scheduleData.endDate).getTime() -
                      new Date(scheduleData.startDate).getTime()) /
                      (1000 * 60 * 60 * 24),
                  ) + 1}{" "}
                  {t("schedules:createPage.scheduleDetails.daysUnit")}
                </p>
                <p className="text-sm">
                  <strong>
                    {t("schedules:createPage.scheduleDetails.estimatedShifts")}
                  </strong>{" "}
                  ~{calculateEstimatedShifts()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Routine Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListTodo className="mr-2 h-5 w-5" />
              {t("schedules:createPage.routines.title")}
            </CardTitle>
            <CardDescription>
              {t("schedules:createPage.routines.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover
              open={routineDropdownOpen}
              onOpenChange={setRoutineDropdownOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={routineDropdownOpen}
                  className="w-full justify-between h-auto min-h-10"
                >
                  {scheduleData.selectedRoutines.length === 0 ? (
                    <span className="text-muted-foreground">
                      {t("schedules:createPage.routines.placeholder")}
                    </span>
                  ) : (
                    <span className="text-left">
                      {scheduleData.selectedRoutines.length === 1
                        ? t("schedules:createPage.routines.selectedOne")
                        : t("schedules:createPage.routines.selectedMany", {
                            count: scheduleData.selectedRoutines.length,
                          })}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={t(
                      "schedules:createPage.routines.searchPlaceholder",
                    )}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {t("schedules:createPage.routines.emptyState")}
                    </CommandEmpty>
                    <CommandGroup>
                      {routineTemplates.map((routine) => {
                        const isSelected =
                          scheduleData.selectedRoutines.includes(routine.id);
                        return (
                          <CommandItem
                            key={routine.id}
                            value={routine.name}
                            onSelect={() => {
                              handleRoutineToggle(routine.id);
                            }}
                            className="cursor-pointer"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{routine.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {routine.defaultStartTime || "08:00"}
                                </span>
                                <span>•</span>
                                <span>
                                  ~
                                  {formatDuration(
                                    routine.estimatedDuration || 60,
                                  )}
                                </span>
                                <span>•</span>
                                <span>{routine.pointsValue || 10} pts</span>
                              </div>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected routines display */}
            {scheduleData.selectedRoutines.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {scheduleData.selectedRoutines.map((routineId) => {
                  const routine = routineTemplates.find(
                    (rt) => rt.id === routineId,
                  );
                  if (!routine) return null;
                  return (
                    <Badge
                      key={routineId}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {routine.name}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => handleRoutineToggle(routineId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {scheduleData.selectedRoutines.length === 0 && (
              <div className="rounded-lg bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                  ⚠️ {t("schedules:createPage.routines.validationError")}
                </p>
              </div>
            )}

            {routineTemplates.length === 0 && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  {t("schedules:createPage.routines.noTemplates")}
                </p>
                <Link
                  to="/schedule/routinetemplates"
                  className="text-sm text-primary hover:underline"
                >
                  {t("schedules:createPage.routines.createTemplateLink")}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Days of Week Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              {t("schedules:createPage.daysOfWeek.title")}
            </CardTitle>
            <CardDescription>
              {t("schedules:createPage.daysOfWeek.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.id}`}
                    checked={scheduleData.daysOfWeek.includes(day.id)}
                    onCheckedChange={() => handleDayToggle(day.id)}
                  />
                  <Label
                    htmlFor={`day-${day.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t(`schedules:createPage.daysOfWeek.${day.label}`)}
                  </Label>
                </div>
              ))}
            </div>

            {scheduleData.daysOfWeek.length === 0 && (
              <div className="rounded-lg bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                  ⚠️ {t("schedules:createPage.daysOfWeek.validationError")}
                </p>
              </div>
            )}

            {/* Quick select buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setScheduleData({
                    ...scheduleData,
                    daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                  })
                }
              >
                {t("schedules:createPage.daysOfWeek.quickSelect.weekdays")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setScheduleData({
                    ...scheduleData,
                    daysOfWeek: ["Sat", "Sun"],
                  })
                }
              >
                {t("schedules:createPage.daysOfWeek.quickSelect.weekends")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setScheduleData({
                    ...scheduleData,
                    daysOfWeek: [
                      "Mon",
                      "Tue",
                      "Wed",
                      "Thu",
                      "Fri",
                      "Sat",
                      "Sun",
                    ],
                  })
                }
              >
                {t("schedules:createPage.daysOfWeek.quickSelect.allDays")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wand2 className="mr-2 h-5 w-5" />
              {t("schedules:createPage.assignmentMethod.title")}
            </CardTitle>
            <CardDescription>
              {t("schedules:createPage.assignmentMethod.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="autoAssignment" className="text-base">
                  {t("schedules:createPage.assignmentMethod.autoToggle")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("schedules:createPage.assignmentMethod.autoDescription")}
                </p>
              </div>
              <Switch
                id="autoAssignment"
                checked={scheduleData.useAutoAssignment}
                onCheckedChange={(checked) =>
                  setScheduleData({
                    ...scheduleData,
                    useAutoAssignment: checked,
                  })
                }
              />
            </div>

            {!scheduleData.useAutoAssignment && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {t("schedules:createPage.assignmentMethod.manualTitle")}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {t(
                        "schedules:createPage.assignmentMethod.manualDescription",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("schedules:createPage.notifications.title")}
            </CardTitle>
            <CardDescription>
              {t("schedules:createPage.notifications.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="notifyMembers" className="text-base">
                  {t("schedules:createPage.notifications.notifyToggle")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("schedules:createPage.notifications.notifyDescription")}
                </p>
              </div>
              <Switch
                id="notifyMembers"
                checked={scheduleData.notifyMembers}
                onCheckedChange={(checked) =>
                  setScheduleData({ ...scheduleData, notifyMembers: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Link to={`/stables/${stableId}`}>
            <Button type="button" variant="outline">
              {t("schedules:createPage.actions.cancel")}
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={
              isLoading ||
              scheduleData.selectedRoutines.length === 0 ||
              scheduleData.daysOfWeek.length === 0
            }
          >
            {isLoading ? (
              t("schedules:createPage.actions.creating")
            ) : scheduleData.useAutoAssignment ? (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                {t("schedules:createPage.actions.createAutoAssign")}
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                {t("schedules:createPage.actions.createSchedule")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
