import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

interface LoadingSpinnerProps {
  /** Size of the spinner: sm (h-4), md (h-6), lg (h-8). Default: lg */
  size?: SpinnerSize;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center the spinner in a flex container */
  centered?: boolean;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/**
 * Reusable loading spinner component.
 *
 * @example
 * // Full-page centered loading state
 * <LoadingSpinner centered />
 *
 * @example
 * // Inline button loading indicator
 * <LoadingSpinner size="sm" className="mr-2" />
 */
export function LoadingSpinner({
  size = "lg",
  className,
  centered = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <Loader2
      className={cn(
        sizeClasses[size],
        "animate-spin text-muted-foreground",
        className,
      )}
    />
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center py-8">{spinner}</div>
    );
  }

  return spinner;
}
