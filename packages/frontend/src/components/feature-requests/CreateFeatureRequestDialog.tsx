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
import { Sparkles, Loader2, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createFeatureRequest,
  refineFeatureRequestText,
} from "@/services/featureRequestService";
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
  const { t, i18n } = useTranslation(["featureRequests", "common"]);
  const { toast } = useToast();
  const schema = createFormSchema(t);

  const [isRefining, setIsRefining] = useState(false);
  const [originalText, setOriginalText] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema as any) as any,
    defaultValues: {
      title: "",
      description: "",
      category: "improvement",
    },
  });

  const watchTitle = watch("title");
  const watchDescription = watch("description");
  const canRefine =
    watchTitle.length > 3 && watchDescription.length > 10 && !isRefining;

  async function handleRefine() {
    setIsRefining(true);
    try {
      setOriginalText({ title: watchTitle, description: watchDescription });
      const refined = await refineFeatureRequestText(
        watchTitle,
        watchDescription,
        i18n.language,
      );
      setValue("title", refined.title, { shouldValidate: true });
      setValue("description", refined.description, { shouldValidate: true });
      toast({
        title: t("featureRequests:ai.refineSuccess"),
      });
    } catch {
      setOriginalText(null);
      toast({
        title: t("featureRequests:ai.refineError"),
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  }

  function handleRevert() {
    if (!originalText) return;
    setValue("title", originalText.title, { shouldValidate: true });
    setValue("description", originalText.description, { shouldValidate: true });
    setOriginalText(null);
  }

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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canRefine || mutation.isPending}
                onClick={handleRefine}
                className="gap-1.5"
              >
                {isRefining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isRefining
                  ? t("featureRequests:ai.refining")
                  : t("featureRequests:ai.refine")}
              </Button>
              {originalText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRevert}
                  className="gap-1.5"
                >
                  <Undo2 className="h-4 w-4" />
                  {t("featureRequests:ai.revert")}
                </Button>
              )}
            </div>
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
