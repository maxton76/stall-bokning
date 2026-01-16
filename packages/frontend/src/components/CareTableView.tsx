import { CareTableCell } from "./CareTableCell";
import type { ActivityTypeConfig, Activity } from "@/types/activity";

interface CareTableViewProps {
  horses: Array<{ id: string; name: string; feiRules?: string }>;
  activityTypes: ActivityTypeConfig[];
  activities: Activity[];
  onCellClick: (
    horseId: string,
    activityTypeId: string,
    nextActivity?: Activity,
  ) => void;
}

export function CareTableView({
  horses,
  activityTypes,
  activities,
  onCellClick,
}: CareTableViewProps) {
  const careTypes = activityTypes
    .filter((t) => t.category === "Care")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Find last COMPLETED activity
  const findLastActivity = (horseId: string, typeId: string) => {
    return activities
      .filter(
        (a) =>
          a.horseId === horseId &&
          a.activityTypeConfigId === typeId &&
          a.status === "completed",
      )
      .sort((a, b) => b.date.toMillis() - a.date.toMillis())[0];
  };

  // Find next PENDING activity
  const findNextActivity = (horseId: string, typeId: string) => {
    return activities
      .filter(
        (a) =>
          a.horseId === horseId &&
          a.activityTypeConfigId === typeId &&
          a.status !== "completed",
      )
      .sort((a, b) => a.date.toMillis() - b.date.toMillis())[0];
  };

  if (horses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No horses found for this stable
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-sm font-medium">
                  Horse
                </th>
                {careTypes.map((type) => (
                  <th
                    key={type.id}
                    className="px-2 py-3 text-center text-sm font-medium"
                  >
                    <div className="whitespace-nowrap">{type.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {horses.map((horse) => (
                <tr
                  key={horse.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-background px-4 py-2 whitespace-nowrap font-medium">
                    {horse.name}
                    {horse.feiRules && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {horse.feiRules}
                      </span>
                    )}
                  </td>
                  {careTypes.map((type) => {
                    const nextActivity = findNextActivity(horse.id, type.id);
                    return (
                      <td key={type.id} className="p-0">
                        <CareTableCell
                          horseId={horse.id}
                          horseName={horse.name}
                          activityTypeId={type.id}
                          activityType={type}
                          lastActivity={findLastActivity(horse.id, type.id)}
                          nextActivity={nextActivity}
                          onClick={(hId, atId, next) =>
                            onCellClick(hId, atId, next)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
