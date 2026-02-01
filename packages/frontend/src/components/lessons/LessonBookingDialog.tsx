import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cacheInvalidation } from "@/lib/queryClient";
import { bookLessonSelf } from "@/services/lessonService";
import type { Lesson, LessonType } from "@equiduty/shared";

interface LessonBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  lessonType?: LessonType;
}

export function LessonBookingDialog({
  open,
  onOpenChange,
  lesson,
  lessonType,
}: LessonBookingDialogProps) {
  const { t, i18n } = useTranslation(["lessons", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;

  const [booking, setBooking] = useState(false);

  const startTime = new Date(lesson.startTime as unknown as string);
  const endTime = new Date(lesson.endTime as unknown as string);
  const spotsLeft = lesson.maxParticipants - lesson.currentParticipants;
  const isFull = spotsLeft <= 0;
  const allowWaitlist = lessonType?.allowWaitlist ?? false;

  const cancellationHours = lessonType?.cancellationHours ?? 24;

  const handleBook = async () => {
    if (!currentOrganization) return;

    setBooking(true);
    try {
      const result = await bookLessonSelf(currentOrganization, lesson.id);

      if (result.isWaitlisted) {
        toast({
          title: t("lessons:bookingDialog.waitlistSuccess", {
            position: result.waitlistPosition,
          }),
        });
      } else {
        toast({ title: t("lessons:bookingDialog.bookingSuccess") });
      }

      await cacheInvalidation.lessons.all();
      await cacheInvalidation.lessonBookings.all();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("common:errors.generic");
      toast({ title: message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("lessons:bookingDialog.title")}</DialogTitle>
          <DialogDescription>{lesson.lessonTypeName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lesson Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(startTime, "EEEE d MMMM yyyy", { locale })}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} (
                {lesson.durationMinutes} min)
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{lesson.instructorName}</span>
            </div>
            {lesson.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{lesson.location}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {isFull ? (
                  <Badge variant="destructive">
                    {t("lessons:bookingDialog.full")}
                  </Badge>
                ) : (
                  t("lessons:bookingDialog.spotsLeft", { count: spotsLeft })
                )}
              </span>
            </div>
          </div>

          {/* Level badge */}
          {lessonType?.level && (
            <Badge variant="outline">
              {t(`lessons:types.level.${lessonType.level}`)}
            </Badge>
          )}

          {/* Waitlist notice */}
          {isFull && allowWaitlist && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("lessons:bookingDialog.waitlistInfo")}
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation policy */}
          <p className="text-xs text-muted-foreground">
            {t("lessons:bookingDialog.cancellationNotice", {
              hours: cancellationHours,
            })}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={booking}
          >
            {t("common:buttons.cancel")}
          </Button>
          {isFull ? (
            allowWaitlist ? (
              <Button onClick={handleBook} disabled={booking}>
                {booking
                  ? t("common:buttons.submitting")
                  : t("lessons:bookingDialog.joinWaitlist")}
              </Button>
            ) : null
          ) : (
            <Button onClick={handleBook} disabled={booking}>
              {booking
                ? t("common:buttons.submitting")
                : t("lessons:bookingDialog.book")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
