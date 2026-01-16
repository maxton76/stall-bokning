import { useEffect, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormSelect, FormTextarea } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { checkReservationConflicts } from "@/services/facilityReservationService";
import { queryKeys } from "@/lib/queryClient";
import type { FacilityReservation } from "@/types/facilityReservation";
import type { Facility } from "@/types/facility";
import { toDate } from "@/utils/timestampUtils";

const reservationSchema = z
  .object({
    facilityId: z.string().min(1, "Facility is required"),
    date: z.date({ message: "Date is required" }),
    startTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    endTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    horseId: z.string().min(1, "Horse is required"),
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
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

type ReservationFormData = z.infer<typeof reservationSchema>;

interface FacilityReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: FacilityReservation;
  facilities: Facility[];
  horses?: Array<{ id: string; name: string }>;
  onSave: (data: ReservationFormData) => Promise<void>;
  onDelete?: (reservationId: string) => Promise<void>;
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
  initialValues,
}: FacilityReservationDialogProps) {
  const isEditMode = !!reservation;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset delete state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setShowDeleteConfirm(false);
      setIsDeleting(false);
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
    },
    onSubmit: async (data) => {
      await onSave(data);
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? "Reservation updated successfully"
      : "Reservation created successfully",
    errorMessage: isEditMode
      ? "Failed to update reservation"
      : "Failed to create reservation",
  });

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
      });
    } else {
      resetForm();
    }
  }, [reservation, initialValues, open]);

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

    return {
      startDateTime: Timestamp.fromDate(startDateTime),
      endDateTime: Timestamp.fromDate(endDateTime),
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

  const facilityOptions = facilities.map((f) => ({
    value: f.id,
    label: f.name,
  }));
  const horseOptions = horses.map((h) => ({ value: h.id, label: h.name }));

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Edit Reservation" : "New Reservation"}
      description={
        isEditMode
          ? "Update reservation details"
          : "Create a new facility reservation"
      }
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update Reservation" : "Create Reservation"}
      maxWidth="sm:max-w-[500px]"
    >
      <FormSelect
        name="facilityId"
        label="Facility"
        form={form}
        options={facilityOptions}
        placeholder="Select facility"
        required
      />

      {/* Date Picker - Custom implementation */}
      <div className="space-y-2">
        <Label>
          Date <span className="text-destructive">*</span>
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
              {date ? format(date, "PPP") : "Pick a date"}
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
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          name="startTime"
          label="Start time"
          form={form}
          type="time"
          required
        />
        <FormInput
          name="endTime"
          label="End time"
          form={form}
          type="time"
          required
        />
      </div>

      {/* Conflict Warning */}
      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scheduling Conflict</AlertTitle>
          <AlertDescription>
            This time slot overlaps with {conflicts.length} existing
            reservation(s).
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
        label="Horse"
        form={form}
        options={horseOptions}
        placeholder="Select horse"
        required
      />

      <FormInput
        name="contactInfo"
        label="Contact information"
        form={form}
        placeholder="Phone or email for contact"
      />

      <FormTextarea
        name="notes"
        label="Notes"
        form={form}
        placeholder="Additional notes or special requirements..."
        rows={3}
      />

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
              Cancel Reservation
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to cancel this reservation? This action
                cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Cancelling..." : "Yes, Cancel Reservation"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  No, Keep It
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </BaseFormDialog>
  );
}
