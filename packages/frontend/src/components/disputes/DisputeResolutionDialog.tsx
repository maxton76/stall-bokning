import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { DisputeResolutionType } from "@equiduty/shared";

// ============================================================================
// Constants
// ============================================================================

export const RESOLUTION_TYPES: DisputeResolutionType[] = [
  "credit_note",
  "adjustment",
  "explanation",
  "refund",
  "other",
];

// ============================================================================
// Resolve Dialog
// ============================================================================

interface ResolveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolutionType: DisputeResolutionType;
  onResolutionTypeChange: (type: DisputeResolutionType) => void;
  resolutionNotes: string;
  onResolutionNotesChange: (notes: string) => void;
  onResolve: () => void;
  resolving: boolean;
}

export function ResolveDialog({
  open,
  onOpenChange,
  resolutionType,
  onResolutionTypeChange,
  resolutionNotes,
  onResolutionNotesChange,
  onResolve,
  resolving,
}: ResolveDialogProps) {
  const { t } = useTranslation(["disputes", "common"]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("disputes:actions.resolve")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("disputes:resolution.type")}
            </label>
            <Select
              value={resolutionType}
              onValueChange={(v) =>
                onResolutionTypeChange(v as DisputeResolutionType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`disputes:resolution.types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("disputes:resolution.notes")}
            </label>
            <Textarea
              placeholder={t("disputes:resolution.notesPlaceholder")}
              value={resolutionNotes}
              onChange={(e) => onResolutionNotesChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:buttons.cancel")}
          </Button>
          <Button
            onClick={onResolve}
            disabled={!resolutionNotes.trim() || resolving}
          >
            {resolving
              ? t("common:labels.loading")
              : t("disputes:actions.resolve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Reject Dialog
// ============================================================================

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectReason: string;
  onRejectReasonChange: (reason: string) => void;
  onReject: () => void;
  rejecting: boolean;
}

export function RejectDialog({
  open,
  onOpenChange,
  rejectReason,
  onRejectReasonChange,
  onReject,
  rejecting,
}: RejectDialogProps) {
  const { t } = useTranslation(["disputes", "common"]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("disputes:actions.reject")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("disputes:rejection.reason")}
          </label>
          <Textarea
            placeholder={t("disputes:rejection.reasonPlaceholder")}
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common:buttons.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={!rejectReason.trim() || rejecting}
          >
            {rejecting
              ? t("common:labels.loading")
              : t("disputes:actions.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
