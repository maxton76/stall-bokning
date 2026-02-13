import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormSelect, FormTextarea } from "@/components/form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FacilityScheduleEditor } from "@/components/facility/FacilityScheduleEditor";
import { FacilityExceptionsManager } from "@/components/facility/FacilityExceptionsManager";
import type {
  Facility,
  FacilityType,
  TimeSlotDuration,
  FacilityAvailabilitySchedule,
  WeeklySchedule,
  ScheduleException,
  TimeBlock,
} from "@/types/facility";
import { createDefaultSchedule } from "@equiduty/shared";
import { migrateLegacyAvailability } from "@equiduty/shared/utils/facilityAvailability";

const FACILITY_TYPE_KEYS: FacilityType[] = [
  "transport",
  "water_treadmill",
  "indoor_arena",
  "outdoor_arena",
  "galloping_track",
  "lunging_ring",
  "paddock",
  "solarium",
  "jumping_yard",
  "treadmill",
  "vibration_plate",
  "pasture",
  "walker",
  "other",
];

const TIME_SLOT_KEYS = ["15", "30", "60"] as const;

const STATUS_KEYS = ["active", "inactive", "maintenance"] as const;

// Schema will be created with useMemo inside component for translations
type FacilityFormData = {
  name: string;
  type: FacilityType;
  description?: string;
  status: "active" | "inactive" | "maintenance";
  planningWindowOpens: number;
  planningWindowCloses: number;
  maxHorsesPerReservation: number;
  minTimeSlotDuration: TimeSlotDuration;
  maxHoursPerReservation: number;
  maxDurationUnit: "hours" | "days";
};

interface FacilityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility?: Facility;
  onSave: (
    data: FacilityFormData & {
      availabilitySchedule: FacilityAvailabilitySchedule;
    },
  ) => Promise<void>;
}

export function FacilityFormDialog({
  open,
  onOpenChange,
  facility,
  onSave,
}: FacilityFormDialogProps) {
  const { t } = useTranslation("facilities");
  const isEditMode = !!facility;

  // Manage schedule state separately from form (not easily handled by react-hook-form)
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    () => createDefaultSchedule().weeklySchedule,
  );
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);

  // Build translated facility type options
  const facilityTypeOptions = useMemo(
    () =>
      FACILITY_TYPE_KEYS.map((key) => ({
        value: key,
        label: t(`types.${key}`),
      })),
    [t],
  );

  // Build translated time slot options
  const timeSlotOptions = useMemo(
    () =>
      TIME_SLOT_KEYS.map((key) => ({
        value: key,
        label: t(`timeSlots.${key}`),
      })),
    [t],
  );

  // Build translated status options
  const statusOptions = useMemo(
    () =>
      STATUS_KEYS.map((key) => ({
        value: key,
        label: t(`facilityStatus.${key}`),
      })),
    [t],
  );

  // Create schema with translated messages
  const facilitySchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("form.validation.nameRequired")).max(100),
        type: z.enum([
          "transport",
          "water_treadmill",
          "indoor_arena",
          "outdoor_arena",
          "galloping_track",
          "lunging_ring",
          "paddock",
          "solarium",
          "jumping_yard",
          "treadmill",
          "vibration_plate",
          "pasture",
          "walker",
          "other",
        ]),
        description: z.string().optional(),
        status: z.enum(["active", "inactive", "maintenance"]),
        planningWindowOpens: z.coerce.number().min(0).max(365),
        planningWindowCloses: z.coerce.number().min(0).max(168),
        maxHorsesPerReservation: z.coerce.number().min(1).max(50),
        minTimeSlotDuration: z
          .enum(["15", "30", "60"])
          .transform((val) => parseInt(val, 10) as TimeSlotDuration),
        maxHoursPerReservation: z.coerce.number().min(1).max(720),
        maxDurationUnit: z.enum(["hours", "days"]),
      }),
    [t],
  );

  const { form, handleSubmit, resetForm } = useFormDialog<FacilityFormData>({
    schema: facilitySchema,
    defaultValues: {
      name: "",
      type: "indoor_arena",
      description: "",
      status: "active",
      planningWindowOpens: 14,
      planningWindowCloses: 1,
      maxHorsesPerReservation: 1,
      minTimeSlotDuration: 30 as 15 | 30 | 60,
      maxHoursPerReservation: 2,
      maxDurationUnit: "hours",
    },
    onSubmit: async (data) => {
      const { maxDurationUnit, ...rest } = data;
      const submitData = {
        ...rest,
        maxHoursPerReservation:
          maxDurationUnit === "days"
            ? rest.maxHoursPerReservation * 24
            : rest.maxHoursPerReservation,
        availabilitySchedule: {
          weeklySchedule,
          exceptions,
        },
      };
      await onSave(
        submitData as FacilityFormData & {
          availabilitySchedule: FacilityAvailabilitySchedule;
        },
      );
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? t("messages.updateSuccess")
      : t("messages.createSuccess"),
    errorMessage: isEditMode
      ? t("messages.updateError", { defaultValue: "Failed to update facility" })
      : t("messages.createError", {
          defaultValue: "Failed to create facility",
        }),
  });

  // Reset form when dialog opens with facility data
  useEffect(() => {
    if (facility) {
      const hours = facility.maxHoursPerReservation;
      const useDays = hours >= 24 && hours % 24 === 0;
      resetForm({
        name: facility.name,
        type: facility.type,
        description: facility.description || "",
        status: facility.status,
        planningWindowOpens: facility.planningWindowOpens,
        planningWindowCloses: facility.planningWindowCloses,
        maxHorsesPerReservation: facility.maxHorsesPerReservation,
        minTimeSlotDuration: facility.minTimeSlotDuration as 15 | 30 | 60,
        maxHoursPerReservation: useDays ? hours / 24 : hours,
        maxDurationUnit: useDays ? "days" : "hours",
      });

      // Load schedule from facility or migrate legacy fields
      if (facility.availabilitySchedule) {
        setWeeklySchedule(facility.availabilitySchedule.weeklySchedule);
        setExceptions(facility.availabilitySchedule.exceptions || []);
      } else {
        // Migrate legacy fields
        const migrated = migrateLegacyAvailability({
          availableFrom: facility.availableFrom,
          availableTo: facility.availableTo,
          daysAvailable: facility.daysAvailable,
        });
        setWeeklySchedule(migrated.weeklySchedule);
        setExceptions([]);
      }
    } else {
      resetForm();
      const defaultSchedule = createDefaultSchedule();
      setWeeklySchedule(defaultSchedule.weeklySchedule);
      setExceptions([]);
    }
  }, [facility, open]);

  const handleAddException = async (exception: {
    date: string;
    type: "closed" | "modified";
    timeBlocks: TimeBlock[];
    reason?: string;
  }) => {
    setExceptions((prev) => [
      ...prev,
      {
        ...exception,
        createdBy: "",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleRemoveException = (date: string) => {
    setExceptions((prev) => prev.filter((e) => e.date !== date));
  };

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? t("form.title.edit") : t("form.title.create")}
      description={
        isEditMode ? t("form.description.edit") : t("form.description.create")
      }
      form={form}
      onSubmit={handleSubmit}
      submitLabel={
        isEditMode ? t("form.submit.update") : t("form.submit.create")
      }
      maxWidth="sm:max-w-[700px]"
    >
      {/* Section 1: Basic Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          {t("form.sections.basicInfo")}
        </h3>

        <FormSelect
          name="type"
          label={t("form.labels.type")}
          form={form}
          options={facilityTypeOptions}
          placeholder={t("form.placeholders.type")}
          required
        />

        <FormInput
          name="name"
          label={t("form.labels.name")}
          form={form}
          placeholder={t("form.placeholders.name")}
          required
        />

        <FormTextarea
          name="description"
          label={t("form.labels.description")}
          form={form}
          placeholder={t("form.placeholders.description")}
          rows={3}
        />

        <FormSelect
          name="status"
          label={t("form.labels.status")}
          form={form}
          options={statusOptions}
        />
      </div>

      {/* Section 2: Booking Rules */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          {t("form.sections.bookingRules")}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="planningWindowOpens"
            label={t("bookingRules.planningWindowOpens")}
            form={form}
            type="number"
            placeholder="14"
          />

          <FormInput
            name="planningWindowCloses"
            label={t("bookingRules.planningWindowCloses")}
            form={form}
            type="number"
            placeholder="1"
          />
        </div>

        <FormInput
          name="maxHorsesPerReservation"
          label={t("bookingRules.maxHorsesPerReservation")}
          form={form}
          type="number"
          placeholder="1"
        />

        <FormSelect
          name="minTimeSlotDuration"
          label={t("bookingRules.minSlotDuration")}
          form={form}
          options={timeSlotOptions}
          required
        />

        <div className="space-y-2">
          <Label>{t("bookingRules.maxDurationPerReservation")}</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              className="flex-1"
              placeholder="2"
              {...form.register("maxHoursPerReservation", {
                valueAsNumber: true,
              })}
            />
            <Select
              value={form.watch("maxDurationUnit")}
              onValueChange={(value: "hours" | "days") => {
                const currentValue = form.getValues("maxHoursPerReservation");
                const currentUnit = form.getValues("maxDurationUnit");
                if (currentUnit === "hours" && value === "days") {
                  form.setValue(
                    "maxHoursPerReservation",
                    currentValue >= 24 && currentValue % 24 === 0
                      ? currentValue / 24
                      : 1,
                  );
                } else if (currentUnit === "days" && value === "hours") {
                  form.setValue("maxHoursPerReservation", currentValue * 24);
                }
                form.setValue("maxDurationUnit", value);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">
                  {t("bookingRules.durationUnit.hours")}
                </SelectItem>
                <SelectItem value="days">
                  {t("bookingRules.durationUnit.days")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.formState.errors.maxHoursPerReservation && (
            <p className="text-sm text-destructive">
              {form.formState.errors.maxHoursPerReservation.message}
            </p>
          )}
        </div>
      </div>

      {/* Section 3: Availability Schedule */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          {t("form.sections.availability")}
        </h3>

        <FacilityScheduleEditor
          schedule={weeklySchedule}
          onChange={setWeeklySchedule}
        />
      </div>

      {/* Section 4: Exceptions */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{t("schedule.exceptions")}</h3>

        <FacilityExceptionsManager
          exceptions={exceptions}
          onAdd={handleAddException}
          onRemove={handleRemoveException}
        />
      </div>
    </BaseFormDialog>
  );
}
