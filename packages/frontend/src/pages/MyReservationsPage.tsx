import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, isFuture, parseISO } from "date-fns";
import { Calendar, ArrowRight, MoreVertical, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/hooks/use-toast";
import {
  getUserReservations,
  cancelReservation,
} from "@/services/facilityReservationService";
import { getActiveFacilities } from "@/services/facilityService";
import type { FacilityReservation } from "@/types/facilityReservation";
import type { Facility } from "@/types/facility";
import { toDate } from "@/utils/timestampUtils";

export default function MyReservationsPage() {
  const { t } = useTranslation(["facilities", "common"]);
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] =
    useState<FacilityReservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable when stables load
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId) {
      setSelectedStableId(stables[0]!.id);
    }
  }, [stables, selectedStableId]);

  // Load user's reservations
  const reservations = useAsyncData<FacilityReservation[]>({
    loadFn: async () => {
      if (!user?.uid) return [];
      return await getUserReservations(user.uid);
    },
  });

  // Load facilities for selected stable
  const facilities = useAsyncData<Facility[]>({
    loadFn: async () => {
      if (!selectedStableId) return [];
      return await getActiveFacilities(selectedStableId);
    },
  });

  // Reload data when user or stable changes
  useEffect(() => {
    if (user?.uid) {
      reservations.load();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (selectedStableId) {
      facilities.load();
    }
  }, [selectedStableId]);

  // Filter reservations for selected stable and sort by date
  const filteredReservations = useMemo(() => {
    if (!reservations.data) return [];

    return reservations.data
      .filter((r) => {
        // Only show reservations for selected stable
        if (selectedStableId && r.stableId !== selectedStableId) return false;
        // Only show upcoming or recent reservations (not completed/cancelled)
        const startTime = toDate(r.startTime);
        if (!startTime) return false;
        // Show all active/upcoming reservations
        return (
          r.status !== "completed" &&
          r.status !== "cancelled" &&
          r.status !== "no_show"
        );
      })
      .sort((a, b) => {
        const dateA = toDate(a.startTime);
        const dateB = toDate(b.startTime);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
  }, [reservations.data, selectedStableId]);

  // Get translated facility type label
  const getFacilityTypeLabel = (type: string): string => {
    return t(`types.${type}`, { defaultValue: type });
  };

  // Get translated status label and variant
  const getStatusDisplay = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      confirmed: "default",
      pending: "secondary",
      cancelled: "destructive",
      completed: "outline",
      no_show: "destructive",
    };
    return {
      label: t(`status.${status}`, { defaultValue: status }),
      variant: variants[status] || "outline",
    };
  };

  const handleCancelClick = (reservation: FacilityReservation) => {
    setReservationToCancel(reservation);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!reservationToCancel || !user?.uid) return;

    setIsCancelling(true);
    try {
      await cancelReservation(reservationToCancel.id, user.uid);
      toast({
        title: t("myReservations.toast.cancelled"),
        description: t("myReservations.toast.cancelledDescription"),
      });
      reservations.reload();
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
      toast({
        title: t("common:toast.error", { defaultValue: "Error" }),
        description: t("myReservations.toast.cancelError"),
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
      setReservationToCancel(null);
    }
  };

  if (stablesLoading || reservations.loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("common:labels.loading")}</p>
      </div>
    );
  }

  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          {t("myReservations.title")}
        </h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t("myReservations.noStablesAccess")}
              <br />
              {t("myReservations.joinStablePrompt")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("myReservations.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("myReservations.description")}
          </p>
        </div>
        {stables.length > 1 && (
          <Select value={selectedStableId} onValueChange={setSelectedStableId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("myReservations.selectStable")} />
            </SelectTrigger>
            <SelectContent>
              {stables.map((stable) => (
                <SelectItem key={stable.id} value={stable.id}>
                  {stable.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Facility Cards Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {t("myReservations.availableFacilities")}
        </h2>
        {facilities.loading ? (
          <p className="text-muted-foreground">
            {t("myReservations.loadingFacilities")}
          </p>
        ) : facilities.data && facilities.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {facilities.data.map((facility) => (
              <Card
                key={facility.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{facility.name}</CardTitle>
                  <CardDescription>
                    {getFacilityTypeLabel(facility.type)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {facility.availableFrom} - {facility.availableTo}
                    </span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/my-reservations/facility/${facility.id}`}>
                        {t("myReservations.viewAvailability")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Warehouse className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-center text-sm">
                {t("myReservations.noFacilities")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reservations Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {t("myReservations.myHorseReservations")}
        </h2>
        {filteredReservations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-center text-sm">
                {t("myReservations.noUpcomingReservations")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("myReservations.table.date")}</TableHead>
                  <TableHead>{t("myReservations.table.time")}</TableHead>
                  <TableHead>{t("myReservations.table.facility")}</TableHead>
                  <TableHead>{t("myReservations.table.horse")}</TableHead>
                  <TableHead>{t("myReservations.table.status")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => {
                  const startTime = toDate(reservation.startTime);
                  const endTime = toDate(reservation.endTime);
                  const statusDisplay = getStatusDisplay(reservation.status);

                  return (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {startTime
                            ? format(startTime, "EEE, MMM d, yyyy")
                            : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {startTime && endTime
                          ? `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{reservation.facilityName}</span>
                          <Badge variant="outline" className="text-xs">
                            {getFacilityTypeLabel(reservation.facilityType)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{reservation.horseName || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusDisplay.variant}>
                          {statusDisplay.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">
                                {t("myReservations.openMenu")}
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleCancelClick(reservation)}
                            >
                              {t("myReservations.cancelReservation")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("myReservations.cancelDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("myReservations.cancelDialog.description")}
              {reservationToCancel && (
                <span className="block mt-2 font-medium text-foreground">
                  {t("myReservations.cancelDialog.facilityInfo", {
                    facility: reservationToCancel.facilityName,
                    date:
                      toDate(reservationToCancel.startTime) &&
                      format(
                        toDate(reservationToCancel.startTime)!,
                        "EEE, MMM d, yyyy",
                      ),
                  })}
                </span>
              )}
              {t("myReservations.cancelDialog.cannotUndo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              {t("myReservations.cancelDialog.keep")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling
                ? t("myReservations.cancelDialog.cancelling")
                : t("myReservations.cancelDialog.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
