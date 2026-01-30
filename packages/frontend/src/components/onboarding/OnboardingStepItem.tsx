import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, CircleDot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StepStatus } from "@/types/onboarding";
import { cn } from "@/lib/utils";

interface OnboardingStepItemProps {
  titleKey: string;
  descriptionKey: string;
  status: StepStatus;
  actionRoute?: string;
  actionLabelKey?: string;
}

const statusIcons: Record<StepStatus, typeof CheckCircle2> = {
  completed: CheckCircle2,
  current: CircleDot,
  pending: Circle,
};

const statusColors: Record<StepStatus, string> = {
  completed: "text-green-600",
  current: "text-primary",
  pending: "text-muted-foreground",
};

export function OnboardingStepItem({
  titleKey,
  descriptionKey,
  status,
  actionRoute,
  actionLabelKey,
}: OnboardingStepItemProps) {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();

  const Icon = statusIcons[status];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg p-2 transition-colors",
        status === "current" && "bg-accent/50",
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", statusColors[status])} />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            status === "completed" && "line-through text-muted-foreground",
          )}
        >
          {t(titleKey)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t(descriptionKey)}
        </p>
        {status === "current" && actionRoute && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 mt-1 text-xs"
            onClick={() => navigate(actionRoute)}
          >
            {actionLabelKey ? t(actionLabelKey) : t("panel.go")}
            <ArrowRight className="ml-1 size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
