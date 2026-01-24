import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { Alert, AlertDescription, AlertTitle } from "./alert";

interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message/description */
  message?: string;
  /** Callback when user clicks retry button */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Error state component for displaying API errors with optional retry.
 *
 * Shows an error alert with a descriptive message and retry button.
 * Use this in query boundaries when an error occurs.
 *
 * @example
 * ```tsx
 * if (query.isError) {
 *   return (
 *     <ErrorState
 *       message={query.error.message}
 *       onRetry={() => query.refetch()}
 *     />
 *   );
 * }
 * ```
 */
export function ErrorState({
  title,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation("common");

  return (
    <div className={`py-6 ${className ?? ""}`}>
      <Alert variant="destructive" className="mx-auto max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title ?? t("errors.loadFailed")}</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{message ?? t("errors.generic")}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("actions.retry")}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
