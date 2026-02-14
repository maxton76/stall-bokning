import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  X,
  AlertTriangle,
  Pill,
  Wheat,
  FileText,
  Camera,
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Horse,
  RoutineStep,
  HorseStepProgress,
  DailyNotes,
} from "@shared/types";
import { useHorseNotes } from "@/hooks/useRoutines";
import { cn } from "@/lib/utils";

interface HorseContextCardProps {
  horse: Horse;
  step: RoutineStep;
  progress?: HorseStepProgress;
  dailyNotes: DailyNotes | null;
  feedingInfo?: {
    feedType: string;
    quantity: string;
    supplements?: string[];
  };
  medicationInfo?: {
    name: string;
    dosage: string;
    instructions?: string;
  };
  blanketInfo?: {
    current: string;
    recommended?: string;
  };
  specialInstructions?: string;
  onMarkDone: (notes?: string) => void;
  onSkip: (reason: string) => void;
  onMedicationConfirm?: (given: boolean, skipReason?: string) => void;
  onBlanketAction?: (action: "on" | "off" | "unchanged") => void;
  onPhotoCapture?: (file: File) => void;
  isSubmitting?: boolean;
  readonly?: boolean;
}

export function HorseContextCard({
  horse,
  step,
  progress,
  dailyNotes,
  feedingInfo,
  medicationInfo,
  blanketInfo,
  specialInstructions,
  onMarkDone,
  onSkip,
  onMedicationConfirm,
  onBlanketAction,
  onPhotoCapture,
  isSubmitting = false,
  readonly = false,
}: HorseContextCardProps) {
  const { t } = useTranslation(["routines", "common"]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [notes, setNotes] = useState("");
  const [showMedicationSkipDialog, setShowMedicationSkipDialog] =
    useState(false);
  const [medicationSkipReason, setMedicationSkipReason] = useState("");

  // Get horse-specific notes
  const {
    note: horseNote,
    alerts: horseAlerts,
    hasNote,
    hasAlerts,
    priority,
  } = useHorseNotes(dailyNotes, horse.id);

  const isCompleted = progress?.completed;
  const isSkipped = progress?.skipped;
  const isDone = isCompleted || isSkipped;

  const handleMarkDone = () => {
    onMarkDone(notes || undefined);
    setNotes("");
  };

  const handleSkip = () => {
    if (!skipReason.trim()) return;
    onSkip(skipReason);
    setShowSkipDialog(false);
    setSkipReason("");
  };

  const handleMedicationGiven = () => {
    onMedicationConfirm?.(true);
  };

  const handleMedicationSkip = () => {
    if (!medicationSkipReason.trim()) return;
    onMedicationConfirm?.(false, medicationSkipReason);
    setShowMedicationSkipDialog(false);
    setMedicationSkipReason("");
  };

  return (
    <>
      <Card
        className={cn(
          "transition-all",
          isDone && "opacity-60",
          isCompleted && "border-green-200 bg-green-50/50",
          isSkipped && "border-gray-200 bg-gray-50/50",
          hasAlerts && priority === "critical" && !isDone && "border-red-300",
          hasAlerts && priority === "warning" && !isDone && "border-yellow-300",
        )}
      >
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isCompleted && "bg-green-100 text-green-600",
                    isSkipped && "bg-gray-100 text-gray-600",
                    !isDone && "bg-blue-100 text-blue-600",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : isSkipped ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <span className="text-lg font-semibold">
                      {horse.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {horse.name}
                    {hasAlerts && (
                      <Badge
                        variant="outline"
                        className={cn(
                          priority === "critical" &&
                            "border-red-500 text-red-500",
                          priority === "warning" &&
                            "border-yellow-500 text-yellow-500",
                        )}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {t(`routines:dailyNotes.priority.${priority}`)}
                      </Badge>
                    )}
                  </CardTitle>
                  {(horse.boxName || horse.paddockName) && (
                    <CardDescription>
                      {[horse.boxName, horse.paddockName]
                        .filter(Boolean)
                        .join(" · ")}
                    </CardDescription>
                  )}
                  {isSkipped && progress?.skipReason && (
                    <CardDescription>
                      {t("routines:horse.skipReason")}: {progress.skipReason}
                    </CardDescription>
                  )}
                  {isCompleted && progress?.notes && (
                    <CardDescription>
                      {t("routines:actions.addNote")}: {progress.notes}
                    </CardDescription>
                  )}
                </div>
              </div>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Daily Notes Alert */}
              {hasNote && (
                <div
                  className={cn(
                    "p-3 rounded-lg border-l-4",
                    priority === "critical" && "border-l-red-500 bg-red-50",
                    priority === "warning" &&
                      "border-l-yellow-500 bg-yellow-50",
                    priority === "info" && "border-l-blue-500 bg-blue-50",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn(
                        "h-4 w-4 mt-0.5",
                        priority === "critical" && "text-red-500",
                        priority === "warning" && "text-yellow-500",
                        priority === "info" && "text-blue-500",
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {t(
                          `routines:dailyNotes.noteCategory.${horseNote?.category || "other"}`,
                        )}
                      </p>
                      <p className="text-sm">{horseNote?.note}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feeding Info */}
              {step.showFeeding && feedingInfo && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <Wheat className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{t("routines:horse.feeding")}</p>
                    <p className="text-sm">
                      {feedingInfo.feedType}: {feedingInfo.quantity}
                    </p>
                    {feedingInfo.supplements &&
                      feedingInfo.supplements.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          + {feedingInfo.supplements.join(", ")}
                        </p>
                      )}
                  </div>
                </div>
              )}

              {/* Medication Info */}
              {step.showMedication && medicationInfo && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-3">
                    <Pill className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium flex items-center gap-2">
                        {t("routines:horse.medication")}
                        <Badge variant="destructive" className="text-xs">
                          {t("routines:horse.medicationRequired")}
                        </Badge>
                      </p>
                      <p className="text-sm">
                        {medicationInfo.name}: {medicationInfo.dosage}
                      </p>
                      {medicationInfo.instructions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {medicationInfo.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Medication confirmation */}
                  {!isDone && !readonly && onMedicationConfirm && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant={
                          progress?.medicationGiven ? "default" : "outline"
                        }
                        onClick={handleMedicationGiven}
                        disabled={isSubmitting}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {t("routines:horse.done")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowMedicationSkipDialog(true)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("routines:horse.skip")}
                      </Button>
                    </div>
                  )}

                  {progress?.medicationSkipped && (
                    <Badge variant="destructive" className="mt-2">
                      {t("routines:horse.medicationSkipped")}
                    </Badge>
                  )}
                </div>
              )}

              {/* Blanket Info */}
              {step.showBlanketStatus && blanketInfo && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium">{t("routines:horse.blanket")}</p>
                  <p className="text-sm">
                    {t("common:labels.current")}: {blanketInfo.current}
                  </p>
                  {blanketInfo.recommended && (
                    <p className="text-sm text-muted-foreground">
                      {t("common:labels.recommended")}:{" "}
                      {blanketInfo.recommended}
                    </p>
                  )}

                  {!isDone && !readonly && onBlanketAction && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant={
                          progress?.blanketAction === "on"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => onBlanketAction("on")}
                        disabled={isSubmitting}
                      >
                        {t("routines:horse.blanketOn")}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          progress?.blanketAction === "off"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => onBlanketAction("off")}
                        disabled={isSubmitting}
                      >
                        {t("routines:horse.blanketOff")}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          progress?.blanketAction === "unchanged"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => onBlanketAction("unchanged")}
                        disabled={isSubmitting}
                      >
                        {t("routines:horse.blanketUnchanged")}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Special Instructions */}
              {step.showSpecialInstructions && specialInstructions && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {t("routines:horse.specialInstructions")}
                      </p>
                      <p className="text-sm">{specialInstructions}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Saved Notes Display (when completed) */}
              {isDone && progress?.notes && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">
                        {t("routines:actions.addNote")}
                      </p>
                      <p className="text-sm text-blue-800">{progress.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes input */}
              {!isDone && !readonly && (
                <div>
                  <Input
                    placeholder={t("routines:actions.addNote")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mb-3"
                  />
                </div>
              )}

              {/* Action Buttons */}
              {!isDone && !readonly && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleMarkDone}
                    disabled={isSubmitting}
                    className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {t("routines:horse.done")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSkipDialog(true)}
                    disabled={isSubmitting}
                  >
                    {t("routines:horse.skip")}
                  </Button>
                  {step.allowPhotoEvidence && onPhotoCapture && (
                    <Button variant="outline" size="icon">
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>

          {/* Collapsed preview */}
          {!isExpanded && !isDone && !readonly && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {step.showFeeding && feedingInfo && (
                  <span className="text-amber-700 font-medium">
                    {feedingInfo.feedType}: {feedingInfo.quantity}
                  </span>
                )}
                {step.showMedication && medicationInfo && (
                  <span className="flex items-center gap-1 text-purple-600">
                    <Pill className="h-4 w-4" />
                    {medicationInfo.name}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkDone}
                  disabled={isSubmitting}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {t("routines:horse.done")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSkipDialog(true)}
                  disabled={isSubmitting}
                >
                  {t("routines:horse.skip")}
                </Button>
              </div>
            </CardContent>
          )}
        </Collapsible>
      </Card>

      {/* Skip Dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("routines:horse.skip")} - {horse.name}
            </DialogTitle>
            <DialogDescription>
              {t("routines:horse.skipReason")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder={t("routines:horse.skipReason")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
              {t("common:buttons.cancel")}
            </Button>
            <Button onClick={handleSkip} disabled={!skipReason.trim()}>
              {t("routines:actions.skip")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medication Skip Dialog */}
      <Dialog
        open={showMedicationSkipDialog}
        onOpenChange={setShowMedicationSkipDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t("routines:notifications.medicationSkipped")}
            </DialogTitle>
            <DialogDescription>
              {t("routines:notifications.medicationSkippedMessage", {
                horseName: horse.name,
                routineName: "",
              })}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={medicationSkipReason}
            onChange={(e) => setMedicationSkipReason(e.target.value)}
            placeholder={t("routines:horse.skipReason")}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMedicationSkipDialog(false)}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleMedicationSkip}
              disabled={!medicationSkipReason.trim()}
            >
              {t("routines:actions.skip")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
