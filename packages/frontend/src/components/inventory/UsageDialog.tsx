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
import { recordUsage } from "@/services/inventoryService";
import type { FeedInventory } from "@stall-bokning/shared";

const usageSchema = z.object({
  quantity: z.number().positive("Quantity must be positive"),
  notes: z.string().optional(),
});

type UsageFormData = z.infer<typeof usageSchema>;

interface UsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FeedInventory | null;
  onSuccess: () => void;
}

export function UsageDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: UsageDialogProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UsageFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(usageSchema as any),
    defaultValues: {
      quantity: 0,
      notes: "",
    },
  });

  const onSubmit = async (data: UsageFormData) => {
    if (!item) return;

    // Check if there's enough stock
    if (data.quantity > item.currentQuantity) {
      toast({
        title: t("inventory:errors.insufficientStock"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await recordUsage(item.id, {
        quantity: data.quantity,
        notes: data.notes || undefined,
      });

      toast({
        title: t("inventory:messages.usageSuccess"),
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
          <DialogTitle>{t("inventory:dialogs.usage.title")}</DialogTitle>
          <DialogDescription>
            {item?.feedTypeName && (
              <span className="font-medium">{item.feedTypeName}</span>
            )}
            {" - "}
            {t("inventory:dialogs.usage.description")}
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
            <Label htmlFor="quantity">
              {t("inventory:dialogs.usage.quantityLabel")} ({item?.unit})
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              max={item?.currentQuantity || 0}
              {...form.register("quantity", { valueAsNumber: true })}
            />
            {form.formState.errors.quantity && (
              <p className="text-sm text-red-500">
                {form.formState.errors.quantity.message}
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
                : t("inventory:actions.recordUsage")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
