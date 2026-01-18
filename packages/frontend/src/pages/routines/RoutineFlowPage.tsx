import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { useRoutineFlow, useDailyNotes } from "@/hooks/useRoutines";
import { getRoutineInstances } from "@/services/routineService";
import { HorseContextCard } from "@/components/routines/HorseContextCard";
import { DailyNotesModal } from "@/components/routines/DailyNotesModal";
import { RoutineProgressIndicator } from "@/components/routines/RoutineProgressIndicator";
import type { RoutineInstance, RoutineStep, Horse } from "@shared/types";
import { cn } from "@/lib/utils";

export default function RoutineFlowPage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["routines", "common"]);
  const { toast } = useToast();

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

  // Load instance data on mount
  useEffect(() => {
    if (instanceId) {
      loadInstance();
    }
  }, [instanceId]);

  const loadInstance = async () => {
    if (!instanceId) return;
    try {
      // Get instances and find the one we need
      const instances = await getRoutineInstances(
        "", // We don't have stableId yet
      );
      // This is a simplified approach - ideally we'd have a getRoutineInstance(id) endpoint
    } catch (err) {
      console.error("Error loading routine instance:", err);
    }
  };

  // Get template data from instance
  const template = (instance as any)?.templateSnapshot;
  const steps: RoutineStep[] = template?.steps ?? [];
  const totalSteps = steps.length;
  const progressPercent =
    totalSteps > 0 ? Math.round((currentStepIndex / totalSteps) * 100) : 0;

  // Check if notes need to be read first
  const requiresNotesRead = template?.requiresNotesRead && !notesAcknowledged;

  // Check if this is the last step
  const isLastStep = currentStepIndex >= totalSteps - 1;

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
      await start();
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
      toast({
        title: t("routines:notifications.routineCompleted"),
        description: template?.name,
      });
      navigate("/routines");
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
      navigate("/routines");
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

  // Not started state
  if (instance.status === "scheduled") {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/routines")}
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
              {/* TODO: Load actual horses from context */}
              <HorseContextCard
                horse={
                  {
                    id: "demo-horse-1",
                    name: "Bella",
                  } as any
                }
                step={currentStep}
                progress={
                  instance.progress.stepProgress[currentStep?.id ?? ""]
                    ?.horseProgress?.["demo-horse-1"]
                }
                dailyNotes={dailyNotes}
                onMarkDone={(notes) => markHorseDone("demo-horse-1", notes)}
                onSkip={(reason) => skipHorse("demo-horse-1", reason)}
                onMedicationConfirm={(given, reason) =>
                  confirmMedication("demo-horse-1", given, reason)
                }
                onBlanketAction={(action) =>
                  setBlanketAction("demo-horse-1", action)
                }
                isSubmitting={isSubmitting}
              />
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
          onClick={() => navigate("/routines")}
          disabled={isSubmitting}
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
