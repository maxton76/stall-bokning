import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { ChecklistItem } from "@equiduty/shared";

interface ActivityChecklistProps {
  items: ChecklistItem[];
  onItemToggle: (itemId: string, completed: boolean) => Promise<void>;
  onMarkAllComplete?: () => Promise<void>;
  disabled?: boolean;
  showProgress?: boolean;
  className?: string;
}

export function ActivityChecklist({
  items,
  onItemToggle,
  onMarkAllComplete,
  disabled = false,
  showProgress = true,
  className,
}: ActivityChecklistProps) {
  const { t } = useTranslation(["activities", "common"]);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [markingAllComplete, setMarkingAllComplete] = useState(false);

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allComplete = completedCount === totalCount && totalCount > 0;

  const handleItemToggle = async (itemId: string, completed: boolean) => {
    if (disabled || loadingItems.has(itemId)) return;

    setLoadingItems((prev) => new Set(prev).add(itemId));
    try {
      await onItemToggle(itemId, completed);
    } finally {
      setLoadingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleMarkAllComplete = async () => {
    if (disabled || markingAllComplete || !onMarkAllComplete) return;

    setMarkingAllComplete(true);
    try {
      await onMarkAllComplete();
    } finally {
      setMarkingAllComplete(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {showProgress && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("activities:progress.label")}
          </span>
          <span
            className={cn(
              "font-medium",
              allComplete
                ? "text-green-600"
                : progress >= 50
                  ? "text-yellow-600"
                  : "text-muted-foreground",
            )}
          >
            {completedCount} / {totalCount} ({progress}%)
          </span>
        </div>
      )}

      <div className="space-y-1">
        {items.map((item) => {
          const isLoading = loadingItems.has(item.id);

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md transition-colors",
                item.completed ? "bg-green-50" : "hover:bg-muted/50",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {isLoading ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <Checkbox
                  id={`checklist-item-${item.id}`}
                  checked={item.completed}
                  onCheckedChange={(checked) =>
                    handleItemToggle(item.id, checked === true)
                  }
                  disabled={disabled}
                  aria-label={`${item.completed ? t("common:status.completed") : t("common:status.pending")}: ${item.text}`}
                  className={cn(
                    item.completed &&
                      "border-green-500 bg-green-500 text-white",
                  )}
                />
              )}
              <label
                htmlFor={`checklist-item-${item.id}`}
                className={cn(
                  "flex-1 text-sm cursor-pointer",
                  item.completed && "line-through text-muted-foreground",
                )}
              >
                {item.text}
              </label>
              {item.entityType === "horse" && item.completed && (
                <span
                  className="text-xs text-muted-foreground"
                  role="img"
                  aria-label={t("common:status.completed")}
                >
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {onMarkAllComplete && !allComplete && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllComplete}
          disabled={disabled || markingAllComplete}
          className="w-full"
        >
          {markingAllComplete ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          {t("activities:actions.markAllComplete")}
        </Button>
      )}

      {allComplete && (
        <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium p-2 bg-green-50 rounded-md">
          <CheckCircle2 className="h-4 w-4" />
          {t("activities:progress.allComplete")}
        </div>
      )}
    </div>
  );
}

/**
 * Compact checklist for card views
 */
interface CompactChecklistProps {
  items: ChecklistItem[];
  maxVisible?: number;
  className?: string;
}

export function CompactChecklist({
  items,
  maxVisible = 3,
  className,
}: CompactChecklistProps) {
  const completedCount = items.filter((item) => item.completed).length;
  const visibleItems = items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;

  return (
    <div className={cn("space-y-1", className)}>
      {visibleItems.map((item) => (
        <div key={item.id} className="flex items-center gap-2 text-sm">
          {item.completed ? (
            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
          <span
            className={cn(
              "truncate",
              item.completed && "text-muted-foreground line-through",
            )}
          >
            {item.text}
          </span>
        </div>
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground pl-5">
          +{remainingCount} more ({completedCount}/{items.length} done)
        </span>
      )}
    </div>
  );
}
