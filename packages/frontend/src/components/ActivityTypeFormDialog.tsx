import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import {
  FormInput,
  FormSelect,
  FormColorPicker,
  FormCheckboxGroup,
} from "@/components/form";
import { Badge } from "@/components/ui/badge";
import type {
  ActivityTypeConfig,
  ActivityTypeCategory,
} from "@/types/activity";
import { DEFAULT_COLORS } from "@/types/activity";

const activityTypeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g., #ef4444)"),
  category: z.enum(["Sport", "Care", "Breeding"]),
  roles: z.array(z.string()).min(1, "Select at least one role"),
});

type ActivityTypeFormData = z.infer<typeof activityTypeSchema>;

interface ActivityTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType?: ActivityTypeConfig;
  onSave: (data: {
    name: string;
    color: string;
    category: ActivityTypeCategory;
    roles: string[];
    icon?: string;
  }) => Promise<void>;
}

export function ActivityTypeFormDialog({
  open,
  onOpenChange,
  activityType,
  onSave,
}: ActivityTypeFormDialogProps) {
  const { t } = useTranslation(["constants", "activities"]);
  const isEditMode = !!activityType;
  const isStandardType = activityType?.isStandard ?? false;

  const ACTIVITY_CATEGORIES = useMemo(
    () => [
      {
        value: "Sport" as ActivityTypeCategory,
        label: t("constants:activityCategories.sport"),
      },
      {
        value: "Care" as ActivityTypeCategory,
        label: t("constants:activityCategories.care"),
      },
      {
        value: "Breeding" as ActivityTypeCategory,
        label: t("constants:activityCategories.breeding"),
      },
    ],
    [t],
  );

  const AVAILABLE_ROLES = useMemo(
    () => [
      { value: "owner", label: t("constants:activityRoles.owner") },
      { value: "trainer", label: t("constants:activityRoles.trainer") },
      { value: "rider", label: t("constants:activityRoles.rider") },
      { value: "groom", label: t("constants:activityRoles.groom") },
      {
        value: "veterinarian",
        label: t("constants:activityRoles.veterinarian"),
      },
      { value: "farrier", label: t("constants:activityRoles.farrier") },
      { value: "dentist", label: t("constants:activityRoles.dentist") },
      { value: "instructor", label: t("constants:activityRoles.instructor") },
      { value: "stable-hand", label: t("constants:activityRoles.stablehand") },
    ],
    [t],
  );

  const { form, handleSubmit, resetForm } = useFormDialog<ActivityTypeFormData>(
    {
      schema: activityTypeSchema,
      defaultValues: {
        name: "",
        color: "#6366f1", // Default indigo
        category: "Sport",
        roles: [],
      },
      onSubmit: async (data) => {
        await onSave({
          name: data.name,
          color: data.color,
          category: data.category,
          roles: data.roles,
        });
      },
      onSuccess: () => {
        onOpenChange(false);
      },
      successMessage: isEditMode
        ? "Activity type updated successfully"
        : "Activity type created successfully",
      errorMessage: isEditMode
        ? "Failed to update activity type"
        : "Failed to create activity type",
    },
  );

  // Reset form when dialog opens with activity type data
  useEffect(() => {
    if (activityType) {
      resetForm({
        name: activityType.name,
        color: activityType.color,
        category: activityType.category,
        roles: activityType.roles,
      });
    } else {
      resetForm();
    }
  }, [activityType, open]);

  const dialogTitle = (
    <div className="flex items-center gap-2">
      <span>{isEditMode ? "Edit Activity Type" : "Add Activity Type"}</span>
      {isStandardType && (
        <Badge variant="outline" className="text-xs">
          Standard
        </Badge>
      )}
    </div>
  );

  const dialogDescription = isStandardType
    ? "Standard types: Only color, icon, and status can be modified."
    : isEditMode
      ? "Modify the activity type configuration."
      : "Create a custom activity type for your stable.";

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle as any}
      description={dialogDescription}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? "Update" : "Create"}
      maxWidth="sm:max-w-[500px]"
    >
      <FormInput
        name="name"
        label="Name"
        form={form}
        placeholder="e.g., Dentist, Riding, Foaling"
        disabled={isStandardType}
        required
      />

      <FormColorPicker
        name="color"
        label="Color"
        form={form}
        colors={DEFAULT_COLORS}
        required
      />

      <FormSelect
        name="category"
        label="Category"
        form={form}
        options={ACTIVITY_CATEGORIES}
        placeholder="Select category"
        disabled={isStandardType}
        required
      />

      <FormCheckboxGroup
        name="roles"
        label="Roles"
        form={form}
        options={AVAILABLE_ROLES}
        columns={2}
        helperText="Select one or more roles that can perform this activity type."
        disabled={isStandardType}
        required
      />
    </BaseFormDialog>
  );
}
