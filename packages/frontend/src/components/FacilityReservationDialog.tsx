import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarIcon, Clock, Info, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormSelect, FormTextarea } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { checkReservationConflicts } from "@/services/facilityReservationService";
import { getAvailableSlots } from "@/services/facilityService";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";
import type { FacilityReservation } from "@/types/facilityReservation";
import type { Facility, TimeBlock } from "@/types/facility";
import { toDate, roundToMinute } from "@/utils/timestampUtils";
import { isTimeRangeAvailable } from "@equiduty/shared/utils/facilityAvailability";
import {
  getSmartDefaults,
  saveLastUsedFacilityId,
  addToBookingHistory,
} from "@/utils/bookingSmartDefaults";
import { AvailabilityIndicator } from "@/components/AvailabilityIndicator";

// Schema will be created with useMemo inside component for translations
type ReservationFormData = {
  facilityId: string;
  date: Date;
  startTime: string;
  endTime: string;
  horseId: string;
  contactInfo?: string;
  notes?: string;
  recurringWeekly?: boolean;
};

interface FacilityReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: FacilityReservation;
  facilities: Facility[];
  horses?: Array<{ id: string; name: string }>;
  onSave: (
    data: ReservationFormData & { adminOverride?: boolean },
  ) => Promise<void>;
  onDelete?: (reservationId: string) => Promise<void>;
  /** Owner ID of the stable these facilities belong to */
  stableOwnerId?: string;
  initialValues?: {
    facilityId?: string;
    date?: Date;
    startTime?: string;
    endTime?: string;
  };
}

export function FacilityReservationDialog({
  open,
  onOpenChange,
  reservation,
  facilities,
  horses = [],
  onSave,
  onDelete,
  stableOwnerId,
  initialValues,
}: FacilityReservationDialogProps) {
  const { t } = useTranslation("facilities");
  const { user } = useAuth();
  const isEditMode = !!reservation;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);

  // Determine if user can override availability
  const canOverride =
    user?.systemRole === "system_admin" ||
    (stableOwnerId != null && user?.uid === stableOwnerId);

  // Create schema with translated messages
  const reservationSchema = useMemo(
    () =>
      z
        .object({
          facilityId: z
            .string()
            .min(1, t("reservation.validation.facilityRequired")),
          date: z.date({ message: t("reservation.validation.dateRequired") }),
          startTime: z
            .string()
            .regex(
              /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
              t("reservation.validation.timeInvalid"),
            ),
          endTime: z
            .string()
            .regex(
              /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
              t("reservation.validation.timeInvalid"),
            ),
          horseId: z.string().min(1, t("reservation.validation.horseRequired")),
          contactInfo: z.string().optional(),
          notes: z.string().optional(),
        })
        .refine(
          (data) => {
            const startParts = data.startTime.split(":");
            const endParts = data.endTime.split(":");
            if (startParts.length !== 2 || endParts.length !== 2) return false;

            const startHour = parseInt(startParts[0] || "0", 10);
            const startMin = parseInt(startParts[1] || "0", 10);
            const endHour = parseInt(endParts[0] || "0", 10);
            const endMin = parseInt(endParts[1] || "0", 10);

            return endHour * 60 + endMin > startHour * 60 + startMin;
          },
          {
            message: t("reservation.validation.endAfterStart"),
            path: ["endTime"],
          },
        ),
    [t],
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      setAdminOverride(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!reservation || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(reservation.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete reservation:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const { form, handleSubmit, resetForm } = useFormDialog<ReservationFormData>({
    schema: reservationSchema,
    defaultValues: {
      facilityId: "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      horseId: "",
      contactInfo: "",
      notes: "",
      recurringWeekly: false,
    },
    onSubmit: async (data) => {
      // Save booking history for smart defaults
      if (!isEditMode && data.facilityId) {
        const durationMinutes = calculateDuration(data.startTime, data.endTime);
        addToBookingHistory(data.facilityId, durationMinutes);
        saveLastUsedFacilityId(data.facilityId);
      }
      await onSave({ ...data, adminOverride: adminOverride || undefined });
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? t("reservation.messages.updateSuccess")
      : t("reservation.messages.createSuccess"),
    errorMessage: isEditMode
      ? t("reservation.messages.updateError")
      : t("reservation.messages.createError"),
  });

  // Helper function to calculate duration in minutes
  const calculateDuration = (startTime: string, endTime: string): number => {
    const [startHour = 0, startMin = 0] = startTime.split(":").map(Number);
    const [endHour = 0, endMin = 0] = endTime.split(":").map(Number);
    return endHour * 60 + endMin - (startHour * 60 + startMin);
  };

  // Reset form when dialog opens with reservation data or initial values
  useEffect(() => {
    if (reservation) {
      const startDate = toDate(reservation.startTime) || new Date();
      const endDate = toDate(reservation.endTime) || new Date();
      resetForm({
        facilityId: reservation.facilityId,
        date: startDate,
        startTime: format(startDate, "HH:mm"),
        endTime: format(endDate, "HH:mm"),
        horseId: reservation.horseId || "",
        contactInfo: reservation.contactInfo || "",
        notes: reservation.notes || "",
        recurringWeekly: false,
      });
    } else if (initialValues) {
      resetForm({
        facilityId: initialValues.facilityId || "",
        date: initialValues.date || new Date(),
        startTime: initialValues.startTime || "09:00",
        endTime: initialValues.endTime || "10:00",
        horseId: "",
        contactInfo: "",
        notes: "",
        recurringWeekly: false,
      });
    } else {
      // Apply smart defaults when creating new reservation
      const smartDefaults = getSmartDefaults(facilities, new Date().getHours());
      const autoHorseId = horses.length === 1 ? horses[0]?.id || "" : "";

      resetForm({
        facilityId: smartDefaults.facilityId || "",
        date: new Date(),
        startTime: smartDefaults.startTime,
        endTime: smartDefaults.endTime,
        horseId: autoHorseId,
        contactInfo: "",
        notes: "",
        recurringWeekly: false,
      });
    }
  }, [reservation, initialValues, open, facilities, horses]);

  // Watch fields for conflict checking
  const facilityId = form.watch("facilityId");
  const date = form.watch("date");
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");

  // Calculate start and end date times
  const getDateTimes = () => {
    if (!facilityId || !date || !startTime || !endTime) return null;

    const startParts = startTime.split(":");
    const endParts = endTime.split(":");

    if (startParts.length !== 2 || endParts.length !== 2) return null;

    const startHour = parseInt(startParts[0] || "0", 10);
    const startMin = parseInt(startParts[1] || "0", 10);
    const endHour = parseInt(endParts[0] || "0", 10);
    const endMin = parseInt(endParts[1] || "0", 10);

    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMin, 0, 0);

    // Ensure exact minute precision (no seconds/milliseconds)
    const roundedStart = roundToMinute(startDateTime);
    const roundedEnd = roundToMinute(endDateTime);

    return {
      startDateTime: Timestamp.fromDate(roundedStart),
      endDateTime: Timestamp.fromDate(roundedEnd),
    };
  };

  const dateTimes = getDateTimes();

  // Check for conflicts when relevant fields change
  const { data: conflicts = [], isLoading: checkingConflicts } = useQuery({
    queryKey: queryKeys.facilityReservations.conflicts(
      facilityId || "",
      toDate(dateTimes?.startDateTime) || new Date(),
      toDate(dateTimes?.endDateTime) || new Date(),
    ),
    queryFn: async () => {
      if (!dateTimes) return [];
      return checkReservationConflicts(
        facilityId!,
        dateTimes.startDateTime,
        dateTimes.endDateTime,
        reservation?.id,
      );
    },
    enabled: !!dateTimes && !!facilityId,
    staleTime: 0, // Always check for conflicts
    refetchOnWindowFocus: false,
  });

  // Fetch available slots for selected facility + date
  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ["facility-available-slots", facilityId, dateStr],
    queryFn: () => getAvailableSlots(facilityId!, dateStr),
    enabled: !!facilityId && !!dateStr,
    staleTime: 60 * 1000,
  });

  const effectiveBlocks: TimeBlock[] = slotsData?.timeBlocks ?? [];
  const isClosed =
    !!facilityId &&
    !!dateStr &&
    !loadingSlots &&
    slotsData != null &&
    effectiveBlocks.length === 0;

  // Check if selected time is outside availability
  const isOutsideAvailability = useMemo(() => {
    if (!startTime || !endTime || effectiveBlocks.length === 0) return false;
    return !isTimeRangeAvailable(effectiveBlocks, startTime, endTime);
  }, [effectiveBlocks, startTime, endTime]);

  const facilityOptions = facilities.map((f) => ({
    value: f.id,
    label: f.name,
  }));
  const horseOptions = horses.map((h) => ({ value: h.id, label: h.name }));

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditMode ? t("reservation.title.edit") : t("reservation.title.create")
      }
      description={
        isEditMode
          ? t("reservation.description.edit")
          : t("reservation.description.create")
      }
      form={form}
      onSubmit={handleSubmit}
      submitLabel={
        isEditMode
          ? t("reservation.actions.update")
          : t("reservation.actions.create")
      }
      maxWidth="sm:max-w-[500px]"
    >
      <FormSelect
        name="facilityId"
        label={t("reservation.labels.facility")}
        form={form}
        options={facilityOptions}
        placeholder={t("reservation.placeholders.facility")}
        required
      />

      {/* Pre-fill indicator for calendar selections */}
      {initialValues && !isEditMode && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t("reservation.messages.timePreFilled")}
          </AlertDescription>
        </Alert>
      )}

      {/* Date Picker - Custom implementation */}
      <div className="space-y-2">
        <Label>
          {t("reservation.labels.date")}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : t("reservation.placeholders.date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && form.setValue("date", date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.date && (
          <p className="text-sm text-destructive">
            {form.formState.errors.date.message}
          </p>
        )}
      </div>

      {/* Time Range */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">
            {t("reservation.labels.startTime")} /{" "}
            {t("reservation.labels.endTime")}
          </Label>
          {startTime && endTime && (
            <Badge variant="secondary" className="ml-2">
              {calculateDuration(startTime, endTime)}{" "}
              {t("common:labels.minutes")}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="startTime"
            label=""
            form={form}
            type="time"
            required
          />
          <FormInput name="endTime" label="" form={form} type="time" required />
        </div>

        {/* Availability Indicator */}
        {facilityId && date && startTime && endTime && !checkingConflicts && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-muted-foreground">
              {t("reservation.labels.availability")}:
            </span>
            <AvailabilityIndicator
              status={
                isClosed
                  ? "closed"
                  : conflicts.length > 0
                    ? "full"
                    : isOutsideAvailability
                      ? "limited"
                      : "available"
              }
              size="sm"
            />
          </div>
        )}
        {checkingConflicts && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-muted-foreground">
              {t("reservation.labels.availability")}:
            </span>
            <AvailabilityIndicator status="checking" size="sm" />
          </div>
        )}
      </div>

      {/* Available Slots Display */}
      {facilityId && dateStr && !loadingSlots && slotsData != null && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t("schedule.enforcement.availableSlots")}
          </div>
          {isClosed ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("schedule.enforcement.facilityClosedOnDate")}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-wrap gap-2">
              {effectiveBlocks.map((block, idx) => (
                <Badge key={idx} variant="secondary">
                  {block.from} – {block.to}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outside Availability Warning */}
      {isOutsideAvailability && !isClosed && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t("schedule.enforcement.outsideAvailabilityWarning")}
          </AlertDescription>
        </Alert>
      )}

      {/* Admin Override Checkbox */}
      {canOverride && (isClosed || isOutsideAvailability) && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="adminOverride"
            checked={adminOverride}
            onCheckedChange={(checked) => setAdminOverride(checked === true)}
          />
          <Label htmlFor="adminOverride" className="text-sm font-normal">
            {t("schedule.enforcement.adminOverrideLabel")}
          </Label>
        </div>
      )}

      {/* Conflict Warning */}
      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("reservation.alerts.conflictTitle")}</AlertTitle>
          <AlertDescription>
            {t("reservation.alerts.conflictDesc", { count: conflicts.length })}
            {conflicts.map((conflict, idx) => {
              const conflictStart = toDate(conflict.startTime);
              const conflictEnd = toDate(conflict.endTime);
              return (
                <div key={idx} className="mt-2 text-sm">
                  • {conflict.userFullName || conflict.userEmail} (
                  {conflictStart && format(conflictStart, "HH:mm")} -{" "}
                  {conflictEnd && format(conflictEnd, "HH:mm")})
                </div>
              );
            })}
          </AlertDescription>
        </Alert>
      )}

      <FormSelect
        name="horseId"
        label={t("reservation.labels.horse")}
        form={form}
        options={horseOptions}
        placeholder={t("reservation.placeholders.horse")}
        required
      />

      <FormInput
        name="contactInfo"
        label={t("reservation.labels.contactInfo")}
        form={form}
        placeholder={t("reservation.placeholders.contactInfo")}
      />

      <FormTextarea
        name="notes"
        label={t("reservation.labels.notes")}
        form={form}
        placeholder={t("reservation.placeholders.notes")}
        rows={3}
      />

      {/* Recurring Booking Option - Only for new reservations */}
      {!isEditMode && (
        <div className="flex items-center space-x-2 p-3 rounded-md border bg-muted/50">
          <Checkbox
            id="recurringWeekly"
            checked={form.watch("recurringWeekly")}
            onCheckedChange={(checked) =>
              form.setValue("recurringWeekly", checked === true)
            }
          />
          <div className="space-y-0.5">
            <Label
              htmlFor="recurringWeekly"
              className="text-sm font-medium cursor-pointer"
            >
              {t("reservation.labels.recurringWeekly")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("reservation.descriptions.recurringWeekly")}
            </p>
          </div>
        </div>
      )}

      {/* Delete Section - Only shown in edit mode */}
      {isEditMode && onDelete && (
        <div className="border-t pt-4 mt-4">
          {!showDeleteConfirm ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("reservation.actions.cancelButton")}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("reservation.delete.confirmText")}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? t("reservation.actions.cancelling")
                    : t("reservation.actions.confirmCancel")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {t("reservation.actions.keepIt")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </BaseFormDialog>
  );
}
