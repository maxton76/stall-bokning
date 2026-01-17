import { useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Minus } from "lucide-react";

interface BalanceAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    year: number;
    corrections: number;
    reason: string;
  }) => Promise<void>;
  userName?: string;
  currentBalance?: number;
  isLoading?: boolean;
}

export function BalanceAdjustmentDialog({
  open,
  onOpenChange,
  onSave,
  userName,
  currentBalance = 0,
  isLoading,
}: BalanceAdjustmentDialogProps) {
  const { t } = useTranslation(["availability", "common"]);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const balanceAdjustmentSchema = z.object({
    year: z.number().int().min(2000).max(2100),
    adjustmentType: z.enum(["add", "subtract"]),
    amount: z
      .number()
      .positive(t("balanceAdjustment.validation.amountPositive")),
    reason: z
      .string()
      .min(1, t("balanceAdjustment.validation.reasonRequired"))
      .max(500, t("balanceAdjustment.validation.reasonTooLong")),
  });

  type BalanceAdjustmentFormData = z.infer<typeof balanceAdjustmentSchema>;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BalanceAdjustmentFormData>({
    resolver: zodResolver(balanceAdjustmentSchema as any) as any,
    defaultValues: {
      year: currentYear,
      adjustmentType: "add",
      amount: 0,
      reason: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        year: currentYear,
        adjustmentType: "add",
        amount: 0,
        reason: "",
      });
    }
  }, [open, reset, currentYear]);

  const adjustmentType = watch("adjustmentType");
  const amount = watch("amount");

  const previewBalance =
    adjustmentType === "add"
      ? currentBalance + (amount || 0)
      : currentBalance - (amount || 0);

  const onSubmit = async (data: BalanceAdjustmentFormData) => {
    const corrections =
      data.adjustmentType === "add" ? data.amount : -data.amount;

    await onSave({
      year: data.year,
      corrections,
      reason: data.reason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t("balanceAdjustment.title")}</DialogTitle>
          <DialogDescription>
            {userName
              ? t("balanceAdjustment.description", { name: userName })
              : t("balanceAdjustment.descriptionGeneric")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Balance Display */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("balanceAdjustment.currentBalance")}
              </span>
              <span className="text-lg font-semibold">{currentBalance}h</span>
            </div>
            {amount > 0 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  {t("balanceAdjustment.afterAdjustment")}
                </span>
                <span
                  className={`text-lg font-semibold ${
                    previewBalance > currentBalance
                      ? "text-green-600"
                      : previewBalance < currentBalance
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {previewBalance}h
                </span>
              </div>
            )}
          </div>

          {/* Year Selection */}
          <div className="space-y-2">
            <Label htmlFor="year">{t("balanceAdjustment.year")}</Label>
            <Controller
              name="year"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("balanceAdjustment.selectYear")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Adjustment Type and Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("balanceAdjustment.type")}</Label>
              <Controller
                name="adjustmentType"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "add" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => field.onChange("add")}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("balanceAdjustment.add")}
                    </Button>
                    <Button
                      type="button"
                      variant={
                        field.value === "subtract" ? "default" : "outline"
                      }
                      className="flex-1"
                      onClick={() => field.onChange("subtract")}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      {t("balanceAdjustment.subtract")}
                    </Button>
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                {t("balanceAdjustment.hours")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.5}
                placeholder="0"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              {t("balanceAdjustment.reason")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={t("balanceAdjustment.reasonPlaceholder")}
              rows={3}
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">
                {errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isLoading}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {(isSubmitting || isLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("balanceAdjustment.applyAdjustment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
