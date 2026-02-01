import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ChargeableItem,
  ChargeableItemCategory,
  ChargeableItemUnitType,
  SwedishVatRate,
} from "@equiduty/shared";

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS: ChargeableItemCategory[] = [
  "activity",
  "booking",
  "service",
  "recurring",
  "package",
];

const UNIT_TYPE_OPTIONS: ChargeableItemUnitType[] = [
  "fixed",
  "per_hour",
  "per_session",
  "per_quantity",
  "per_day",
];

const VAT_RATE_OPTIONS: SwedishVatRate[] = [25, 12, 6, 0];

// ============================================================================
// Form State Types (exported for parent)
// ============================================================================

export interface ChargeableItemFormState {
  name: string;
  description: string;
  unitType: ChargeableItemUnitType;
  defaultUnitPriceSEK: string;
  vatRate: SwedishVatRate;
  vatCategory: string;
  category: ChargeableItemCategory;
  accountingCode: string;
  costCenter: string;
}

export const EMPTY_FORM: ChargeableItemFormState = {
  name: "",
  description: "",
  unitType: "fixed",
  defaultUnitPriceSEK: "",
  vatRate: 25,
  vatCategory: "",
  category: "service",
  accountingCode: "",
  costCenter: "",
};

export function formStateFromItem(
  item: ChargeableItem,
): ChargeableItemFormState {
  return {
    name: item.name,
    description: item.description || "",
    unitType: item.unitType,
    defaultUnitPriceSEK: (item.defaultUnitPrice / 100).toString(),
    vatRate: item.vatRate,
    vatCategory: item.vatCategory,
    category: item.category,
    accountingCode: item.accountingCode || "",
    costCenter: item.costCenter || "",
  };
}

// ============================================================================
// Props
// ============================================================================

interface ChargeableItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ChargeableItem | null;
  formState: ChargeableItemFormState;
  onFormStateChange: (form: ChargeableItemFormState) => void;
  onSave: () => void;
  isSaving: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ChargeableItemFormDialog({
  open,
  onOpenChange,
  editingItem,
  formState,
  onFormStateChange,
  onSave,
  isSaving,
}: ChargeableItemFormDialogProps) {
  const { t } = useTranslation(["invoices", "common"]);

  const updateField = useCallback(
    <K extends keyof ChargeableItemFormState>(
      field: K,
      value: ChargeableItemFormState[K],
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
              ? t("invoices:chargeableItems.dialogs.edit.title")
              : t("invoices:chargeableItems.dialogs.create.title")}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? t("invoices:chargeableItems.dialogs.edit.description")
              : t("invoices:chargeableItems.dialogs.create.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="ci-name">
              {t("invoices:chargeableItems.fields.name")} *
            </Label>
            <Input
              id="ci-name"
              value={formState.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={t("invoices:chargeableItems.placeholders.name")}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="ci-description">
              {t("invoices:chargeableItems.fields.description")}
            </Label>
            <Textarea
              id="ci-description"
              value={formState.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t(
                "invoices:chargeableItems.placeholders.description",
              )}
              rows={2}
            />
          </div>

          {/* Unit Type + Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("invoices:chargeableItems.fields.unitType")} *</Label>
              <Select
                value={formState.unitType}
                onValueChange={(value) =>
                  updateField("unitType", value as ChargeableItemUnitType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPE_OPTIONS.map((ut) => (
                    <SelectItem key={ut} value={ut}>
                      {t(`invoices:chargeableItems.unitTypes.${ut}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("invoices:chargeableItems.fields.category")} *</Label>
              <Select
                value={formState.category}
                onValueChange={(value) =>
                  updateField("category", value as ChargeableItemCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`invoices:chargeableItems.categories.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price + VAT Rate row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ci-price">
                {t("invoices:chargeableItems.fields.priceSEK")} *
              </Label>
              <Input
                id="ci-price"
                type="number"
                min="0"
                step="0.01"
                value={formState.defaultUnitPriceSEK}
                onChange={(e) =>
                  updateField("defaultUnitPriceSEK", e.target.value)
                }
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("invoices:chargeableItems.fields.vatRate")} *</Label>
              <Select
                value={String(formState.vatRate)}
                onValueChange={(value) =>
                  updateField("vatRate", Number(value) as SwedishVatRate)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAT_RATE_OPTIONS.map((rate) => (
                    <SelectItem key={rate} value={String(rate)}>
                      {rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* VAT Category */}
          <div className="grid gap-2">
            <Label htmlFor="ci-vat-category">
              {t("invoices:chargeableItems.fields.vatCategory")} *
            </Label>
            <Input
              id="ci-vat-category"
              value={formState.vatCategory}
              onChange={(e) => updateField("vatCategory", e.target.value)}
              placeholder={t(
                "invoices:chargeableItems.placeholders.vatCategory",
              )}
            />
          </div>

          {/* Accounting Code + Cost Center row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ci-accounting-code">
                {t("invoices:chargeableItems.fields.accountingCode")}
              </Label>
              <Input
                id="ci-accounting-code"
                value={formState.accountingCode}
                onChange={(e) => updateField("accountingCode", e.target.value)}
                placeholder={t(
                  "invoices:chargeableItems.placeholders.accountingCode",
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ci-cost-center">
                {t("invoices:chargeableItems.fields.costCenter")}
              </Label>
              <Input
                id="ci-cost-center"
                value={formState.costCenter}
                onChange={(e) => updateField("costCenter", e.target.value)}
                placeholder={t(
                  "invoices:chargeableItems.placeholders.costCenter",
                )}
              />
            </div>
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
