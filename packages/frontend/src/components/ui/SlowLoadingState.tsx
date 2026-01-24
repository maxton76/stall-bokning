import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { LoadingSpinner } from "./LoadingSpinner";

interface SlowLoadingStateProps {
  /** Callback when user clicks retry button */
  onRetry?: () => void;
  /** Optional custom message */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading state component for when requests are taking longer than expected.
 *
 * Shows a spinner with a "taking longer than usual" message and optional retry button.
 * Use this when a request has been pending for more than the slow threshold (typically 5s).
 *
 * @example
 * ```tsx
 * if (isSlow) {
 *   return <SlowLoadingState onRetry={() => query.refetch()} />;
 * }
 * ```
 */
export function SlowLoadingState({
  onRetry,
  message,
  className,
}: SlowLoadingStateProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 ${className ?? ""}`}
    >
      <LoadingSpinner size="lg" />
      <div className="text-center">
        <p className="text-muted-foreground">
          {message ?? t("loading.takingLonger")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          {t("loading.serverStarting")}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("actions.retry")}
        </Button>
      )}
    </div>
  );
}
