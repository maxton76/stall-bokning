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
  generateShifts,
} from "@/services/scheduleService";
import { getShiftTypesByStable } from "@/services/shiftTypeService";
import type { ShiftType } from "@/types/schedule";

export default function CreateSchedulePage() {
  const { stableId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation(["schedules"]);
  const [isLoading, setIsLoading] = useState(false);

  const [scheduleData, setScheduleData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    useAutoAssignment: true,
    selectedShiftTypes: [] as string[],
    notifyMembers: true,
  });

  // Fetch stable info
  const { data: stableName = "" } = useQuery({
    queryKey: queryKeys.stables.detail(stableId || ""),
    queryFn: async () => {
      if (!stableId) return "";
      const { getStable } = await import("@/services/stableService");
      const stable = await getStable(stableId);
      return stable?.name || "";
    },
    enabled: !!stableId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch shift types
  const { data: shiftTypes = [] } = useQuery({
    queryKey: ["shiftTypes", "stable", stableId],
    queryFn: async () => {
      if (!stableId) return [];
      return await getShiftTypesByStable(stableId);
    },
    enabled: !!stableId,
    staleTime: 5 * 60 * 1000,
  });

  // State for dropdown open
  const [shiftTypeDropdownOpen, setShiftTypeDropdownOpen] = useState(false);

  const handleShiftTypeToggle = (shiftTypeId: string) => {
    setScheduleData({
      ...scheduleData,
      selectedShiftTypes: scheduleData.selectedShiftTypes.includes(shiftTypeId)
        ? scheduleData.selectedShiftTypes.filter((id) => id !== shiftTypeId)
        : [...scheduleData.selectedShiftTypes, shiftTypeId],
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
          selectedShiftTypes: scheduleData.selectedShiftTypes,
          useAutoAssignment: scheduleData.useAutoAssignment,
          notifyMembers: scheduleData.notifyMembers,
        },
        user.uid,
      );

      // Get selected shift types
      const selectedTypes = shiftTypes.filter((st) =>
        scheduleData.selectedShiftTypes.includes(st.id),
      );

      // Generate shifts
      const shifts = generateShifts(
        scheduleId,
        stableId,
        stableName,
        new Date(scheduleData.startDate),
        new Date(scheduleData.endDate),
        selectedTypes,
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

    const start = new Date(scheduleData.startDate);
    const end = new Date(scheduleData.endDate);
    const days =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Simple calculation: count how many shifts would be created
    let totalShifts = 0;
    scheduleData.selectedShiftTypes.forEach((stId) => {
      const shiftType = shiftTypes.find((st) => st.id === stId);
      if (shiftType) {
        // Count how many days match the shift's days of week
        totalShifts += Math.floor(days / 7) * shiftType.daysOfWeek.length;
      }
    });

    return totalShifts;
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

        {/* Shift Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>{t("schedules:createPage.shiftTypes.title")}</CardTitle>
            <CardDescription>
              {t("schedules:createPage.shiftTypes.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover
              open={shiftTypeDropdownOpen}
              onOpenChange={setShiftTypeDropdownOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={shiftTypeDropdownOpen}
                  className="w-full justify-between h-auto min-h-10"
                >
                  {scheduleData.selectedShiftTypes.length === 0 ? (
                    <span className="text-muted-foreground">
                      {t("schedules:createPage.shiftTypes.placeholder")}
                    </span>
                  ) : (
                    <span className="text-left">
                      {scheduleData.selectedShiftTypes.length === 1
                        ? t("schedules:createPage.shiftTypes.selectedOne")
                        : t("schedules:createPage.shiftTypes.selectedMany", {
                            count: scheduleData.selectedShiftTypes.length,
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
                      "schedules:createPage.shiftTypes.searchPlaceholder",
                    )}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {t("schedules:createPage.shiftTypes.emptyState")}
                    </CommandEmpty>
                    <CommandGroup>
                      {shiftTypes.map((shiftType) => {
                        const isSelected =
                          scheduleData.selectedShiftTypes.includes(
                            shiftType.id,
                          );
                        return (
                          <CommandItem
                            key={shiftType.id}
                            value={shiftType.name}
                            onSelect={() => {
                              handleShiftTypeToggle(shiftType.id);
                            }}
                            className="cursor-pointer"
                            // Prevent closing on select for multi-select behavior
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
                              <div className="font-medium">
                                {shiftType.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {shiftType.time} • {shiftType.points} pts •{" "}
                                {shiftType.daysOfWeek.join(", ")}
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

            {/* Selected shift types display */}
            {scheduleData.selectedShiftTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {scheduleData.selectedShiftTypes.map((stId) => {
                  const shiftType = shiftTypes.find((st) => st.id === stId);
                  if (!shiftType) return null;
                  return (
                    <Badge
                      key={stId}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {shiftType.name}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => handleShiftTypeToggle(stId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {scheduleData.selectedShiftTypes.length === 0 && (
              <div className="rounded-lg bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                  ⚠️ {t("schedules:createPage.shiftTypes.validationError")}
                </p>
              </div>
            )}
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
            disabled={isLoading || scheduleData.selectedShiftTypes.length === 0}
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
