import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { Calendar, Clock, User, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useOrganization } from "@/contexts/OrganizationContext";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getMyLessonBookings,
  getLessonSettings,
  cancelBooking,
  getBookingStatusVariant,
  type MyBookingsResponse,
  type LessonSettingsResponse,
} from "@/services/lessonService";
import type { LessonBooking } from "@equiduty/shared";

export default function MyLessonBookingsPage() {
  const { t, i18n } = useTranslation(["lessons", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;

  const [activeTab, setActiveTab] = useState("upcoming");
  const [cancelDialogBooking, setCancelDialogBooking] =
    useState<LessonBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const organizationId = currentOrganization;

  const bookingsQuery = useApiQuery<MyBookingsResponse>(
    queryKeys.lessonBookings.myBookings(organizationId || ""),
    () => getMyLessonBookings(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 60 * 1000,
    },
  );

  const settingsQuery = useApiQuery<LessonSettingsResponse>(
    queryKeys.lessonSettings.byOrganization(organizationId || ""),
    () => getLessonSettings(organizationId!),
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
    },
  );

  const now = new Date();

  const upcomingBookings = (bookingsQuery.data?.bookings || []).filter(
    (b) =>
      b.status !== "cancelled" &&
      new Date(b.lessonDate as unknown as string) >= now,
  );

  const pastBookings = (bookingsQuery.data?.bookings || []).filter(
    (b) =>
      b.status !== "cancelled" &&
      new Date(b.lessonDate as unknown as string) < now,
  );

  const cancelledBookings = (bookingsQuery.data?.bookings || []).filter(
    (b) => b.status === "cancelled",
  );

  const handleCancelBooking = async () => {
    if (!cancelDialogBooking || !organizationId) return;

    setCancelling(true);
    try {
      await cancelBooking(
        organizationId,
        cancelDialogBooking.lessonId,
        cancelDialogBooking.id,
      );
      await cacheInvalidation.lessonBookings.all();
      toast({ title: t("lessons:messages.bookingCancelled") });
    } catch (error) {
      toast({
        title: t("common:errors.generic"),
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
      setCancelDialogBooking(null);
    }
  };

  const canCancelBooking = (booking: LessonBooking): boolean => {
    const lessonDate = new Date(booking.lessonDate as unknown as string);
    const hoursUntilLesson =
      (lessonDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const deadlineHours =
      settingsQuery.data?.settings?.defaultCancellationDeadlineHours ?? 24;
    return hoursUntilLesson >= deadlineHours;
  };

  const BookingCard = ({
    booking,
    showCancelButton = false,
  }: {
    booking: LessonBooking;
    showCancelButton?: boolean;
  }) => {
    const lessonDate = new Date(booking.lessonDate as unknown as string);

    return (
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">
                {booking.lessonDate
                  ? format(lessonDate, "EEEE d MMMM", { locale })
                  : "—"}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {booking.startTime} - {booking.endTime}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {booking.instructorName}
                </span>
                {booking.facilityName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {booking.facilityName}
                  </span>
                )}
              </div>
              {booking.horseName && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("lessons:myBookings.assignedHorse")}: {booking.horseName}
                </p>
              )}
              {booking.waitlistPosition != null &&
                booking.status === "waitlisted" && (
                  <p className="text-sm text-amber-600 mt-1">
                    {t("lessons:bookingDialog.onWaitlist", {
                      position: booking.waitlistPosition,
                    })}
                  </p>
                )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getBookingStatusVariant(booking.status)}>
              {t(`lessons:bookings.status.${booking.status}`)}
            </Badge>
            {showCancelButton && (
              <Button
                variant="outline"
                size="sm"
                disabled={!canCancelBooking(booking)}
                onClick={() => setCancelDialogBooking(booking)}
              >
                {canCancelBooking(booking)
                  ? t("lessons:bookings.cancel")
                  : t("lessons:myBookings.cancelDeadlinePassed")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!organizationId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:messages.selectOrganization")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("lessons:myBookings.title")}</h1>
        <p className="text-muted-foreground">
          {t("lessons:myBookings.description")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            {t("lessons:myBookings.tabs.upcoming")}
            {upcomingBookings.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingBookings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            {t("lessons:myBookings.tabs.past")}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t("lessons:myBookings.tabs.cancelled")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {bookingsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-2">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t("lessons:myBookings.emptyUpcoming")}
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                showCancelButton
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {bookingsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : pastBookings.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-2">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t("lessons:myBookings.emptyPast")}
                </p>
              </CardContent>
            </Card>
          ) : (
            pastBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3">
          {bookingsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : cancelledBookings.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-2">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t("lessons:myBookings.emptyCancelled")}
                </p>
              </CardContent>
            </Card>
          ) : (
            cancelledBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!cancelDialogBooking}
        onOpenChange={(open) => !open && setCancelDialogBooking(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("lessons:myBookings.cancelConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("lessons:myBookings.cancelConfirmMessage", { hours: 24 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              {t("common:buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling
                ? t("common:buttons.cancelling")
                : t("lessons:bookings.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
