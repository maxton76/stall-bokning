/**
 * TodayScheduleView Component
 * Operations-focused view for schedule managers (Persona C)
 * Shows today's bookings with quick status updates and preparation notes
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, isToday, isBefore, isAfter, addHours } from "date-fns";
import { Calendar, Clock, Printer } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UpcomingArrivals } from "@/components/UpcomingArrivals";
import { QuickStatusUpdate } from "@/components/QuickStatusUpdate";
import { FacilityPreparationNotes } from "@/components/FacilityPreparationNotes";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import { toDate } from "@/utils/timestampUtils";
import { cn } from "@/lib/utils";

interface TodayScheduleViewProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
  onStatusUpdate: (
    reservationId: string,
    status: "completed" | "no_show",
  ) => void;
  onReservationClick: (reservation: FacilityReservation) => void;
}

export function TodayScheduleView({
  facilities,
  reservations,
  onStatusUpdate,
  onReservationClick,
}: TodayScheduleViewProps) {
  const { t } = useTranslation(["facilities", "common", "constants"]);

  // Filter today's reservations
  const todaysReservations = useMemo(() => {
    return reservations
      .filter((r) => {
        const startTime = toDate(r.startTime);
        return startTime && isToday(startTime);
      })
      .sort((a, b) => {
        const aTime = toDate(a.startTime);
        const bTime = toDate(b.startTime);
        if (!aTime || !bTime) return 0;
        return aTime.getTime() - bTime.getTime();
      });
  }, [reservations]);

  // Group reservations by facility
  const reservationsByFacility = useMemo(() => {
    const groups = new Map<string, FacilityReservation[]>();

    todaysReservations.forEach((reservation) => {
      const existing = groups.get(reservation.facilityId) || [];
      groups.set(reservation.facilityId, [...existing, reservation]);
    });

    return groups;
  }, [todaysReservations]);

  // Check if reservation is currently in progress
  const isInProgress = (reservation: FacilityReservation) => {
    const startTime = toDate(reservation.startTime);
    const endTime = toDate(reservation.endTime);
    if (!startTime || !endTime) return false;

    const now = new Date();
    return isBefore(startTime, now) && isAfter(endTime, now);
  };

  // Check if reservation is upcoming (within next hour)
  const isUpcomingSoon = (reservation: FacilityReservation) => {
    const startTime = toDate(reservation.startTime);
    if (!startTime) return false;

    const now = new Date();
    const oneHourFromNow = addHours(now, 1);

    return isAfter(startTime, now) && isBefore(startTime, oneHourFromNow);
  };

  // Handle print schedule
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            {t("facilities:operations.todaySchedule")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          {t("facilities:operations.printSchedule")}
        </Button>
      </div>

      {/* Upcoming Arrivals Widget */}
      <UpcomingArrivals reservations={todaysReservations} />

      {/* Today's Schedule by Facility */}
      <div className="grid gap-6">
        {todaysReservations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-lg font-medium">
                {t("facilities:operations.noBookingsToday")}
              </p>
            </CardContent>
          </Card>
        ) : (
          Array.from(reservationsByFacility.entries()).map(
            ([facilityId, facilityReservations]) => {
              const facility = facilities.find((f) => f.id === facilityId);
              if (!facility) return null;

              return (
                <Card key={facilityId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {facility.name}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({facilityReservations.length}{" "}
                        {t("facilities:page.reservationsTitle").toLowerCase()})
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {t(`constants:facilityTypes.${facility.type}`)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {facilityReservations.map((reservation) => {
                          const startTime = toDate(reservation.startTime);
                          const endTime = toDate(reservation.endTime);
                          const inProgress = isInProgress(reservation);
                          const upcomingSoon = isUpcomingSoon(reservation);

                          return (
                            <div
                              key={reservation.id}
                              className={cn(
                                "p-4 rounded-lg border transition-all",
                                inProgress && "bg-primary/10 border-primary",
                                upcomingSoon &&
                                  "bg-orange-50 dark:bg-orange-950 border-orange-300",
                              )}
                            >
                              <div className="flex items-start justify-between gap-4">
                                {/* Left: Reservation Details */}
                                <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() =>
                                    onReservationClick(reservation)
                                  }
                                >
                                  {/* Time */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock
                                      className={cn(
                                        "h-4 w-4",
                                        inProgress && "text-primary",
                                        upcomingSoon && "text-orange-600",
                                      )}
                                    />
                                    <span className="font-medium">
                                      {startTime &&
                                        endTime &&
                                        `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`}
                                    </span>
                                    {inProgress && (
                                      <span className="text-xs text-primary font-medium">
                                        {t("facilities:operations.inProgress")}
                                      </span>
                                    )}
                                    {upcomingSoon && (
                                      <span className="text-xs text-orange-600 font-medium">
                                        {t("facilities:operations.nextArrival")}
                                      </span>
                                    )}
                                  </div>

                                  {/* User Info */}
                                  <div className="text-sm space-y-1">
                                    <p className="font-medium">
                                      {reservation.userFullName ||
                                        reservation.userEmail}
                                    </p>
                                    {reservation.contactInfo && (
                                      <p className="text-muted-foreground">
                                        {reservation.contactInfo}
                                      </p>
                                    )}
                                    {reservation.notes && (
                                      <p className="text-muted-foreground italic">
                                        {reservation.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Quick Actions */}
                                <div className="flex flex-col gap-2">
                                  <QuickStatusUpdate
                                    reservation={reservation}
                                    onStatusUpdate={onStatusUpdate}
                                  />
                                </div>
                              </div>

                              {/* Preparation Notes */}
                              <FacilityPreparationNotes
                                facility={facility}
                                reservation={reservation}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            },
          )
        )}
      </div>
    </div>
  );
}
