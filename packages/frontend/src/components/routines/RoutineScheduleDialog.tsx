import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CalendarClock, Loader2, AlertCircle, Clock } from "lucide-react";
import { useRoutineSchedules } from "@/hooks/useRoutineSchedules";
import { useRoutineTemplates } from "@/hooks/useRoutines";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import type {
  RoutineSchedule,
  CreateRoutineScheduleInput,
  UpdateRoutineScheduleInput,
  RoutineScheduleRepeatPattern,
  RoutineAssignmentType,
} from "@shared/types";
import { format, addMonths } from "date-fns";

interface RoutineScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stableId: string;
  organizationId: string;
  schedule?: RoutineSchedule; // If provided, we're editing
  onSuccess?: () => void;
}

type AssignmentMode = RoutineAssignmentType | "unassigned";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Måndag", labelEn: "Monday" },
  { value: 2, label: "Tisdag", labelEn: "Tuesday" },
  { value: 3, label: "Onsdag", labelEn: "Wednesday" },
  { value: 4, label: "Torsdag", labelEn: "Thursday" },
  { value: 5, label: "Fredag", labelEn: "Friday" },
  { value: 6, label: "Lördag", labelEn: "Saturday" },
  { value: 0, label: "Söndag", labelEn: "Sunday" },
];

export function RoutineScheduleDialog({
  open,
  onOpenChange,
  stableId,
  organizationId,
  schedule,
  onSuccess,
}: RoutineScheduleDialogProps) {
  const { t, i18n } = useTranslation(["routines", "common"]);
  const isEditing = !!schedule;
  const isSwedish = i18n.language === "sv";

  // Form state
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [repeatPattern, setRepeatPattern] =
    useState<RoutineScheduleRepeatPattern>("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [scheduledStartTime, setScheduledStartTime] = useState("07:00");
  const [assignmentMode, setAssignmentMode] =
    useState<AssignmentMode>("unassigned");
  const [defaultAssignedTo, setDefaultAssignedTo] = useState("");

  // Hooks
  const { createSchedule, updateSchedule, createMutation, updateMutation } =
    useRoutineSchedules(stableId);
  const { templates, loading: templatesLoading } = useRoutineTemplates(
    organizationId,
    stableId,
  );
  const { data: members = [], isLoading: membersLoading } =
    useOrganizationMembers(organizationId);

  // Reset form when opening or schedule changes
  useEffect(() => {
    if (open) {
      if (schedule) {
        // Editing mode - populate form with existing values
        setName(schedule.name || "");
        setTemplateId(schedule.templateId);
        setStartDate(
          schedule.startDate
            ? format(
                new Date(
                  ((schedule.startDate as any).seconds
                    ? (schedule.startDate as any).seconds * 1000
                    : schedule.startDate) as number,
                ),
                "yyyy-MM-dd",
              )
            : format(new Date(), "yyyy-MM-dd"),
        );
        if (schedule.endDate) {
          setHasEndDate(true);
          setEndDate(
            format(
              new Date(
                ((schedule.endDate as any).seconds
                  ? (schedule.endDate as any).seconds * 1000
                  : schedule.endDate) as number,
              ),
              "yyyy-MM-dd",
            ),
          );
        } else {
          setHasEndDate(false);
          setEndDate("");
        }
        setRepeatPattern(schedule.repeatPattern);
        setSelectedDays(schedule.repeatDays || [1, 2, 3, 4, 5]);
        setScheduledStartTime(schedule.scheduledStartTime || "07:00");
        setAssignmentMode(schedule.assignmentMode);
        setDefaultAssignedTo(schedule.defaultAssignedTo || "");
      } else {
        // Creating mode - reset to defaults
        setName("");
        setTemplateId("");
        setStartDate(format(new Date(), "yyyy-MM-dd"));
        setEndDate(format(addMonths(new Date(), 1), "yyyy-MM-dd"));
        setHasEndDate(false);
        setRepeatPattern("daily");
        setSelectedDays([1, 2, 3, 4, 5]);
        setScheduledStartTime("07:00");
        setAssignmentMode("unassigned");
        setDefaultAssignedTo("");
      }
    }
  }, [open, schedule]);

  // Get selected template
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );

  // Toggle day selection
  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!templateId || !startDate) return;

    if (isEditing && schedule) {
      // Update existing schedule
      const updateData: UpdateRoutineScheduleInput = {
        name: name || undefined,
        startDate,
        endDate: hasEndDate && endDate ? endDate : null,
        repeatPattern,
        repeatDays: repeatPattern === "custom" ? selectedDays : undefined,
        scheduledStartTime,
        assignmentMode,
        defaultAssignedTo:
          assignmentMode === "manual" && defaultAssignedTo
            ? defaultAssignedTo
            : null,
      };

      await updateSchedule(schedule.id, updateData);
    } else {
      // Create new schedule
      const createData: CreateRoutineScheduleInput = {
        organizationId,
        stableId,
        templateId,
        name: name || undefined,
        startDate,
        endDate: hasEndDate && endDate ? endDate : undefined,
        repeatPattern,
        repeatDays: repeatPattern === "custom" ? selectedDays : undefined,
        scheduledStartTime,
        assignmentMode,
        defaultAssignedTo:
          assignmentMode === "manual" && defaultAssignedTo
            ? defaultAssignedTo
            : undefined,
      };

      await createSchedule(createData);
    }

    onSuccess?.();
    onOpenChange(false);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {isEditing
              ? t("routines:schedules.editSchedule")
              : t("routines:schedules.createSchedule")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("routines:schedules.editScheduleDescription")
              : t("routines:schedules.createScheduleDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Custom Name (optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("routines:schedules.scheduleName")}{" "}
              <span className="text-muted-foreground">
                ({t("common:optional")})
              </span>
            </Label>
            <Input
              id="name"
              placeholder={t("routines:schedules.scheduleNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">{t("routines:schedules.template")}</Label>
            <Select
              value={templateId}
              onValueChange={setTemplateId}
              disabled={isEditing}
            >
              <SelectTrigger id="template">
                <SelectValue
                  placeholder={t("routines:schedules.selectTemplate")}
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <span>{template.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {template.pointsValue}{" "}
                        {t("routines:schedules.pointsShort")}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                {t("routines:schedules.startDate")}
              </Label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">
                {t("routines:schedules.startTime")}
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startTime"
                  type="time"
                  value={scheduledStartTime}
                  onChange={(e) => setScheduledStartTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* End Date (optional) */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasEndDate"
                checked={hasEndDate}
                onCheckedChange={(checked) => setHasEndDate(checked === true)}
              />
              <Label htmlFor="hasEndDate" className="font-normal">
                {t("routines:schedules.hasEndDate")}
              </Label>
            </div>
            {hasEndDate && (
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          </div>

          <Separator />

          {/* Repeat Pattern */}
          <div className="space-y-2">
            <Label>{t("routines:schedules.repeatPattern")}</Label>
            <Select
              value={repeatPattern}
              onValueChange={(v) =>
                setRepeatPattern(v as RoutineScheduleRepeatPattern)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  {t("routines:schedules.patterns.daily")}
                </SelectItem>
                <SelectItem value="weekdays">
                  {t("routines:schedules.patterns.weekdays")}
                </SelectItem>
                <SelectItem value="custom">
                  {t("routines:schedules.patterns.custom")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Days Selection */}
          {repeatPattern === "custom" && (
            <div className="space-y-2">
              <Label>{t("routines:schedules.selectDays")}</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                    />
                    <label
                      htmlFor={`day-${day.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {isSwedish ? day.label : day.labelEn}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Assignment Mode */}
          <div className="space-y-2">
            <Label>{t("routines:schedules.assignmentMode")}</Label>
            <Select
              value={assignmentMode}
              onValueChange={(v) => setAssignmentMode(v as AssignmentMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  {t("routines:schedules.assignment.unassigned")}
                </SelectItem>
                <SelectItem value="auto">
                  {t("routines:schedules.assignment.auto")}
                </SelectItem>
                <SelectItem value="manual">
                  {t("routines:schedules.assignment.manual")}
                </SelectItem>
                <SelectItem value="selfBooked">
                  {t("routines:schedules.assignment.selfBooked")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {assignmentMode === "auto" &&
                t("routines:schedules.assignmentDescription.auto")}
              {assignmentMode === "unassigned" &&
                t("routines:schedules.assignmentDescription.unassigned")}
              {assignmentMode === "manual" &&
                t("routines:schedules.assignmentDescription.manual")}
              {assignmentMode === "selfBooked" &&
                t("routines:schedules.assignmentDescription.selfBooked")}
            </p>
          </div>

          {/* Manual Assignment - Select User */}
          {assignmentMode === "manual" && (
            <div className="space-y-2">
              <Label>{t("routines:schedules.defaultAssignee")}</Label>
              <Select
                value={defaultAssignedTo}
                onValueChange={setDefaultAssignedTo}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("routines:schedules.selectAssignee")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {members.map(
                    (member: {
                      id: string;
                      userId: string;
                      firstName: string;
                      lastName: string;
                      userEmail: string;
                    }) => (
                      <SelectItem key={member.id} value={member.userId}>
                        {`${member.firstName} ${member.lastName}`.trim() ||
                          member.userEmail}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("routines:schedules.error")}:{" "}
                {(error as Error)?.message || t("common:unknownError")}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!templateId || !startDate || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common:saving")}
              </>
            ) : isEditing ? (
              t("common:save")
            ) : (
              t("routines:schedules.create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
