import { useTranslation } from "react-i18next";
import { Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface OnboardingHeaderProps {
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  onMinimize: () => void;
  onDismiss: () => void;
}

export function OnboardingHeader({
  progressPercent,
  completedCount,
  totalCount,
  onMinimize,
  onDismiss,
}: OnboardingHeaderProps) {
  const { t } = useTranslation("onboarding");

  return (
    <div className="px-4 pt-4 pb-3 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("panel.title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("panel.progress", {
              completed: completedCount,
              total: totalCount,
            })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onMinimize}
            aria-label={t("panel.minimize")}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onDismiss}
            aria-label={t("panel.dismiss")}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <Progress value={progressPercent} className="h-2" />
    </div>
  );
}
