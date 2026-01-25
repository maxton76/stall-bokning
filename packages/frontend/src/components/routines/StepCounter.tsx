import { useTranslation } from "react-i18next";

interface StepCounterProps {
  current: number; // stepsCompleted or currentStepIndex
  total: number; // stepsTotal or steps.length
  className?: string;
}

export function StepCounter({ current, total, className }: StepCounterProps) {
  const { t } = useTranslation(["routines"]);
  const displayStep = Math.min(current + 1, total);

  return (
    <span className={className}>
      {t("routines:flow.step")} {displayStep} {t("routines:flow.of")} {total}
    </span>
  );
}
