import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  AlertCircle,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Play,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useApiMutation } from "@/hooks/useApiMutation";
import {
  useSelectionProcessWithActions,
  useDeleteSelectionProcess,
  useUpdateSelectionProcessDates,
} from "@/hooks/useSelectionProcess";
import { scheduledRoutinesKeys } from "@/hooks/useScheduledRoutines";
import { assignRoutineInstance } from "@/services/routineService";
import {
  SelectionWeekView,
  AdminControlsCard,
} from "@/components/selectionProcess";
import type { SelectionProcessTurn } from "@stall-bokning/shared";
import { toDate } from "@stall-bokning/shared";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

/**
 * Selection Process Detail Page
 *
 * Shows single process details with:
 * - Turn order with current position highlighted
 * - Selection UI when it's user's turn
 * - "Klar" button for completing turn
 * - Selection history
 */
export default function SelectionProcessPage() {
  const { t } = useTranslation(["selectionProcess", "common"]);
  const { processId } = useParams<{ processId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<string[]>([]);

  // Fetch process with all actions
  const {
    process,
    loading,
    error,
    refetch,
    isCurrentTurn,
    userTurnOrder,
    userTurnStatus,
    turnsAhead,
    startProcess,
    isStarting,
    completeTurn,
    isCompleting,
    cancelProcess,
    isCancelling,
  } = useSelectionProcessWithActions(processId, {
    startSuccessMessage: t("selectionProcess:messages.successfully.started"),
    completeTurnSuccessMessage: t("selectionProcess:messages.turnCompleted"),
    cancelSuccessMessage: t("selectionProcess:messages.successfully.cancelled"),
  });

  // Delete mutation
  const { deleteProcess, isDeleting } = useDeleteSelectionProcess({
    successMessage: t("selectionProcess:messages.successfully.deleted"),
    onSuccess: () => navigate("/schedule/selection"),
  });

  // Date update mutation
  const { updateDates, isUpdatingDates } = useUpdateSelectionProcessDates(
    processId ?? "",
    {
      successMessage: t("selectionProcess:messages.datesUpdated"),
    },
  );

  // Mutation for assigning routine instances
  const assignMutation = useApiMutation(
    async (instanceId: string) => {
      if (!user?.uid || !user?.fullName) {
        throw new Error("User not authenticated");
      }
      return assignRoutineInstance(instanceId, user.uid, user.fullName);
    },
    {
      successMessage: t("selectionProcess:messages.routineSelected"),
      onSuccess: (_, instanceId) => {
        // Add to selected routines for visual feedback
        setSelectedRoutineIds((prev) => [...prev, instanceId]);
        // Invalidate routine queries to refresh the schedule
        queryClient.invalidateQueries({ queryKey: scheduledRoutinesKeys.all });
      },
    },
  );

  const getStatusBadgeVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "draft":
      default:
        return "outline";
    }
  };

  const getTurnStatusIcon = (turn: SelectionProcessTurn) => {
    switch (turn.status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "active":
        return <Play className="h-4 w-4 text-blue-500" />;
      case "pending":
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleCompleteTurn = async () => {
    try {
      const result = await completeTurn(undefined as void);
      setConfirmCompleteOpen(false);
      if (result.processCompleted) {
        // Show a message or stay on page
      }
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Handlers for AdminControlsCard
  const handleCancelProcess = async () => {
    try {
      await cancelProcess(undefined);
      navigate("/schedule/selection");
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleDeleteProcess = async () => {
    if (!processId) return;
    try {
      await deleteProcess(processId);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleStartProcess = async () => {
    try {
      await startProcess(undefined as void);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleDateChange = async (dates: {
    selectionStartDate?: string;
    selectionEndDate?: string;
  }) => {
    try {
      await updateDates(dates);
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !process) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Link to="/schedule/selection">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("selectionProcess:buttons.back")}
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("selectionProcess:messages.errors.loadFailed")}:{" "}
            {error?.message || t("common:messages.unknownError")}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common:buttons.retry")}
        </Button>
      </div>
    );
  }

  // Parse dates from Firestore timestamps using shared utility
  const startDate = toDate(process.selectionStartDate);
  const endDate = toDate(process.selectionEndDate);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/schedule/selection">
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("selectionProcess:buttons.back")}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {process.name}
            </h1>
            <Badge variant={getStatusBadgeVariant(process.status)}>
              {t(`selectionProcess:status.${process.status}`)}
            </Badge>
          </div>
          {process.description && (
            <p className="text-muted-foreground mt-1">{process.description}</p>
          )}
        </div>
      </div>

      {/* Current Turn Alert */}
      {isCurrentTurn && process.status === "active" && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <span className="font-semibold">
              {t("selectionProcess:messages.yourTurn")}
            </span>{" "}
            - {t("selectionProcess:modals.confirmComplete.description")}
          </AlertDescription>
        </Alert>
      )}

      {/* Selection Week View - Show when it's user's turn */}
      {process.status === "active" && isCurrentTurn && (
        <Card>
          <CardHeader>
            <CardTitle>{t("selectionProcess:titles.selectRoutines")}</CardTitle>
            <CardDescription>
              {t("selectionProcess:descriptions.selectRoutines")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SelectionWeekView
              process={process}
              stableId={process.stableId}
              onSelectRoutine={(instanceId) =>
                assignMutation.mutateAsync(instanceId)
              }
              selectedRoutineIds={selectedRoutineIds}
              isSelecting={assignMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("selectionProcess:details.overview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("selectionProcess:labels.startDate")}
              </span>
              <span className="font-medium">
                {format(startDate, "d MMMM yyyy", { locale: sv })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("selectionProcess:labels.endDate")}
              </span>
              <span className="font-medium">
                {format(endDate, "d MMMM yyyy", { locale: sv })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("selectionProcess:labels.participantCount")}
              </span>
              <span className="font-medium">{process.turns.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("selectionProcess:labels.completedTurns")}
              </span>
              <span className="font-medium">
                {process.turns.filter((t) => t.status === "completed").length} /{" "}
                {process.turns.length}
              </span>
            </div>
            {userTurnOrder && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("selectionProcess:queue.yourPosition", {
                    position: userTurnOrder,
                    total: process.turns.length,
                  })}
                </span>
                {turnsAhead > 0 && (
                  <span className="text-muted-foreground">
                    ({turnsAhead} {t("selectionProcess:queue.waiting")})
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Turn Order Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("selectionProcess:labels.turnOrder")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {process.turns.map((turn, index) => {
                const isUserTurn = turn.userId === user?.uid;
                const isActiveTurn =
                  process.currentTurnUserId === turn.userId &&
                  process.status === "active";

                return (
                  <div
                    key={turn.userId}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isActiveTurn
                        ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                        : isUserTurn
                          ? "border-primary/20 bg-primary/5"
                          : "border-transparent bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {turn.order}.
                      </span>
                      {getTurnStatusIcon(turn)}
                      <span
                        className={`${isUserTurn ? "font-semibold" : ""} ${
                          turn.status === "completed"
                            ? "text-muted-foreground"
                            : ""
                        }`}
                      >
                        {turn.userName}
                        {isUserTurn && (
                          <span className="text-xs ml-2 text-primary">
                            ({t("common:labels.you")})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {turn.selectionsCount > 0 && (
                        <Badge variant="secondary">
                          {turn.selectionsCount} {t("common:labels.selected")}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          turn.status === "active"
                            ? "default"
                            : turn.status === "completed"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {t(`selectionProcess:turnStatus.${turn.status}`)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Controls Card - only visible to users with canManage permission */}
      <AdminControlsCard
        process={process}
        onCancel={handleCancelProcess}
        onDelete={handleDeleteProcess}
        onStart={handleStartProcess}
        onDateChange={handleDateChange}
        isCancelling={isCancelling}
        isDeleting={isDeleting}
        isStarting={isStarting}
        isUpdatingDates={isUpdatingDates}
      />

      {/* Complete Turn Action */}
      {isCurrentTurn && process.status === "active" && (
        <Card className="border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {t("selectionProcess:titles.completeTurn")}
                </h3>
                <p className="text-muted-foreground">
                  {t("selectionProcess:modals.confirmComplete.description")}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setConfirmCompleteOpen(true)}
                disabled={isCompleting}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {isCompleting
                  ? t("common:labels.loading")
                  : t("selectionProcess:buttons.completeTurn")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Complete Turn Dialog */}
      <Dialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("selectionProcess:modals.confirmComplete.title")}
            </DialogTitle>
            <DialogDescription>
              {t("selectionProcess:modals.confirmComplete.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmCompleteOpen(false)}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button onClick={handleCompleteTurn} disabled={isCompleting}>
              {isCompleting
                ? t("common:labels.loading")
                : t("selectionProcess:modals.confirmComplete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
