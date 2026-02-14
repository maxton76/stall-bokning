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
import { Input } from "@/components/ui/input";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
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
import { HorseMultiSelect } from "@/components/HorseMultiSelect";
import { HorseChipList } from "@/components/HorseChipList";
import { getHorseIds, getHorses } from "@/utils/reservationHelpers";
import { calculatePeakConcurrentHorses } from "@/utils/bookingValidation";
import { isApiError } from "@/lib/apiErrors";

// Schema will be created with useMemo inside component for translations
type ReservationFormData = {
  facilityId: string;
  date: Date;
  startTime: string;
  endTime: string;
  /** @deprecated Use horseIds instead */
  horseId?: string;
  /** Array of horse IDs for multi-horse bookings (preferred) */
  horseIds: string[];
  /** Number of external horses (not registered in the stable) */
  externalHorseCount: number;
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
    data: ReservationFormData & {
      adminOverride?: boolean;
      horseNames?: string[];
    },
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
  const { currentOrganizationId } = useOrganization();
  const { hasPermission, isSystemAdmin } = useOrgPermissions(
    currentOrganizationId,
  );
  const isEditMode = !!reservation;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [horseSelectionMode, setHorseSelectionMode] = useState<
    "byName" | "byCount"
  >("byName");
  const [conflictInfo, setConflictInfo] = useState<{
    message: string;
    suggestedSlots?: Array<{
      startTime: string;
      endTime: string;
      remainingCapacity: number;
    }>;
    remainingCapacity?: number;
  } | null>(null);

  // Determine if user can override availability
  const canOverride =
    user?.systemRole === "system_admin" ||
    (stableOwnerId != null && user?.uid === stableOwnerId);

  // Create schema with translated messages (maxHorses will be checked later)
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
          horseIds: z.array(z.string()).min(0),
          externalHorseCount: z.coerce.number().min(0).default(0),
          horseId: z.string().optional(), // Legacy field
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
        )
        .refine(
          (data) => {
            // At least one horse (stable or external) must be selected
            return data.horseIds.length + data.externalHorseCount > 0;
          },
          {
            message: t("reservation.validation.atLeastOneHorse"),
            path: ["horseIds"],
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
      setConflictInfo(null);
      setHorseSelectionMode("byName");
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
      horseIds: [],
      externalHorseCount: 0,
      contactInfo: "",
      notes: "",
      recurringWeekly: false,
    },
    onSubmit: async (data) => {
      // Clear any previous conflict info
      setConflictInfo(null);

      // Block submission if over capacity (multi-horse facilities)
      const totalHorses = data.horseIds.length + data.externalHorseCount;
      if (
        capacityInfo != null &&
        totalHorses > capacityInfo.remainingCapacity
      ) {
        throw new Error(
          t("reservation.capacity.overCapacity", {
            selected: totalHorses,
            remaining: capacityInfo.remainingCapacity,
          }),
        );
      }

      // Save booking history for smart defaults
      if (!isEditMode && data.facilityId) {
        const durationMinutes = calculateDuration(data.startTime, data.endTime);
        addToBookingHistory(data.facilityId, durationMinutes);
        saveLastUsedFacilityId(data.facilityId);
      }

      // Get horse names for the selected IDs
      const selectedHorses = horses.filter((h) => data.horseIds.includes(h.id));
      const horseNames = selectedHorses.map((h) => h.name);

      try {
        await onSave({
          ...data,
          horseNames, // Include horse names for denormalization
          adminOverride: adminOverride || undefined,
        });
      } catch (err) {
        // Handle 409 conflict with suggested alternative slots
        if (
          isApiError(err) &&
          err.status === 409 &&
          err.details?.suggestedSlots
        ) {
          setConflictInfo({
            message: err.message,
            suggestedSlots: err.details.suggestedSlots as Array<{
              startTime: string;
              endTime: string;
              remainingCapacity: number;
            }>,
            remainingCapacity: err.details.remainingCapacity as number,
          });
        }
        throw err;
      }
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

  // Get selected facility to check maxHorsesPerReservation
  const selectedFacilityId = form.watch("facilityId");
  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);
  const maxHorses = selectedFacility?.maxHorsesPerReservation || 1;
  const isMultiHorseFacility = maxHorses > 1;

  // Determine horse scope based on user role
  // Elevated roles (schedule planner, org owner, stable manager, system admin) see all stable horses
  // Regular users see only their own horses
  const horseScope: "my" | "stable" = useMemo(() => {
    if (isSystemAdmin) return "stable";
    if (hasPermission("manage_schedules")) return "stable";
    if (stableOwnerId && user?.uid === stableOwnerId) return "stable";
    return "my";
  }, [isSystemAdmin, hasPermission, stableOwnerId, user?.uid]);

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
      const horseIds = getHorseIds(reservation);
      const extCount = reservation.externalHorseCount || 0;

      // Auto-detect horse selection mode from reservation data
      if (extCount > 0 && horseIds.length === 0) {
        setHorseSelectionMode("byCount");
      } else {
        setHorseSelectionMode("byName");
      }

      resetForm({
        facilityId: reservation.facilityId,
        date: startDate,
        startTime: format(startDate, "HH:mm"),
        endTime: format(endDate, "HH:mm"),
        horseIds,
        externalHorseCount: extCount,
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
        horseIds: [],
        contactInfo: "",
        notes: "",
        recurringWeekly: false,
      });
    } else {
      // Apply smart defaults when creating new reservation
      const smartDefaults = getSmartDefaults(facilities, new Date().getHours());
      const autoHorseIds = horses.length === 1 ? [horses[0]!.id] : [];

      resetForm({
        facilityId: smartDefaults.facilityId || "",
        date: new Date(),
        startTime: smartDefaults.startTime,
        endTime: smartDefaults.endTime,
        horseIds: autoHorseIds,
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

  // Clear conflict banner when relevant form fields change
  useEffect(() => {
    setConflictInfo(null);
  }, [facilityId, date, startTime, endTime]);

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

  // Compute capacity from existing conflicts (multi-horse facilities only)
  const capacityInfo = useMemo(() => {
    if (!isMultiHorseFacility) return null;
    return calculatePeakConcurrentHorses(conflicts, maxHorses);
  }, [conflicts, maxHorses, isMultiHorseFacility]);

  const selectedHorseIds = form.watch("horseIds") || [];
  const externalHorseCount = form.watch("externalHorseCount") || 0;
  const totalHorseCount = selectedHorseIds.length + externalHorseCount;
  const isOverCapacity =
    capacityInfo != null && totalHorseCount > capacityInfo.remainingCapacity;

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
  // Horse options no longer needed - using HorseMultiSelect instead

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
                  : capacityInfo != null
                    ? capacityInfo.remainingCapacity === 0
                      ? "full"
                      : capacityInfo.peakExistingHorses > 0
                        ? "limited"
                        : isOutsideAvailability
                          ? "limited"
                          : "available"
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

      {/* Capacity Conflict — Suggested Alternative Slots */}
      {conflictInfo && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("reservation.conflict.title")}</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{t("reservation.conflict.description")}</p>
            {conflictInfo.suggestedSlots &&
              conflictInfo.suggestedSlots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {t("reservation.conflict.suggestedSlots")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {conflictInfo.suggestedSlots.map((slot, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => {
                          const start = new Date(slot.startTime);
                          const end = new Date(slot.endTime);
                          form.setValue("startTime", format(start, "HH:mm"));
                          form.setValue("endTime", format(end, "HH:mm"));
                          setConflictInfo(null);
                        }}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {format(new Date(slot.startTime), "HH:mm")} –{" "}
                        {format(new Date(slot.endTime), "HH:mm")}
                        <span className="ml-1 text-muted-foreground">
                          (
                          {t("reservation.conflict.spotsAvailable", {
                            count: slot.remainingCapacity,
                          })}
                          )
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </AlertDescription>
        </Alert>
      )}

      {/* Horse Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t("reservation.labels.horses")}
          <span className="text-destructive ml-1">*</span>
        </Label>

        {/* Segmented toggle: By Name / By Count */}
        <div className="inline-flex rounded-lg border bg-muted p-0.5">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              horseSelectionMode === "byName"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setHorseSelectionMode("byName");
              form.setValue("externalHorseCount", 0);
            }}
          >
            {t("reservation.labels.horseSelectionByName")}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              horseSelectionMode === "byCount"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setHorseSelectionMode("byCount");
              form.setValue("horseIds", []);
            }}
          >
            {t("reservation.labels.horseSelectionByCount")}
          </button>
        </div>

        {/* By Name mode: HorseMultiSelect + chips */}
        {horseSelectionMode === "byName" && (
          <>
            {selectedFacility && (
              <HorseMultiSelect
                stableId={selectedFacility.stableId}
                selectedHorseIds={selectedHorseIds}
                onChange={(horseIds) => form.setValue("horseIds", horseIds)}
                placeholder={t("reservation.placeholders.horses")}
                disabled={form.formState.isSubmitting}
                maxSelectable={
                  capacityInfo?.remainingCapacity
                    ? Math.max(0, capacityInfo.remainingCapacity)
                    : undefined
                }
                scope={horseScope}
              />
            )}
            {!selectedFacility && (
              <p className="text-sm text-muted-foreground">
                {t("reservation.placeholders.selectFacilityFirst")}
              </p>
            )}

            {/* Display selected horses as chips */}
            {selectedFacility && (
              <HorseChipList
                horses={horses.filter((h) =>
                  (form.watch("horseIds") || []).includes(h.id),
                )}
                onRemove={(horseId: string) => {
                  const currentIds = form.watch("horseIds") || [];
                  form.setValue(
                    "horseIds",
                    currentIds.filter((id: string) => id !== horseId),
                  );
                }}
                disabled={form.formState.isSubmitting}
              />
            )}
          </>
        )}

        {/* By Count mode: Number stepper */}
        {horseSelectionMode === "byCount" && selectedFacility && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("reservation.labels.horseCount")}
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={
                  form.formState.isSubmitting ||
                  form.watch("externalHorseCount") <= 0
                }
                onClick={() => {
                  const current = form.watch("externalHorseCount");
                  form.setValue("externalHorseCount", Math.max(0, current - 1));
                }}
              >
                -
              </Button>
              <Input
                {...form.register("externalHorseCount", {
                  valueAsNumber: true,
                })}
                type="number"
                min={0}
                max={capacityInfo?.remainingCapacity ?? maxHorses}
                className="text-center w-20"
                disabled={form.formState.isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={
                  form.formState.isSubmitting ||
                  (capacityInfo?.remainingCapacity != null &&
                    form.watch("externalHorseCount") >=
                      capacityInfo.remainingCapacity)
                }
                onClick={() => {
                  const current = form.watch("externalHorseCount");
                  const maxExternal =
                    capacityInfo?.remainingCapacity ?? maxHorses;
                  form.setValue(
                    "externalHorseCount",
                    Math.min(current + 1, maxExternal),
                  );
                }}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("reservation.placeholders.externalHorseCount")}
            </p>
          </div>
        )}
        {horseSelectionMode === "byCount" && !selectedFacility && (
          <p className="text-sm text-muted-foreground">
            {t("reservation.placeholders.selectFacilityFirst")}
          </p>
        )}

        {/* Show dynamic capacity info for multi-horse facilities */}
        {selectedFacility && isMultiHorseFacility && capacityInfo && (
          <p className="text-xs text-muted-foreground">
            {capacityInfo.remainingCapacity === 0
              ? t("reservation.capacity.atCapacity", { max: maxHorses })
              : t("reservation.capacity.slotsUsed", {
                  used: capacityInfo.peakExistingHorses,
                  max: maxHorses,
                })}
            {capacityInfo.remainingCapacity > 0 &&
              ` — ${t("reservation.capacity.remainingSlots", { count: capacityInfo.remainingCapacity })}`}
          </p>
        )}

        {/* Over-capacity warning */}
        {isOverCapacity && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("reservation.capacity.overCapacity", {
                selected: totalHorseCount,
                remaining: capacityInfo!.remainingCapacity,
              })}
            </AlertDescription>
          </Alert>
        )}

        {/* Show validation error */}
        {form.formState.errors.horseIds && (
          <p className="text-sm text-destructive">
            {form.formState.errors.horseIds.message}
          </p>
        )}
      </div>

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
