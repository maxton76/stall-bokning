import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "./LoadingSpinner";

interface DefaultLoadingStateProps {
  /** Optional custom message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default loading state component for API queries.
 *
 * Shows a spinner with a "Loading..." message. Use this as the default
 * loading state for query boundaries.
 *
 * @example
 * ```tsx
 * if (query.isLoading) {
 *   return <DefaultLoadingState />;
 * }
 * ```
 */
export function DefaultLoadingState({
  message,
  className,
}: DefaultLoadingStateProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className={`flex items-center justify-center py-12 ${className ?? ""}`}
    >
      <LoadingSpinner size="md" className="mr-2" />
      <span className="text-muted-foreground">
        {message ?? t("actions.loading")}
      </span>
    </div>
  );
}
