import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { recordAdjustment } from "@/services/inventoryService";
import type { FeedInventory } from "@equiduty/shared";

const adjustmentSchema = z.object({
  newQuantity: z.number().min(0, "Quantity cannot be negative"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FeedInventory | null;
  onSuccess: () => void;
}

export function AdjustmentDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: AdjustmentDialogProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AdjustmentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(adjustmentSchema as any),
    defaultValues: {
      newQuantity: item?.currentQuantity || 0,
      reason: "",
      notes: "",
    },
  });

  // Reset form when item changes
  if (
    item &&
    form.getValues("newQuantity") !== item.currentQuantity &&
    !form.formState.isDirty
  ) {
    form.setValue("newQuantity", item.currentQuantity);
  }

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!item) return;

    setIsSubmitting(true);
    try {
      await recordAdjustment(item.id, {
        newQuantity: data.newQuantity,
        reason: data.reason,
        notes: data.notes || undefined,
      });

      toast({
        title: t("inventory:messages.adjustmentSuccess"),
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({
        title: t("inventory:errors.createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const difference = item
    ? form.watch("newQuantity") - item.currentQuantity
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("inventory:dialogs.adjustment.title")}</DialogTitle>
          <DialogDescription>
            {item?.feedTypeName && (
              <span className="font-medium">{item.feedTypeName}</span>
            )}
            {" - "}
            {t("inventory:dialogs.adjustment.description")}
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">
              {t("inventory:fields.currentQuantity")}:
            </span>{" "}
            <span className="font-medium">
              {item.currentQuantity} {item.unit}
            </span>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newQuantity">
              {t("inventory:dialogs.adjustment.newQuantityLabel")} ({item?.unit}
              )
            </Label>
            <Input
              id="newQuantity"
              type="number"
              step="0.01"
              min="0"
              {...form.register("newQuantity", { valueAsNumber: true })}
            />
            {form.formState.errors.newQuantity && (
              <p className="text-sm text-red-500">
                {form.formState.errors.newQuantity.message}
              </p>
            )}
            {difference !== 0 && (
              <p
                className={`text-sm ${difference > 0 ? "text-green-600" : "text-red-600"}`}
              >
                {difference > 0 ? "+" : ""}
                {difference} {item?.unit}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              {t("inventory:dialogs.adjustment.reasonLabel")} *
            </Label>
            <Input
              id="reason"
              placeholder={t("inventory:dialogs.adjustment.reasonPlaceholder")}
              {...form.register("reason")}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-red-500">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("inventory:fields.notes")}</Label>
            <Textarea id="notes" {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("common:actions.saving")
                : t("inventory:actions.adjust")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
