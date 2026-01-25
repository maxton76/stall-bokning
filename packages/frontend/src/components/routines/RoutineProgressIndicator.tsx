import { useTranslation } from "react-i18next";
import { Check, Circle, Clock, SkipForward } from "lucide-react";
import { StepCounter } from "./StepCounter";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RoutineStep, RoutineProgress, StepStatus } from "@shared/types";
import { cn } from "@/lib/utils";

interface RoutineProgressIndicatorProps {
  steps: RoutineStep[];
  currentStepIndex: number;
  progress: RoutineProgress;
  className?: string;
  variant?: "dots" | "bar" | "stepper";
}

const STATUS_STYLES: Record<
  StepStatus,
  { icon: React.ComponentType<any>; color: string }
> = {
  pending: { icon: Circle, color: "text-gray-300" },
  in_progress: { icon: Clock, color: "text-amber-500" },
  completed: { icon: Check, color: "text-green-500" },
  skipped: { icon: SkipForward, color: "text-gray-400" },
};

export function RoutineProgressIndicator({
  steps,
  currentStepIndex,
  progress,
  className,
  variant = "stepper",
}: RoutineProgressIndicatorProps) {
  const { t } = useTranslation(["routines"]);

  const progressPercent =
    steps.length > 0
      ? Math.round((progress.stepsCompleted / steps.length) * 100)
      : 0;

  if (variant === "bar") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("routines:flow.progress")}
          </span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <p className="text-sm text-muted-foreground text-center">
          <StepCounter current={currentStepIndex} total={steps.length} />
        </p>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        {steps.map((step, index) => {
          const stepProgress = progress.stepProgress[step.id];
          const status = stepProgress?.status ?? "pending";
          const isCurrent = index === currentStepIndex;

          return (
            <TooltipProvider key={step.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-all",
                      status === "completed" && "bg-green-500",
                      status === "skipped" && "bg-gray-300",
                      status === "in_progress" && "bg-amber-500 animate-pulse",
                      status === "pending" && !isCurrent && "bg-gray-200",
                      status === "pending" &&
                        isCurrent &&
                        "bg-primary ring-2 ring-primary/30",
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{step.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`routines:stepStatus.${status}`)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  // Stepper variant (default)
  return (
    <div className={cn("relative", className)}>
      {/* Progress line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const stepProgress = progress.stepProgress[step.id];
          const status = stepProgress?.status ?? "pending";
          const isCurrent = index === currentStepIndex;
          const StatusIcon = STATUS_STYLES[status].icon;

          return (
            <TooltipProvider key={step.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background transition-all",
                        status === "completed" &&
                          "border-green-500 bg-green-50",
                        status === "skipped" && "border-gray-300 bg-gray-50",
                        status === "in_progress" &&
                          "border-amber-500 bg-amber-50",
                        status === "pending" && !isCurrent && "border-gray-200",
                        isCurrent &&
                          status === "pending" &&
                          "border-primary bg-primary/10 ring-4 ring-primary/20",
                      )}
                    >
                      {status === "completed" ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : status === "skipped" ? (
                        <SkipForward className="h-4 w-4 text-gray-400" />
                      ) : (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isCurrent ? "text-primary" : "text-gray-400",
                          )}
                        >
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-2 text-xs max-w-[80px] text-center truncate",
                        isCurrent
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {step.name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">{step.name}</p>
                    {step.description && (
                      <p className="text-xs text-muted-foreground max-w-[200px]">
                        {step.description}
                      </p>
                    )}
                    <p className="text-xs">
                      {t(`routines:stepStatus.${status}`)}
                    </p>
                    {step.estimatedMinutes && (
                      <p className="text-xs text-muted-foreground">
                        ~{step.estimatedMinutes} {t("routines:flow.minutes")}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

// Compact version for mobile
export function RoutineProgressCompact({
  steps,
  currentStepIndex,
  progress,
  className,
}: RoutineProgressIndicatorProps) {
  const { t } = useTranslation(["routines"]);

  const progressPercent =
    steps.length > 0
      ? Math.round((progress.stepsCompleted / steps.length) * 100)
      : 0;

  const currentStep = steps[currentStepIndex];

  return (
    <div className={cn("space-y-2", className)}>
      {/* Current step info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {Math.min(currentStepIndex + 1, steps.length)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">{currentStep?.name}</p>
            <p className="text-xs text-muted-foreground">
              <StepCounter current={currentStepIndex} total={steps.length} />
            </p>
          </div>
        </div>
        <span className="text-sm font-medium">{progressPercent}%</span>
      </div>

      {/* Progress bar */}
      <Progress value={progressPercent} className="h-1.5" />

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5">
        {steps.map((step, index) => {
          const stepProgress = progress.stepProgress[step.id];
          const status = stepProgress?.status ?? "pending";
          const isCurrent = index === currentStepIndex;

          return (
            <div
              key={step.id}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                status === "completed" && "bg-green-500",
                status === "skipped" && "bg-gray-300",
                status === "in_progress" && "bg-amber-500",
                status === "pending" && !isCurrent && "bg-gray-200",
                isCurrent && status === "pending" && "bg-primary",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
