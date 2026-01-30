import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OnboardingStepItem } from "./OnboardingStepItem";
import { cn } from "@/lib/utils";
import type { StepWithStatus } from "@/contexts/OnboardingContext";

interface OnboardingSectionProps {
  titleKey: string;
  steps: StepWithStatus[];
  completedCount: number;
  totalCount: number;
  /** Auto-expand if section has the current step */
  defaultOpen?: boolean;
}

export function OnboardingSection({
  titleKey,
  steps,
  completedCount,
  totalCount,
  defaultOpen = false,
}: OnboardingSectionProps) {
  const { t } = useTranslation("onboarding");
  const [open, setOpen] = useState(defaultOpen);

  const allDone = completedCount === totalCount;

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <span
          className={cn(
            "text-sm font-medium",
            allDone && "text-muted-foreground",
          )}
        >
          {t(titleKey)}
        </span>
        <div className="flex items-center gap-2">
          <Badge
            variant={allDone ? "default" : "secondary"}
            className="text-xs px-1.5 py-0"
          >
            {completedCount}/{totalCount}
          </Badge>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </div>
      </button>
      {open && (
        <div className="px-2 pb-3 space-y-1">
          {steps.map((step) => (
            <OnboardingStepItem
              key={step.id}
              titleKey={step.titleKey}
              descriptionKey={step.descriptionKey}
              status={step.status}
              actionRoute={step.actionRoute}
              actionLabelKey={step.actionLabelKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
