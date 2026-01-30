import { useState, useEffect, useMemo, useCallback } from "react";
import type { GroupByOption } from "@/components/activities/GroupedActivityList";
import type { ActivityInstance } from "@equiduty/shared";

const STORAGE_KEY = "activityGroupByPreference";

interface UseGroupedActivitiesOptions {
  defaultGroupBy?: GroupByOption;
  persistPreference?: boolean;
}

interface UseGroupedActivitiesReturn {
  groupBy: GroupByOption;
  setGroupBy: (value: GroupByOption) => void;
  sortedActivities: ActivityInstance[];
}

/**
 * Hook for managing activity grouping state with localStorage persistence
 */
export function useGroupedActivities(
  activities: ActivityInstance[],
  options: UseGroupedActivitiesOptions = {},
): UseGroupedActivitiesReturn {
  const { defaultGroupBy = "date", persistPreference = true } = options;

  // Initialize from localStorage or default
  const [groupBy, setGroupByState] = useState<GroupByOption>(() => {
    if (persistPreference) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (
        saved &&
        ["assignee", "date", "horse", "category", "status"].includes(saved)
      ) {
        return saved as GroupByOption;
      }
    }
    return defaultGroupBy;
  });

  // Persist preference to localStorage
  const setGroupBy = useCallback(
    (value: GroupByOption) => {
      setGroupByState(value);
      if (persistPreference) {
        localStorage.setItem(STORAGE_KEY, value);
      }
    },
    [persistPreference],
  );

  // Sort activities based on groupBy criteria
  const sortedActivities = useMemo(() => {
    const sorted = [...activities];

    switch (groupBy) {
      case "date":
        sorted.sort((a, b) => {
          const dateA = getTimestamp(a.scheduledDate);
          const dateB = getTimestamp(b.scheduledDate);
          return dateA - dateB;
        });
        break;
      case "assignee":
        sorted.sort((a, b) => {
          const nameA = a.assignedToName || "zzz"; // Unassigned last
          const nameB = b.assignedToName || "zzz";
          return nameA.localeCompare(nameB, "sv");
        });
        break;
      case "horse":
        sorted.sort((a, b) => {
          const nameA = a.horseName || (a.appliesToAllHorses ? "All" : "zzz");
          const nameB = b.horseName || (b.appliesToAllHorses ? "All" : "zzz");
          return nameA.localeCompare(nameB, "sv");
        });
        break;
      case "category":
        sorted.sort((a, b) => {
          return (a.category || "other").localeCompare(b.category || "other");
        });
        break;
      case "status":
        const statusOrder = [
          "scheduled",
          "in-progress",
          "missed",
          "completed",
          "cancelled",
          "skipped",
        ];
        sorted.sort((a, b) => {
          const orderA = statusOrder.indexOf(a.status) ?? 999;
          const orderB = statusOrder.indexOf(b.status) ?? 999;
          return orderA - orderB;
        });
        break;
    }

    return sorted;
  }, [activities, groupBy]);

  return {
    groupBy,
    setGroupBy,
    sortedActivities,
  };
}

/**
 * Get timestamp from various date formats
 */
function getTimestamp(date: any): number {
  if (!date) return 0;
  if (typeof date === "number") return date;
  if (date instanceof Date) return date.getTime();
  if (typeof date === "object" && "toDate" in date) {
    return date.toDate().getTime();
  }
  if (typeof date === "object" && "seconds" in date) {
    return date.seconds * 1000;
  }
  if (typeof date === "string") {
    return new Date(date).getTime();
  }
  return 0;
}
