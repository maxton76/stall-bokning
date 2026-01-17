import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Clock,
  MapPin,
  User,
  Users,
  Calendar,
  Trash2,
  Edit,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getLessonStatusVariant,
  getBookingStatusVariant,
} from "@/services/lessonService";
import type {
  Lesson,
  LessonBooking,
  LessonType,
  Instructor,
} from "@stall-bokning/shared";

export interface LessonDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  bookings?: LessonBooking[];
  lessonType?: LessonType;
  instructor?: Instructor;
  onUpdate?: () => void;
  onCancel?: (lessonId: string) => Promise<void>;
  onEdit?: (lesson: Lesson) => void;
  onAddBooking?: (lessonId: string) => void;
  onCancelBooking?: (lessonId: string, bookingId: string) => Promise<void>;
}

export function LessonDetailDialog({
  open,
  onOpenChange,
  lesson,
  bookings = [],
  lessonType,
  instructor,
  onUpdate,
  onCancel,
  onEdit,
  onAddBooking,
  onCancelBooking,
}: LessonDetailDialogProps) {
  const { t, i18n } = useTranslation(["lessons", "common"]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);

  const locale = i18n.language === "sv" ? sv : enUS;

  if (!lesson) return null;

  const startTime = new Date(lesson.startTime);
  const endTime = new Date(lesson.endTime);
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const waitlistedBookings = bookings.filter((b) => b.status === "waitlisted");
  const spotsAvailable = lesson.maxParticipants - confirmedBookings.length;

  async function handleCancelLesson() {
    if (!onCancel || !lesson) return;
    setIsCancelling(true);
    try {
      await onCancel(lesson.id);
      setShowCancelDialog(false);
      onOpenChange(false);
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (!onCancelBooking || !lesson) return;
    setIsCancelling(true);
    try {
      await onCancelBooking(lesson.id, bookingId);
      setCancellingBookingId(null);
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {lessonType && (
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: lessonType.color || "#6b7280" }}
                  />
                )}
                <DialogTitle>
                  {lessonType?.name || t("lessons:lesson.details")}
                </DialogTitle>
              </div>
              <Badge variant={getLessonStatusVariant(lesson.status)}>
                {t(`lessons:status.${lesson.status}`)}
              </Badge>
            </div>
            <DialogDescription>
              {format(startTime, "EEEE d MMMM yyyy", { locale })}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Lesson Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                  </span>
                </div>

                {lesson.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lesson.location}</span>
                  </div>
                )}

                {instructor && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{instructor.name}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {t("lessons:lesson.participantsCount", {
                      current: confirmedBookings.length,
                      max: lesson.maxParticipants,
                    })}
                  </span>
                </div>
              </div>

              {lesson.notes && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    {t("lessons:fields.notes")}
                  </p>
                  <p>{lesson.notes}</p>
                </div>
              )}

              <Separator />

              {/* Participants */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {t("lessons:lesson.participants")}
                    </CardTitle>
                    {onAddBooking &&
                      spotsAvailable > 0 &&
                      lesson.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddBooking(lesson.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          {t("lessons:bookings.create")}
                        </Button>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                  {confirmedBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("lessons:lesson.spotsAvailable", {
                        count: spotsAvailable,
                      })}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {confirmedBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {booking.participantName || "Participant"}
                              </p>
                              {booking.horseName && (
                                <p className="text-xs text-muted-foreground">
                                  {booking.horseName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getBookingStatusVariant(booking.status)}
                            >
                              {t(`lessons:bookings.status.${booking.status}`)}
                            </Badge>
                            {onCancelBooking &&
                              booking.status !== "cancelled" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    setCancellingBookingId(booking.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {waitlistedBookings.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">
                        {t("lessons:lesson.waitlist", {
                          count: waitlistedBookings.length,
                        })}
                      </p>
                      <div className="space-y-2">
                        {waitlistedBookings.map((booking, index) => (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                #{index + 1}
                              </span>
                              <div>
                                <p className="text-sm">
                                  {booking.participantName || "Participant"}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {t("lessons:bookings.status.waitlisted")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lesson Type Info */}
              {lessonType && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {t("lessons:fields.lessonType")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("lessons:types.fields.category")}
                      </span>
                      <span>
                        {t(`lessons:types.category.${lessonType.category}`)}
                      </span>
                    </div>
                    {lessonType.level && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("lessons:types.fields.level")}
                        </span>
                        <span>
                          {t(`lessons:types.level.${lessonType.level}`)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("lessons:fields.price")}
                      </span>
                      <span>
                        {lessonType.pricing?.basePrice ?? lessonType.price ?? 0}{" "}
                        {lessonType.currency || "SEK"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {lesson.status !== "cancelled" && lesson.status !== "completed" && (
              <>
                {onEdit && (
                  <Button
                    variant="outline"
                    onClick={() => onEdit(lesson)}
                    className="w-full sm:w-auto"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t("lessons:lesson.edit")}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t("lessons:lesson.cancel")}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              {t("common:close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Lesson Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lessons:lesson.cancel")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("lessons:lesson.cancelConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelLesson}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? t("common:saving") : t("lessons:lesson.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Booking Dialog */}
      <AlertDialog
        open={!!cancellingBookingId}
        onOpenChange={() => setCancellingBookingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lessons:bookings.cancel")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("lessons:bookings.cancelConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancellingBookingId && handleCancelBooking(cancellingBookingId)
              }
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? t("common:saving") : t("lessons:bookings.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
