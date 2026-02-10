import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Loader2Icon,
  ChevronDown,
  ChevronUp,
  User,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import type { Horse } from "@/types/roles";
import type { HorseActivityHistoryEntry, RoutineCategory } from "@shared/types";
import {
  useHorseActivityHistory,
  flattenActivities,
  getCategoryInfo,
} from "@/hooks/useHorseActivityHistory";
import { toDate } from "@/utils/timestampUtils";

interface RoutineHistoryCardProps {
  horse: Horse;
}

const CATEGORY_OPTIONS: { value: RoutineCategory | "all"; labelKey: string }[] =
  [
    { value: "all", labelKey: "horses:routineHistory.filters.allCategories" },
    { value: "feeding", labelKey: "routines:categories.feeding" },
    { value: "medication", labelKey: "routines:categories.medication" },
    { value: "blanket", labelKey: "routines:categories.blanket" },
    { value: "turnout", labelKey: "routines:categories.turnout" },
    { value: "bring_in", labelKey: "routines:categories.bring_in" },
    { value: "mucking", labelKey: "routines:categories.mucking" },
    { value: "water", labelKey: "routines:categories.water" },
    { value: "health_check", labelKey: "routines:categories.health_check" },
  ];

const DATE_RANGE_OPTIONS = [
  { value: "7", labelKey: "horses:routineHistory.filters.last7Days" },
  { value: "30", labelKey: "horses:routineHistory.filters.last30Days" },
  { value: "all", labelKey: "horses:routineHistory.filters.allTime" },
];

export function RoutineHistoryCard({ horse }: RoutineHistoryCardProps) {
  const { t, i18n } = useTranslation(["horses", "routines", "common"]);
  const dateLocale = i18n.language === "sv" ? sv : enUS;

  const [categoryFilter, setCategoryFilter] = useState<RoutineCategory | "all">(
    "all",
  );
  const [dateRange, setDateRange] = useState<string>("30");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    urls: string[];
    index: number;
  } | null>(null);

  // Calculate start date based on range - memoized to prevent query key changes
  const startDate = useMemo(() => {
    if (dateRange === "all") return undefined;
    // Use start of day to ensure stable value within same day
    const date = subDays(new Date(), parseInt(dateRange));
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }, [dateRange]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useHorseActivityHistory(horse.id, {
    category: categoryFilter === "all" ? undefined : categoryFilter,
    startDate,
    limit: 20,
  });

  const activities = flattenActivities(data);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderActivityDetails = (activity: HorseActivityHistoryEntry) => {
    const details: React.ReactNode[] = [];

    // Feeding snapshot
    if (activity.feedingSnapshot) {
      details.push(
        <div key="feeding" className="text-sm space-y-1">
          <p className="font-medium text-muted-foreground">
            {t("horses:routineHistory.snapshot.feeding")}
          </p>
          <p>
            {activity.feedingSnapshot.instructions.feedTypeName} -{" "}
            {activity.feedingSnapshot.instructions.quantity}{" "}
            {activity.feedingSnapshot.instructions.quantityMeasure}
          </p>
          {activity.feedingSnapshot.instructions.specialInstructions && (
            <p className="text-muted-foreground italic">
              {activity.feedingSnapshot.instructions.specialInstructions}
            </p>
          )}
        </div>,
      );
    }

    // Medication snapshot
    if (activity.medicationSnapshot) {
      details.push(
        <div key="medication" className="text-sm space-y-1">
          <p className="font-medium text-muted-foreground">
            {t("horses:routineHistory.snapshot.medication")}
          </p>
          <p>
            {activity.medicationSnapshot.instructions.medicationName} -{" "}
            {activity.medicationSnapshot.instructions.dosage}
          </p>
          {activity.medicationSnapshot.instructions.notes && (
            <p className="text-muted-foreground italic">
              {activity.medicationSnapshot.instructions.notes}
            </p>
          )}
          <Badge
            variant={
              activity.medicationSnapshot.given ? "default" : "destructive"
            }
          >
            {activity.medicationSnapshot.given
              ? t("common:status.given")
              : t("common:status.skipped")}
          </Badge>
        </div>,
      );
    }

    // Blanket snapshot
    if (activity.blanketSnapshot) {
      details.push(
        <div key="blanket" className="text-sm space-y-1">
          <p className="font-medium text-muted-foreground">
            {t("horses:routineHistory.snapshot.blanket")}
          </p>
          <p>
            {activity.blanketSnapshot.instructions.currentBlanket &&
              `${t("common:current")}: ${activity.blanketSnapshot.instructions.currentBlanket}`}
          </p>
          <Badge variant="outline">
            {activity.blanketSnapshot.action === "on" && t("common:on")}
            {activity.blanketSnapshot.action === "off" && t("common:off")}
            {activity.blanketSnapshot.action === "unchanged" &&
              t("common:unchanged")}
          </Badge>
        </div>,
      );
    }

    // Notes
    if (activity.notes) {
      details.push(
        <div key="notes" className="text-sm space-y-1">
          <p className="font-medium text-muted-foreground">
            {t("common:notes")}
          </p>
          <p className="italic">{activity.notes}</p>
        </div>,
      );
    }

    // Photos
    if (activity.photoUrls && activity.photoUrls.length > 0) {
      details.push(
        <div key="photos" className="text-sm space-y-2">
          <p className="font-medium text-muted-foreground">
            📷{" "}
            {t("horses:routineHistory.photos", {
              count: activity.photoUrls.length,
            })}
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {activity.photoUrls.map((url, i) => (
              <button
                key={i}
                onClick={() =>
                  setSelectedPhoto({ url, urls: activity.photoUrls!, index: i })
                }
                className="shrink-0 rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
              >
                <img
                  src={url}
                  alt=""
                  className="w-20 h-20 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>,
      );
    }

    // Skip reason
    if (activity.skipReason) {
      details.push(
        <div key="skipReason" className="text-sm space-y-1">
          <p className="font-medium text-muted-foreground">
            {t("horses:routineHistory.skipReason")}
          </p>
          <p className="text-destructive italic">{activity.skipReason}</p>
        </div>,
      );
    }

    return details.length > 0 ? (
      <div className="mt-3 pt-3 border-t space-y-3">{details}</div>
    ) : null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("horses:routineHistory.title")}</CardTitle>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t("horses:routineHistory.description")}
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Select
            value={categoryFilter}
            onValueChange={(value) =>
              setCategoryFilter(value as RoutineCategory | "all")
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">
              {t("common:errors.loadFailed")}
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {t("horses:routineHistory.noActivities")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const categoryInfo = getCategoryInfo(activity.category);
              const executedAt = toDate(activity.executedAt);
              const isExpanded = expandedIds.has(activity.id);

              return (
                <div
                  key={activity.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{categoryInfo.icon}</span>
                        <span className="font-medium truncate">
                          {activity.stepName}
                        </span>
                        <Badge
                          variant={
                            activity.executionStatus === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            activity.executionStatus === "skipped"
                              ? "bg-amber-100 text-amber-800"
                              : ""
                          }
                        >
                          {activity.executionStatus === "completed" ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {t(
                            `horses:routineHistory.status.${activity.executionStatus || "unknown"}`,
                          )}
                        </Badge>
                        {activity.photoUrls &&
                          activity.photoUrls.length > 0 && (
                            <span
                              title={t("horses:routineHistory.hasPhotos")}
                              className="text-sm"
                            >
                              📷
                            </span>
                          )}
                        {activity.notes && (
                          <span
                            title={t("horses:routineHistory.hasNotes")}
                            className="text-sm"
                          >
                            📝
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {executedAt
                            ? format(executedAt, "d MMM yyyy, HH:mm", {
                                locale: dateLocale,
                              })
                            : "-"}
                        </span>
                        {activity.executedByName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {activity.executedByName}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {activity.routineTemplateName}
                        </Badge>
                      </div>
                    </div>

                    {/* Expand button - only show if there are details */}
                    {(activity.feedingSnapshot ||
                      activity.medicationSnapshot ||
                      activity.blanketSnapshot ||
                      activity.notes ||
                      activity.skipReason ||
                      (activity.photoUrls &&
                        activity.photoUrls.length > 0)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(activity.id)}
                        className="shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && renderActivityDetails(activity)}
                </div>
              );
            })}

            {/* Load more button */}
            {hasNextPage && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {t("horses:routineHistory.loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.url}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
            >
              ✕
            </button>
            {selectedPhoto.urls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  onClick={() => {
                    const prev =
                      (selectedPhoto.index - 1 + selectedPhoto.urls.length) %
                      selectedPhoto.urls.length;
                    const prevUrl = selectedPhoto.urls[prev];
                    if (prevUrl) {
                      setSelectedPhoto({
                        ...selectedPhoto,
                        url: prevUrl,
                        index: prev,
                      });
                    }
                  }}
                  className="bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
                >
                  ‹
                </button>
                <span className="bg-black/50 text-white rounded-full px-3 py-1 text-sm">
                  {selectedPhoto.index + 1} / {selectedPhoto.urls.length}
                </span>
                <button
                  onClick={() => {
                    const next =
                      (selectedPhoto.index + 1) % selectedPhoto.urls.length;
                    const nextUrl = selectedPhoto.urls[next];
                    if (nextUrl) {
                      setSelectedPhoto({
                        ...selectedPhoto,
                        url: nextUrl,
                        index: next,
                      });
                    }
                  }}
                  className="bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
