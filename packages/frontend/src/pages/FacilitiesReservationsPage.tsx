import { useState, useEffect, useMemo } from "react";
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
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDialog } from "@/hooks/useDialog";
import { useUserStables } from "@/hooks/useUserStables";
import {
  getStableReservations,
  createReservation,
  updateReservation,
} from "@/services/facilityReservationService";
import { getFacilitiesByStable } from "@/services/facilityService";
import { getUserHorsesAtStable } from "@/services/horseService";
import type { FacilityReservation } from "@/types/facilityReservation";
import type { Facility, FacilityType } from "@/types/facility";
import type { Horse } from "@stall-bokning/shared/types/domain";
import { FacilityReservationDialog } from "@/components/FacilityReservationDialog";
import { FacilityCalendarView } from "@/components/FacilityCalendarView";
import { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { toDate } from "@/utils/timestampUtils";

const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  transport: "Transport",
  water_treadmill: "Water treadmill",
  indoor_arena: "Indoor arena",
  outdoor_arena: "Outdoor arena",
  galloping_track: "Galloping track",
  lunging_ring: "Lunging ring",
  paddock: "Paddock",
  solarium: "Solarium",
  jumping_yard: "Jumping yard",
  treadmill: "Treadmill",
  vibration_plate: "Vibration plate",
  pasture: "Pasture",
  walker: "Walker",
  other: "Other",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  completed: "bg-blue-100 text-blue-800",
  no_show: "bg-red-100 text-red-800",
};

type ViewType = "calendar" | "timeline";

export default function FacilitiesReservationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewType, setViewType] = useState<ViewType>("timeline");
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

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable when stables load
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId) {
      setSelectedStableId(stables[0]!.id);
    }
  }, [stables, selectedStableId]);

  // Load facilities and reservations for selected stable
  const facilities = useAsyncData<Facility[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getFacilitiesByStable(selectedStableId);
    },
  });

  const reservations = useAsyncData<FacilityReservation[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getStableReservations(selectedStableId);
    },
  });

  const horses = useAsyncData<Horse[]>({
    loadFn: async () => {
      if (!selectedStableId || !user?.uid) return [];
      return await getUserHorsesAtStable(user.uid, selectedStableId);
    },
  });

  // Reload data when stable changes
  useEffect(() => {
    if (selectedStableId) {
      facilities.load();
      reservations.load();
      if (user?.uid) {
        horses.load();
      }
    }
  }, [selectedStableId, user?.uid]);

  // Filter reservations
  const filteredReservations = useMemo(() => {
    if (!reservations.data) return [];

    return reservations.data.filter((reservation) => {
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
  }, [reservations.data, selectedFacilityType, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!reservations.data) return { total: 0, upcoming: 0, completed: 0 };

    const now = new Date();

    return {
      total: reservations.data.length,
      upcoming: reservations.data.filter((r) => {
        const startTime = toDate(r.startTime);
        return r.status === "confirmed" && startTime && startTime > now;
      }).length,
      completed: reservations.data.filter((r) => r.status === "completed")
        .length,
    };
  }, [reservations.data]);

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
        title: "Success",
        description: "Reservation rescheduled successfully",
      });

      reservations.reload();
    } catch (error) {
      console.error("Failed to reschedule reservation:", error);
      toast({
        title: "Error",
        description: "Failed to reschedule reservation. Please try again.",
        variant: "destructive",
      });
      reservations.reload(); // Reload to revert the optimistic update
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
        title: "Success",
        description: "Reservation duration updated successfully",
      });

      reservations.reload();
    } catch (error) {
      console.error("Failed to update reservation duration:", error);
      toast({
        title: "Error",
        description: "Failed to update reservation. Please try again.",
        variant: "destructive",
      });
      reservations.reload(); // Reload to revert the optimistic update
    }
  };

  const handleSaveReservation = async (data: any) => {
    try {
      if (!user || !selectedStableId) {
        toast({
          title: "Error",
          description: "Missing required information",
          variant: "destructive",
        });
        return;
      }

      // Get facility details for denormalized data
      const facility = facilities.data?.find((f) => f.id === data.facilityId);
      if (!facility) {
        toast({
          title: "Error",
          description: "Selected facility not found",
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
          title: "Success",
          description: "Reservation updated successfully",
        });
      } else {
        // Create new reservation
        await createReservation(reservationData, user.uid, denormalizedData);
        toast({
          title: "Success",
          description: "Reservation created successfully",
        });
      }

      reservationDialog.closeDialog();
      reservations.reload();
    } catch (error) {
      console.error("Failed to save reservation:", error);
      toast({
        title: "Error",
        description: "Failed to save reservation. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (facilities.loading || reservations.loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Facility Reservations
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage facility bookings
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Switcher */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={viewType === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("calendar")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              List View
            </Button>
            <Button
              variant={viewType === "timeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("timeline")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Schedule View
            </Button>
          </div>
          <Button onClick={handleNewReservation}>
            <Plus className="mr-2 h-4 w-4" />
            New Reservation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reservations
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Stable</label>
              <Select
                value={selectedStableId}
                onValueChange={setSelectedStableId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stable" />
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
              <label className="text-sm font-medium mb-2 block">Facility</label>
              <Select
                value={selectedFacility}
                onValueChange={setSelectedFacility}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All facilities</SelectItem>
                  {facilities.data?.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Facility Type
              </label>
              <Select
                value={selectedFacilityType}
                onValueChange={setSelectedFacilityType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(FACILITY_TYPE_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
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
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>
                Click a date to view reservations
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
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
                <CardTitle>
                  Reservations for {format(selectedDate, "PPP")}
                </CardTitle>
                <CardDescription>
                  {reservationsForSelectedDate.length} reservation(s) found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reservationsForSelectedDate.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No reservations for this date
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
                              {FACILITY_TYPE_LABELS[reservation.facilityType]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {toDate(reservation.startTime) &&
                              toDate(reservation.endTime) &&
                              `${format(toDate(reservation.startTime)!, "HH:mm")} - ${format(toDate(reservation.endTime)!, "HH:mm")}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {reservation.userFullName || reservation.userEmail}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[reservation.status]}>
                          {reservation.status}
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
          facilities={facilities.data || []}
          reservations={filteredReservations}
          selectedFacilityId={selectedFacility}
          onEventClick={handleReservationClick}
          onDateSelect={handleTimelineSelect}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
        />
      )}

      {/* Reservation Dialog */}
      <FacilityReservationDialog
        open={reservationDialog.open}
        onOpenChange={reservationDialog.closeDialog}
        reservation={reservationDialog.data || undefined}
        facilities={facilities.data || []}
        horses={horses.data || []}
        onSave={handleSaveReservation}
        initialValues={dialogInitialValues}
      />
    </div>
  );
}
