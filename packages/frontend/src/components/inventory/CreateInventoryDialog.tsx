import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { createInventoryItem } from "@/services/inventoryService";
import { getFeedTypesByStable } from "@/services/feedTypeService";
import type { FeedType } from "@stall-bokning/shared";

const createInventorySchema = z.object({
  feedTypeId: z.string().min(1, "Feed type is required"),
  currentQuantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  minimumStockLevel: z
    .number()
    .min(0, "Minimum stock level cannot be negative"),
  reorderPoint: z.number().min(0, "Reorder point cannot be negative"),
  reorderQuantity: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  currency: z.string().default("SEK"),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
});

type CreateInventoryFormData = z.infer<typeof createInventorySchema>;

interface CreateInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stableId: string;
  onSuccess: () => void;
}

const COMMON_UNITS = ["kg", "g", "l", "bags", "bales", "scoops", "pcs"];

export function CreateInventoryDialog({
  open,
  onOpenChange,
  stableId,
  onSuccess,
}: CreateInventoryDialogProps) {
  const { t } = useTranslation(["inventory", "common"]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedTypes = useAsyncData<FeedType[]>({
    loadFn: async () => {
      return getFeedTypesByStable(stableId);
    },
  });

  useEffect(() => {
    if (open) {
      feedTypes.load();
    }
  }, [open, stableId]);

  const form = useForm<CreateInventoryFormData>({
    resolver: zodResolver(createInventorySchema),
    defaultValues: {
      feedTypeId: "",
      currentQuantity: 0,
      unit: "kg",
      minimumStockLevel: 10,
      reorderPoint: 20,
      currency: "SEK",
      storageLocation: "",
      notes: "",
    },
  });

  const onSubmit = async (data: CreateInventoryFormData) => {
    setIsSubmitting(true);
    try {
      await createInventoryItem({
        stableId,
        feedTypeId: data.feedTypeId,
        currentQuantity: data.currentQuantity,
        unit: data.unit,
        minimumStockLevel: data.minimumStockLevel,
        reorderPoint: data.reorderPoint,
        reorderQuantity: data.reorderQuantity,
        unitCost: data.unitCost,
        currency: data.currency,
        storageLocation: data.storageLocation || undefined,
        notes: data.notes || undefined,
      });

      toast({
        title: t("inventory:messages.createSuccess"),
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      if (error?.message?.includes("already exists")) {
        toast({
          title: t("inventory:errors.alreadyExists"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("inventory:errors.createFailed"),
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("inventory:dialogs.create.title")}</DialogTitle>
          <DialogDescription>
            {t("inventory:dialogs.create.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Feed Type */}
          <div className="space-y-2">
            <Label htmlFor="feedTypeId">
              {t("inventory:fields.feedType")} *
            </Label>
            <Select
              value={form.watch("feedTypeId")}
              onValueChange={(value) => form.setValue("feedTypeId", value)}
              disabled={feedTypes.isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common:labels.select")} />
              </SelectTrigger>
              <SelectContent>
                {feedTypes.data?.map((feedType) => (
                  <SelectItem key={feedType.id} value={feedType.id}>
                    {feedType.name}
                    {feedType.category && (
                      <span className="text-muted-foreground ml-2">
                        ({feedType.category})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.feedTypeId && (
              <p className="text-sm text-red-500">
                {form.formState.errors.feedTypeId.message}
              </p>
            )}
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentQuantity">
                {t("inventory:fields.currentQuantity")} *
              </Label>
              <Input
                id="currentQuantity"
                type="number"
                step="0.01"
                min="0"
                {...form.register("currentQuantity", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t("inventory:fields.unit")} *</Label>
              <Select
                value={form.watch("unit")}
                onValueChange={(value) => form.setValue("unit", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {t(`inventory:units.${unit}`, unit)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock Levels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimumStockLevel">
                {t("inventory:fields.minimumStockLevel")} *
              </Label>
              <Input
                id="minimumStockLevel"
                type="number"
                step="0.01"
                min="0"
                {...form.register("minimumStockLevel", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">
                {t("inventory:fields.reorderPoint")} *
              </Label>
              <Input
                id="reorderPoint"
                type="number"
                step="0.01"
                min="0"
                {...form.register("reorderPoint", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitCost">{t("inventory:fields.unitCost")}</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                {...form.register("unitCost", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">{t("common:labels.currency")}</Label>
              <Select
                value={form.watch("currency")}
                onValueChange={(value) => form.setValue("currency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEK">SEK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Storage Location */}
          <div className="space-y-2">
            <Label htmlFor="storageLocation">
              {t("inventory:fields.storageLocation")}
            </Label>
            <Input id="storageLocation" {...form.register("storageLocation")} />
          </div>

          {/* Notes */}
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
                : t("common:actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
