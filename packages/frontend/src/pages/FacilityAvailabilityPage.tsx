import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Info,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { useToast } from "@/hooks/use-toast";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import { getFacility } from "@/services/facilityService";
import {
  getReservationsByFacility,
  createReservation,
  updateReservation,
  cancelReservation,
} from "@/services/facilityReservationService";
import { getUserHorsesAtStable } from "@/services/horseService";
import { FacilityCalendarView } from "@/components/FacilityCalendarView";
import { FacilityReservationDialog } from "@/components/FacilityReservationDialog";
import type { Facility, FacilityType } from "@/types/facility";
import type { FacilityReservation } from "@/types/facilityReservation";
import type { Horse } from "@stall-bokning/shared/types/domain";
import { getWeekNumber } from "@stall-bokning/shared";

export default function FacilityAvailabilityPage() {
  const { t } = useTranslation(["facilities", "common", "constants"]);
  const { facilityId } = useParams<{ facilityId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  // Helper function to get translated facility type
  const getFacilityTypeLabel = (type: FacilityType) =>
    t(`constants:facilityTypes.${type}`);
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dialogInitialValues, setDialogInitialValues] = useState<{
    facilityId?: string;
    date?: Date;
    startTime?: string;
    endTime?: string;
  }>();
  const reservationDialog = useDialog<FacilityReservation>();

  // Load facility details
  const facilityQuery = useApiQuery<Facility | null>(
    queryKeys.facilities.detail(facilityId || ""),
    () => getFacility(facilityId!),
    {
      enabled: !!facilityId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const facilityData = facilityQuery.data ?? null;
  const facilityLoading = facilityQuery.isLoading;

  // Load reservations for this facility
  const reservationsQuery = useApiQuery<FacilityReservation[]>(
    queryKeys.facilityReservations.byFacility(facilityId || ""),
    () => getReservationsByFacility(facilityId!),
    {
      enabled: !!facilityId,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );
  const reservationsData = reservationsQuery.data ?? [];
  const reservationsLoading = reservationsQuery.isLoading;

  // Load user's horses at the stable
  const horsesQuery = useApiQuery<Horse[]>(
    queryKeys.horses.list({
      stableId: facilityData?.stableId,
      userId: user?.uid,
    }),
    () => getUserHorsesAtStable(user!.uid, facilityData!.stableId),
    {
      enabled: !!facilityData?.stableId && !!user?.uid,
      staleTime: 5 * 60 * 1000,
    },
  );
  const horsesData = horsesQuery.data ?? [];

  // Navigation handlers
  const handleNavigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(new Date());
    } else if (viewMode === "week") {
      setCurrentDate(
        direction === "prev"
          ? subWeeks(currentDate, 1)
          : addWeeks(currentDate, 1),
      );
    } else {
      setCurrentDate(
        direction === "prev"
          ? subDays(currentDate, 1)
          : addDays(currentDate, 1),
      );
    }
  };

  const handleNewReservation = () => {
    setDialogInitialValues({
      facilityId: facilityId,
      date: currentDate,
    });
    reservationDialog.openDialog();
  };

  const handleTimelineSelect = (
    _facilityId: string | undefined,
    start: Date,
    end: Date,
  ) => {
    const startTime = format(start, "HH:mm");
    const endTime = format(end, "HH:mm");

    setDialogInitialValues({
      facilityId: facilityId,
      date: start,
      startTime,
      endTime,
    });
    reservationDialog.openDialog();
  };

  const handleReservationClick = (reservation: FacilityReservation) => {
    // Only allow editing if the user owns the reservation
    if (reservation.userId === user?.uid) {
      setDialogInitialValues(undefined);
      reservationDialog.openDialog(reservation);
    } else {
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.error"),
      });
    }
  };

  /**
   * Shared handler for updating reservation times (used by both drag-drop and resize).
   * Validates ownership before allowing changes.
   */
  const handleReservationTimeUpdate = async (
    reservationId: string,
    newStart: Date,
    newEnd: Date,
    action: "reschedule" | "resize",
  ) => {
    if (!user) return;

    // Check if user owns the reservation
    const reservation = reservationsData?.find((r) => r.id === reservationId);
    if (!reservation || reservation.userId !== user.uid) {
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.error"),
        variant: "destructive",
      });
      await cacheInvalidation.facilityReservations.all();
      return;
    }

    try {
      const updates = {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
      };

      await updateReservation(reservationId, updates, user.uid);

      toast({
        title: t("common:messages.success"),
        description: t("facilities:reservation.messages.updateSuccess"),
      });

      await cacheInvalidation.facilityReservations.all();
    } catch (error) {
      console.error(`Failed to ${action} reservation:`, error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
      await cacheInvalidation.facilityReservations.all();
    }
  };

  const handleEventDrop = (
    reservationId: string,
    newStart: Date,
    newEnd: Date,
  ) =>
    handleReservationTimeUpdate(reservationId, newStart, newEnd, "reschedule");

  const handleEventResize = (
    reservationId: string,
    newStart: Date,
    newEnd: Date,
  ) => handleReservationTimeUpdate(reservationId, newStart, newEnd, "resize");

  const handleSaveReservation = async (data: any) => {
    try {
      if (!user || !facilityData) {
        toast({
          title: t("common:messages.error"),
          description: t("common:messages.loadingFailed"),
          variant: "destructive",
        });
        return;
      }

      // Convert date and time to Timestamp
      const startDateTime = new Date(data.date);
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(data.date);
      const [endHour, endMin] = data.endTime.split(":").map(Number);
      endDateTime.setHours(endHour, endMin, 0, 0);

      const reservationData = {
        facilityId: data.facilityId,
        userId: user.uid,
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        status: "pending" as const,
        horseId: data.horseId || undefined,
        contactInfo: data.contactInfo || undefined,
        notes: data.notes || undefined,
      };

      const denormalizedData = {
        facilityName: facilityData.name,
        facilityType: facilityData.type,
        stableId: facilityData.stableId,
        stableName: facilityData.stableName,
        userEmail: user.email || "",
        userFullName: user.displayName || undefined,
      };

      if (reservationDialog.data) {
        // Update existing reservation
        await updateReservation(
          reservationDialog.data.id,
          reservationData,
          user.uid,
        );
        toast({
          title: t("common:messages.success"),
          description: t("facilities:reservation.messages.updateSuccess"),
        });
      } else {
        // Create new reservation
        await createReservation(reservationData, user.uid, denormalizedData);
        toast({
          title: t("common:messages.success"),
          description: t("facilities:reservation.messages.createSuccess"),
        });
      }

      reservationDialog.closeDialog();
      await cacheInvalidation.facilityReservations.all();
    } catch (error) {
      console.error("Failed to save reservation:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    if (!user) {
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.error"),
        variant: "destructive",
      });
      return;
    }

    try {
      await cancelReservation(reservationId, user.uid);
      toast({
        title: t("common:messages.success"),
        description: t("facilities:reservation.messages.cancelSuccess"),
      });
      reservationDialog.closeDialog();
      await cacheInvalidation.facilityReservations.all();
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.deleteFailed"),
        variant: "destructive",
      });
      throw error;
    }
  };

  // Get current week start for display
  const currentWeekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  );

  if (facilityLoading || reservationsLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:labels.loading")}</p>
      </div>
    );
  }

  if (!facilityData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/my-reservations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common:navigation.myReservations")}
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t("common:messages.loadingFailed")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left side: Back button and navigation */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/my-reservations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("common:navigation.myReservations")}
            </Link>
          </Button>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("today")}
            >
              {t("common:time.today")}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleNavigate("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleNavigate("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-xl font-semibold">
              {format(currentWeekStart, "MMMM yyyy")}
            </h2>
            <Badge variant="outline" className="text-xs">
              {t("common:time.week")} {getWeekNumber(currentWeekStart)}
            </Badge>
          </div>
        </div>

        {/* Right side: View toggle and add button */}
        <div className="flex items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as "day" | "week")}
          >
            <TabsList>
              <TabsTrigger value="day">{t("common:time.today")}</TabsTrigger>
              <TabsTrigger value="week">{t("common:time.week")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleNewReservation}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("common:buttons.add")}</span>
          </Button>
        </div>
      </div>

      {/* Facility Info Bar */}
      <Card className="bg-muted/50">
        <CardContent className="py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{facilityData.name}</span>
            </div>
            <Badge variant="secondary">
              {getFacilityTypeLabel(facilityData.type)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {t("facilities:availability.availableFrom")}:{" "}
              {facilityData.availableFrom} - {facilityData.availableTo}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("facilities:bookingRules.maxHorsesPerReservation")}:{" "}
              {facilityData.maxHorsesPerReservation}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <FacilityCalendarView
        facilities={facilityData ? [facilityData] : []}
        reservations={reservationsData || []}
        selectedFacilityId={facilityId}
        onEventClick={handleReservationClick}
        onDateSelect={handleTimelineSelect}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        calendarConfig={{
          slotMinTime: facilityData?.availableFrom
            ? `${facilityData.availableFrom}:00`
            : "06:00:00",
          slotMaxTime: facilityData?.availableTo
            ? `${facilityData.availableTo}:00`
            : "22:00:00",
        }}
        viewOptions={{
          initialView: viewMode === "day" ? "timeGridDay" : "timeGridWeek",
          showDayGrid: false,
          showList: false,
        }}
      />

      {/* Reservation Dialog */}
      <FacilityReservationDialog
        open={reservationDialog.open}
        onOpenChange={reservationDialog.closeDialog}
        reservation={reservationDialog.data || undefined}
        facilities={facilityData ? [facilityData] : []}
        horses={horsesData || []}
        onSave={handleSaveReservation}
        onDelete={handleDeleteReservation}
        initialValues={dialogInitialValues}
      />
    </div>
  );
}
