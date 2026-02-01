import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BulkImportProgress, BulkImportJobStatus } from "@equiduty/shared";

interface BulkImportConfirmationProps {
  jobId: string | null;
  progress: BulkImportProgress | null;
  jobStatus?: BulkImportJobStatus | null;
  onClose: () => void;
}

export function BulkImportConfirmation({
  jobId,
  progress,
  jobStatus,
  onClose,
}: BulkImportConfirmationProps) {
  const { t } = useTranslation(["organizations", "common"]);

  const isFailed = jobStatus === "failed";
  const isCompleted = jobStatus === "completed";
  const isProcessing =
    !isFailed &&
    !isCompleted &&
    progress &&
    progress.processed < progress.total;
  const isSubmitted = !isFailed && !isCompleted && !isProcessing;
  const progressPercent = progress
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6 text-center py-4">
      {isFailed ? (
        <XCircle className="h-12 w-12 text-destructive mx-auto" />
      ) : isProcessing || isSubmitted ? (
        <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
      ) : (
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-medium">
          {isFailed
            ? t("organizations:bulkImport.confirmation.failed")
            : isCompleted
              ? t("organizations:bulkImport.confirmation.completed")
              : isProcessing
                ? t("organizations:bulkImport.confirmation.processing")
                : t("organizations:bulkImport.confirmation.submitted")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isFailed
            ? t("organizations:bulkImport.confirmation.failedDescription")
            : isCompleted && progress
              ? t(
                  "organizations:bulkImport.confirmation.completedDescription",
                  {
                    succeeded: progress.succeeded,
                    total: progress.total,
                  },
                )
              : isProcessing
                ? t(
                    "organizations:bulkImport.confirmation.processingDescription",
                  )
                : t(
                    "organizations:bulkImport.confirmation.submittedDescription",
                  )}
        </p>
      </div>

      {/* Progress bar (if we have real-time progress) */}
      {progress && !isFailed && !isCompleted && (
        <div className="space-y-2 px-4">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {t("organizations:bulkImport.confirmation.progress", {
              processed: progress.processed,
              total: progress.total,
              succeeded: progress.succeeded,
              failed: progress.failed,
            })}
          </p>
        </div>
      )}

      {/* Can close hint during processing/submitted */}
      {(isProcessing || isSubmitted) && (
        <p className="text-xs text-muted-foreground px-4">
          {t("organizations:bulkImport.confirmation.canClose")}
        </p>
      )}

      {/* Close button */}
      <div className="flex justify-center">
        <Button onClick={onClose}>{t("common:buttons.close")}</Button>
      </div>
    </div>
  );
}
