import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ActivityTypeConfig, Activity } from "@/types/activity";
import { toDate } from "@/utils/timestampUtils";

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horse?: { id: string; name: string; feiRules?: string };
  activityType?: ActivityTypeConfig;
  lastActivity?: Activity;
  onAdd: () => void;
}

export function QuickAddDialog({
  open,
  onOpenChange,
  horse,
  activityType,
  lastActivity,
  onAdd,
}: QuickAddDialogProps) {
  const { t } = useTranslation("activities");

  // Don't render if missing data
  if (!horse || !activityType) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{activityType.name}</DialogTitle>
          <DialogDescription>
            {t("quickAdd.description", {
              activity: activityType.name.toLowerCase(),
              horse: horse.name,
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Horse Info */}
        <div className="mb-4">
          <div className="font-medium text-base">{horse.name}</div>
          {horse.feiRules && (
            <div className="text-sm text-muted-foreground">
              {horse.feiRules}
            </div>
          )}
        </div>

        {/* Last Done Status */}
        <div className="mb-2">
          <div className="text-sm font-medium">
            {t("quickAdd.lastDone")} {activityType.name.toLowerCase()}
          </div>
          <div className="text-sm text-muted-foreground">
            {lastActivity && toDate(lastActivity.date)
              ? format(toDate(lastActivity.date)!, "PPP")
              : t("quickAdd.neverUnknown")}
          </div>
        </div>

        {/* Interval */}
        <div className="mb-4">
          <div className="text-sm font-medium">{t("quickAdd.interval")}</div>
          <div className="text-sm text-muted-foreground">
            26 {t("quickAdd.weeks")}
          </div>
        </div>

        {/* Add Button */}
        <Button onClick={onAdd} className="w-full">
          {t("quickAdd.add")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
