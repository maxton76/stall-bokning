/**
 * QuickStatusUpdate Component
 * One-click buttons to mark reservations as completed or no-show
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { FacilityReservation } from "@/types/facilityReservation";

interface QuickStatusUpdateProps {
  reservation: FacilityReservation;
  onStatusUpdate: (
    reservationId: string,
    status: "completed" | "no_show",
  ) => void;
}

export function QuickStatusUpdate({
  reservation,
  onStatusUpdate,
}: QuickStatusUpdateProps) {
  const { t } = useTranslation(["facilities", "common"]);
  const [showConfirm, setShowConfirm] = useState<
    "completed" | "no_show" | null
  >(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Don't show actions for already completed/no-show bookings
  if (reservation.status === "completed" || reservation.status === "no_show") {
    return null;
  }

  const handleConfirm = async () => {
    if (!showConfirm) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(reservation.id, showConfirm);
      setShowConfirm(null);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start gap-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          onClick={() => setShowConfirm("completed")}
          disabled={isUpdating}
        >
          <CheckCircle className="h-4 w-4" />
          {t("facilities:operations.markCompleted")}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={() => setShowConfirm("no_show")}
          disabled={isUpdating}
        >
          <XCircle className="h-4 w-4" />
          {t("facilities:operations.markNoShow")}
        </Button>
      </div>

      <AlertDialog
        open={showConfirm !== null}
        onOpenChange={() => setShowConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showConfirm === "completed"
                ? t("facilities:operations.markCompleted")
                : t("facilities:operations.markNoShow")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showConfirm === "completed"
                ? "Are you sure you want to mark this reservation as completed?"
                : "Are you sure you want to mark this reservation as a no-show?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">{reservation.facilityName}</p>
            <p className="text-sm text-muted-foreground">
              {reservation.userFullName || reservation.userEmail}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>
              {t("common:buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common:buttons.updating")}
                </>
              ) : (
                t("common:buttons.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
