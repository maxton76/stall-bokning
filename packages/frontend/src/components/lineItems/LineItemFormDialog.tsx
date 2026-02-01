import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  LineItem,
  LineItemSourceType,
  SwedishVatRate,
} from "@equiduty/shared";
import { toDate } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

const SOURCE_TYPE_OPTIONS: LineItemSourceType[] = [
  "activity",
  "booking",
  "recurring",
  "manual",
  "package_purchase",
  "cancellation_fee",
  "no_show_fee",
  "reminder_fee",
];

const VAT_RATE_OPTIONS: SwedishVatRate[] = [25, 12, 6, 0];

// ============================================================================
// Form State Types (exported for parent)
// ============================================================================

export interface LineItemFormState {
  memberId: string;
  billingContactId: string;
  date: string;
  description: string;
  quantity: string;
  unitPriceSEK: string;
  vatRate: SwedishVatRate;
  sourceType: LineItemSourceType;
  horseId: string;
}

export const EMPTY_FORM: LineItemFormState = {
  memberId: "",
  billingContactId: "",
  date: new Date().toISOString().split("T")[0] ?? "",
  description: "",
  quantity: "1",
  unitPriceSEK: "",
  vatRate: 25,
  sourceType: "manual",
  horseId: "",
};

export function formStateFromItem(item: LineItem): LineItemFormState {
  const dateObj = toDate(item.date);

  return {
    memberId: item.memberId,
    billingContactId: item.billingContactId,
    date: dateObj.toISOString().split("T")[0] ?? "",
    description: item.description,
    quantity: String(item.quantity),
    unitPriceSEK: (item.unitPrice / 100).toString(),
    vatRate: item.vatRate as SwedishVatRate,
    sourceType: item.sourceType,
    horseId: item.horseId || "",
  };
}

// ============================================================================
// Props
// ============================================================================

interface LineItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: LineItem | null;
  formState: LineItemFormState;
  onFormStateChange: (form: LineItemFormState) => void;
  onSave: () => void;
  isSaving: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function LineItemFormDialog({
  open,
  onOpenChange,
  editingItem,
  formState,
  onFormStateChange,
  onSave,
  isSaving,
}: LineItemFormDialogProps) {
  const { t } = useTranslation(["invoices", "common"]);

  const updateField = useCallback(
    <K extends keyof LineItemFormState>(
      field: K,
      value: LineItemFormState[K],
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
              ? t("invoices:lineItems.dialogs.edit.title")
              : t("invoices:lineItems.dialogs.create.title")}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? t("invoices:lineItems.dialogs.edit.description")
              : t("invoices:lineItems.dialogs.create.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Member ID + Billing Contact ID row */}
          {!editingItem && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="li-member-id">
                  {t("invoices:lineItems.fields.memberId")} *
                </Label>
                <Input
                  id="li-member-id"
                  value={formState.memberId}
                  onChange={(e) => updateField("memberId", e.target.value)}
                  placeholder={t("invoices:lineItems.placeholders.memberId")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="li-billing-contact-id">
                  {t("invoices:lineItems.fields.billingContactId")} *
                </Label>
                <Input
                  id="li-billing-contact-id"
                  value={formState.billingContactId}
                  onChange={(e) =>
                    updateField("billingContactId", e.target.value)
                  }
                  placeholder={t(
                    "invoices:lineItems.placeholders.billingContactId",
                  )}
                />
              </div>
            </div>
          )}

          {/* Date + Source Type row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="li-date">
                {t("invoices:lineItems.fields.date")} *
              </Label>
              <Input
                id="li-date"
                type="date"
                value={formState.date}
                onChange={(e) => updateField("date", e.target.value)}
              />
            </div>
            {!editingItem && (
              <div className="grid gap-2">
                <Label>{t("invoices:lineItems.fields.sourceType")} *</Label>
                <Select
                  value={formState.sourceType}
                  onValueChange={(value) =>
                    updateField("sourceType", value as LineItemSourceType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPE_OPTIONS.map((st) => (
                      <SelectItem key={st} value={st}>
                        {t(`invoices:lineItems.sourceTypes.${st}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="li-description">
              {t("invoices:lineItems.fields.description")} *
            </Label>
            <Input
              id="li-description"
              value={formState.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t("invoices:lineItems.placeholders.description")}
            />
          </div>

          {/* Quantity + Unit Price row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="li-quantity">
                {t("invoices:lineItems.fields.quantity")} *
              </Label>
              <Input
                id="li-quantity"
                type="number"
                min="0"
                step="1"
                value={formState.quantity}
                onChange={(e) => updateField("quantity", e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="li-unit-price">
                {t("invoices:lineItems.fields.unitPriceSEK")} *
              </Label>
              <Input
                id="li-unit-price"
                type="number"
                min="0"
                step="0.01"
                value={formState.unitPriceSEK}
                onChange={(e) => updateField("unitPriceSEK", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* VAT Rate */}
          <div className="grid gap-2">
            <Label>{t("invoices:lineItems.fields.vatRate")} *</Label>
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

          {/* Horse ID (optional) */}
          <div className="grid gap-2">
            <Label htmlFor="li-horse-id">
              {t("invoices:lineItems.fields.horseId")}
            </Label>
            <Input
              id="li-horse-id"
              value={formState.horseId}
              onChange={(e) => updateField("horseId", e.target.value)}
              placeholder={t("invoices:lineItems.placeholders.horseId")}
            />
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
