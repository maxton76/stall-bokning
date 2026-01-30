import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createFeatureRequest } from "@/services/featureRequestService";
import type { FeatureRequestCategory } from "@equiduty/shared";

import type { TFunction } from "i18next";

const CATEGORIES: FeatureRequestCategory[] = [
  "improvement",
  "new_feature",
  "integration",
  "bug_fix",
  "other",
];

function createFormSchema(t: TFunction) {
  return z.object({
    title: z.string().min(5, t("featureRequests:validation.titleMin")).max(200),
    description: z
      .string()
      .min(20, t("featureRequests:validation.descriptionMin"))
      .max(2000),
    category: z.enum([
      "improvement",
      "new_feature",
      "integration",
      "bug_fix",
      "other",
    ]),
  });
}

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

interface CreateFeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateFeatureRequestDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateFeatureRequestDialogProps) {
  const { t } = useTranslation(["featureRequests", "common"]);
  const { toast } = useToast();
  const schema = createFormSchema(t);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema as any) as any,
    defaultValues: {
      title: "",
      description: "",
      category: "improvement",
    },
  });

  const mutation = useMutation({
    mutationFn: createFeatureRequest,
    onSuccess: () => {
      toast({
        title: t("featureRequests:createSuccess"),
        description: t("featureRequests:createSuccessDescription"),
      });
      reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: t("common:errors.somethingWentWrong"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormData) {
    mutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("featureRequests:createTitle")}</DialogTitle>
          <DialogDescription>
            {t("featureRequests:createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fr-title">
              {t("featureRequests:fields.title")}
            </Label>
            <Input
              id="fr-title"
              placeholder={t("featureRequests:placeholders.title")}
              {...register("title")}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fr-description">
              {t("featureRequests:fields.description")}
            </Label>
            <Textarea
              id="fr-description"
              placeholder={t("featureRequests:placeholders.description")}
              rows={4}
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fr-category">
              {t("featureRequests:fields.category")}
            </Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger id="fr-category">
                    <SelectValue
                      placeholder={t("featureRequests:placeholders.category")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`featureRequests:categories.${cat}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p className="text-sm text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t("common:buttons.submitting")
                : t("common:buttons.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
