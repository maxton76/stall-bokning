import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormSelect, FormTextarea } from "@/components/form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  Facility,
  FacilityType,
  TimeSlotDuration,
} from "@/types/facility";

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

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

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
  availableFrom: string;
  availableTo: string;
  daysAvailable: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
};

interface FacilityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility?: Facility;
  onSave: (data: FacilityFormData) => Promise<void>;
}

export function FacilityFormDialog({
  open,
  onOpenChange,
  facility,
  onSave,
}: FacilityFormDialogProps) {
  const { t } = useTranslation("facilities");
  const isEditMode = !!facility;

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

  // Build translated day options
  const dayOptions = useMemo(
    () =>
      DAY_KEYS.map((key) => ({
        key,
        label: t(`days.${key}`),
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
        maxHoursPerReservation: z.coerce.number().min(1).max(24),
        availableFrom: z
          .string()
          .regex(
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            t("form.validation.timeInvalid"),
          ),
        availableTo: z
          .string()
          .regex(
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            t("form.validation.timeInvalid"),
          ),
        daysAvailable: z.object({
          monday: z.boolean(),
          tuesday: z.boolean(),
          wednesday: z.boolean(),
          thursday: z.boolean(),
          friday: z.boolean(),
          saturday: z.boolean(),
          sunday: z.boolean(),
        }),
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
      availableFrom: "08:00",
      availableTo: "20:00",
      daysAvailable: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false,
      },
    },
    onSubmit: async (data) => {
      await onSave(data);
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
      resetForm({
        name: facility.name,
        type: facility.type,
        description: facility.description || "",
        status: facility.status,
        planningWindowOpens: facility.planningWindowOpens,
        planningWindowCloses: facility.planningWindowCloses,
        maxHorsesPerReservation: facility.maxHorsesPerReservation,
        minTimeSlotDuration: facility.minTimeSlotDuration as 15 | 30 | 60,
        maxHoursPerReservation: facility.maxHoursPerReservation,
        availableFrom: facility.availableFrom,
        availableTo: facility.availableTo,
        daysAvailable: facility.daysAvailable,
      });
    } else {
      resetForm();
    }
  }, [facility, open]);

  const daysAvailable = form.watch("daysAvailable") ?? {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: false,
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
        />

        <FormInput
          name="maxHoursPerReservation"
          label={t("bookingRules.maxHoursPerReservation")}
          form={form}
          type="number"
          placeholder="2"
        />
      </div>

      {/* Section 3: Availability */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          {t("form.sections.availability")}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="availableFrom"
            label={t("availability.availableFrom")}
            form={form}
            type="time"
          />

          <FormInput
            name="availableTo"
            label={t("availability.availableTo")}
            form={form}
            type="time"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("availability.daysAvailable")}</Label>
          <div className="flex gap-2 flex-wrap">
            {dayOptions.map((day) => (
              <div key={day.key} className="flex items-center space-x-2">
                <Checkbox
                  id={day.key}
                  checked={daysAvailable[day.key]}
                  onCheckedChange={(checked) =>
                    form.setValue(`daysAvailable.${day.key}`, checked === true)
                  }
                />
                <Label htmlFor={day.key} className="font-normal cursor-pointer">
                  {day.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseFormDialog>
  );
}
