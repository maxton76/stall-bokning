/**
 * MyUpcomingReservations Component
 * Card-based display of user's upcoming facility reservations
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { Calendar, Clock, MapPin, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";
import { STATUS_COLORS } from "@/constants/facilityConstants";
import { cn } from "@/lib/utils";

interface MyUpcomingReservationsProps {
  reservations: FacilityReservation[];
  onReservationClick: (reservation: FacilityReservation) => void;
  maxItems?: number;
}

export function MyUpcomingReservations({
  reservations,
  onReservationClick,
  maxItems = 10,
}: MyUpcomingReservationsProps) {
  const { t } = useTranslation(["facilities", "common", "constants"]);

  // Filter and sort upcoming reservations
  const upcomingReservations = useMemo(() => {
    const now = new Date();
    const futureLimit = addDays(now, 30); // Show next 30 days

    return reservations
      .filter((r) => {
        const startTime = toDate(r.startTime);
        if (!startTime) return false;

        // Show upcoming and in-progress (started but not ended)
        const endTime = toDate(r.endTime);
        const isUpcoming = isAfter(startTime, now);
        const isInProgress =
          isBefore(startTime, now) && endTime && isAfter(endTime, now);

        return (
          (isUpcoming || isInProgress) &&
          isBefore(startTime, futureLimit) &&
          r.status !== "cancelled" &&
          r.status !== "completed"
        );
      })
      .sort((a, b) => {
        const aTime = toDate(a.startTime);
        const bTime = toDate(b.startTime);
        if (!aTime || !bTime) return 0;
        return aTime.getTime() - bTime.getTime();
      })
      .slice(0, maxItems);
  }, [reservations, maxItems]);

  // Group by date
  const groupedReservations = useMemo(() => {
    const groups = new Map<string, FacilityReservation[]>();

    upcomingReservations.forEach((reservation) => {
      const startTime = toDate(reservation.startTime);
      if (!startTime) return;

      const dateKey = format(startTime, "yyyy-MM-dd");
      const existing = groups.get(dateKey) || [];
      groups.set(dateKey, [...existing, reservation]);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [upcomingReservations]);

  // Check if reservation is starting soon (within next 2 hours)
  const isStartingSoon = (reservation: FacilityReservation) => {
    const startTime = toDate(reservation.startTime);
    if (!startTime) return false;

    const now = new Date();
    const twoHoursFromNow = addDays(now, 0);
    twoHoursFromNow.setHours(now.getHours() + 2);

    return isAfter(startTime, now) && isBefore(startTime, twoHoursFromNow);
  };

  // Check if reservation is in progress
  const isInProgress = (reservation: FacilityReservation) => {
    const startTime = toDate(reservation.startTime);
    const endTime = toDate(reservation.endTime);
    if (!startTime || !endTime) return false;

    const now = new Date();
    return isBefore(startTime, now) && isAfter(endTime, now);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t("facilities:myReservations.title")}
        </CardTitle>
        <CardDescription>
          {upcomingReservations.length > 0
            ? t("facilities:reservations.reservationsFound", {
                count: upcomingReservations.length,
              })
            : t("facilities:myReservations.noUpcomingReservations")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingReservations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t("facilities:myReservations.noUpcomingReservations")}</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {groupedReservations.map(([dateKey, dateReservations]) => {
                const firstReservation = dateReservations[0];
                const startTime = toDate(firstReservation?.startTime);
                if (!startTime) return null;

                return (
                  <div key={dateKey} className="space-y-3">
                    {/* Date Header */}
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(startTime, "EEEE, MMMM d, yyyy")}</span>
                    </div>

                    {/* Reservations for this date */}
                    <div className="space-y-2">
                      {dateReservations.map((reservation) => {
                        const resStartTime = toDate(reservation.startTime);
                        const resEndTime = toDate(reservation.endTime);
                        const startsSoon = isStartingSoon(reservation);
                        const inProgress = isInProgress(reservation);

                        return (
                          <button
                            key={reservation.id}
                            onClick={() => onReservationClick(reservation)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-all",
                              "hover:shadow-md hover:border-primary/50",
                              "focus:outline-none focus:ring-2 focus:ring-primary",
                              inProgress && "bg-primary/5 border-primary",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Facility Name */}
                                <h4 className="font-medium text-sm truncate">
                                  {reservation.facilityName}
                                </h4>

                                {/* Time */}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>
                                    {resStartTime &&
                                      resEndTime &&
                                      `${format(resStartTime, "HH:mm")} - ${format(resEndTime, "HH:mm")}`}
                                  </span>
                                </div>

                                {/* Facility Type */}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>
                                    {t(
                                      `constants:facilityTypes.${reservation.facilityType}`,
                                    )}
                                  </span>
                                </div>

                                {/* Warnings */}
                                {startsSoon && (
                                  <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 mt-2">
                                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>
                                      {t("facilities:operations.nextArrival")}
                                    </span>
                                  </div>
                                )}

                                {inProgress && (
                                  <div className="flex items-center gap-1.5 text-xs text-primary mt-2 font-medium">
                                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>
                                      {t("facilities:operations.inProgress")}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Status Badge */}
                              <Badge
                                className={cn(
                                  "shrink-0",
                                  STATUS_COLORS[reservation.status],
                                )}
                              >
                                {t(
                                  `constants:reservationStatus.${reservation.status}`,
                                )}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
