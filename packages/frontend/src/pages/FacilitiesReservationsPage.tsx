import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDialog } from "@/hooks/useDialog";
import { useUserStables } from "@/hooks/useUserStables";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getStableReservations,
  createReservation,
  updateReservation,
  deleteReservation,
} from "@/services/facilityReservationService";
import { getFacilitiesByStable } from "@/services/facilityService";
import { getUserHorsesAtStable } from "@/services/horseService";
import type { FacilityReservation } from "@/types/facilityReservation";
import type { Facility, FacilityType } from "@/types/facility";
import type { Horse } from "@equiduty/shared/types/domain";
import { FacilityReservationDialog } from "@/components/FacilityReservationDialog";
import { FacilityCalendarView } from "@/components/FacilityCalendarView";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { toDate } from "@/utils/timestampUtils";
import { STATUS_COLORS } from "@/constants/facilityConstants";
import { useOrganizationCalendarHolidays } from "@/hooks/useOrganizationHolidays";
import { ViewModeSelector } from "@/components/ViewModeSelector";
import { CustomerBookingView } from "@/components/CustomerBookingView";
import { FacilityUtilizationDashboard } from "@/components/FacilityUtilizationDashboard";
import { TodayScheduleView } from "@/components/TodayScheduleView";
import { useViewMode } from "@/hooks/useViewMode";

type ViewType = "calendar" | "timeline";

export default function FacilitiesReservationsPage() {
  const { t } = useTranslation(["facilities", "common", "constants"]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { viewMode, setViewMode, availableViewModes } = useViewMode();
  const [viewType, setViewType] = useState<ViewType>("timeline");

  // Helper function to get translated facility type
  const getFacilityTypeLabel = (type: FacilityType) =>
    t(`constants:facilityTypes.${type}`);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedFacilityType, setSelectedFacilityType] =
    useState<string>("all");
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const [dialogInitialValues, setDialogInitialValues] = useState<{
    facilityId?: string;
    date?: Date;
    startTime?: string;
    endTime?: string;
  }>();
  const reservationDialog = useDialog<FacilityReservation>();

  // Holiday data for calendar views
  const { holidays, showHolidays } =
    useOrganizationCalendarHolidays(selectedDate);

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable when stables load
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId) {
      setSelectedStableId(stables[0]!.id);
    }
  }, [stables, selectedStableId]);

  // Load facilities for selected stable
  const facilitiesQuery = useApiQuery<Facility[]>(
    queryKeys.facilities.list({ stableId: selectedStableId }),
    () => getFacilitiesByStable(selectedStableId),
    {
      enabled: !!selectedStableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const facilitiesData = facilitiesQuery.data ?? [];
  const facilitiesLoading = facilitiesQuery.isLoading;

  // Load reservations for selected stable
  const reservationsQuery = useApiQuery<FacilityReservation[]>(
    queryKeys.facilityReservations.byStable(selectedStableId),
    () => getStableReservations(selectedStableId),
    {
      enabled: !!selectedStableId,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );
  const reservationsData = reservationsQuery.data ?? [];
  const reservationsLoading = reservationsQuery.isLoading;

  // Load horses for selected stable (for reservation form)
  const horsesQuery = useApiQuery<Horse[]>(
    queryKeys.horses.list({ stableId: selectedStableId, userId: user?.uid }),
    () => getUserHorsesAtStable(user!.uid, selectedStableId),
    {
      enabled: !!selectedStableId && !!user?.uid,
      staleTime: 5 * 60 * 1000,
    },
  );
  const horsesData = horsesQuery.data ?? [];

  // Filter reservations
  const filteredReservations = useMemo(() => {
    if (!reservationsData) return [];

    return reservationsData.filter((reservation) => {
      // Filter by facility type
      if (
        selectedFacilityType !== "all" &&
        reservation.facilityType !== selectedFacilityType
      ) {
        return false;
      }

      // Filter by status
      if (selectedStatus !== "all" && reservation.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [reservationsData, selectedFacilityType, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!reservationsData) return { total: 0, upcoming: 0, completed: 0 };

    const now = new Date();

    return {
      total: reservationsData.length,
      upcoming: reservationsData.filter((r) => {
        const startTime = toDate(r.startTime);
        return r.status === "confirmed" && startTime && startTime > now;
      }).length,
      completed: reservationsData.filter((r) => r.status === "completed")
        .length,
    };
  }, [reservationsData]);

  // Get reservations for selected date
  const reservationsForSelectedDate = useMemo(() => {
    if (!filteredReservations || !selectedDate) return [];

    return filteredReservations.filter((reservation) => {
      const startTime = toDate(reservation.startTime);
      return startTime && isSameDay(startTime, selectedDate);
    });
  }, [filteredReservations, selectedDate]);

  // Get dates with reservations for calendar highlighting
  const datesWithReservations = useMemo(() => {
    if (!filteredReservations) return [];

    return filteredReservations
      .map((r) => toDate(r.startTime))
      .filter((date): date is Date => date !== null);
  }, [filteredReservations]);

  const handleNewReservation = () => {
    setDialogInitialValues(undefined);
    reservationDialog.openDialog();
  };

  const handleReservationClick = (reservation: FacilityReservation) => {
    setDialogInitialValues(undefined);
    reservationDialog.openDialog(reservation);
  };

  const handleTimelineSelect = (
    facilityId: string | undefined,
    start: Date,
    end: Date,
  ) => {
    // Pre-fill form with selected facility and time
    const startTime = format(start, "HH:mm");
    const endTime = format(end, "HH:mm");

    setDialogInitialValues({
      facilityId:
        facilityId || selectedFacility !== "all" ? selectedFacility : undefined,
      date: start,
      startTime,
      endTime,
    });
    reservationDialog.openDialog();
  };

  const handleQuickBook = (
    facilityId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ) => {
    // Pre-fill form with selected facility and time for quick booking
    setDialogInitialValues({
      facilityId,
      date,
      startTime,
      endTime,
    });
    reservationDialog.openDialog();
  };

  const handleEventDrop = async (
    reservationId: string,
    newStart: Date,
    newEnd: Date,
    newFacilityId?: string,
  ) => {
    if (!user) return;

    try {
      const updates = {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
        ...(newFacilityId && { facilityId: newFacilityId }),
      };

      await updateReservation(reservationId, updates, user.uid);

      toast({
        title: t("common:messages.success"),
        description: t("facilities:reservation.messages.updateSuccess"),
      });

      await cacheInvalidation.facilityReservations.all();
    } catch (error) {
      console.error("Failed to reschedule reservation:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
      await cacheInvalidation.facilityReservations.all(); // Reload to revert the optimistic update
    }
  };

  const handleEventResize = async (
    reservationId: string,
    newStart: Date,
    newEnd: Date,
  ) => {
    if (!user) return;

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
      console.error("Failed to update reservation duration:", error);
      toast({
        title: t("common:messages.error"),
        description: t("common:messages.saveFailed"),
        variant: "destructive",
      });
      await cacheInvalidation.facilityReservations.all(); // Reload to revert the optimistic update
    }
  };

  const handleSaveReservation = async (data: any) => {
    try {
      if (!user || !selectedStableId) {
        toast({
          title: t("common:messages.error"),
          description: t("common:messages.loadingFailed"),
          variant: "destructive",
        });
        return;
      }

      // Get facility details for denormalized data
      const facility = facilitiesData?.find((f) => f.id === data.facilityId);
      if (!facility) {
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
        facilityName: facility.name,
        facilityType: facility.type,
        stableId: selectedStableId,
        stableName: facility.stableName,
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
      await deleteReservation(reservationId);
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
      throw error; // Re-throw so the dialog knows there was an error
    }
  };

  if (facilitiesLoading || reservationsLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:labels.loading")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("facilities:page.reservationsTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("facilities:page.reservationsDescription")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Persona View Mode Selector */}
          <ViewModeSelector
            viewMode={viewMode}
            onChange={setViewMode}
            availableViewModes={availableViewModes}
          />
          {viewMode === "admin" && (
            <Button onClick={handleNewReservation}>
              <Plus className="mr-2 h-4 w-4" />
              {t("facilities:reservation.title.create")}
            </Button>
          )}
        </div>
      </div>

      {/* Customer View - Simplified booking interface */}
      {viewMode === "customer" && (
        <CustomerBookingView
          facilities={facilitiesData || []}
          reservations={reservationsData || []}
          horses={horsesData || []}
          onCreateReservation={handleNewReservation}
          onReservationClick={handleReservationClick}
          onQuickBook={handleQuickBook}
          userId={user?.uid}
        />
      )}

      {/* Manager View - Analytics and utilization */}
      {viewMode === "manager" && (
        <FacilityUtilizationDashboard
          facilities={facilitiesData || []}
          reservations={reservationsData || []}
        />
      )}

      {/* Operations View - Today's schedule */}
      {viewMode === "operations" && (
        <TodayScheduleView
          facilities={facilitiesData || []}
          reservations={reservationsData || []}
          onReservationClick={handleReservationClick}
        />
      )}

      {/* Admin View - Full control with calendar/timeline */}
      {viewMode === "admin" && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("facilities:page.reservationsTitle")}
                </CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("common:status.pending")}
                </CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcoming}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("common:status.completed")}
                </CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>
          </div>

          {/* View Switcher for Admin */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
            <Button
              variant={viewType === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("calendar")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {t("facilities:calendar.title")}
            </Button>
            <Button
              variant={viewType === "timeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("timeline")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {t("common:navigation.schedule")}
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t("common:buttons.filter")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("common:navigation.stables")}
                  </label>
                  <Select
                    value={selectedStableId}
                    onValueChange={setSelectedStableId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("common:navigation.stables")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {stables.map((stable) => (
                        <SelectItem key={stable.id} value={stable.id}>
                          {stable.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("facilities:reservation.labels.facility")}
                  </label>
                  <Select
                    value={selectedFacility}
                    onValueChange={setSelectedFacility}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("facilities:page.title")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("facilities:page.title")}
                      </SelectItem>
                      {facilitiesData?.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id}>
                          {facility.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("facilities:form.labels.type")}
                  </label>
                  <Select
                    value={selectedFacilityType}
                    onValueChange={setSelectedFacilityType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("common:labels.type")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("common:labels.type")}
                      </SelectItem>
                      {(
                        [
                          "transport",
                          "water_treadmill",
                          "indoor_arena",
                          "outdoor_arena",
                          "galloping_track",
                          "lunging_ring",
                          "paddock",
                          "solarium",
                          "jumping_yard",
                          "treadmill",
                          "vibration_plate",
                          "pasture",
                          "walker",
                          "other",
                        ] as FacilityType[]
                      ).map((type) => (
                        <SelectItem key={type} value={type}>
                          {getFacilityTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("common:labels.status")}
                  </label>
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("common:labels.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("common:labels.status")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("constants:reservationStatus.pending")}
                      </SelectItem>
                      <SelectItem value="confirmed">
                        {t("constants:reservationStatus.confirmed")}
                      </SelectItem>
                      <SelectItem value="cancelled">
                        {t("constants:reservationStatus.cancelled")}
                      </SelectItem>
                      <SelectItem value="completed">
                        {t("constants:reservationStatus.completed")}
                      </SelectItem>
                      <SelectItem value="no_show">
                        {t("constants:reservationStatus.no_show")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar View */}
          {viewType === "calendar" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t("facilities:calendar.title")}</CardTitle>
                  <CardDescription>
                    {t("facilities:page.reservationsDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                    holidays={holidays}
                    showHolidays={showHolidays}
                    modifiers={{
                      hasReservations: datesWithReservations,
                    }}
                    modifiersStyles={{
                      hasReservations: {
                        fontWeight: "bold",
                        textDecoration: "underline",
                      },
                    }}
                  />
                </CardContent>
              </Card>

              {/* Reservations for Selected Date */}
              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle>{format(selectedDate, "PPP")}</CardTitle>
                    <CardDescription>
                      {reservationsForSelectedDate.length}{" "}
                      {t("facilities:page.reservationsTitle").toLowerCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reservationsForSelectedDate.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {t("facilities:calendar.noReservations")}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {reservationsForSelectedDate.map((reservation) => (
                          <div
                            key={reservation.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                            onClick={() => handleReservationClick(reservation)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">
                                  {reservation.facilityName}
                                </h4>
                                <Badge variant="outline">
                                  {getFacilityTypeLabel(
                                    reservation.facilityType,
                                  )}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {toDate(reservation.startTime) &&
                                  toDate(reservation.endTime) &&
                                  `${format(toDate(reservation.startTime)!, "HH:mm")} - ${format(toDate(reservation.endTime)!, "HH:mm")}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {reservation.userFullName ||
                                  reservation.userEmail}
                              </p>
                            </div>
                            <Badge
                              className={STATUS_COLORS[reservation.status]}
                            >
                              {t(
                                `constants:reservationStatus.${reservation.status}`,
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Timeline View */}
          {viewType === "timeline" && (
            <FacilityCalendarView
              facilities={facilitiesData || []}
              reservations={filteredReservations}
              selectedFacilityId={selectedFacility}
              onEventClick={handleReservationClick}
              onDateSelect={handleTimelineSelect}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              holidayOptions={{ holidays, showHolidays }}
            />
          )}
        </>
      )}

      {/* Reservation Dialog */}
      <FacilityReservationDialog
        open={reservationDialog.open}
        onOpenChange={reservationDialog.closeDialog}
        reservation={reservationDialog.data || undefined}
        facilities={facilitiesData || []}
        horses={horsesData || []}
        onSave={handleSaveReservation}
        onDelete={handleDeleteReservation}
        initialValues={dialogInitialValues}
      />
    </div>
  );
}
