import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  value: number;
  displayText?: string;
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  className?: string;
}

/**
 * Get progress color based on completion percentage
 */
function getProgressColor(value: number): string {
  if (value === 100) return "bg-green-500";
  if (value >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Get text color based on completion percentage
 */
function getTextColor(value: number): string {
  if (value === 100) return "text-green-600";
  if (value >= 50) return "text-yellow-600";
  return "text-red-600";
}

export function ProgressIndicator({
  value,
  displayText,
  size = "md",
  showPercentage = true,
  className,
}: ProgressIndicatorProps) {
  const progressColor = getProgressColor(value);
  const textColor = getTextColor(value);

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between">
        {displayText && (
          <span className={cn("font-medium", textSizeClasses[size], textColor)}>
            {displayText}
          </span>
        )}
        {showPercentage && (
          <span className={cn("font-medium", textSizeClasses[size], textColor)}>
            {value}%
          </span>
        )}
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-muted",
          sizeClasses[size],
        )}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out rounded-full",
            progressColor,
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Compact progress badge for list views
 */
interface ProgressBadgeProps {
  value: number;
  displayText?: string;
  className?: string;
}

export function ProgressBadge({
  value,
  displayText,
  className,
}: ProgressBadgeProps) {
  const bgColor =
    value === 100
      ? "bg-green-100"
      : value >= 50
        ? "bg-yellow-100"
        : "bg-red-100";
  const textColor = getTextColor(value);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        bgColor,
        textColor,
        className,
      )}
    >
      {displayText || `${value}%`}
    </span>
  );
}
