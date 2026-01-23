import { Plus, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActivityTypeConfig, Activity } from "@/types/activity";
import { toDate } from "@/utils/timestampUtils";
import { useTranslatedActivityTypes } from "@/hooks/useTranslatedActivityTypes";

interface CareTableCellProps {
  horseId: string;
  horseName: string;
  activityTypeId: string;
  activityType: ActivityTypeConfig;
  lastActivity?: Activity;
  nextActivity?: Activity;
  onClick: (
    horseId: string,
    activityTypeId: string,
    nextActivity?: Activity,
  ) => void;
}

export function CareTableCell({
  horseId,
  horseName,
  activityTypeId,
  activityType,
  lastActivity,
  nextActivity,
  onClick,
}: CareTableCellProps) {
  const translateActivityType = useTranslatedActivityTypes();
  const handleClick = () => onClick(horseId, activityTypeId, nextActivity);
  const hasNextActivity = !!nextActivity;
  const displayName = translateActivityType(activityType);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full h-full flex flex-col items-center justify-center p-3",
        "hover:bg-accent transition-colors",
        "border-l border-border",
        "min-h-[80px]",
      )}
      aria-label={`${hasNextActivity ? "Edit" : lastActivity ? "View" : "Add"} ${displayName} activity for ${horseName}`}
    >
      {/* Show last completed activity */}
      {lastActivity && toDate(lastActivity.date) && (
        <div className="flex flex-col items-center gap-1">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-xs text-muted-foreground">
            {format(toDate(lastActivity.date)!, "MMM d")}
          </span>
        </div>
      )}
      {/* Show next scheduled activity */}
      {nextActivity && toDate(nextActivity.date) && (
        <div className="text-xs text-blue-600">
          Next: {format(toDate(nextActivity.date)!, "MMM d")}
        </div>
      )}
      {/* Show add button if no activities */}
      {!lastActivity && !nextActivity && (
        <Plus className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}
