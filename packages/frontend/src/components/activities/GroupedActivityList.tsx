import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import type {
  ActivityInstance,
  ActivityInstanceStatus,
} from "@equiduty/shared";
import { ProgressBadge } from "./ProgressIndicator";

export type GroupByOption =
  | "assignee"
  | "date"
  | "horse"
  | "category"
  | "status";

interface GroupedActivityListProps {
  activities: ActivityInstance[];
  groupBy: GroupByOption;
  onGroupByChange: (groupBy: GroupByOption) => void;
  onActivityClick?: (activity: ActivityInstance) => void;
  className?: string;
}

interface ActivityGroup {
  key: string;
  label: string;
  icon?: React.ReactNode;
  activities: ActivityInstance[];
  completedCount: number;
}

/**
 * Group activities by the selected criteria
 */
function groupActivities(
  activities: ActivityInstance[],
  groupBy: GroupByOption,
  t: (key: string) => string,
  locale: string = "sv-SE",
): ActivityGroup[] {
  const groups = new Map<string, ActivityInstance[]>();

  for (const activity of activities) {
    let key: string;
    switch (groupBy) {
      case "assignee":
        key = activity.assignedTo || "unassigned";
        break;
      case "date":
        key = activity.scheduledDate
          ? (new Date(
              typeof activity.scheduledDate === "object" &&
                "toDate" in activity.scheduledDate
                ? (activity.scheduledDate as any).toDate()
                : activity.scheduledDate,
            )
              .toISOString()
              .split("T")[0] ?? "unknown")
          : "unknown";
        break;
      case "horse":
        key =
          activity.horseId || (activity.appliesToAllHorses ? "all" : "none");
        break;
      case "category":
        key = activity.category || "other";
        break;
      case "status":
        key = activity.status || "unknown";
        break;
      default:
        key = "unknown";
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(activity);
  }

  // Convert to array and add labels
  return Array.from(groups.entries())
    .map(([key, items]) => {
      let label: string;
      let icon: React.ReactNode;

      switch (groupBy) {
        case "assignee":
          label =
            key === "unassigned"
              ? t("activities:groups.unassigned")
              : items[0]?.assignedToName || key;
          icon = <User className="h-4 w-4" />;
          break;
        case "date":
          const date = new Date(key);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          if (date.toDateString() === today.toDateString()) {
            label = t("common:dates.today");
          } else if (date.toDateString() === tomorrow.toDateString()) {
            label = t("common:dates.tomorrow");
          } else {
            label = date.toLocaleDateString(locale, {
              weekday: "long",
              month: "short",
              day: "numeric",
            });
          }
          icon = <Calendar className="h-4 w-4" />;
          break;
        case "horse":
          label =
            key === "all"
              ? t("activities:groups.allHorses")
              : key === "none"
                ? t("activities:groups.noHorse")
                : items[0]?.horseName || key;
          icon = (
            <span
              className="text-base"
              role="img"
              aria-label={t("common:labels.horse") || "Horse"}
            >
              🐴
            </span>
          );
          break;
        case "category":
          label = t(`recurrence.categories.${key}`);
          icon = getCategoryIcon(key);
          break;
        case "status":
          label = t(`activities:status.${key}`);
          icon = getStatusIcon(key as ActivityInstanceStatus);
          break;
        default:
          label = key;
      }

      return {
        key,
        label,
        icon,
        activities: items,
        completedCount: items.filter((a) => a.status === "completed").length,
      };
    })
    .sort((a, b) => {
      // Sort by date if grouping by date
      if (groupBy === "date") {
        return a.key.localeCompare(b.key);
      }
      // Sort unassigned to end if grouping by assignee
      if (groupBy === "assignee") {
        if (a.key === "unassigned") return 1;
        if (b.key === "unassigned") return -1;
      }
      // Sort by count (more items first)
      return b.activities.length - a.activities.length;
    });
}

function getCategoryIcon(category: string): React.ReactNode {
  const icons: Record<string, { emoji: string; label: string }> = {
    feeding: { emoji: "🍽️", label: "Feeding" },
    mucking: { emoji: "🧹", label: "Mucking" },
    turnout: { emoji: "🏞️", label: "Turnout" },
    "bring-in": { emoji: "🐴", label: "Bring in" },
    health: { emoji: "💉", label: "Health" },
    grooming: { emoji: "✨", label: "Grooming" },
    cleaning: { emoji: "🧼", label: "Cleaning" },
    water: { emoji: "💧", label: "Water" },
    hay: { emoji: "🌾", label: "Hay" },
    other: { emoji: "📋", label: "Other" },
  };
  const iconData = icons[category] ??
    icons.other ?? { emoji: "📋", label: "Other" };
  return (
    <span className="text-base" role="img" aria-label={iconData.label}>
      {iconData.emoji}
    </span>
  );
}

function getStatusIcon(status: ActivityInstanceStatus): React.ReactNode {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "scheduled":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "in-progress":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "missed":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
    case "skipped":
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getStatusColor(status: ActivityInstanceStatus): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "in-progress":
      return "bg-yellow-100 text-yellow-800";
    case "missed":
      return "bg-red-100 text-red-800";
    case "cancelled":
    case "skipped":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function GroupedActivityList({
  activities,
  groupBy,
  onGroupByChange,
  onActivityClick,
  className,
}: GroupedActivityListProps) {
  const { t, i18n } = useTranslation(["activities", "common", "recurrence"]);
  // Map i18n language code to locale for date formatting
  const locale = i18n.language === "sv" ? "sv-SE" : "en-US";
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Load from localStorage with validation to prevent XSS
    try {
      const saved = localStorage.getItem("activityGroupsExpanded");
      if (!saved) return new Set<string>();

      const parsed = JSON.parse(saved);
      // Validate that parsed data is an array of strings
      if (!Array.isArray(parsed)) return new Set<string>();
      // Filter to ensure all items are strings (prevent prototype pollution)
      const validStrings = parsed.filter(
        (item): item is string => typeof item === "string",
      );
      return new Set(validStrings);
    } catch {
      // If parsing fails, return empty set and clear corrupted data
      localStorage.removeItem("activityGroupsExpanded");
      return new Set<string>();
    }
  });

  const groups = useMemo(
    () => groupActivities(activities, groupBy, t, locale),
    [activities, groupBy, t, locale],
  );

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      // Save to localStorage
      localStorage.setItem("activityGroupsExpanded", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allKeys = new Set(groups.map((g) => g.key));
    setExpandedGroups(allKeys);
    localStorage.setItem(
      "activityGroupsExpanded",
      JSON.stringify([...allKeys]),
    );
  }, [groups]);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
    localStorage.setItem("activityGroupsExpanded", JSON.stringify([]));
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={groupBy}
            onValueChange={(v) => onGroupByChange(v as GroupByOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assignee">
                {t("activities:filters.groupBy.assignee")}
              </SelectItem>
              <SelectItem value="date">
                {t("activities:filters.groupBy.date")}
              </SelectItem>
              <SelectItem value="horse">
                {t("activities:filters.groupBy.horse")}
              </SelectItem>
              <SelectItem value="category">
                {t("activities:filters.groupBy.category")}
              </SelectItem>
              <SelectItem value="status">
                {t("activities:filters.groupBy.status")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            {t("common:actions.expandAll")}
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            {t("common:actions.collapseAll")}
          </Button>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          const progress =
            group.activities.length > 0
              ? Math.round(
                  (group.completedCount / group.activities.length) * 100,
                )
              : 0;

          return (
            <Collapsible
              key={group.key}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.key)}
            >
              <CollapsibleTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                    "bg-card border hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    {group.icon}
                    <span className="font-medium">{group.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {group.activities.length}
                    </Badge>
                  </div>
                  <ProgressBadge
                    value={progress}
                    displayText={`${group.completedCount}/${group.activities.length}`}
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="pl-6 pt-2 space-y-1">
                  {group.activities.map((activity) => (
                    <ActivityListItem
                      key={activity.id}
                      activity={activity}
                      onClick={() => onActivityClick?.(activity)}
                      groupBy={groupBy}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("activities:empty.noActivities")}
        </div>
      )}
    </div>
  );
}

/**
 * Single activity item in the list
 */
interface ActivityListItemProps {
  activity: ActivityInstance;
  onClick?: () => void;
  groupBy: GroupByOption;
}

function ActivityListItem({
  activity,
  onClick,
  groupBy,
}: ActivityListItemProps) {
  const { t } = useTranslation(["activities"]);

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
        "hover:bg-muted/50",
        activity.status === "completed" && "opacity-60",
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        {getStatusIcon(activity.status)}
        <div className="min-w-0">
          <div className="font-medium truncate">{activity.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{activity.scheduledTime}</span>
            {groupBy !== "horse" && activity.horseName && (
              <>
                <span>•</span>
                <span>{activity.horseName}</span>
              </>
            )}
            {groupBy !== "assignee" && activity.assignedToName && (
              <>
                <span>•</span>
                <span>{activity.assignedToName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activity.progress &&
          activity.progress.value > 0 &&
          activity.progress.value < 100 && (
            <ProgressBadge value={activity.progress.value} />
          )}
        <Badge className={cn("text-xs", getStatusColor(activity.status))}>
          {t(`activities:status.${activity.status}`)}
        </Badge>
      </div>
    </div>
  );
}

/**
 * GroupSelector component for use in toolbars
 */
interface GroupSelectorProps {
  value: GroupByOption;
  onChange: (value: GroupByOption) => void;
  className?: string;
}

export function GroupSelector({
  value,
  onChange,
  className,
}: GroupSelectorProps) {
  const { t } = useTranslation(["activities"]);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as GroupByOption)}>
      <SelectTrigger className={cn("w-[180px]", className)}>
        <SelectValue placeholder={t("activities:filters.groupBy.label")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="assignee">
          {t("activities:filters.groupBy.assignee")}
        </SelectItem>
        <SelectItem value="date">
          {t("activities:filters.groupBy.date")}
        </SelectItem>
        <SelectItem value="horse">
          {t("activities:filters.groupBy.horse")}
        </SelectItem>
        <SelectItem value="category">
          {t("activities:filters.groupBy.category")}
        </SelectItem>
        <SelectItem value="status">
          {t("activities:filters.groupBy.status")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
