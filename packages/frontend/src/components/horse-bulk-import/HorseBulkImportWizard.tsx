import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { doc, onSnapshot } from "firebase/firestore";
import { Upload, FileSpreadsheet, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/apiClient";
import { db } from "@/lib/firebase";
import { partitionEmails } from "@/lib/emailUtils";
import { MAX_FILE_SIZE } from "@/lib/importParser";
import { cacheInvalidation } from "@/lib/queryClient";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  useHorseBulkImport,
  type HorseWizardStep,
} from "@/hooks/useHorseBulkImport";
import { BulkImportConfirmation } from "@/components/bulk-import/BulkImportConfirmation";
import { HorseBulkImportPreview } from "./HorseBulkImportPreview";
import type {
  Stable,
  BulkImportProgress,
  BulkImportJobStatus,
  BulkImportResponse,
  ResolveMemberEmailsResponse,
} from "@equiduty/shared";
import { useRef } from "react";

interface HorseBulkImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  stables: Stable[];
}

const ACCEPTED_EXTENSIONS = ".xlsx,.xls,.csv";

const STEP_TITLES: Record<HorseWizardStep, string> = {
  1: "horses:bulkImport.steps.upload",
  2: "horses:bulkImport.steps.preview",
  3: "horses:bulkImport.steps.confirmation",
};

function StepIndicator({
  currentStep,
  t,
}: {
  currentStep: HorseWizardStep;
  t: (key: string) => string;
}) {
  const steps: HorseWizardStep[] = [1, 2, 3];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div
            className={`
              flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium
              ${
                step === currentStep
                  ? "bg-primary text-primary-foreground"
                  : step < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }
            `}
          >
            {step}
          </div>
          <span
            className={`ml-1.5 text-xs hidden sm:inline ${
              step === currentStep
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }`}
          >
            {t(STEP_TITLES[step])}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-px mx-2 ${
                step < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function HorseBulkImportWizard({
  open,
  onOpenChange,
  organizationId,
  stables,
}: HorseBulkImportWizardProps) {
  const { t } = useTranslation(["horses", "common"]);
  const { toast } = useToast();
  const { limits } = useSubscription();
  const [jobProgress, setJobProgress] = useState<BulkImportProgress | null>(
    null,
  );
  const [jobStatus, setJobStatus] = useState<BulkImportJobStatus | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute remaining horse slots
  const [currentHorseCount, setCurrentHorseCount] = useState<number>(0);
  const { remainingSlots, effectiveMax } = useMemo(() => {
    const remaining =
      limits.horses === -1
        ? Infinity
        : Math.max(0, limits.horses - currentHorseCount);
    return {
      remainingSlots: remaining,
      effectiveMax: remaining === Infinity ? 500 : remaining,
    };
  }, [limits.horses, currentHorseCount]);

  // Fetch current horse count on open
  useEffect(() => {
    if (!open) return;
    apiClient
      .get<{ count: number }>(`/organizations/${organizationId}/horse-count`)
      .then((data) => setCurrentHorseCount(data.count))
      .catch(() => setCurrentHorseCount(0));
  }, [open, organizationId]);

  const {
    state,
    reset,
    setHasHeaders,
    handleFileSelect,
    setDefaultStable,
    setHorseStableOverride,
    setPreviewRows,
    setResolving,
    toggleRowExclusion,
    validationSummary,
    canSubmit,
    getSubmissionPayload,
    goToStep,
    prevStep,
    setSubmitting,
    setJobId,
    setSubmitError,
  } = useHorseBulkImport(remainingSlots);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      reset();
      setJobProgress(null);
      setJobStatus(null);
    }
  }, [open, reset]);

  // Subscribe to job document for progress
  useEffect(() => {
    if (!state.jobId) return;
    const unsubscribe = onSnapshot(
      doc(db, "bulkImportJobs", state.jobId),
      (snapshot) => {
        const data = snapshot.data();
        if (!data) return;
        setJobProgress(data.progress as BulkImportProgress);
        const newStatus = data.status as BulkImportJobStatus;
        setJobStatus((prev) => {
          if (newStatus === "completed" && prev !== "completed") {
            // Invalidate horse list caches
            cacheInvalidation.horses.all();
          }
          return newStatus;
        });
      },
    );
    return unsubscribe;
  }, [state.jobId]);

  // Resolve emails and go to preview
  const goToPreview = useCallback(async () => {
    if (state.unpivotedRows.length === 0) return;

    setResolving(true);
    try {
      const uniqueEmails = [
        ...new Set(
          state.unpivotedRows
            .map((r) => r.ownerEmail)
            .filter(
              (e): e is string => typeof e === "string" && e.trim().length > 0,
            ),
        ),
      ];

      // Filter out invalid emails before API call to avoid Zod validation errors
      const { valid: validEmails, invalid: invalidEmails } =
        partitionEmails(uniqueEmails);

      // Only call API with valid emails (skip if none)
      let resolved: ResolveMemberEmailsResponse["resolved"] = [];
      let unresolved: string[] = [];

      if (validEmails.length > 0) {
        const response = await apiClient.post<ResolveMemberEmailsResponse>(
          `/organizations/${organizationId}/resolve-member-emails`,
          { emails: validEmails },
        );
        resolved = response.resolved;
        unresolved = response.unresolved;
      }

      // Combine API unresolved with invalid emails - validator will mark INVALID_EMAIL
      setPreviewRows(resolved, [...unresolved, ...invalidEmails]);
      goToStep(2);
    } catch (err: any) {
      toast({
        title: t("common:labels.error"),
        description:
          err.message || t("horses:bulkImport.errors.resolveEmailsFailed"),
        variant: "destructive",
      });
      setResolving(false);
    }
  }, [
    state.unpivotedRows,
    organizationId,
    setResolving,
    setPreviewRows,
    goToStep,
    toast,
    t,
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    onOpenChange(false);
    if (state.jobId) {
      cacheInvalidation.horses.all();
    }
  }, [onOpenChange, state.jobId]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const horses = getSubmissionPayload();
      const response = await apiClient.post<BulkImportResponse>(
        `/organizations/${organizationId}/bulk-import-horses`,
        { horses },
      );
      setJobId(response.jobId);
      toast({
        title: t("horses:bulkImport.confirmation.submitted"),
        description: t("horses:bulkImport.confirmation.submittedDescription"),
      });
    } catch (err: any) {
      const message = err.message || t("horses:bulkImport.errors.submitFailed");
      setSubmitError(message);
      toast({
        title: t("common:labels.error"),
        description: message,
        variant: "destructive",
      });
    }
  }, [
    getSubmissionPayload,
    organizationId,
    setSubmitting,
    setJobId,
    setSubmitError,
    toast,
    t,
  ]);

  // Prevent closing during submission
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && state.submitting) return;
      onOpenChange(newOpen);
    },
    [onOpenChange, state.submitting],
  );

  // File upload handlers
  const handleFile = useCallback(
    (file: File) => {
      handleFileSelect(file, state.hasHeaders);
    },
    [handleFileSelect, state.hasHeaders],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const handleHeaderToggle = useCallback(
    (checked: boolean) => {
      setHasHeaders(checked);
      if (state.file) {
        handleFileSelect(state.file, checked);
      }
    },
    [setHasHeaders, handleFileSelect, state.file],
  );

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "FILE_TOO_LARGE":
        return t("horses:bulkImport.errors.fileTooLarge", {
          maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
      case "INVALID_FILE_TYPE":
        return t("horses:bulkImport.errors.invalidFileType");
      case "EMPTY_FILE":
        return t("horses:bulkImport.errors.emptyFile");
      case "NO_DATA_ROWS":
        return t("horses:bulkImport.errors.noDataRows");
      case "PARSE_ERROR":
        return t("horses:bulkImport.errors.parseError");
      case "READ_ERROR":
        return t("horses:bulkImport.errors.readError");
      default:
        return error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("horses:bulkImport.title")}</DialogTitle>
          <DialogDescription>
            {t("horses:bulkImport.description")}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={state.step} t={t} />

        {/* Step 1: File Upload */}
        {state.step === 1 && (
          <div className="space-y-6">
            {/* Format instructions */}
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">
                  {t("horses:bulkImport.upload.formatTitle")}
                </p>
                <p>{t("horses:bulkImport.upload.formatDescription")}</p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                ${state.file && !state.parseError ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : ""}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
              />
              {state.file && !state.parseError ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-10 w-10 text-green-600" />
                  <p className="text-sm font-medium">{state.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(state.file.size / 1024).toFixed(1)} KB —{" "}
                    {t("horses:bulkImport.upload.horsesFound", {
                      count: state.unpivotedRows.length,
                    })}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    {t("horses:bulkImport.upload.changeFile")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {t("horses:bulkImport.upload.dropzone")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("horses:bulkImport.upload.formats")}
                  </p>
                </div>
              )}
            </div>

            {/* Parse error */}
            {state.parseError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {getErrorMessage(state.parseError)}
              </div>
            )}

            {/* Truncation warning in upload step */}
            {state.wasTruncated && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                {t("horses:bulkImport.upload.truncationWarning", {
                  fileCount: state.truncatedCount,
                  remaining: remainingSlots === Infinity ? "∞" : remainingSlots,
                })}
              </div>
            )}

            {/* Header toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="has-headers-horse">
                  {t("horses:bulkImport.upload.hasHeaders")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("horses:bulkImport.upload.hasHeadersTooltip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="has-headers-horse"
                checked={state.hasHeaders}
                onCheckedChange={handleHeaderToggle}
              />
            </div>

            {/* Subscription info */}
            <p className="text-xs text-muted-foreground text-center">
              {limits.horses === -1
                ? t("horses:bulkImport.upload.unlimitedHorses")
                : t("horses:bulkImport.upload.horseLimitInfo", {
                    remaining: remainingSlots,
                    limit: limits.horses,
                  })}
            </p>

            {/* Next button */}
            <div className="flex justify-end">
              <Button
                onClick={goToPreview}
                disabled={
                  !state.parseResult ||
                  !!state.parseError ||
                  state.unpivotedRows.length === 0 ||
                  state.resolving
                }
              >
                {state.resolving
                  ? t("horses:bulkImport.upload.resolving")
                  : t("common:buttons.next")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Configure */}
        {state.step === 2 && (
          <HorseBulkImportPreview
            previewRows={state.previewRows}
            stables={stables}
            defaultStableId={state.defaultStableId}
            defaultStableName={state.defaultStableName}
            perHorseStableOverrides={state.perHorseStableOverrides}
            validationSummary={validationSummary}
            canSubmit={canSubmit}
            submitting={state.submitting}
            submitError={state.submitError}
            wasTruncated={state.wasTruncated}
            truncatedCount={state.truncatedCount}
            onSetDefaultStable={setDefaultStable}
            onSetHorseStableOverride={setHorseStableOverride}
            onToggleRowExclusion={toggleRowExclusion}
            onSubmit={handleSubmit}
            onBack={prevStep}
          />
        )}

        {/* Step 3: Confirmation */}
        {state.step === 3 && (
          <BulkImportConfirmation
            jobId={state.jobId}
            progress={jobProgress}
            jobStatus={jobStatus}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
