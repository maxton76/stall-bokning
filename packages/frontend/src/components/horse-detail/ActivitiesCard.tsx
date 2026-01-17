import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Loader2Icon } from "lucide-react";
import { format, isPast } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getHorseActivities } from "@/services/activityService";
import { queryKeys } from "@/lib/queryClient";
import type { Horse } from "@/types/roles";
import type { Activity } from "@/types/activity";
import { toDate } from "@/utils/timestampUtils";

interface ActivitiesCardProps {
  horse: Horse;
}

export function ActivitiesCard({ horse }: ActivitiesCardProps) {
  const { t } = useTranslation(["horses", "common"]);

  // Fetch activities with TanStack Query
  const {
    data: activities = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: queryKeys.activities.list({ horseId: horse.id, limit: 10 }),
    queryFn: () => getHorseActivities(horse.id, 10),
    enabled: !!horse.id,
    staleTime: 3 * 60 * 1000, // 3 minutes - activities change more frequently
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle query error
  if (error) {
    console.error("Failed to load activities:", error);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("horses:detail.activities.title")}</CardTitle>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/activities/care?horseId=${horse.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("horses:detail.activities.viewAll")}
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {t("horses:detail.activities.noActivities")}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View - hidden on mobile */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("horses:detail.activities.date")}</TableHead>
                    <TableHead>
                      {t("horses:detail.activities.activityType")}
                    </TableHead>
                    <TableHead>
                      {t("horses:detail.activities.statusColumn")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => {
                    const activityDate = toDate(activity.date);
                    const isOverdue =
                      activityDate &&
                      isPast(activityDate) &&
                      activity.status === "pending";

                    return (
                      <TableRow
                        key={activity.id}
                        className={isOverdue ? "bg-destructive/5" : ""}
                      >
                        <TableCell>
                          <span
                            className={`${
                              isOverdue ? "text-destructive font-medium" : ""
                            }`}
                          >
                            {activityDate
                              ? format(activityDate, "MMM d, yyyy")
                              : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">
                            {activity.activityType?.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              activity.status === "completed"
                                ? "default"
                                : isOverdue
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {activity.status === "completed" &&
                              t("horses:detail.activities.status.completed")}
                            {activity.status === "pending" &&
                              (isOverdue
                                ? t("horses:detail.activities.status.overdue")
                                : t("horses:detail.activities.status.pending"))}
                            {activity.status === "cancelled" &&
                              t("horses:detail.activities.status.cancelled")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View - hidden on desktop */}
            <div className="md:hidden space-y-3">
              {activities.map((activity) => {
                const activityDate = toDate(activity.date);
                const isOverdue =
                  activityDate &&
                  isPast(activityDate) &&
                  activity.status === "pending";

                return (
                  <Card
                    key={activity.id}
                    className={`${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base mb-1 capitalize">
                            {activity.activityType?.replace("_", " ")}
                          </h3>
                          <p
                            className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                          >
                            {activityDate
                              ? format(activityDate, "MMM d, yyyy")
                              : "N/A"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            activity.status === "completed"
                              ? "default"
                              : isOverdue
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {activity.status === "completed" &&
                            t("horses:detail.activities.status.completed")}
                          {activity.status === "pending" &&
                            (isOverdue
                              ? t("horses:detail.activities.status.overdue")
                              : t("horses:detail.activities.status.pending"))}
                          {activity.status === "cancelled" &&
                            t("horses:detail.activities.status.cancelled")}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {activities.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t("horses:detail.activities.showingCount", {
                count: activities.length,
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
