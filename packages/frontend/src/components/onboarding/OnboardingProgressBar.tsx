import { useTranslation } from "react-i18next";
import { ChevronUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingProgressBarProps {
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  onExpand: () => void;
}

export function OnboardingProgressBar({
  progressPercent,
  completedCount,
  totalCount,
  onExpand,
}: OnboardingProgressBarProps) {
  const { t } = useTranslation("onboarding");

  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 shadow-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{t("panel.title")}</span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>
      <ChevronUp className="size-4 text-muted-foreground shrink-0" />
    </button>
  );
}
