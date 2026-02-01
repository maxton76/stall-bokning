import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PackageDefinition,
  PackageExpiryPolicy,
  PackageCancellationPolicy,
} from "@equiduty/shared";

// ============================================================================
// Constants
// ============================================================================

const EXPIRY_POLICY_OPTIONS: PackageExpiryPolicy[] = [
  "expire",
  "rollover",
  "partial_refund",
];

const CANCELLATION_POLICY_OPTIONS: PackageCancellationPolicy[] = [
  "no_refund",
  "pro_rata_unit",
  "pro_rata_package",
  "full_refund",
];

// ============================================================================
// Form State Types (exported for parent)
// ============================================================================

export interface PackageFormState {
  name: string;
  description: string;
  chargeableItemId: string;
  totalUnits: string;
  priceSEK: string;
  validityDays: string;
  expiryPolicy: PackageExpiryPolicy;
  transferableWithinGroup: boolean;
  cancellationPolicy: PackageCancellationPolicy;
}

export const EMPTY_FORM: PackageFormState = {
  name: "",
  description: "",
  chargeableItemId: "",
  totalUnits: "",
  priceSEK: "",
  validityDays: "",
  expiryPolicy: "expire",
  transferableWithinGroup: false,
  cancellationPolicy: "no_refund",
};

export function formStateFromItem(item: PackageDefinition): PackageFormState {
  return {
    name: item.name,
    description: item.description || "",
    chargeableItemId: item.chargeableItemId,
    totalUnits: String(item.totalUnits),
    priceSEK: (item.price / 100).toString(),
    validityDays: item.validityDays ? String(item.validityDays) : "",
    expiryPolicy: item.expiryPolicy,
    transferableWithinGroup: item.transferableWithinGroup,
    cancellationPolicy: item.cancellationPolicy,
  };
}

// ============================================================================
// Props
// ============================================================================

interface PackageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: PackageDefinition | null;
  formState: PackageFormState;
  onFormStateChange: (form: PackageFormState) => void;
  onSave: () => void;
  isSaving: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PackageFormDialog({
  open,
  onOpenChange,
  editingItem,
  formState,
  onFormStateChange,
  onSave,
  isSaving,
}: PackageFormDialogProps) {
  const { t } = useTranslation(["invoices", "common"]);

  const updateField = useCallback(
    <K extends keyof PackageFormState>(
      field: K,
      value: PackageFormState[K],
    ) => {
      onFormStateChange({ ...formState, [field]: value });
    },
    [formState, onFormStateChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingItem
              ? t("invoices:packages.dialogs.edit.title")
              : t("invoices:packages.dialogs.create.title")}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? t("invoices:packages.dialogs.edit.description")
              : t("invoices:packages.dialogs.create.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="pkg-name">
              {t("invoices:packages.fields.name")} *
            </Label>
            <Input
              id="pkg-name"
              value={formState.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={t("invoices:packages.placeholders.name")}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="pkg-description">
              {t("invoices:packages.fields.description")}
            </Label>
            <Textarea
              id="pkg-description"
              value={formState.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t("invoices:packages.placeholders.description")}
              rows={2}
            />
          </div>

          {/* Chargeable Item ID */}
          <div className="grid gap-2">
            <Label htmlFor="pkg-chargeable-item">
              {t("invoices:packages.fields.chargeableItemId")} *
            </Label>
            <Input
              id="pkg-chargeable-item"
              value={formState.chargeableItemId}
              onChange={(e) => updateField("chargeableItemId", e.target.value)}
              placeholder={t("invoices:packages.placeholders.chargeableItemId")}
            />
          </div>

          {/* Units + Price row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pkg-units">
                {t("invoices:packages.fields.totalUnits")} *
              </Label>
              <Input
                id="pkg-units"
                type="number"
                min="1"
                value={formState.totalUnits}
                onChange={(e) => updateField("totalUnits", e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pkg-price">
                {t("invoices:packages.fields.priceSEK")} *
              </Label>
              <Input
                id="pkg-price"
                type="number"
                min="0"
                step="0.01"
                value={formState.priceSEK}
                onChange={(e) => updateField("priceSEK", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Validity Days */}
          <div className="grid gap-2">
            <Label htmlFor="pkg-validity">
              {t("invoices:packages.fields.validityDays")}
            </Label>
            <Input
              id="pkg-validity"
              type="number"
              min="1"
              value={formState.validityDays}
              onChange={(e) => updateField("validityDays", e.target.value)}
              placeholder={t("invoices:packages.placeholders.validityDays")}
            />
          </div>

          {/* Expiry Policy + Cancellation Policy row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("invoices:packages.fields.expiryPolicy")} *</Label>
              <Select
                value={formState.expiryPolicy}
                onValueChange={(value) =>
                  updateField("expiryPolicy", value as PackageExpiryPolicy)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_POLICY_OPTIONS.map((policy) => (
                    <SelectItem key={policy} value={policy}>
                      {t(`invoices:packages.expiryPolicies.${policy}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>
                {t("invoices:packages.fields.cancellationPolicy")} *
              </Label>
              <Select
                value={formState.cancellationPolicy}
                onValueChange={(value) =>
                  updateField(
                    "cancellationPolicy",
                    value as PackageCancellationPolicy,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_POLICY_OPTIONS.map((policy) => (
                    <SelectItem key={policy} value={policy}>
                      {t(`invoices:packages.cancellationPolicies.${policy}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transferable Within Group */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="pkg-transferable"
              checked={formState.transferableWithinGroup}
              onCheckedChange={(checked) =>
                updateField("transferableWithinGroup", checked === true)
              }
            />
            <Label htmlFor="pkg-transferable" className="cursor-pointer">
              {t("invoices:packages.fields.transferable")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("common:buttons.cancel", "Avbryt")}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving
              ? t("invoices:common.saving")
              : editingItem
                ? t("invoices:common.update")
                : t("invoices:common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
