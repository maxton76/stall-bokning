import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, GraduationCap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LessonType } from "@equiduty/shared";
import type {
  CreateLessonTypeData,
  SkillLevel,
} from "@/services/lessonService";

const lessonTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum([
    "private",
    "group",
    "clinic",
    "camp",
    "assessment",
    "other",
  ]),
  level: z.string().optional(),
  defaultDuration: z.coerce
    .number()
    .min(15, "Duration must be at least 15 minutes"),
  minParticipants: z.coerce.number().min(1).optional(),
  maxParticipants: z.coerce
    .number()
    .min(1, "Max participants must be at least 1"),
  requiresOwnHorse: z.boolean().optional(),
  basePrice: z.coerce.number().min(0, "Price must be non-negative"),
  memberDiscount: z.coerce.number().min(0).max(100).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

type LessonTypeFormData = z.infer<typeof lessonTypeSchema>;

export interface LessonTypesTabProps {
  lessonTypes: LessonType[];
  skillLevels?: SkillLevel[];
  isLoading?: boolean;
  onRefresh?: () => Promise<unknown>;
  // Legacy props for direct control
  onCreate?: (data: CreateLessonTypeData) => Promise<void>;
  onUpdate?: (id: string, data: Partial<CreateLessonTypeData>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
];

export function LessonTypesTab({
  lessonTypes,
  skillLevels = [],
  onCreate,
  onUpdate,
  onDelete,
}: LessonTypesTabProps) {
  const { t } = useTranslation(["lessons", "common"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LessonType | null>(null);
  const [deletingType, setDeletingType] = useState<LessonType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LessonTypeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(lessonTypeSchema as any),
    defaultValues: {
      name: "",
      description: "",
      category: "group",
      defaultDuration: 60,
      minParticipants: 1,
      maxParticipants: 8,
      requiresOwnHorse: false,
      basePrice: 0,
      memberDiscount: 0,
      color: "#3b82f6",
      isActive: true,
    },
  });

  function openCreateDialog() {
    form.reset({
      name: "",
      description: "",
      category: "group",
      defaultDuration: 60,
      minParticipants: 1,
      maxParticipants: 8,
      requiresOwnHorse: false,
      basePrice: 0,
      memberDiscount: 0,
      color: "#3b82f6",
      isActive: true,
    });
    setEditingType(null);
    setDialogOpen(true);
  }

  function openEditDialog(lessonType: LessonType) {
    form.reset({
      name: lessonType.name,
      description: lessonType.description || "",
      category: lessonType.category as LessonTypeFormData["category"],
      level: lessonType.level,
      defaultDuration: lessonType.defaultDuration || lessonType.durationMinutes,
      minParticipants: lessonType.minParticipants || 1,
      maxParticipants: lessonType.maxParticipants,
      requiresOwnHorse: lessonType.requiresOwnHorse || false,
      basePrice: lessonType.pricing?.basePrice ?? lessonType.price ?? 0,
      memberDiscount: lessonType.pricing?.memberDiscount || 0,
      color: lessonType.color || "#3b82f6",
      isActive: lessonType.isActive,
    });
    setEditingType(lessonType);
    setDialogOpen(true);
  }

  async function handleSubmit(data: LessonTypeFormData) {
    setIsSubmitting(true);
    try {
      const payload: CreateLessonTypeData = {
        name: data.name,
        description: data.description || undefined,
        category: data.category,
        level: data.level,
        defaultDuration: data.defaultDuration,
        minParticipants: data.minParticipants,
        maxParticipants: data.maxParticipants,
        requiresOwnHorse: data.requiresOwnHorse,
        color: data.color,
        isActive: data.isActive,
        pricing: {
          basePrice: data.basePrice,
          currency: "SEK",
          memberDiscount: data.memberDiscount,
        },
      };

      if (editingType && onUpdate) {
        await onUpdate(editingType.id, payload);
      } else if (onCreate) {
        await onCreate(payload);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingType || !onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(deletingType.id);
      setDeletingType(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("lessons:types.title")}</CardTitle>
              <CardDescription>{t("lessons:description")}</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t("lessons:types.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lessonTypes.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">
                {t("lessons:types.empty")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("lessons:description")}
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t("lessons:types.create")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("lessons:types.fields.name")}</TableHead>
                  <TableHead>{t("lessons:types.fields.category")}</TableHead>
                  <TableHead>{t("lessons:types.fields.level")}</TableHead>
                  <TableHead className="text-right">
                    {t("lessons:types.fields.defaultDuration")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("lessons:types.fields.maxParticipants")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("lessons:types.fields.basePrice")}
                  </TableHead>
                  <TableHead>{t("lessons:types.fields.isActive")}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessonTypes.map((lessonType) => (
                  <TableRow key={lessonType.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: lessonType.color || "#6b7280",
                          }}
                        />
                        <span className="font-medium">{lessonType.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t(`lessons:types.category.${lessonType.category}`)}
                    </TableCell>
                    <TableCell>
                      {lessonType.level
                        ? (skillLevels.find((sl) => sl.id === lessonType.level)
                            ?.name ??
                          t(`lessons:types.level.${lessonType.level}`))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {lessonType.defaultDuration} min
                    </TableCell>
                    <TableCell className="text-right">
                      {lessonType.maxParticipants}
                    </TableCell>
                    <TableCell className="text-right">
                      {lessonType.pricing?.basePrice ?? lessonType.price ?? 0}{" "}
                      {lessonType.currency || "SEK"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={lessonType.isActive ? "default" : "secondary"}
                      >
                        {lessonType.isActive
                          ? t("common:active")
                          : t("common:inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(lessonType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingType(lessonType)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType
                ? t("lessons:types.edit")
                : t("lessons:types.create")}
            </DialogTitle>
            <DialogDescription>{t("lessons:description")}</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessons:types.fields.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("lessons:types.fields.description")}
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("lessons:types.fields.category")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            "private",
                            "group",
                            "clinic",
                            "camp",
                            "assessment",
                            "other",
                          ].map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {t(`lessons:types.category.${cat}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lessons:types.fields.level")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {skillLevels
                            .filter((l) => l.isEnabled !== false)
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((level) => (
                              <SelectItem key={level.id} value={level.id}>
                                {level.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="defaultDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("lessons:types.fields.defaultDuration")}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={15} step={15} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("lessons:types.fields.minParticipants")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("lessons:types.fields.maxParticipants")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("lessons:types.fields.basePrice")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="memberDiscount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("lessons:types.fields.memberDiscount")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessons:types.fields.color")}</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              field.value === color
                                ? "border-foreground"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresOwnHorse"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>
                        {t("lessons:types.fields.requiresOwnHorse")}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>
                        {t("lessons:types.fields.isActive")}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  {t("common:cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("common:saving") : t("common:save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingType}
        onOpenChange={() => setDeletingType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common:confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common:deleteWarning", { name: deletingType?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? t("common:deleting") : t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
