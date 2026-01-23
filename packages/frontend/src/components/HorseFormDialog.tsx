import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { format } from "date-fns";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckboxGroup,
  FormDatePicker,
} from "@/components/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Bell } from "lucide-react";
import { EquipmentListEditor } from "@/components/EquipmentListEditor";
import { CategoryInstructionsDropdown } from "@/components/CategoryInstructionsDropdown";
import type { EquipmentItem } from "@stall-bokning/shared";
import type { RoutineCategory } from "@shared/types";
import type { Horse, HorseColor, HorseGroup } from "@/types/roles";
import {
  useTranslatedHorseColors,
  useTranslatedHorseGenders,
  useTranslatedHorseUsage,
} from "@/hooks/useTranslatedConstants";
import { Timestamp } from "firebase/firestore";
import { toDate } from "@/utils/timestampUtils";

interface HorseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    horseData: Omit<
      Horse,
      | "id"
      | "ownerId"
      | "ownerName"
      | "ownerEmail"
      | "createdAt"
      | "updatedAt"
      | "lastModifiedBy"
    >,
  ) => Promise<void>;
  horse?: Horse | null;
  title?: string;
  allowStableAssignment?: boolean;
  availableStables?: Array<{ id: string; name: string }>;
  availableGroups?: HorseGroup[];
}

const horseSchema = z
  .object({
    name: z.string().min(1, "Horse name is required").max(100),
    breed: z.string().optional(),
    age: z.number().min(0).max(50).optional(),
    color: z.string().min(1, "Color is required"),
    gender: z.enum(["stallion", "mare", "gelding"]).optional(),
    isExternal: z.boolean(),
    dateOfArrival: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.date().optional(),
    ),
    currentStableId: z.string().optional(),
    usage: z.array(z.string()),
    horseGroupId: z.string().optional(),
    ueln: z.string().optional(),
    chipNumber: z.string().optional(),
    federationNumber: z.string().optional(),
    feiPassNumber: z.string().optional(),
    feiExpiryDate: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.date().optional(),
    ),
    sire: z.string().optional(),
    dam: z.string().optional(),
    damsire: z.string().optional(),
    withersHeight: z.number().min(0).optional(),
    dateOfBirth: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.date().optional(),
    ),
    studbook: z.string().optional(),
    breeder: z.string().optional(),
    notes: z.string().optional(),
    specialInstructions: z.string().optional(),
    categoryInstructions: z
      .object({
        preparation: z.string().optional(),
        feeding: z.string().optional(),
        medication: z.string().optional(),
        blanket: z.string().optional(),
        turnout: z.string().optional(),
        bring_in: z.string().optional(),
        mucking: z.string().optional(),
        water: z.string().optional(),
        health_check: z.string().optional(),
        safety: z.string().optional(),
        cleaning: z.string().optional(),
        other: z.string().optional(),
      })
      .optional(),
    equipment: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          location: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .optional(),
  })
  .refine((data) => data.isExternal || data.dateOfArrival, {
    message: "Date of arrival is required for non-external horses",
    path: ["dateOfArrival"],
  });

type HorseFormData = z.infer<typeof horseSchema>;

export function HorseFormDialog({
  open,
  onOpenChange,
  onSave,
  horse,
  title,
  allowStableAssignment = false,
  availableStables = [],
  availableGroups = [],
}: HorseFormDialogProps) {
  const { t } = useTranslation(["horses", "common"]);
  const isEditMode = !!horse;

  // Get translated constants
  const translatedColors = useTranslatedHorseColors();
  const translatedGenders = useTranslatedHorseGenders();
  const translatedUsageOptions = useTranslatedHorseUsage();

  const { form, handleSubmit, resetForm } = useFormDialog<HorseFormData>({
    schema: horseSchema,
    defaultValues: {
      name: "",
      breed: "",
      age: undefined,
      color: "",
      gender: undefined,
      isExternal: false,
      dateOfArrival: undefined,
      currentStableId: "none",
      usage: [],
      horseGroupId: "none",
      ueln: "",
      chipNumber: "",
      federationNumber: "",
      feiPassNumber: "",
      feiExpiryDate: undefined,
      sire: "",
      dam: "",
      damsire: "",
      withersHeight: undefined,
      dateOfBirth: undefined,
      studbook: "",
      breeder: "",
      notes: "",
      specialInstructions: "",
      categoryInstructions: {
        preparation: "",
        feeding: "",
        medication: "",
        blanket: "",
        turnout: "",
        bring_in: "",
        mucking: "",
        water: "",
        health_check: "",
        safety: "",
        cleaning: "",
        other: "",
      },
      equipment: [],
    },
    onSubmit: async (data) => {
      // Find stable name if stable is selected
      let stableName = horse?.currentStableName;
      if (data.currentStableId && !stableName) {
        const stable = availableStables.find(
          (s) => s.id === data.currentStableId,
        );
        stableName = stable?.name;
      }

      // Prepare data for save
      const horseData: any = {
        name: data.name.trim(),
        breed: data.breed?.trim() || undefined,
        age: data.age || undefined,
        color: data.color as HorseColor,
        gender: data.gender || undefined,
        isExternal: data.isExternal,
        notes: data.notes?.trim() || undefined,
        specialInstructions: data.specialInstructions?.trim() || undefined,
        categoryInstructions: data.categoryInstructions
          ? Object.fromEntries(
              Object.entries(data.categoryInstructions).map(([key, value]) => [
                key,
                value?.trim() || "",
              ]),
            )
          : undefined,
        equipment:
          data.equipment && data.equipment.length > 0
            ? data.equipment
            : undefined,
        status: "active" as const,
        ueln: data.ueln?.trim() || undefined,
        chipNumber: data.chipNumber?.trim() || undefined,
        federationNumber: data.federationNumber?.trim() || undefined,
        feiPassNumber: data.feiPassNumber?.trim() || undefined,
        feiExpiryDate: data.feiExpiryDate
          ? Timestamp.fromDate(data.feiExpiryDate)
          : undefined,
        sire: data.sire?.trim() || undefined,
        dam: data.dam?.trim() || undefined,
        damsire: data.damsire?.trim() || undefined,
        withersHeight: data.withersHeight || undefined,
        dateOfBirth: data.dateOfBirth
          ? Timestamp.fromDate(data.dateOfBirth)
          : undefined,
        studbook: data.studbook?.trim() || undefined,
        breeder: data.breeder?.trim() || undefined,
      };

      // Conditional fields for non-external horses
      if (!data.isExternal) {
        horseData.dateOfArrival = data.dateOfArrival
          ? Timestamp.fromDate(data.dateOfArrival)
          : undefined;
        horseData.currentStableId =
          data.currentStableId === "none" ? undefined : data.currentStableId;
        horseData.currentStableName = stableName;
        horseData.assignedAt =
          data.currentStableId && data.currentStableId !== "none"
            ? horse?.assignedAt || Timestamp.now()
            : undefined;
        horseData.usage = data.usage.length > 0 ? data.usage : undefined;

        // Group assignment
        if (data.horseGroupId && data.horseGroupId !== "none") {
          horseData.horseGroupId = data.horseGroupId;
          const group = availableGroups.find((g) => g.id === data.horseGroupId);
          horseData.horseGroupName = group?.name;
        }
      }

      await onSave(horseData);
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: isEditMode
      ? t("horses:messages.updateSuccess")
      : t("horses:messages.addSuccess"),
    errorMessage: isEditMode
      ? t("common:messages.updateError")
      : t("common:messages.createError"),
  });

  // Helper to format date for HTML5 date input (YYYY-MM-DD)
  const formatDateForInput = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return "";
    const date = toDate(timestamp);
    if (!date) return "";
    return date.toISOString().split("T")[0]!;
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (horse) {
      resetForm({
        name: horse.name || "",
        breed: horse.breed || "",
        age: horse.age || undefined,
        color: horse.color || "",
        gender: horse.gender || undefined,
        isExternal: horse.isExternal ?? false,
        dateOfArrival: formatDateForInput(horse.dateOfArrival) as any,
        currentStableId: horse.currentStableId || "none",
        usage: horse.usage || [],
        horseGroupId: horse.horseGroupId || "none",
        ueln: horse.ueln || "",
        chipNumber: horse.chipNumber || "",
        federationNumber: horse.federationNumber || "",
        feiPassNumber: horse.feiPassNumber || "",
        feiExpiryDate: formatDateForInput(horse.feiExpiryDate) as any,
        sire: horse.sire || "",
        dam: horse.dam || "",
        damsire: horse.damsire || "",
        withersHeight: horse.withersHeight || undefined,
        dateOfBirth: formatDateForInput(horse.dateOfBirth) as any,
        studbook: horse.studbook || "",
        breeder: horse.breeder || "",
        notes: horse.notes || "",
        specialInstructions: horse.specialInstructions || "",
        categoryInstructions: horse.categoryInstructions || {
          preparation: "",
          feeding: "",
          medication: "",
          blanket: "",
          turnout: "",
          bring_in: "",
          mucking: "",
          water: "",
          health_check: "",
          safety: "",
          cleaning: "",
          other: "",
        },
        equipment: horse.equipment || [],
      });
    } else {
      resetForm();
    }
  }, [horse, open]);

  const isExternal = form.watch("isExternal");

  // Debug: Log form validation errors
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.error("🚨 Form validation errors:", form.formState.errors);
    }
  }, [form.formState.errors]);

  const colorOptions = translatedColors.map((c) => ({
    value: c.value,
    label: c.label,
  }));
  const genderOptions = translatedGenders.map((g) => ({
    value: g.value,
    label: g.label,
  }));
  const stableOptions = [
    { value: "none", label: t("horses:options.noStable") },
    ...availableStables.map((s) => ({ value: s.id, label: s.name })),
  ];
  const groupOptions = [
    { value: "none", label: t("horses:options.noGroup") },
    ...availableGroups.map((g) => ({ value: g.id, label: g.name })),
  ];

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        title ||
        (isEditMode
          ? t("horses:form.title.edit")
          : t("horses:form.title.create"))
      }
      description={
        isEditMode
          ? t("horses:form.description.edit")
          : t("horses:form.description.create")
      }
      form={form}
      onSubmit={handleSubmit}
      submitLabel={
        isEditMode ? t("horses:buttons.update") : t("horses:buttons.addHorse")
      }
      maxWidth="sm:max-w-[600px]"
    >
      <FormInput
        name="name"
        label={t("horses:form.labels.name")}
        form={form}
        placeholder={t("horses:form.placeholders.name")}
        required
      />

      <FormInput
        name="breed"
        label={t("horses:form.labels.breed")}
        form={form}
        placeholder={t("horses:form.placeholders.breed")}
      />

      {/* Is External Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="isExternal"
          checked={isExternal}
          onCheckedChange={(checked) => {
            form.setValue("isExternal", checked);
            if (checked) {
              form.setValue("dateOfArrival", undefined);
              form.setValue("currentStableId", "");
              form.setValue("usage", []);
            }
          }}
        />
        <Label
          htmlFor="isExternal"
          className="text-sm font-normal cursor-pointer"
        >
          {t("horses:form.labels.isExternal")}
        </Label>
      </div>

      {/* Date of Arrival - Required for non-external horses */}
      {!isExternal && (
        <FormDatePicker
          name="dateOfArrival"
          label={t("horses:form.labels.dateOfArrival")}
          form={form}
          required
        />
      )}

      {/* Location/Stable Assignment - Hidden for external horses */}
      {!isExternal && allowStableAssignment && availableStables.length > 0 && (
        <FormSelect
          name="currentStableId"
          label={t("horses:form.labels.location")}
          form={form}
          options={stableOptions}
        />
      )}

      {/* Usage - Hidden for external horses */}
      {!isExternal && (
        <FormCheckboxGroup
          name="usage"
          label={t("horses:form.labels.usage")}
          form={form}
          options={translatedUsageOptions.map((o) => ({
            value: o.value,
            label: `${o.icon} ${o.label}`,
          }))}
        />
      )}

      {/* Horse Group - Hidden for external horses */}
      {!isExternal && availableGroups.length > 0 && (
        <FormSelect
          name="horseGroupId"
          label={t("horses:form.labels.group")}
          form={form}
          options={groupOptions}
        />
      )}

      {/* Expanded Identification Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="ueln"
            label={t("horses:form.labels.ueln")}
            form={form}
            placeholder={t("horses:form.placeholders.ueln")}
          />
          <FormInput
            name="chipNumber"
            label={t("horses:form.labels.chipNumber")}
            form={form}
            placeholder={t("horses:form.placeholders.chipNumber")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            name="federationNumber"
            label={t("horses:form.labels.federationNumber")}
            form={form}
            placeholder={t("horses:form.placeholders.federationNumber")}
          />
          <FormInput
            name="feiPassNumber"
            label={t("horses:form.labels.feiPassNumber")}
            form={form}
            placeholder={t("horses:form.placeholders.feiPassNumber")}
          />
        </div>

        <FormDatePicker
          name="feiExpiryDate"
          label={t("horses:form.labels.feiExpiryDate")}
          form={form}
        />
      </div>

      <FormSelect
        name="color"
        label={t("horses:form.labels.color")}
        form={form}
        options={colorOptions}
        placeholder={t("horses:options.selectColor")}
        required
      />

      <FormSelect
        name="gender"
        label={t("horses:form.labels.gender")}
        form={form}
        options={genderOptions}
        placeholder={t("horses:options.selectGender")}
      />

      <FormDatePicker
        name="dateOfBirth"
        label={t("horses:form.labels.dateOfBirth")}
        form={form}
      />

      {/* Collapsible Additional Details Section */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:underline">
          <span>{t("horses:form.sections.additionalDetails")}</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="sire"
              label={t("horses:form.labels.sire")}
              form={form}
              placeholder={t("horses:form.placeholders.sire")}
            />
            <FormInput
              name="dam"
              label={t("horses:form.labels.dam")}
              form={form}
              placeholder={t("horses:form.placeholders.dam")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="withersHeight"
              label={t("horses:form.labels.withersHeight")}
              form={form}
              type="number"
              placeholder={t("horses:form.placeholders.withersHeight")}
            />
            <FormInput
              name="damsire"
              label={t("horses:form.labels.damsire")}
              form={form}
              placeholder={t("horses:form.placeholders.damsire")}
            />
          </div>

          <FormInput
            name="studbook"
            label={t("horses:form.labels.studbook")}
            form={form}
            placeholder={t("horses:form.placeholders.studbook")}
          />

          <FormInput
            name="breeder"
            label={t("horses:form.labels.breeder")}
            form={form}
            placeholder={t("horses:form.placeholders.breeder")}
          />
        </CollapsibleContent>
      </Collapsible>

      <FormTextarea
        name="notes"
        label={t("horses:form.labels.notes")}
        form={form}
        placeholder={t("horses:form.placeholders.notes")}
        rows={3}
      />

      {/* Special Instructions Section */}
      <Collapsible className="space-y-2 border rounded-lg p-4">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            type="button"
            className="flex w-full items-center justify-between p-0 hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <span className="font-medium">
                {t("horses:form.sections.specialInstructions")}
              </span>
              {(form.watch("specialInstructions") ||
                (form.watch("equipment") &&
                  form.watch("equipment")!.length > 0)) && (
                <Badge variant="secondary" className="ml-2">
                  {t("horses:status.active")}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            {t("horses:form.help.specialInstructions")}
          </p>

          <FormTextarea
            name="specialInstructions"
            label={t("horses:form.labels.specialInstructions")}
            form={form}
            placeholder={t("horses:form.placeholders.specialInstructions")}
            rows={3}
          />
          <p className="text-xs text-muted-foreground -mt-2">
            {t("horses:form.labels.generalInstructionsHint")}
          </p>

          {/* Category-Specific Instructions */}
          <div className="space-y-2">
            <Label>
              {t("horses:form.labels.categoryInstructions")}
              <span className="text-xs text-muted-foreground ml-2">
                {t("horses:form.labels.categoryInstructionsHint")}
              </span>
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              {t("horses:form.labels.categoryInstructionsDescription")}
            </p>
            <CategoryInstructionsDropdown
              value={form.watch("categoryInstructions") || {}}
              onChange={(value) => form.setValue("categoryInstructions", value)}
            />
          </div>

          <EquipmentListEditor
            value={form.watch("equipment") || []}
            onChange={(items) =>
              form.setValue("equipment", items as EquipmentItem[], {
                shouldDirty: true,
              })
            }
          />
        </CollapsibleContent>
      </Collapsible>
    </BaseFormDialog>
  );
}
