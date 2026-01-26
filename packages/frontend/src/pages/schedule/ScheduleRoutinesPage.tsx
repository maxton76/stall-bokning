import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  AlertCircle,
  CalendarClock,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoutineScheduleDialog } from "@/components/routines/RoutineScheduleDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserStables } from "@/hooks/useUserStables";
import {
  useRoutineSchedules,
  useRoutineSchedulesForStable,
} from "@/hooks/useRoutineSchedules";
import type { RoutineSchedule } from "@shared/types";
import { getRepeatPatternDisplayText } from "@shared/types";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";

/**
 * Schedule Routines Page
 *
 * Displays and manages recurring routine schedules.
 * Allows creating, editing, toggling, and deleting schedules.
 */
export default function ScheduleRoutinesPage() {
  const { t, i18n } = useTranslation(["routines", "common"]);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;
  const langCode = i18n.language === "sv" ? "sv" : "en";

  // State
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<
    RoutineSchedule | undefined
  >();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<
    RoutineSchedule | undefined
  >();

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable
  const activeStableId = selectedStableId || stables[0]?.id || "";

  // Find active stable
  const activeStable = stables.find((s) => s.id === activeStableId);

  // Load schedules
  const {
    schedules,
    loading: schedulesLoading,
    error: schedulesError,
    deleteSchedule,
    toggleEnabled,
    refetch,
  } = useRoutineSchedules(activeStableId);

  // Format date for display
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "-";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return format(date, "d MMM yyyy", { locale });
  };

  // Get repeat pattern display text
  const getPatternText = (schedule: RoutineSchedule): string => {
    return getRepeatPatternDisplayText(
      schedule.repeatPattern,
      schedule.repeatDays,
      langCode as "sv" | "en",
    );
  };

  // Get assignment mode text
  const getAssignmentText = (mode: string): string => {
    switch (mode) {
      case "auto":
        return t("routines:schedules.assignment.auto");
      case "manual":
        return t("routines:schedules.assignment.manual");
      case "selfBooked":
        return t("routines:schedules.assignment.selfBooked");
      case "unassigned":
      default:
        return t("routines:schedules.assignment.unassigned");
    }
  };

  // Handle edit
  const handleEdit = (schedule: RoutineSchedule) => {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = (schedule: RoutineSchedule) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (scheduleToDelete) {
      await deleteSchedule(scheduleToDelete.id);
      setDeleteDialogOpen(false);
      setScheduleToDelete(undefined);
    }
  };

  // Handle toggle enabled
  const handleToggle = async (schedule: RoutineSchedule) => {
    await toggleEnabled(schedule.id, !schedule.isEnabled);
  };

  // Handle create new
  const handleCreateNew = () => {
    setEditingSchedule(undefined);
    setDialogOpen(true);
  };

  // Handle dialog success
  const handleDialogSuccess = () => {
    refetch();
  };

  // Loading state
  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // No stables state
  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("routines:schedules.noStables")}
            </h3>
            <p className="text-muted-foreground">
              {t("routines:schedules.noStablesDescription")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("routines:schedules.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("routines:schedules.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stable selector */}
          {stables.length > 1 && (
            <Select value={activeStableId} onValueChange={setSelectedStableId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("common:selectStable")} />
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
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            {t("routines:schedules.createNew")}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {schedulesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("routines:schedules.loadError")}:{" "}
            {(schedulesError as Error)?.message || t("common:unknownError")}
          </AlertDescription>
        </Alert>
      )}

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {activeStable?.name || t("routines:schedules.schedules")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t("routines:schedules.noSchedules")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("routines:schedules.noSchedulesDescription")}
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t("routines:schedules.createFirst")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("routines:schedules.table.name")}</TableHead>
                    <TableHead>
                      {t("routines:schedules.table.template")}
                    </TableHead>
                    <TableHead>{t("routines:schedules.table.dates")}</TableHead>
                    <TableHead>
                      {t("routines:schedules.table.pattern")}
                    </TableHead>
                    <TableHead>{t("routines:schedules.table.time")}</TableHead>
                    <TableHead>
                      {t("routines:schedules.table.assignment")}
                    </TableHead>
                    <TableHead>
                      {t("routines:schedules.table.status")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("routines:schedules.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow
                      key={schedule.id}
                      className={!schedule.isEnabled ? "opacity-60" : ""}
                    >
                      <TableCell className="font-medium">
                        {schedule.name || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {schedule.templateColor && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: schedule.templateColor,
                              }}
                            />
                          )}
                          <span>{schedule.templateName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(schedule.startDate)}
                          {schedule.endDate && (
                            <span className="text-muted-foreground">
                              {" "}
                              → {formatDate(schedule.endDate)}
                            </span>
                          )}
                          {!schedule.endDate && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({t("routines:schedules.indefinite")})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getPatternText(schedule)}</TableCell>
                      <TableCell>{schedule.scheduledStartTime}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getAssignmentText(schedule.assignmentMode)}
                          {schedule.defaultAssignedToName && (
                            <div className="text-xs text-muted-foreground">
                              {schedule.defaultAssignedToName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={schedule.isEnabled ? "default" : "secondary"}
                        >
                          {schedule.isEnabled
                            ? t("routines:schedules.enabled")
                            : t("routines:schedules.disabled")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggle(schedule)}
                                >
                                  {schedule.isEnabled ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {schedule.isEnabled
                                  ? t("routines:schedules.disable")
                                  : t("routines:schedules.enable")}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(schedule)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("common:edit")}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteConfirm(schedule)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("common:delete")}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      {activeStableId && organization?.id && (
        <RoutineScheduleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          stableId={activeStableId}
          organizationId={organization.id}
          schedule={editingSchedule}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("routines:schedules.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("routines:schedules.deleteConfirmDescription", {
                name: scheduleToDelete?.name || scheduleToDelete?.templateName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
