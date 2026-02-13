/**
 * UpcomingArrivals Component
 * Shows next 2-4 hours of arrivals with countdown timers
 */

import { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  isAfter,
  isBefore,
  addHours,
  differenceInMinutes,
} from "date-fns";
import { Clock, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";
import { cn } from "@/lib/utils";

interface UpcomingArrivalsProps {
  reservations: FacilityReservation[];
  hoursAhead?: number; // How many hours ahead to show, default 4
}

export function UpcomingArrivals({
  reservations,
  hoursAhead = 4,
}: UpcomingArrivalsProps) {
  const { t } = useTranslation(["facilities", "common"]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for live countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Filter upcoming arrivals
  const upcomingArrivals = useMemo(() => {
    const now = currentTime;
    const futureLimit = addHours(now, hoursAhead);

    return reservations
      .filter((r) => {
        const startTime = toDate(r.startTime);
        if (!startTime) return false;

        return (
          isAfter(startTime, now) &&
          isBefore(startTime, futureLimit) &&
          r.status !== "cancelled"
        );
      })
      .sort((a, b) => {
        const aTime = toDate(a.startTime);
        const bTime = toDate(b.startTime);
        if (!aTime || !bTime) return 0;
        return aTime.getTime() - bTime.getTime();
      })
      .slice(0, 5); // Show next 5 arrivals
  }, [reservations, currentTime, hoursAhead]);

  // Calculate countdown for a reservation
  const getCountdown = (reservation: FacilityReservation) => {
    const startTime = toDate(reservation.startTime);
    if (!startTime) return null;

    const minutes = differenceInMinutes(startTime, currentTime);

    if (minutes < 0) return null;
    if (minutes < 60)
      return t("facilities:operations.countdown", { time: `${minutes} min` });

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return t("facilities:operations.countdown", { time: `${hours}h` });
    }

    return t("facilities:operations.countdown", {
      time: `${hours}h ${remainingMinutes}m`,
    });
  };

  // Check if arrival is very soon (< 15 minutes)
  const isVerySoon = (reservation: FacilityReservation) => {
    const startTime = toDate(reservation.startTime);
    if (!startTime) return false;

    const minutes = differenceInMinutes(startTime, currentTime);
    return minutes > 0 && minutes < 15;
  };

  if (upcomingArrivals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("facilities:operations.upcomingArrivals")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            {t("facilities:operations.noUpcoming")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextArrival = upcomingArrivals[0];
  const nextStartTime = toDate(nextArrival?.startTime);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t("facilities:operations.upcomingArrivals")}
        </CardTitle>
        <CardDescription>
          Next {upcomingArrivals.length} arrival
          {upcomingArrivals.length > 1 ? "s" : ""} in the next {hoursAhead}{" "}
          hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Next Arrival - Prominent Display */}
          {nextArrival && nextStartTime && (
            <div
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                isVerySoon(nextArrival)
                  ? "bg-orange-50 dark:bg-orange-950 border-orange-500"
                  : "bg-primary/5 border-primary",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isVerySoon(nextArrival) && (
                      <AlertCircle className="h-5 w-5 text-orange-600 animate-pulse" />
                    )}
                    <span className="font-semibold text-lg">
                      {t("facilities:operations.nextArrival")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{nextArrival.facilityName}</p>
                    <p className="text-sm">
                      {nextArrival.userFullName || nextArrival.userEmail}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(nextStartTime, "HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-lg font-bold px-3 py-1",
                      isVerySoon(nextArrival) && "bg-orange-500 text-white",
                    )}
                  >
                    {getCountdown(nextArrival)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Remaining Arrivals */}
          {upcomingArrivals.length > 1 && (
            <div className="space-y-2">
              {upcomingArrivals.slice(1).map((reservation) => {
                const startTime = toDate(reservation.startTime);
                if (!startTime) return null;

                return (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {reservation.facilityName}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {reservation.userFullName || reservation.userEmail}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(startTime, "HH:mm")}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {getCountdown(reservation)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
