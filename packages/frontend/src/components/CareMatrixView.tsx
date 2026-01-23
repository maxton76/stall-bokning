import { useTranslation } from "react-i18next";
import { CareMatrixCell } from "./CareMatrixCell";
import type { ActivityTypeConfig, Activity } from "@/types/activity";
import { toDate } from "@/utils/timestampUtils";
import { useTranslatedActivityTypes } from "@/hooks/useTranslatedActivityTypes";

interface CareMatrixViewProps {
  horses: Array<{ id: string; name: string; feiRules?: string }>;
  activityTypes: ActivityTypeConfig[];
  activities: Activity[];
  onCellClick: (
    horseId: string,
    activityTypeId: string,
    nextActivity?: Activity,
  ) => void;
}

// Helper function to find the last (most recent) COMPLETED activity
function findLastActivity(
  activities: Activity[],
  horseId: string,
  activityTypeId: string,
): Activity | undefined {
  return activities
    .filter((a) => {
      const isCompleted = a.status === "completed";
      const isMatch =
        a.horseId === horseId && a.activityTypeConfigId === activityTypeId;
      return isCompleted && isMatch;
    })
    .sort((a, b) => {
      const aDate = toDate(a.date);
      const bDate = toDate(b.date);
      return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
    })[0]; // Sort descending to get most recent
}

// Helper function to find the next PENDING activity (scheduled but not done)
function findNextActivity(
  activities: Activity[],
  horseId: string,
  activityTypeId: string,
): Activity | undefined {
  return activities
    .filter((a) => {
      const isPending = a.status !== "completed";
      const isMatch =
        a.horseId === horseId && a.activityTypeConfigId === activityTypeId;
      return isPending && isMatch;
    })
    .sort((a, b) => {
      const aDate = toDate(a.date);
      const bDate = toDate(b.date);
      return (aDate?.getTime() ?? 0) - (bDate?.getTime() ?? 0);
    })[0]; // Sort ascending to get earliest pending date
}

export function CareMatrixView({
  horses,
  activityTypes,
  activities,
  onCellClick,
}: CareMatrixViewProps) {
  const { t } = useTranslation(["activities", "common"]);
  const translateActivityType = useTranslatedActivityTypes();

  // Filter to only show Care category activity types
  const careActivityTypes = activityTypes.filter((t) => t.category === "Care");

  // Sort activity types by sortOrder
  const sortedActivityTypes = [...careActivityTypes].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  if (horses.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          {t("activities:care.emptyState.noHorses")}
        </p>
      </div>
    );
  }

  if (sortedActivityTypes.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          {t("activities:care.emptyState.noActivityTypes")}
        </p>
      </div>
    );
  }

  // Calculate grid columns based on number of activity types
  const gridCols = `grid-cols-[200px_repeat(${sortedActivityTypes.length},1fr)]`;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header Row */}
      <div
        className={`grid ${gridCols} bg-muted border-b`}
        style={{
          gridTemplateColumns: `200px repeat(${sortedActivityTypes.length}, 1fr)`,
        }}
      >
        <div className="p-4 font-semibold border-r border-border">
          {t("activities:care.matrix.horse")}
        </div>
        {sortedActivityTypes.map((type) => (
          <div key={type.id} className="p-4 text-center border-l border-border">
            <div className="text-sm font-medium">
              {translateActivityType(type)}
            </div>
          </div>
        ))}
      </div>

      {/* Data Rows */}
      {horses.map((horse) => (
        <div
          key={horse.id}
          className="grid border-b last:border-b-0"
          style={{
            gridTemplateColumns: `200px repeat(${sortedActivityTypes.length}, 1fr)`,
          }}
        >
          {/* Horse Name Cell */}
          <div className="p-4 flex items-center gap-2 border-r border-border bg-background">
            <span className="font-medium">{horse.name}</span>
            {/* TODO: Add FEI rules indicators */}
          </div>

          {/* Activity Type Cells */}
          {sortedActivityTypes.map((type) => {
            const lastActivity = findLastActivity(
              activities,
              horse.id,
              type.id,
            );
            const nextActivity = findNextActivity(
              activities,
              horse.id,
              type.id,
            );
            return (
              <CareMatrixCell
                key={type.id}
                horseId={horse.id}
                horseName={horse.name}
                activityTypeId={type.id}
                activityTypeName={translateActivityType(type)}
                activityTypeColor={type.color}
                lastActivity={lastActivity}
                nextActivity={nextActivity}
                onClick={(hId, atId, next) => onCellClick(hId, atId, next)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
