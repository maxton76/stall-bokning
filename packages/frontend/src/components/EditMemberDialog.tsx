import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput } from "@/components/form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type {
  OrganizationMember,
  OrganizationRole,
} from "../../../shared/src/types/organization";

type EditMemberFormData = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles: string[];
  primaryRole: string;
  showInPlanning: boolean;
  stableAccess: "all" | "specific";
  assignedStableIds?: string[];
};

const BASE_ROLE_KEYS = [
  "administrator",
  "schedule_planner",
  "veterinarian",
  "dentist",
  "farrier",
  "customer",
  "groom",
  "saddle_maker",
  "horse_owner",
  "rider",
  "inseminator",
] as const;

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
  onSave: (memberId: string, data: EditMemberFormData) => Promise<void>;
}

export function EditMemberDialog({
  open,
  onOpenChange,
  member,
  onSave,
}: EditMemberDialogProps) {
  const { t } = useTranslation(["organizations", "common"]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const { modules } = useSubscription();

  // Build role keys — include support_contact only when the tier has supportAccess
  const roleKeys = useMemo(() => {
    const keys: string[] = [...BASE_ROLE_KEYS];
    if (modules.supportAccess) {
      keys.push("support_contact");
    }
    return keys;
  }, [modules.supportAccess]);

  // Build translated organization roles
  const organizationRoles = useMemo(
    () =>
      roleKeys.map((key) => ({
        value: key as OrganizationRole,
        label: t(`organizations:invite.roles.${key}.label`),
        description: t(`organizations:invite.roles.${key}.description`),
      })),
    [t, roleKeys],
  );

  // Create schema with translated validation messages
  const editMemberSchema = useMemo(
    () =>
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phoneNumber: z.string().optional(),
        roles: z
          .array(z.string())
          .min(1, t("organizations:invite.validation.roleRequired")),
        primaryRole: z
          .string()
          .min(1, t("organizations:invite.validation.primaryRoleRequired")),
        showInPlanning: z.boolean().default(true),
        stableAccess: z.enum(["all", "specific"]).default("all"),
        assignedStableIds: z.array(z.string()).optional(),
      }),
    [t],
  );

  const { form, handleSubmit, resetForm } = useFormDialog<EditMemberFormData>({
    schema: editMemberSchema,
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      roles: [],
      primaryRole: "",
      showInPlanning: true,
      stableAccess: "all",
      assignedStableIds: [],
    },
    onSubmit: async (data) => {
      if (member) {
        await onSave(member.userId, data);
      }
    },
    onSuccess: () => {
      onOpenChange(false);
    },
    successMessage: t("organizations:members.updateSuccess"),
    errorMessage: t("organizations:members.updateError"),
  });

  // Watch form fields for conditional rendering
  const primaryRole = form.watch("primaryRole");
  const showInPlanning = form.watch("showInPlanning");

  const handleRoleToggle = (role: string) => {
    const newRoles = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];

    setSelectedRoles(newRoles);
    form.setValue("roles", newRoles, { shouldValidate: true });

    // If primary role is removed, clear it
    if (!newRoles.includes(primaryRole)) {
      form.setValue("primaryRole", "", { shouldValidate: true });
    }
  };

  const handlePrimaryRoleChange = (role: string) => {
    form.setValue("primaryRole", role, { shouldValidate: true });
  };

  // Populate form when member changes or dialog opens
  useEffect(() => {
    if (open && member) {
      const roles = member.roles || [];
      setSelectedRoles(roles);

      form.reset({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        phoneNumber: member.phoneNumber || "",
        roles: roles,
        primaryRole: member.primaryRole || "",
        showInPlanning: member.showInPlanning ?? true,
        stableAccess: member.stableAccess || "all",
        assignedStableIds: member.assignedStableIds || [],
      });
    }
  }, [open, member, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
      setSelectedRoles([]);
    }
  }, [open]);

  if (!member) return null;

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("organizations:members.editTitle")}
      description={t("organizations:members.editDescription")}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={t("common:buttons.save")}
      maxWidth="max-w-2xl"
    >
      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label>{t("organizations:invite.emailLabel")}</Label>
        <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
          {member.userEmail}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          name="firstName"
          label={t("organizations:invite.firstNameLabel")}
          form={form}
          placeholder={t("organizations:invite.firstNamePlaceholder")}
        />
        <FormInput
          name="lastName"
          label={t("organizations:invite.lastNameLabel")}
          form={form}
          placeholder={t("organizations:invite.lastNamePlaceholder")}
        />
      </div>

      <FormInput
        name="phoneNumber"
        label={t("organizations:invite.phoneLabel")}
        form={form}
        type="tel"
        placeholder={t("organizations:invite.phonePlaceholder")}
      />

      {/* Roles Selection */}
      <div className="space-y-3">
        <Label>
          {t("organizations:invite.rolesLabel")}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3 border rounded-lg p-4">
          {organizationRoles.map((role) => (
            <div key={role.value} className="flex items-start space-x-2">
              <Checkbox
                id={`edit-${role.value}`}
                checked={selectedRoles.includes(role.value)}
                onCheckedChange={() => handleRoleToggle(role.value)}
              />
              <div className="grid gap-1">
                <Label
                  htmlFor={`edit-${role.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {role.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {role.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        {form.formState.errors.roles && (
          <p className="text-sm text-destructive">
            {form.formState.errors.roles.message}
          </p>
        )}
      </div>

      {/* Primary Role Selection */}
      {selectedRoles.length > 0 && (
        <div className="space-y-2">
          <Label>
            {t("organizations:invite.primaryRoleLabel")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={primaryRole}
            onValueChange={handlePrimaryRoleChange}
          >
            <div className="grid grid-cols-2 gap-2">
              {organizationRoles
                .filter((role) => selectedRoles.includes(role.value))
                .map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={role.value}
                      id={`edit-primary-${role.value}`}
                    />
                    <Label
                      htmlFor={`edit-primary-${role.value}`}
                      className="font-normal"
                    >
                      {role.label}
                    </Label>
                  </div>
                ))}
            </div>
          </RadioGroup>
          {form.formState.errors.primaryRole && (
            <p className="text-sm text-destructive">
              {form.formState.errors.primaryRole.message}
            </p>
          )}
        </div>
      )}

      {/* Show in Planning */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="edit-showInPlanning"
          checked={showInPlanning}
          onCheckedChange={(checked) =>
            form.setValue("showInPlanning", checked as boolean)
          }
        />
        <Label htmlFor="edit-showInPlanning" className="font-normal">
          {t("organizations:invite.showInStaffPlanning")}
        </Label>
      </div>
    </BaseFormDialog>
  );
}
