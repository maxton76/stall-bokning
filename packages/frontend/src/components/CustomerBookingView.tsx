/**
 * CustomerBookingView Component
 * Simplified booking interface optimized for horse owners (Persona A)
 * Features: Quick booking, availability grid, personal reservations, facility details
 */

import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Plus,
  Star,
  Clock,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { MyUpcomingReservations } from "@/components/MyUpcomingReservations";
import { QuickBookButton } from "@/components/QuickBookButton";
import { MultiResourceTimelineView } from "@/components/calendar/MultiResourceTimelineView";
import { CALENDAR_DEFAULTS } from "@/components/calendar/constants";
import type { Facility } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import type { Horse } from "@equiduty/shared/types/domain";
import { toDate } from "@/utils/timestampUtils";
import {
  isTimeRangeAvailable,
  getEffectiveTimeBlocks,
  createDefaultSchedule,
} from "@equiduty/shared";

interface CustomerBookingViewProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
  horses: Horse[];
  onCreateReservation: () => void;
  onReservationClick: (reservation: FacilityReservation) => void;
  onQuickBook: (
    facilityId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ) => void;
  userId?: string;
}

export function CustomerBookingView({
  facilities,
  reservations,
  horses,
  onCreateReservation,
  onReservationClick,
  onQuickBook,
  userId,
}: CustomerBookingViewProps) {
  const { t } = useTranslation(["facilities", "common"]);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    null,
  );

  // SSR-safe mobile detection for responsive view switching
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter user's reservations
  const myReservations = useMemo(() => {
    if (!userId) return [];
    return reservations
      .filter((r) => r.userId === userId)
      .sort((a, b) => {
        // Use toDate utility for consistent timestamp handling
        const aTime = toDate(a.startTime)?.getTime() ?? 0;
        const bTime = toDate(b.startTime)?.getTime() ?? 0;
        return aTime - bTime;
      });
  }, [reservations, userId]);

  // Get user's favorite facilities (from localStorage or most frequently booked)
  const favoriteFacilities = useMemo(() => {
    const facilityBookingCounts = new Map<string, number>();
    myReservations.forEach((r) => {
      const count = facilityBookingCounts.get(r.facilityId) || 0;
      facilityBookingCounts.set(r.facilityId, count + 1);
    });

    const sortedFacilities = facilities
      .map((f) => ({
        facility: f,
        bookingCount: facilityBookingCounts.get(f.id) || 0,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 3);

    return sortedFacilities.map((item) => item.facility);
  }, [facilities, myReservations]);

  // Get selected facility details
  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === selectedFacilityId),
    [facilities, selectedFacilityId],
  );

  // Memoize filtered reservations to prevent unnecessary re-renders
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status !== "cancelled"),
    [reservations],
  );

  return (
    <div className="space-y-6">
      {/* Hero Section with Quick Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                {t("facilities:quickBook.title")}
              </CardTitle>
              <CardDescription>
                {t("facilities:views.customerDescription")}
              </CardDescription>
            </div>
            <Button
              onClick={onCreateReservation}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("facilities:reservation.title.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Favorite Facilities Quick Book */}
          {favoriteFacilities.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                {t("facilities:quickBook.favoriteLabel")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {favoriteFacilities.map((facility) => (
                  <QuickBookButton
                    key={facility.id}
                    facility={facility}
                    onQuickBook={onQuickBook}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Calendar or Availability Grid */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isMobile
                  ? t("facilities:availability.showGrid")
                  : t("facilities:calendar.title")}
              </CardTitle>
              <CardDescription>
                {isMobile
                  ? t("facilities:customerView.gridDescription")
                  : t("facilities:customerView.calendarDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                // Mobile: Grid view
                <AvailabilityGrid
                  facilities={facilities}
                  reservations={reservations}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onSlotClick={(facilityId, start, end) => {
                    const startTime = start.toTimeString().slice(0, 5);
                    const endTime = end.toTimeString().slice(0, 5);
                    onQuickBook(facilityId, start, startTime, endTime);
                  }}
                  selectedFacilityId={selectedFacilityId}
                  onFacilitySelect={setSelectedFacilityId}
                />
              ) : (
                // Desktop: Calendar view with drag-to-select
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t("facilities:calendar.dragToSelectHelp")}
                    </AlertDescription>
                  </Alert>

                  <MultiResourceTimelineView
                    facilities={facilities}
                    reservations={activeReservations}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    onReservationClick={onReservationClick}
                    onDateSelect={(facilityId, start, end) => {
                      // Validate facility ID before booking
                      if (!facilityId) {
                        console.warn("No facility selected for booking");
                        toast({
                          variant: "destructive",
                          title: t("common:errors.error"),
                          description: t(
                            "facilities:reservation.validation.facilityRequired",
                          ),
                        });
                        return;
                      }

                      // Find the selected facility
                      const targetFacility = facilities.find(
                        (f) => f.id === facilityId,
                      );
                      if (!targetFacility) {
                        console.warn("Selected facility not found");
                        return;
                      }

                      // Client-side validation: Check if time is within business hours
                      const schedule =
                        targetFacility.availabilitySchedule ||
                        createDefaultSchedule();
                      const effectiveBlocks = getEffectiveTimeBlocks(
                        schedule,
                        start,
                      );

                      const startTime = format(start, "HH:mm");
                      const endTime = format(end, "HH:mm");

                      // Validate the selected time range is available
                      const isAvailable = isTimeRangeAvailable(
                        effectiveBlocks,
                        startTime,
                        endTime,
                      );

                      if (!isAvailable) {
                        toast({
                          variant: "destructive",
                          title: t(
                            "facilities:schedule.enforcement.outsideAvailability",
                          ),
                          description: t(
                            "facilities:schedule.enforcement.outsideAvailabilityWarning",
                          ),
                        });
                        return;
                      }

                      // Proceed with booking
                      onQuickBook(facilityId, start, startTime, endTime);
                    }}
                    editable={true}
                    slotDuration={CALENDAR_DEFAULTS.SLOT_DURATION_MINUTES}
                    slotMinTime={CALENDAR_DEFAULTS.SLOT_MIN_TIME}
                    slotMaxTime={CALENDAR_DEFAULTS.SLOT_MAX_TIME}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Facility Details */}
          {selectedFacility && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedFacility.name}</CardTitle>
                <CardDescription>
                  {t(`constants:facilityTypes.${selectedFacility.type}`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedFacility.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFacility.description}
                  </p>
                )}

                {/* Booking Rules */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t("facilities:form.sections.bookingRules")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {selectedFacility.minTimeSlotDuration && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {t("facilities:bookingRules.minSlotDuration")}:{" "}
                          {selectedFacility.minTimeSlotDuration} min
                        </span>
                      </div>
                    )}
                    {selectedFacility.maxHoursPerReservation && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {t(
                            "facilities:bookingRules.maxDurationPerReservation",
                          )}
                          : {selectedFacility.maxHoursPerReservation}{" "}
                          {t("facilities:bookingRules.durationUnit.hours")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability Times */}
                {selectedFacility.daysAvailable && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      {t("facilities:form.sections.availability")}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedFacility.daysAvailable)
                        .filter(([_, isAvailable]) => isAvailable)
                        .map(([day]) => (
                          <Badge key={day} variant="secondary">
                            {t(`facilities:days.${day}`)}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - My Reservations */}
        <div className="lg:col-span-1">
          <MyUpcomingReservations
            reservations={myReservations}
            onReservationClick={onReservationClick}
          />
        </div>
      </div>
    </div>
  );
}
