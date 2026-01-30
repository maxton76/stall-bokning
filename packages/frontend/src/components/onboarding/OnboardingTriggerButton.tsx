import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnboarding } from "@/contexts/OnboardingContext";

/**
 * Header button that shows remaining onboarding steps.
 * Visible when the guide has been dismissed but not yet completed.
 */
export function OnboardingTriggerButton() {
  const { t } = useTranslation("onboarding");
  const {
    dismissed,
    allComplete,
    totalCount,
    completedCount,
    reopenGuide,
    loading,
  } = useOnboarding();

  // Only show when dismissed but not complete
  if (loading || !dismissed || allComplete) return null;

  const remaining = totalCount - completedCount;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={reopenGuide}
          >
            <ListChecks className="size-5" />
            {remaining > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 size-5 p-0 flex items-center justify-center text-xs"
              >
                {remaining}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("trigger.tooltip", { remaining })}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
