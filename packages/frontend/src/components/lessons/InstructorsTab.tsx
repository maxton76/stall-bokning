import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, User, Mail, Phone, Award } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Instructor } from "@equiduty/shared";
import type { CreateInstructorData } from "@/services/lessonService";

const instructorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.string().optional(),
  defaultRate: z.coerce.number().min(0).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

type InstructorFormData = z.infer<typeof instructorSchema>;

export interface InstructorsTabProps {
  instructors: Instructor[];
  isLoading?: boolean;
  onRefresh?: () => Promise<unknown>;
  // Legacy props for direct control
  onCreate?: (data: CreateInstructorData) => Promise<void>;
  onUpdate?: (id: string, data: Partial<CreateInstructorData>) => Promise<void>;
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

export function InstructorsTab({
  instructors,
  onCreate,
  onUpdate,
}: InstructorsTabProps) {
  const { t } = useTranslation(["lessons", "common"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InstructorFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(instructorSchema as any),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      bio: "",
      specializations: "",
      defaultRate: 0,
      color: "#3b82f6",
      isActive: true,
    },
  });

  function openCreateDialog() {
    form.reset({
      name: "",
      email: "",
      phone: "",
      bio: "",
      specializations: "",
      defaultRate: 0,
      color: "#3b82f6",
      isActive: true,
    });
    setEditingInstructor(null);
    setDialogOpen(true);
  }

  function openEditDialog(instructor: Instructor) {
    form.reset({
      name: instructor.name,
      email: instructor.email || "",
      phone: instructor.phone || "",
      bio: instructor.bio || "",
      specializations: instructor.specializations?.join(", ") || "",
      defaultRate: instructor.defaultRate || 0,
      color: instructor.color || "#3b82f6",
      isActive: instructor.isActive,
    });
    setEditingInstructor(instructor);
    setDialogOpen(true);
  }

  async function handleSubmit(data: InstructorFormData) {
    setIsSubmitting(true);
    try {
      const payload: CreateInstructorData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        bio: data.bio || undefined,
        specializations: data.specializations
          ? data.specializations
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        defaultRate: data.defaultRate || undefined,
        color: data.color,
        isActive: data.isActive,
      };

      if (editingInstructor && onUpdate) {
        await onUpdate(editingInstructor.id, payload);
      } else if (onCreate) {
        await onCreate(payload);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("lessons:instructors.title")}</CardTitle>
              <CardDescription>{t("lessons:description")}</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t("lessons:instructors.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {instructors.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">
                {t("lessons:instructors.empty")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("lessons:description")}
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t("lessons:instructors.create")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {instructors.map((instructor) => (
                <Card key={instructor.id} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback
                          style={{
                            backgroundColor: instructor.color || "#6b7280",
                          }}
                          className="text-white"
                        >
                          {getInitials(
                            instructor.name || instructor.displayName || "?",
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">
                            {instructor.name}
                          </h3>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(instructor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge
                          variant={
                            instructor.isActive ? "default" : "secondary"
                          }
                          className="mt-1"
                        >
                          {instructor.isActive
                            ? t("common:active")
                            : t("common:inactive")}
                        </Badge>

                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          {instructor.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">
                                {instructor.email}
                              </span>
                            </div>
                          )}
                          {instructor.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{instructor.phone}</span>
                            </div>
                          )}
                        </div>

                        {instructor.specializations &&
                          instructor.specializations.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {instructor.specializations
                                .slice(0, 3)
                                .map((spec, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {spec}
                                  </Badge>
                                ))}
                              {instructor.specializations.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{instructor.specializations.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                        {instructor.certifications &&
                          instructor.certifications.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Award className="h-3 w-3" />
                              <span>
                                {instructor.certifications.length}{" "}
                                {t(
                                  "lessons:instructors.fields.certifications",
                                ).toLowerCase()}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInstructor
                ? t("lessons:instructors.edit")
                : t("lessons:instructors.create")}
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
                    <FormLabel>
                      {t("lessons:instructors.fields.name")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("lessons:instructors.fields.email")}
                      </FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("lessons:instructors.fields.phone")}
                      </FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessons:instructors.fields.bio")}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specializations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("lessons:instructors.fields.specializations")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Dressage, Jumping, Eventing..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("lessons:instructors.fields.defaultRate")}
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
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("lessons:instructors.fields.color")}
                    </FormLabel>
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>
                        {t("lessons:instructors.fields.isActive")}
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
    </div>
  );
}
