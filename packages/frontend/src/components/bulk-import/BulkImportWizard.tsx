import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/apiClient";
import { db } from "@/lib/firebase";
import { cacheInvalidation } from "@/lib/queryClient";
import { useBulkImport, type WizardStep } from "@/hooks/useBulkImport";
import { BulkImportFileUpload } from "./BulkImportFileUpload";
import { BulkImportColumnMapping } from "./BulkImportColumnMapping";
import { BulkImportPreview } from "./BulkImportPreview";
import { BulkImportConfirmation } from "./BulkImportConfirmation";
import type {
  OrganizationMember,
  OrganizationInvite,
  BulkImportProgress,
  BulkImportJobStatus,
  BulkImportResponse,
} from "@equiduty/shared";

interface BulkImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  existingMembers: OrganizationMember[];
  existingInvites: (OrganizationInvite & { id: string })[];
}

const STEP_TITLES: Record<WizardStep, string> = {
  1: "organizations:bulkImport.steps.upload",
  2: "organizations:bulkImport.steps.mapping",
  3: "organizations:bulkImport.steps.preview",
  4: "organizations:bulkImport.steps.confirmation",
};

function StepIndicator({
  currentStep,
  t,
}: {
  currentStep: WizardStep;
  t: (key: string) => string;
}) {
  const steps: WizardStep[] = [1, 2, 3, 4];
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

export function BulkImportWizard({
  open,
  onOpenChange,
  organizationId,
  existingMembers,
  existingInvites,
}: BulkImportWizardProps) {
  const { t } = useTranslation(["organizations", "common"]);
  const { toast } = useToast();
  const [jobProgress, setJobProgress] = useState<BulkImportProgress | null>(
    null,
  );
  const [jobStatus, setJobStatus] = useState<BulkImportJobStatus | null>(null);

  const {
    state,
    reset,
    setHasHeaders,
    handleFileSelect,
    updateMapping,
    hasEmailMapping,
    goToPreview,
    setGlobalRoles,
    setRowRoleOverride,
    clearRowRoleOverride,
    toggleRowExclusion,
    validationSummary,
    canSubmit,
    getSubmissionPayload,
    goToStep,
    prevStep,
    setSubmitting,
    setJobId,
    setSubmitError,
  } = useBulkImport(existingMembers, existingInvites);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      reset();
      setJobProgress(null);
      setJobStatus(null);
    }
  }, [open, reset]);

  // Subscribe to job document for progress and status updates
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
            cacheInvalidation.organizationMembers.list(organizationId);
            cacheInvalidation.organizationInvites.list(organizationId);
          }
          return newStatus;
        });
      },
    );
    return unsubscribe;
  }, [state.jobId, organizationId]);

  // Handle close
  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Invalidate caches if import was submitted
    if (state.jobId) {
      cacheInvalidation.organizationMembers.list(organizationId);
      cacheInvalidation.organizationInvites.list(organizationId);
    }
  }, [onOpenChange, state.jobId, organizationId]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const members = getSubmissionPayload();
      const response = await apiClient.post<BulkImportResponse>(
        `/organizations/${organizationId}/bulk-import`,
        { members },
      );
      setJobId(response.jobId);
      toast({
        title: t("organizations:bulkImport.confirmation.submitted"),
        description: t(
          "organizations:bulkImport.confirmation.submittedDescription",
        ),
      });
    } catch (err: any) {
      const message =
        err.message || t("organizations:bulkImport.errors.submitFailed");
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

  // Prevent closing with Escape during submission
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && state.submitting) return;
      onOpenChange(newOpen);
    },
    [onOpenChange, state.submitting],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("organizations:bulkImport.title")}</DialogTitle>
          <DialogDescription>
            {t("organizations:bulkImport.description")}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={state.step} t={t} />

        {/* Step 1: File Upload */}
        {state.step === 1 && (
          <BulkImportFileUpload
            file={state.file}
            hasHeaders={state.hasHeaders}
            parseError={state.parseError}
            onFileSelect={handleFileSelect}
            onHasHeadersChange={setHasHeaders}
            onNext={() => goToStep(2)}
            canProceed={state.parseResult !== null && !state.parseError}
          />
        )}

        {/* Step 2: Column Mapping */}
        {state.step === 2 && state.parseResult && (
          <BulkImportColumnMapping
            parseResult={state.parseResult}
            columnMappings={state.columnMappings}
            hasEmailMapping={hasEmailMapping}
            onUpdateMapping={updateMapping}
            onNext={goToPreview}
            onBack={prevStep}
          />
        )}

        {/* Step 3: Preview & Roles */}
        {state.step === 3 && (
          <BulkImportPreview
            previewRows={state.previewRows}
            globalRoles={state.globalRoles}
            globalPrimaryRole={state.globalPrimaryRole}
            perRowRoleOverrides={state.perRowRoleOverrides}
            validationSummary={validationSummary}
            canSubmit={canSubmit}
            submitting={state.submitting}
            submitError={state.submitError}
            onSetGlobalRoles={setGlobalRoles}
            onSetRowRoleOverride={setRowRoleOverride}
            onClearRowRoleOverride={clearRowRoleOverride}
            onToggleRowExclusion={toggleRowExclusion}
            onSubmit={handleSubmit}
            onBack={prevStep}
          />
        )}

        {/* Step 4: Confirmation */}
        {state.step === 4 && (
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
