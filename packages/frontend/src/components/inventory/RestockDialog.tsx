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
import { recordRestock } from "@/services/inventoryService";
import type { FeedInventory } from "@stall-bokning/shared";

const restockSchema = z.object({
  quantity: z.number().positive("Quantity must be positive"),
  unitCost: z.number().positive().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type RestockFormData = z.infer<typeof restockSchema>;

interface RestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FeedInventory | null;
  onSuccess: () => void;
}

export function RestockDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: RestockDialogProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RestockFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(restockSchema as any),
    defaultValues: {
      quantity: 0,
      unitCost: item?.unitCost || undefined,
      invoiceNumber: "",
      notes: "",
    },
  });

  const onSubmit = async (data: RestockFormData) => {
    if (!item) return;

    setIsSubmitting(true);
    try {
      await recordRestock(item.id, {
        quantity: data.quantity,
        unitCost: data.unitCost,
        invoiceNumber: data.invoiceNumber || undefined,
        notes: data.notes || undefined,
      });

      toast({
        title: t("inventory:messages.restockSuccess"),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("inventory:dialogs.restock.title")}</DialogTitle>
          <DialogDescription>
            {item?.feedTypeName && (
              <span className="font-medium">{item.feedTypeName}</span>
            )}
            {" - "}
            {t("inventory:dialogs.restock.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">
              {t("inventory:dialogs.restock.quantityLabel")} ({item?.unit})
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              {...form.register("quantity", { valueAsNumber: true })}
            />
            {form.formState.errors.quantity && (
              <p className="text-sm text-red-500">
                {form.formState.errors.quantity.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitCost">
              {t("inventory:fields.unitCost")} ({item?.currency || "SEK"})
            </Label>
            <Input
              id="unitCost"
              type="number"
              step="0.01"
              min="0"
              {...form.register("unitCost", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">
              {t("inventory:dialogs.restock.invoiceNumber")}
            </Label>
            <Input id="invoiceNumber" {...form.register("invoiceNumber")} />
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
                : t("inventory:actions.restock")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
