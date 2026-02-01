import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface CommissionCalculateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodStart: string;
  onPeriodStartChange: (value: string) => void;
  periodEnd: string;
  onPeriodEndChange: (value: string) => void;
  onCalculate: () => void;
  isCalculating: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CommissionCalculateDialog({
  open,
  onOpenChange,
  periodStart,
  onPeriodStartChange,
  periodEnd,
  onPeriodEndChange,
  onCalculate,
  isCalculating,
}: CommissionCalculateDialogProps) {
  const { t } = useTranslation(["trainerCommission", "common"]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("trainerCommission:dialog.calculateTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("trainerCommission:dialog.calculateDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t("trainerCommission:commission.periodStart")}</Label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => onPeriodStartChange(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("trainerCommission:commission.periodEnd")}</Label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => onPeriodEndChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCalculating}
          >
            {t("common:buttons.cancel", "Cancel")}
          </Button>
          <Button
            onClick={onCalculate}
            disabled={isCalculating || !periodStart || !periodEnd}
          >
            {isCalculating
              ? t("common:buttons.loading", "Loading...")
              : t("trainerCommission:commission.calculate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
