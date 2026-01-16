import { useEffect } from "react";
import { z } from "zod";
import { format, addDays, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const requestLeaveSchema = z
  .object({
    firstDay: z.string().min(1, "First day is required"),
    lastDay: z.string().min(1, "Last day is required"),
    note: z.string().optional(),
  })
  .refine(
    (data) => {
      const first = new Date(data.firstDay);
      const last = new Date(data.lastDay);
      return last >= first;
    },
    {
      message: "Last day must be on or after first day",
      path: ["lastDay"],
    },
  );

type RequestLeaveFormData = z.infer<typeof requestLeaveSchema>;

interface RequestLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: RequestLeaveFormData) => Promise<void>;
  organizationId: string;
}

export function RequestLeaveDialog({
  open,
  onOpenChange,
  onSave,
  organizationId,
}: RequestLeaveDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RequestLeaveFormData>({
    resolver: zodResolver(requestLeaveSchema as any) as any,
    defaultValues: {
      firstDay: "",
      lastDay: "",
      note: "",
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset({
        firstDay: "",
        lastDay: "",
        note: "",
      });
    }
  }, [open, reset]);

  const firstDay = watch("firstDay");
  const lastDay = watch("lastDay");

  // Calculate duration if both dates are set
  const duration =
    firstDay && lastDay
      ? differenceInDays(new Date(lastDay), new Date(firstDay)) + 1
      : 0;

  const onSubmit = async (data: RequestLeaveFormData) => {
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="firstDay">
              First day <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstDay"
              type="date"
              {...register("firstDay")}
              min={format(new Date(), "yyyy-MM-dd")}
            />
            {errors.firstDay && (
              <p className="text-sm text-destructive">
                {errors.firstDay.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastDay">
              Last day <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastDay"
              type="date"
              {...register("lastDay")}
              min={firstDay || format(new Date(), "yyyy-MM-dd")}
            />
            {errors.lastDay && (
              <p className="text-sm text-destructive">
                {errors.lastDay.message}
              </p>
            )}
            {duration > 0 && (
              <p className="text-sm text-muted-foreground">
                {duration} day{duration !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              {...register("note")}
              placeholder="Optional note..."
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
