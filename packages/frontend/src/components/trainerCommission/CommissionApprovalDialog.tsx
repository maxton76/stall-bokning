import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Props
// ============================================================================

interface CommissionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onReject: () => void;
  isRejecting: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CommissionApprovalDialog({
  open,
  onOpenChange,
  rejectReason,
  onRejectReasonChange,
  onReject,
  isRejecting,
}: CommissionApprovalDialogProps) {
  const { t } = useTranslation(["trainerCommission", "common"]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("trainerCommission:dialog.rejectTitle")}</DialogTitle>
          <DialogDescription>
            {t("trainerCommission:dialog.rejectDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t("trainerCommission:commission.rejectReason")} *</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRejecting}
          >
            {t("common:buttons.cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isRejecting || !rejectReason.trim()}
          >
            {isRejecting
              ? t("common:buttons.loading", "Loading...")
              : t("trainerCommission:commission.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
