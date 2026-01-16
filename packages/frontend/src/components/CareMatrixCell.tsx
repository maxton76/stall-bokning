import { Plus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Activity } from "@/types/activity";
import { toDate } from "@/utils/timestampUtils";

interface CareMatrixCellProps {
  horseId: string;
  horseName: string;
  activityTypeId: string;
  activityTypeName: string;
  activityTypeColor: string;
  lastActivity?: Activity;
  nextActivity?: Activity;
  onClick: (
    horseId: string,
    activityTypeId: string,
    nextActivity?: Activity,
  ) => void;
}

export function CareMatrixCell({
  horseId,
  activityTypeId,
  lastActivity,
  nextActivity,
  onClick,
}: CareMatrixCellProps) {
  const hasLastActivity = !!lastActivity;
  const hasNextActivity = !!nextActivity;

  // Determine if overdue: there's a pending activity with a date in the past
  const now = new Date();
  const nextActivityDate = nextActivity ? toDate(nextActivity.date) : null;
  const isOverdue =
    hasNextActivity && nextActivityDate && nextActivityDate < now;

  // Get last activity date for display
  const lastActivityDate = lastActivity ? toDate(lastActivity.date) : null;

  return (
    <button
      onClick={() => onClick(horseId, activityTypeId, nextActivity)}
      className={cn(
        "w-full h-full flex flex-col items-center justify-center p-3 gap-2",
        "hover:bg-accent transition-colors",
        "border-l border-border",
        "min-h-[80px]",
      )}
      aria-label={
        hasNextActivity
          ? `View ${activityTypeId} activity`
          : `Add ${activityTypeId} activity`
      }
    >
      {/* Last completed activity date */}
      {hasLastActivity && lastActivityDate && (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
        >
          Done {format(lastActivityDate, "M/d/yy")}
        </Badge>
      )}

      {/* Next scheduled date in green badge */}
      {hasNextActivity && toDate(nextActivity.date) && (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
        >
          Next {format(toDate(nextActivity.date)!, "M/d/yy")}
        </Badge>
      )}

      {/* Overdue indicator */}
      {isOverdue && (
        <div className="text-red-500">
          <AlertCircle className="h-5 w-5" />
        </div>
      )}

      {/* Add button when no pending activity scheduled */}
      {!hasNextActivity && (
        <div className="text-gray-300 hover:text-gray-400 transition-colors">
          <div className="rounded-full border-2 border-current p-1">
            <Plus className="h-4 w-4" />
          </div>
        </div>
      )}
    </button>
  );
}
