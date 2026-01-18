import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { BaseFormDialog } from "@/components/BaseFormDialog";
import { useFormDialog } from "@/hooks/useFormDialog";
import { FormInput, FormSelect } from "@/components/form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type {
  OrganizationRole,
  StableAccessLevel,
} from "../../../shared/src/types/organization";

const addressSchema = z.object({
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postcode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

type InviteUserFormData = {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  contactType: "Personal" | "Business";
  businessName?: string;
  address?: {
    street?: string;
    houseNumber?: string;
    postcode?: string;
    city?: string;
    country?: string;
  };
  roles: string[];
  primaryRole: string;
  showInPlanning: boolean;
  stableAccess: "all" | "specific";
  assignedStableIds?: string[];
};

const ROLE_KEYS = [
  "administrator",
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

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: InviteUserFormData) => Promise<void>;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onSave,
}: InviteUserDialogProps) {
  const { t } = useTranslation(["organizations", "common"]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [addressOpen, setAddressOpen] = useState(false);

  // Build translated organization roles
  const organizationRoles = useMemo(
    () =>
      ROLE_KEYS.map((key) => ({
        value: key as OrganizationRole,
        label: t(`organizations:invite.roles.${key}.label`),
        description: t(`organizations:invite.roles.${key}.description`),
      })),
    [t],
  );

  // Create schema with translated validation messages
  const inviteUserSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .email(t("organizations:invite.validation.invalidEmail")),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phoneNumber: z.string().optional(),
        contactType: z.enum(["Personal", "Business"]),
        businessName: z.string().optional(),
        address: addressSchema.optional(),
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

  const { form, handleSubmit, resetForm } = useFormDialog<InviteUserFormData>({
    schema: inviteUserSchema,
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      contactType: "Personal",
      businessName: "",
      address: {
        street: "",
        houseNumber: "",
        postcode: "",
        city: "",
        country: "",
      },
      roles: [],
      primaryRole: "",
      showInPlanning: true,
      stableAccess: "all",
      assignedStableIds: [],
    },
    onSubmit: async (data) => {
      await onSave(data);
    },
    onSuccess: () => {
      setSelectedRoles([]);
      onOpenChange(false);
    },
    successMessage: t("organizations:invite.success"),
    errorMessage: t("organizations:invite.error"),
  });

  // Watch form fields for conditional rendering
  const roles = form.watch("roles");
  const primaryRole = form.watch("primaryRole");
  const showInPlanning = form.watch("showInPlanning");
  const contactType = form.watch("contactType");

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

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetForm();
      setSelectedRoles([]);
      setAddressOpen(false);
    }
  }, [open]);

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("organizations:invite.title")}
      description={t("organizations:invite.description")}
      form={form}
      onSubmit={handleSubmit}
      submitLabel={t("organizations:invite.sendInvitation")}
      maxWidth="max-w-2xl"
    >
      {/* Contact Type */}
      <div className="space-y-2">
        <Label>{t("organizations:invite.contactType")}</Label>
        <RadioGroup
          value={form.watch("contactType")}
          onValueChange={(value) =>
            form.setValue("contactType", value as "Personal" | "Business")
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Personal" id="personal" />
            <Label htmlFor="personal" className="font-normal">
              {t("organizations:invite.contactTypes.personal")}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Business" id="business" />
            <Label htmlFor="business" className="font-normal">
              {t("organizations:invite.contactTypes.business")}
            </Label>
          </div>
        </RadioGroup>
      </div>

      <FormInput
        name="email"
        label={t("organizations:invite.emailLabel")}
        form={form}
        type="email"
        placeholder={t("organizations:invite.emailPlaceholder")}
        required
      />

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

      {/* Business-specific fields */}
      {contactType === "Business" && (
        <>
          <FormInput
            name="businessName"
            label={t("organizations:invite.businessNameLabel")}
            form={form}
            placeholder={t("organizations:invite.businessNamePlaceholder")}
            required
          />

          {/* Address section (collapsible) */}
          <Collapsible open={addressOpen} onOpenChange={setAddressOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 p-0 h-auto"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${addressOpen ? "rotate-180" : ""}`}
                />
                <span className="text-sm text-muted-foreground">
                  {t("organizations:invite.addressOptional")}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <FormInput
                    name="address.street"
                    label={t("organizations:invite.address.streetLabel")}
                    form={form}
                    placeholder={t(
                      "organizations:invite.address.streetPlaceholder",
                    )}
                  />
                </div>
                <FormInput
                  name="address.houseNumber"
                  label={t("organizations:invite.address.numberLabel")}
                  form={form}
                  placeholder={t(
                    "organizations:invite.address.numberPlaceholder",
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  name="address.postcode"
                  label={t("organizations:invite.address.postcodeLabel")}
                  form={form}
                  placeholder={t(
                    "organizations:invite.address.postcodePlaceholder",
                  )}
                />
                <FormInput
                  name="address.city"
                  label={t("organizations:invite.address.cityLabel")}
                  form={form}
                  placeholder={t(
                    "organizations:invite.address.cityPlaceholder",
                  )}
                />
              </div>
              <FormInput
                name="address.country"
                label={t("organizations:invite.address.countryLabel")}
                form={form}
                placeholder={t(
                  "organizations:invite.address.countryPlaceholder",
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* Roles Selection - Custom implementation due to descriptions */}
      <div className="space-y-3">
        <Label>
          {t("organizations:invite.rolesLabel")}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3 border rounded-lg p-4">
          {organizationRoles.map((role) => (
            <div key={role.value} className="flex items-start space-x-2">
              <Checkbox
                id={role.value}
                checked={selectedRoles.includes(role.value)}
                onCheckedChange={() => handleRoleToggle(role.value)}
              />
              <div className="grid gap-1">
                <Label
                  htmlFor={role.value}
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
                      id={`primary-${role.value}`}
                    />
                    <Label
                      htmlFor={`primary-${role.value}`}
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
          id="showInPlanning"
          checked={showInPlanning}
          onCheckedChange={(checked) =>
            form.setValue("showInPlanning", checked as boolean)
          }
        />
        <Label htmlFor="showInPlanning" className="font-normal">
          {t("organizations:invite.showInStaffPlanning")}
        </Label>
      </div>
    </BaseFormDialog>
  );
}
