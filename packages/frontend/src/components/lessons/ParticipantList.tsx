import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { MoreHorizontal, UserMinus, ArrowUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cacheInvalidation } from "@/lib/queryClient";
import {
  updateBooking,
  cancelBooking,
  getBookingStatusVariant,
} from "@/services/lessonService";
import type { LessonBooking } from "@equiduty/shared";

interface ParticipantListProps {
  lessonId: string;
  bookings: LessonBooking[];
  horses?: { id: string; name: string }[];
  onRefresh: () => void;
}

export function ParticipantList({
  lessonId,
  bookings,
  horses = [],
  onRefresh,
}: ParticipantListProps) {
  const { t, i18n } = useTranslation(["lessons", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;

  const confirmedBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending",
  );
  const waitlistedBookings = bookings
    .filter((b) => b.status === "waitlisted")
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));

  const handleAssignHorse = async (bookingId: string, horseId: string) => {
    if (!currentOrganization) return;
    try {
      await updateBooking(currentOrganization, lessonId, bookingId, {
        horseId,
      });
      toast({ title: t("lessons:messages.horseAssigned") });
      onRefresh();
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    }
  };

  const handleRemoveParticipant = async (bookingId: string) => {
    if (!currentOrganization) return;
    try {
      await cancelBooking(currentOrganization, lessonId, bookingId);
      toast({ title: t("lessons:messages.participantRemoved") });
      await cacheInvalidation.lessons.all();
      onRefresh();
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    }
  };

  const handlePromoteFromWaitlist = async (bookingId: string) => {
    if (!currentOrganization) return;
    try {
      await updateBooking(currentOrganization, lessonId, bookingId, {
        status: "confirmed",
      });
      toast({ title: t("lessons:messages.promotedFromWaitlist") });
      await cacheInvalidation.lessons.all();
      onRefresh();
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    }
  };

  const handleMoveToWaitlist = async (bookingId: string) => {
    if (!currentOrganization) return;
    try {
      await updateBooking(currentOrganization, lessonId, bookingId, {
        status: "waitlisted",
      });
      onRefresh();
    } catch {
      toast({ title: t("common:errors.generic"), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Confirmed Participants */}
      <div>
        <h3 className="text-sm font-medium mb-2">
          {t("lessons:participants.title")} ({confirmedBookings.length})
        </h3>
        {confirmedBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("lessons:participants.noParticipants")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("lessons:participants.name")}</TableHead>
                <TableHead>{t("lessons:participants.horse")}</TableHead>
                <TableHead>{t("lessons:participants.status")}</TableHead>
                <TableHead>{t("lessons:participants.bookedAt")}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {confirmedBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.contactName}</p>
                      {booking.contactEmail && (
                        <p className="text-xs text-muted-foreground">
                          {booking.contactEmail}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {horses.length > 0 ? (
                      <Select
                        value={booking.horseId || "none"}
                        onValueChange={(value) =>
                          handleAssignHorse(
                            booking.id,
                            value === "none" ? "" : value,
                          )
                        }
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue
                            placeholder={t("lessons:participants.assignHorse")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {horses.map((horse) => (
                            <SelectItem key={horse.id} value={horse.id}>
                              {horse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      booking.horseName || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBookingStatusVariant(booking.status)}>
                      {t(`lessons:bookings.status.${booking.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {booking.createdAt
                      ? format(
                          new Date(booking.createdAt as unknown as string),
                          "d MMM HH:mm",
                          { locale },
                        )
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleMoveToWaitlist(booking.id)}
                        >
                          {t("lessons:participants.moveToWaitlist")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveParticipant(booking.id)}
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          {t("lessons:participants.removeParticipant")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Waitlist */}
      {waitlistedBookings.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-2">
              {t("lessons:participants.waitlistSection")} (
              {waitlistedBookings.length})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("lessons:participants.name")}</TableHead>
                  <TableHead>{t("lessons:participants.bookedAt")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlistedBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.waitlistPosition}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.contactName}</p>
                        {booking.contactEmail && (
                          <p className="text-xs text-muted-foreground">
                            {booking.contactEmail}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {booking.createdAt
                        ? format(
                            new Date(booking.createdAt as unknown as string),
                            "d MMM HH:mm",
                            { locale },
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handlePromoteFromWaitlist(booking.id)
                            }
                          >
                            <ArrowUp className="mr-2 h-4 w-4" />
                            {t("lessons:participants.promoteFromWaitlist")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveParticipant(booking.id)}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            {t("lessons:participants.removeParticipant")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
