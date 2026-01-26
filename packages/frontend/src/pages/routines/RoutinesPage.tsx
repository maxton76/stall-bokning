import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, isToday, isTomorrow, addDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  Plus,
  ChevronRight,
} from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useUserStables } from "@/hooks/useUserStables";
import {
  useRoutineInstances,
  useRoutineTemplates,
  useDailyNotes,
} from "@/hooks/useRoutines";
import type { RoutineInstance } from "@shared/types";
import { cn } from "@/lib/utils";
import {
  ROUTINE_STATUS_COLORS,
  ROUTINE_STATUS_ICONS,
} from "@/constants/routineStyles";
import { StepCounter } from "@/components/routines";

export default function RoutinesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(["routines", "common"]);
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStableId, setSelectedStableId] = useState<string>("all");

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Get the active stable ID for queries
  const activeStableId =
    selectedStableId === "all" ? stables[0]?.id : selectedStableId;
  const stableIdForQuery = activeStableId || undefined;

  // Load routine instances for selected date
  const {
    instances,
    loading: instancesLoading,
    createInstance,
  } = useRoutineInstances(stableIdForQuery, selectedDate);

  // Load templates for creating new routines
  const { templates, loading: templatesLoading } = useRoutineTemplates(
    currentOrganizationId ?? undefined,
    stableIdForQuery,
  );

  // Load daily notes
  const { notes, hasAlerts, hasCriticalAlerts } = useDailyNotes(
    stableIdForQuery,
    selectedDate,
  );

  // Filter instances by stable if "all" is selected
  const filteredInstances = useMemo(() => {
    if (selectedStableId === "all") {
      return instances;
    }
    return instances.filter((i) => i.stableId === selectedStableId);
  }, [instances, selectedStableId]);

  // Group instances by status
  const groupedInstances = useMemo(() => {
    const groups = {
      active: [] as RoutineInstance[],
      scheduled: [] as RoutineInstance[],
      completed: [] as RoutineInstance[],
    };

    filteredInstances.forEach((instance) => {
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
  }, [filteredInstances]);

  const handleStartRoutine = async (instance: RoutineInstance) => {
    navigate(`/routines/flow/${instance.id}`);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const id = await createInstance(templateId, selectedDate);
      navigate(`/routines/flow/${id}`);
    } catch (error) {
      console.error("Error creating routine:", error);
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return t("common:dates.today");
    if (isTomorrow(date)) return t("common:dates.tomorrow");
    return format(date, "EEEE, d MMMM");
  };

  const loading = stablesLoading || instancesLoading;

  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:loading.default")}</p>
      </div>
    );
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("routines:empty.noRoutines")}
            </h3>
            <p className="text-muted-foreground">
              {t("routines:empty.noRoutinesDescription")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("routines:page.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("routines:page.description")}
            </p>
          </div>
        </div>

        <Button onClick={() => navigate("/schedule/routinetemplates")}>
          <Plus className="h-4 w-4 mr-2" />
          {t("routines:actions.createTemplate")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Stable Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                {t("common:labels.stable")}
              </label>
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("common:labels.selectStable")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common:labels.all")}</SelectItem>
                  {stables.map((stable) => (
                    <SelectItem key={stable.id} value={stable.id}>
                      {stable.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[280px] justify-start text-left font-normal",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {getDateLabel(selectedDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Quick Date Buttons */}
            <div className="flex gap-2">
              <Button
                variant={isToday(selectedDate) ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                {t("common:dates.today")}
              </Button>
              <Button
                variant={isTomorrow(selectedDate) ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(addDays(new Date(), 1))}
              >
                {t("common:dates.tomorrow")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Notes Alert */}
      {hasAlerts && (
        <Card
          className={cn(
            "border-l-4",
            hasCriticalAlerts
              ? "border-l-red-500 bg-red-50"
              : "border-l-yellow-500 bg-yellow-50",
          )}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle
                className={cn(
                  "h-5 w-5",
                  hasCriticalAlerts ? "text-red-500" : "text-yellow-500",
                )}
              />
              <div className="flex-1">
                <p className="font-medium">{t("routines:dailyNotes.alerts")}</p>
                <p className="text-sm text-muted-foreground">
                  {notes?.alerts?.length}{" "}
                  {t("routines:dailyNotes.alertsForToday", {
                    count: notes?.alerts?.length,
                  })}
                </p>
              </div>
              <Button variant="outline" size="sm">
                {t("common:buttons.view")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Routines */}
      {groupedInstances.active.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-amber-500" />
              {t("routines:status.in_progress")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedInstances.active.map((instance) => (
              <RoutineCard
                key={instance.id}
                instance={instance}
                onStart={handleStartRoutine}
                t={t}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Scheduled Routines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            {t("routines:status.scheduled")}
          </CardTitle>
          <CardDescription>{getDateLabel(selectedDate)}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-4">
              {t("common:loading.default")}
            </p>
          ) : groupedInstances.scheduled.length === 0 ? (
            <div className="text-center py-8">
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
                        onClick={() => handleCreateFromTemplate(template.id)}
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
            <div className="space-y-3">
              {groupedInstances.scheduled.map((instance) => (
                <RoutineCard
                  key={instance.id}
                  instance={instance}
                  onStart={handleStartRoutine}
                  t={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Routines */}
      {groupedInstances.completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t("routines:status.completed")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedInstances.completed.map((instance) => (
              <RoutineCard
                key={instance.id}
                instance={instance}
                onStart={handleStartRoutine}
                t={t}
                readonly
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface RoutineCardProps {
  instance: RoutineInstance;
  onStart: (instance: RoutineInstance) => void;
  t: (key: string, options?: any) => string;
  readonly?: boolean;
}

function RoutineCard({ instance, onStart, t, readonly }: RoutineCardProps) {
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
      {!readonly && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </div>
  );
}
