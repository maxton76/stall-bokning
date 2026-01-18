import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Check,
  Repeat,
  AlertTriangle,
} from "lucide-react";
import {
  ROUTINE_TYPE_ICONS,
  ROUTINE_TYPE_BADGE_COLORS,
} from "@/constants/routineStyles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type {
  RoutineTemplate,
  RoutineInstance,
  RoutineType,
} from "@shared/types";
import { cn } from "@/lib/utils";

interface StableMember {
  id: string;
  displayName: string;
  email: string;
  historicalPoints?: number;
}

interface RoutineSchedulerProps {
  templates: RoutineTemplate[];
  existingInstances: RoutineInstance[];
  stableMembers: StableMember[];
  stableId: string;
  onSchedule: (
    templateId: string,
    dates: Date[],
    assignedTo?: string,
    useAutoAssign?: boolean,
  ) => Promise<void>;
  isLoading?: boolean;
}

export function RoutineScheduler({
  templates,
  existingInstances,
  stableMembers,
  stableId,
  onSchedule,
  isLoading,
}: RoutineSchedulerProps) {
  const { t } = useTranslation(["routines", "common"]);
  const { toast } = useToast();

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<RoutineTemplate | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("auto");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the next 7 days for quick selection
  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, []);

  // Check if a date already has a routine instance of a given template
  const hasExistingInstance = (date: Date, templateId: string) => {
    return existingInstances.some(
      (instance) =>
        instance.templateId === templateId &&
        isSameDay(new Date(instance.scheduledDate as unknown as string), date),
    );
  };

  // Sort members by historical points (fairness - lowest first)
  const sortedMembers = useMemo(() => {
    return [...stableMembers].sort(
      (a, b) => (a.historicalPoints ?? 0) - (b.historicalPoints ?? 0),
    );
  }, [stableMembers]);

  const handleOpenSchedule = (template: RoutineTemplate) => {
    setSelectedTemplate(template);
    setSelectedDates([]);
    setAssignedTo("auto");
    setRepeatWeekly(false);
    setRepeatWeeks(4);
    setShowScheduleDialog(true);
  };

  const handleToggleDate = (date: Date) => {
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, date));
      if (exists) {
        return prev.filter((d) => !isSameDay(d, date));
      } else {
        return [...prev, date];
      }
    });
  };

  const handleSelectWeek = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push(addDays(start, i));
    }
    setSelectedDates(weekDates);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedTemplate || selectedDates.length === 0) return;

    setIsSubmitting(true);
    try {
      // Calculate all dates including repeats
      let allDates = [...selectedDates];

      if (repeatWeekly) {
        for (let week = 1; week < repeatWeeks; week++) {
          selectedDates.forEach((date) => {
            allDates.push(addDays(date, week * 7));
          });
        }
      }

      // Filter out dates that already have instances
      const newDates = allDates.filter(
        (date) => !hasExistingInstance(date, selectedTemplate.id),
      );

      if (newDates.length === 0) {
        toast({
          title: t("routines:scheduling.noNewDates"),
          description: t("routines:scheduling.allDatesExist"),
          variant: "destructive",
        });
        return;
      }

      const useAutoAssign = assignedTo === "auto";
      const assignedUserId = useAutoAssign ? undefined : assignedTo;

      await onSchedule(
        selectedTemplate.id,
        newDates,
        assignedUserId,
        useAutoAssign,
      );

      toast({
        title: t("routines:scheduling.success"),
        description: t("routines:scheduling.scheduledCount", {
          count: newDates.length,
        }),
      });

      setShowScheduleDialog(false);
    } catch (error) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTemplates = templates.filter((t) => t.isActive);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t("routines:scheduling.title")}
          </CardTitle>
          <CardDescription>
            {t("routines:scheduling.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTemplates.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {t("routines:scheduling.noTemplates")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Schedule Section */}
              <div className="flex flex-wrap gap-2 pb-4 border-b">
                <span className="text-sm font-medium mr-2 self-center">
                  {t("routines:scheduling.quickSchedule")}:
                </span>
                {weekDays.slice(0, 3).map((day) => (
                  <Button
                    key={day.toISOString()}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Quick schedule all morning/evening templates for today
                      // This is a simplified version
                    }}
                    disabled={isLoading}
                  >
                    {format(day, "EEE d")}
                  </Button>
                ))}
              </div>

              {/* Templates List */}
              <div className="grid gap-3">
                {activeTemplates.map((template) => {
                  const TypeIcon = ROUTINE_TYPE_ICONS[template.type];
                  return (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            ROUTINE_TYPE_BADGE_COLORS[template.type],
                          )}
                        >
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{template.defaultStartTime}</span>
                            <span>•</span>
                            <span>
                              ~{template.estimatedDuration}{" "}
                              {t("routines:flow.minutes")}
                            </span>
                            <span>•</span>
                            <span>
                              {template.pointsValue} {t("common:labels.points")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleOpenSchedule(template)}
                        disabled={isLoading}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {t("routines:scheduling.schedule")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("routines:scheduling.scheduleRoutine")}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} - {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label>{t("routines:scheduling.selectDates")}</Label>
              <div className="flex gap-4">
                {/* Quick Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectWeek}
                  >
                    {t("routines:scheduling.thisWeek")}
                  </Button>
                  {weekDays.slice(0, 5).map((day) => {
                    const isSelected = selectedDates.some((d) =>
                      isSameDay(d, day),
                    );
                    const hasExisting =
                      selectedTemplate &&
                      hasExistingInstance(day, selectedTemplate.id);

                    return (
                      <Button
                        key={day.toISOString()}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleDate(day)}
                        disabled={hasExisting ?? false}
                        className={cn(hasExisting && "opacity-50")}
                      >
                        {format(day, "EEE d/M")}
                        {isSelected && <Check className="h-3 w-3 ml-1" />}
                        {hasExisting && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {t("routines:scheduling.exists")}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>

                {/* Calendar */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {t("routines:scheduling.moreDates")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => setSelectedDates(dates || [])}
                      disabled={(date) =>
                        date < new Date() ||
                        (selectedTemplate
                          ? hasExistingInstance(date, selectedTemplate.id)
                          : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDates.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("routines:scheduling.selectedCount", {
                    count: selectedDates.length,
                  })}
                </p>
              )}
            </div>

            {/* Repeat Weekly */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="repeat"
                  checked={repeatWeekly}
                  onCheckedChange={(checked) =>
                    setRepeatWeekly(checked as boolean)
                  }
                />
                <Label htmlFor="repeat" className="flex items-center gap-1">
                  <Repeat className="h-4 w-4" />
                  {t("routines:scheduling.repeatWeekly")}
                </Label>
              </div>
              {repeatWeekly && (
                <Select
                  value={String(repeatWeeks)}
                  onValueChange={(v) => setRepeatWeeks(Number(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8, 12].map((weeks) => (
                      <SelectItem key={weeks} value={String(weeks)}>
                        {weeks} {t("routines:scheduling.weeks")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Assignment */}
            <div className="space-y-2">
              <Label>{t("routines:scheduling.assignTo")}</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("routines:scheduling.selectAssignment")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {t("routines:scheduling.auto")}
                      </Badge>
                      {t("routines:scheduling.fairDistribution")}
                    </div>
                  </SelectItem>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("routines:scheduling.leaveUnassigned")}
                    </div>
                  </SelectItem>
                  {sortedMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{member.displayName}</span>
                        <Badge variant="outline" className="ml-2">
                          {member.historicalPoints ?? 0}{" "}
                          {t("common:labels.points")}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {assignedTo === "auto"
                  ? t("routines:scheduling.autoDescription")
                  : t("routines:scheduling.manualDescription")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
              disabled={isSubmitting}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button
              onClick={handleScheduleSubmit}
              disabled={
                isSubmitting || selectedDates.length === 0 || !selectedTemplate
              }
            >
              {isSubmitting
                ? t("common:loading")
                : t("routines:scheduling.createSchedule")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
