import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Clock,
  AlertTriangle,
  FileText,
  Camera,
  CheckCircle2,
  XCircle,
  Eye,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useRoutineFlow, useDailyNotes } from "@/hooks/useRoutines";
import {
  useRoutineActivityHistory,
  getCategoryInfo,
} from "@/hooks/useHorseActivityHistory";
import { getRoutineInstance } from "@/services/routineService";
import { completeShift } from "@/services/scheduleService";
import { HorseContextCard } from "@/components/routines/HorseContextCard";
import { DailyNotesModal } from "@/components/routines/DailyNotesModal";
import { RoutineProgressIndicator } from "@/components/routines/RoutineProgressIndicator";
import { resolveStepHorses } from "@/utils/routineHorseResolver";
import { getInstructionsForHorseStep } from "@/utils/instructionsResolver";
import type { RoutineInstance, RoutineStep, Horse } from "@shared/types";
import type { Horse as HorseType } from "@/types/roles";
import { cn } from "@/lib/utils";

export default function RoutineFlowPage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation(["routines", "common"]);
  const { toast } = useToast();

  // Get the linked shift ID from URL if this routine was started from a shift
  const linkedShiftId = searchParams.get("shiftId");

  // Flow state
  const {
    instance,
    setInstance,
    loading,
    error,
    isSubmitting,
    currentStep,
    currentStepIndex,
    start,
    goToNextStep,
    goToPreviousStep,
    markHorseDone,
    skipHorse,
    confirmMedication,
    setBlanketAction,
    complete,
    cancel,
  } = useRoutineFlow(instanceId);

  // Daily notes
  const {
    notes: dailyNotes,
    acknowledged: notesAcknowledged,
    acknowledge: acknowledgeNotes,
    hasAlerts,
    hasCriticalAlerts,
  } = useDailyNotes(instance?.stableId);

  // Local state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [stepHorses, setStepHorses] = useState<HorseType[]>([]);
  const [horsesLoading, setHorsesLoading] = useState(false);

  // Load instance data on mount
  useEffect(() => {
    if (instanceId) {
      loadInstance();
    }
  }, [instanceId]);

  const loadInstance = async () => {
    if (!instanceId) return;
    try {
      const instanceData = await getRoutineInstance(instanceId);
      setInstance(instanceData);
    } catch (err) {
      console.error("Error loading routine instance:", err);
    }
  };

  // Load horses for current step
  useEffect(() => {
    const loadStepHorses = async () => {
      if (!currentStep || !instance) return;

      // Skip horse loading if step has no horse context
      if (currentStep.horseContext === "none") {
        setStepHorses([]);
        setHorsesLoading(false);
        return;
      }

      // Validate required data
      if (!instance.stableId) {
        console.error("Cannot load horses: missing stableId");
        setStepHorses([]);
        setHorsesLoading(false);
        return;
      }

      if (!instance.organizationId) {
        console.error("Cannot load horses: missing organizationId");
        setStepHorses([]);
        setHorsesLoading(false);
        return;
      }

      setHorsesLoading(true);
      try {
        const horses = await resolveStepHorses(
          currentStep,
          instance.stableId,
          instance.organizationId,
        );
        setStepHorses(horses);
      } catch (error) {
        console.error("Error loading horses for step:", error);
        setStepHorses([]);
        toast({
          title: t("common:errors.genericError"),
          description: "Failed to load horses",
          variant: "destructive",
        });
      } finally {
        setHorsesLoading(false);
      }
    };

    loadStepHorses();
  }, [currentStep, instance, toast, t]);

  // Get template data from instance
  // The API returns template.steps when fetching a single instance
  const template =
    (instance as any)?.template ?? (instance as any)?.templateSnapshot;
  const steps: RoutineStep[] = template?.steps ?? [];
  const totalSteps = steps.length;
  const progressPercent =
    totalSteps > 0 ? Math.round((currentStepIndex / totalSteps) * 100) : 0;

  // Check if notes need to be read first
  const requiresNotesRead = template?.requiresNotesRead && !notesAcknowledged;

  // Check if this is the last step
  const isLastStep = currentStepIndex >= totalSteps - 1;

  // Memoize horse instructions for performance optimization
  // NOTE: This must be called before any early returns to comply with React hooks rules
  const horseInstructions = useMemo(() => {
    if (!currentStep) return [];
    return stepHorses.map((horse) => ({
      horseId: horse.id,
      instructions: getInstructionsForHorseStep(horse, currentStep?.category),
    }));
  }, [stepHorses, currentStep]);

  // Handle starting the routine
  const handleStart = async () => {
    if (requiresNotesRead) {
      setShowNotesModal(true);
      return;
    }

    try {
      await start();
      toast({
        title: t("routines:notifications.routineStarted"),
        description: template?.name,
      });
    } catch (err) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    }
  };

  // Handle acknowledging notes and starting
  const handleNotesAcknowledged = async () => {
    acknowledgeNotes();
    setShowNotesModal(false);
    try {
      await start(true); // Notes were just acknowledged
    } catch (err) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    }
  };

  // Handle next step
  const handleNextStep = async () => {
    if (isLastStep) {
      setShowCompleteDialog(true);
      return;
    }

    try {
      await goToNextStep();
    } catch (err) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    }
  };

  // Handle routine completion
  const handleComplete = async () => {
    try {
      await complete(completionNotes || undefined);

      // If this routine was started from a shift, mark the shift as completed too
      if (linkedShiftId) {
        try {
          await completeShift(linkedShiftId, completionNotes || undefined);
          toast({
            title: t("routines:notifications.routineAndShiftCompleted"),
            description: template?.name,
          });
        } catch (shiftErr) {
          // Still show success for routine, but warn about shift
          console.error("Error completing linked shift:", shiftErr);
          toast({
            title: t("routines:notifications.routineCompleted"),
            description: t("routines:errors.shiftCompletionFailed"),
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: t("routines:notifications.routineCompleted"),
          description: template?.name,
        });
      }

      // Navigate back to schedule page if started from a shift, otherwise activities
      navigate(linkedShiftId ? "/schedule" : "/activities");
    } catch (err) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    }
    setShowCompleteDialog(false);
  };

  // Handle cancellation
  const handleCancel = async () => {
    try {
      await cancel();
      toast({
        title: t("routines:status.cancelled"),
      });
      navigate("/activities");
    } catch (err) {
      toast({
        title: t("common:errors.genericError"),
        variant: "destructive",
      });
    }
    setShowCancelDialog(false);
  };

  // Loading state
  if (loading || !instance) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:loading")}</p>
      </div>
    );
  }

  // Completed/Cancelled state - Read-only view
  if (instance.status === "completed" || instance.status === "cancelled") {
    return (
      <CompletedRoutineView
        instance={instance}
        template={template}
        steps={steps}
        t={t}
        navigate={navigate}
      />
    );
  }

  // Not started state
  if (instance.status === "scheduled") {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/activities")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common:buttons.back")}
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{template?.name}</CardTitle>
            <CardDescription>{template?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Routine Info */}
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {instance.scheduledStartTime}
              </span>
              <span>
                {totalSteps} {t("routines:template.steps")}
              </span>
              <span>
                ~{template?.estimatedDuration} {t("routines:flow.minutes")}
              </span>
            </div>

            {/* Notes Alert */}
            {hasAlerts && (
              <div
                className={cn(
                  "p-4 rounded-lg border-l-4",
                  hasCriticalAlerts
                    ? "border-l-red-500 bg-red-50"
                    : "border-l-yellow-500 bg-yellow-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5",
                      hasCriticalAlerts ? "text-red-500" : "text-yellow-500",
                    )}
                  />
                  <span className="font-medium">
                    {t("routines:flow.readNotesFirst")}
                  </span>
                </div>
              </div>
            )}

            {/* Start Button */}
            <div className="flex justify-center">
              <Button size="lg" onClick={handleStart} disabled={isSubmitting}>
                {t("routines:actions.start")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daily Notes Modal */}
        <DailyNotesModal
          open={showNotesModal}
          onOpenChange={setShowNotesModal}
          notes={dailyNotes}
          onAcknowledge={handleNotesAcknowledged}
        />
      </div>
    );
  }

  // Active flow state
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCancelDialog(true)}
          >
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{template?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t("routines:flow.step")} {currentStepIndex + 1}{" "}
              {t("routines:flow.of")} {totalSteps}
            </p>
          </div>
        </div>

        {/* Time estimate */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />~{currentStep?.estimatedMinutes ?? 5}{" "}
          {t("routines:flow.minutes")}
        </div>
      </div>

      {/* Progress Indicator */}
      <RoutineProgressIndicator
        steps={steps}
        currentStepIndex={currentStepIndex}
        progress={instance.progress}
        className="mb-6"
      />

      {/* Current Step */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-2">
                {t(`routines:categories.${currentStep?.category}`)}
              </Badge>
              <CardTitle>{currentStep?.name}</CardTitle>
              {currentStep?.description && (
                <CardDescription>{currentStep.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Horse Context Cards */}
          {currentStep && currentStep.horseContext !== "none" && (
            <div className="space-y-4">
              {horsesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t("common:loading")}</p>
                </div>
              ) : stepHorses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t("routines:flow.noHorses")}
                  </p>
                </div>
              ) : (
                stepHorses.map((horse) => {
                  const instructions = horseInstructions.find(
                    (h) => h.horseId === horse.id,
                  )?.instructions;

                  return (
                    <HorseContextCard
                      key={horse.id}
                      horse={horse}
                      step={currentStep}
                      specialInstructions={instructions}
                      progress={
                        instance.progress.stepProgress[currentStep?.id ?? ""]
                          ?.horseProgress?.[horse.id]
                      }
                      dailyNotes={dailyNotes}
                      onMarkDone={(notes) => markHorseDone(horse.id, notes)}
                      onSkip={(reason) => skipHorse(horse.id, reason)}
                      onMedicationConfirm={(given, reason) =>
                        confirmMedication(horse.id, given, reason)
                      }
                      onBlanketAction={(action) =>
                        setBlanketAction(horse.id, action)
                      }
                      isSubmitting={isSubmitting}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* General step (no horses) */}
          {currentStep?.horseContext === "none" && (
            <div className="flex flex-col items-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground mb-4">
                {currentStep.description || t("routines:flow.noHorses")}
              </p>
              {currentStep.requiresConfirmation && (
                <div className="flex items-center gap-2">
                  <Checkbox id="confirm-step" />
                  <label htmlFor="confirm-step" className="text-sm">
                    {t("routines:actions.confirmStep")}
                  </label>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={isSubmitting || currentStepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("routines:actions.previousStep")}
        </Button>

        <Button onClick={handleNextStep} disabled={isSubmitting} size="lg">
          {isLastStep ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              {t("routines:actions.complete")}
            </>
          ) : (
            <>
              {t("routines:actions.nextStep")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("routines:actions.cancel")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("routines:errors.cannotComplete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:buttons.back")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("routines:actions.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("routines:actions.complete")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("routines:notifications.routineCompletedMessage", {
                routineName: template?.name,
                userName: "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">
              {t("routines:actions.addNote")} ({t("common:labels.optional")})
            </label>
            <Textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder={t("routines:actions.addNote")}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              <Check className="h-4 w-4 mr-2" />
              {t("routines:actions.complete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Completed Routine View Component
interface CompletedRoutineViewProps {
  instance: RoutineInstance;
  template: any;
  steps: RoutineStep[];
  t: (key: string, options?: any) => string;
  navigate: (path: string) => void;
}

function CompletedRoutineView({
  instance,
  template,
  steps,
  t,
  navigate,
}: CompletedRoutineViewProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const isCompleted = instance.status === "completed";
  const isCancelled = instance.status === "cancelled";

  // Fetch activity history for this routine instance
  const { data: activityHistory, isLoading: historyLoading } =
    useRoutineActivityHistory(instance.id);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  // Format completion date - handle Firestore timestamp
  const completionDate = instance.completedAt
    ? new Date(
        typeof instance.completedAt === "object" &&
          "toDate" in instance.completedAt
          ? (instance.completedAt as any).toDate()
          : (instance.completedAt as any),
      ).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate("/activities")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("common:buttons.back")}
      </Button>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                isCompleted && "bg-green-100",
                isCancelled && "bg-gray-100",
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-gray-600" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl">{template?.name}</CardTitle>
          <CardDescription>
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className={cn(
                "mt-2",
                isCompleted && "bg-green-100 text-green-800 hover:bg-green-100",
                isCancelled && "bg-gray-100 text-gray-800 hover:bg-gray-100",
              )}
            >
              {t(`routines:status.${instance.status}`)}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Completion Info */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {completionDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {completionDate}
              </span>
            )}
            {instance.completedBy && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {(instance as any).completedByName ||
                  instance.assignedToName ||
                  t("routines:flow.completedByUser")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {t("routines:flow.readOnlyView")}
            </span>
          </div>

          {/* Overall completion notes */}
          {instance.notes && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    {t("routines:flow.completionNotes")}
                  </p>
                  <p className="text-sm text-blue-800">{instance.notes}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Steps Timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("routines:flow.stepsOverview")}
        </h2>

        {steps.map((step, index) => {
          const stepProgress = instance.progress.stepProgress[step.id];
          const isStepCompleted = stepProgress?.status === "completed";

          // Get activities from history for this step
          const stepActivities = activityHistory?.groupedByStep[step.id] || [];
          const hasHistoryData = stepActivities.length > 0;

          // Fallback to instance progress if no history (for backwards compatibility)
          const horsesProgress = stepProgress?.horseProgress || {};

          // Use activity history if available, otherwise fallback to progress
          const horsesCompleted = hasHistoryData
            ? stepActivities.filter((a) => a.executionStatus === "completed")
                .length
            : Object.values(horsesProgress).filter((hp: any) => hp?.completed)
                .length;
          const horsesSkipped = hasHistoryData
            ? stepActivities.filter((a) => a.executionStatus === "skipped")
                .length
            : Object.values(horsesProgress).filter((hp: any) => hp?.skipped)
                .length;
          const totalHorses = hasHistoryData
            ? stepActivities.length
            : Object.keys(horsesProgress).length;

          // Always allow expanding to see step details
          const hasContent = true;
          const isExpanded = expandedSteps.has(step.id);

          return (
            <Collapsible
              key={step.id}
              open={isExpanded}
              onOpenChange={() => toggleStep(step.id)}
            >
              <Card
                className={cn(
                  "transition-all",
                  isStepCompleted && "border-green-200 bg-green-50/50",
                  !isStepCompleted && isCancelled && "opacity-60",
                )}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader
                    className={cn(
                      "pb-2",
                      hasContent && "cursor-pointer hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Step number indicator */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                          isStepCompleted
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-600",
                        )}
                      >
                        {isStepCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {step.name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {t(`routines:categories.${step.category}`)}
                          </Badge>
                        </div>
                        {step.description && (
                          <CardDescription className="text-sm">
                            {step.description}
                          </CardDescription>
                        )}
                      </div>
                      {/* Horse progress summary */}
                      {totalHorses > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <span className="text-green-600">
                            {horsesCompleted} ✓
                          </span>
                          {horsesSkipped > 0 && (
                            <span className="ml-2 text-gray-500">
                              {horsesSkipped} ⊘
                            </span>
                          )}
                          <span className="ml-1">/ {totalHorses}</span>
                        </div>
                      )}
                      {/* Expand/collapse icon */}
                      {hasContent && (
                        <div className="text-muted-foreground">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {/* Loading state for history */}
                  {historyLoading && step.horseContext !== "none" && (
                    <CardContent className="pt-2">
                      <p className="text-sm text-muted-foreground">
                        {t("common:loading")}
                      </p>
                    </CardContent>
                  )}

                  {/* Message for steps with horse context but no recorded data */}
                  {!historyLoading &&
                    step.horseContext !== "none" &&
                    totalHorses === 0 && (
                      <CardContent className="pt-2">
                        <p className="text-sm text-muted-foreground italic">
                          {t("routines:flow.noHorseDataRecorded")}
                        </p>
                      </CardContent>
                    )}

                  {/* Horse activity history details (preferred) */}
                  {!historyLoading && hasHistoryData && (
                    <CardContent className="pt-2">
                      <div className="space-y-2">
                        {stepActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className={cn(
                              "p-3 rounded-lg border",
                              activity.executionStatus === "completed" &&
                                "bg-green-50/50 border-green-200",
                              activity.executionStatus === "skipped" &&
                                "bg-gray-50/50 border-gray-200",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                                    activity.executionStatus === "completed" &&
                                      "bg-green-100 text-green-600",
                                    activity.executionStatus === "skipped" &&
                                      "bg-gray-100 text-gray-600",
                                  )}
                                >
                                  {activity.executionStatus === "completed" ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </div>
                                <span className="font-medium">
                                  {activity.horseName}
                                </span>
                              </div>
                              {activity.executionStatus === "skipped" && (
                                <Badge variant="secondary" className="text-xs">
                                  {t("routines:horse.skipped")}
                                </Badge>
                              )}
                            </div>

                            {/* Skip reason */}
                            {activity.skipReason && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                <span className="font-medium">
                                  {t("routines:horse.skipReason")}:
                                </span>{" "}
                                {activity.skipReason}
                              </div>
                            )}

                            {/* Notes */}
                            {activity.notes && (
                              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                                <div className="flex items-start gap-2">
                                  <FileText className="h-3 w-3 mt-0.5 text-blue-600" />
                                  <p className="text-sm text-blue-800">
                                    {activity.notes}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Feeding snapshot */}
                            {activity.feedingSnapshot && (
                              <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                                <p className="text-xs font-medium text-amber-800 mb-1">
                                  {t("horses:routineHistory.snapshot.feeding")}
                                </p>
                                <p className="text-sm text-amber-700">
                                  {
                                    activity.feedingSnapshot.instructions
                                      .feedTypeName
                                  }{" "}
                                  -{" "}
                                  {
                                    activity.feedingSnapshot.instructions
                                      .quantity
                                  }{" "}
                                  {
                                    activity.feedingSnapshot.instructions
                                      .quantityMeasure
                                  }
                                </p>
                                {activity.feedingSnapshot.instructions
                                  .specialInstructions && (
                                  <p className="text-xs text-amber-600 mt-1 italic">
                                    {
                                      activity.feedingSnapshot.instructions
                                        .specialInstructions
                                    }
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Medication snapshot */}
                            {activity.medicationSnapshot && (
                              <div className="mt-2 text-sm">
                                <div className="p-2 bg-red-50 rounded border border-red-100 mb-2">
                                  <p className="text-xs font-medium text-red-800 mb-1">
                                    {t(
                                      "horses:routineHistory.snapshot.medication",
                                    )}
                                  </p>
                                  <p className="text-sm text-red-700">
                                    {
                                      activity.medicationSnapshot.instructions
                                        .medicationName
                                    }{" "}
                                    -{" "}
                                    {
                                      activity.medicationSnapshot.instructions
                                        .dosage
                                    }
                                  </p>
                                  {activity.medicationSnapshot.instructions
                                    .notes && (
                                    <p className="text-xs text-red-600 mt-1 italic">
                                      {
                                        activity.medicationSnapshot.instructions
                                          .notes
                                      }
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant={
                                    activity.medicationSnapshot.given
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {activity.medicationSnapshot.given
                                    ? t("routines:horse.medicationGiven")
                                    : t("routines:horse.medicationSkipped")}
                                </Badge>
                                {activity.medicationSnapshot.skipReason && (
                                  <span className="ml-2 text-muted-foreground">
                                    {activity.medicationSnapshot.skipReason}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Blanket snapshot */}
                            {activity.blanketSnapshot && (
                              <div className="mt-2">
                                <div className="p-2 bg-purple-50 rounded border border-purple-100">
                                  <p className="text-xs font-medium text-purple-800 mb-1">
                                    {t(
                                      "horses:routineHistory.snapshot.blanket",
                                    )}
                                  </p>
                                  {activity.blanketSnapshot.instructions
                                    .currentBlanket && (
                                    <p className="text-sm text-purple-700">
                                      {t("common:current")}:{" "}
                                      {
                                        activity.blanketSnapshot.instructions
                                          .currentBlanket
                                      }
                                    </p>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="text-xs mt-1"
                                  >
                                    {activity.blanketSnapshot.action === "on" &&
                                      t("common:on")}
                                    {activity.blanketSnapshot.action ===
                                      "off" && t("common:off")}
                                    {activity.blanketSnapshot.action ===
                                      "unchanged" && t("common:unchanged")}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}

                  {/* Fallback to horse progress details (for backwards compatibility) */}
                  {!historyLoading && !hasHistoryData && totalHorses > 0 && (
                    <CardContent className="pt-2">
                      <div className="space-y-2">
                        {Object.entries(horsesProgress).map(
                          ([horseId, progress]: [string, any]) => (
                            <div
                              key={horseId}
                              className={cn(
                                "p-3 rounded-lg border",
                                progress?.completed &&
                                  "bg-green-50/50 border-green-200",
                                progress?.skipped &&
                                  "bg-gray-50/50 border-gray-200",
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                                      progress?.completed &&
                                        "bg-green-100 text-green-600",
                                      progress?.skipped &&
                                        "bg-gray-100 text-gray-600",
                                      !progress?.completed &&
                                        !progress?.skipped &&
                                        "bg-blue-100 text-blue-600",
                                    )}
                                  >
                                    {progress?.completed ? (
                                      <Check className="h-3 w-3" />
                                    ) : progress?.skipped ? (
                                      <X className="h-3 w-3" />
                                    ) : (
                                      "?"
                                    )}
                                  </div>
                                  <span className="font-medium">
                                    {progress?.horseName || horseId}
                                  </span>
                                </div>
                                {progress?.skipped && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {t("routines:horse.skipped")}
                                  </Badge>
                                )}
                              </div>

                              {/* Skip reason */}
                              {progress?.skipped && progress?.skipReason && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  <span className="font-medium">
                                    {t("routines:horse.skipReason")}:
                                  </span>{" "}
                                  {progress.skipReason}
                                </div>
                              )}

                              {/* Notes */}
                              {progress?.notes && (
                                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                                  <div className="flex items-start gap-2">
                                    <FileText className="h-3 w-3 mt-0.5 text-blue-600" />
                                    <p className="text-sm text-blue-800">
                                      {progress.notes}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Medication info */}
                              {progress?.medicationGiven !== undefined && (
                                <div className="mt-2 text-sm">
                                  <Badge
                                    variant={
                                      progress.medicationGiven
                                        ? "default"
                                        : "destructive"
                                    }
                                    className="text-xs"
                                  >
                                    {progress.medicationGiven
                                      ? t("routines:horse.medicationGiven")
                                      : t("routines:horse.medicationSkipped")}
                                  </Badge>
                                  {progress.medicationSkipReason && (
                                    <span className="ml-2 text-muted-foreground">
                                      {progress.medicationSkipReason}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Blanket action */}
                              {progress?.blanketAction && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  <span className="font-medium">
                                    {t("routines:horse.blanket")}:
                                  </span>{" "}
                                  {t(
                                    `routines:horse.blanket${progress.blanketAction.charAt(0).toUpperCase() + progress.blanketAction.slice(1)}`,
                                  )}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  )}

                  {/* General step (no horses) completion status */}
                  {step.horseContext === "none" && (
                    <CardContent className="pt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isStepCompleted ? (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            <span>{t("routines:flow.stepCompleted")}</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 text-gray-400" />
                            <span>{t("routines:flow.stepNotCompleted")}</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Back to activities button */}
      <div className="mt-8 flex justify-center">
        <Button onClick={() => navigate("/activities")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("routines:actions.backToActivities")}
        </Button>
      </div>
    </div>
  );
}
