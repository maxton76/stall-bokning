import { useEffect, useState } from "react";
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

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  contactType: z.enum(["Personal", "Business"]),
  // Business-specific fields
  businessName: z.string().optional(),
  address: addressSchema.optional(),
  // Role assignment
  roles: z.array(z.string()).min(1, "At least one role must be selected"),
  primaryRole: z.string().min(1, "Primary role is required"),
  showInPlanning: z.boolean().default(true),
  // Stable access
  stableAccess: z.enum(["all", "specific"]).default("all"),
  assignedStableIds: z.array(z.string()).optional(),
});

type InviteUserFormData = z.infer<typeof inviteUserSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: InviteUserFormData) => Promise<void>;
}

const organizationRoles: {
  value: OrganizationRole;
  label: string;
  description: string;
}[] = [
  {
    value: "administrator",
    label: "Administrator",
    description: "Full organization access",
  },
  {
    value: "veterinarian",
    label: "Veterinarian",
    description: "Animal health services",
  },
  { value: "dentist", label: "Dentist", description: "Equine dental services" },
  { value: "farrier", label: "Farrier", description: "Hoof care services" },
  { value: "customer", label: "Customer", description: "Horse owner/client" },
  { value: "groom", label: "Groom", description: "Daily care staff" },
  {
    value: "saddle_maker",
    label: "Saddle Maker",
    description: "Tack and saddle services",
  },
  {
    value: "horse_owner",
    label: "Horse Owner",
    description: "External horse owner",
  },
  { value: "rider", label: "Rider", description: "Professional rider" },
  {
    value: "inseminator",
    label: "Inseminator",
    description: "Breeding services",
  },
];

export function InviteUserDialog({
  open,
  onOpenChange,
  onSave,
}: InviteUserDialogProps) {
  const { t } = useTranslation(["organizations", "common"]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [addressOpen, setAddressOpen] = useState(false);

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
    successMessage: "Invitation sent successfully",
    errorMessage: "Failed to send invitation",
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
      title="Invite User to Organization"
      description="Invite a new member to your organization and assign their roles"
      form={form}
      onSubmit={handleSubmit}
      submitLabel="Send Invitation"
      maxWidth="max-w-2xl"
    >
      {/* Contact Type */}
      <div className="space-y-2">
        <Label>Contact Type</Label>
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
              Personal
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Business" id="business" />
            <Label htmlFor="business" className="font-normal">
              Business
            </Label>
          </div>
        </RadioGroup>
      </div>

      <FormInput
        name="email"
        label="Email"
        form={form}
        type="email"
        placeholder="user@example.com"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          name="firstName"
          label="First Name"
          form={form}
          placeholder="First name"
        />
        <FormInput
          name="lastName"
          label="Last Name"
          form={form}
          placeholder="Last name"
        />
      </div>

      <FormInput
        name="phoneNumber"
        label="Phone Number"
        form={form}
        type="tel"
        placeholder="+46 70 123 45 67"
      />

      {/* Business-specific fields */}
      {contactType === "Business" && (
        <>
          <FormInput
            name="businessName"
            label="Business Name"
            form={form}
            placeholder="Company name"
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
                  Address (optional)
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <FormInput
                    name="address.street"
                    label="Street"
                    form={form}
                    placeholder="Street name"
                  />
                </div>
                <FormInput
                  name="address.houseNumber"
                  label="Number"
                  form={form}
                  placeholder="123"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  name="address.postcode"
                  label="Postcode"
                  form={form}
                  placeholder="12345"
                />
                <FormInput
                  name="address.city"
                  label="City"
                  form={form}
                  placeholder="Stockholm"
                />
              </div>
              <FormInput
                name="address.country"
                label="Country"
                form={form}
                placeholder="Sweden"
              />
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {/* Roles Selection - Custom implementation due to descriptions */}
      <div className="space-y-3">
        <Label>
          Roles <span className="text-destructive">*</span>
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
            Primary Role <span className="text-destructive">*</span>
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
          Show in staff activity planning
        </Label>
      </div>
    </BaseFormDialog>
  );
}
