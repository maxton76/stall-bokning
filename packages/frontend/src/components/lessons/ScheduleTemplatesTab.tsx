import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addWeeks } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { Plus, Calendar, Play, CalendarIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  LessonScheduleTemplate,
  LessonType,
  Instructor,
} from "@stall-bokning/shared";
import type { CreateScheduleTemplateData } from "@/services/lessonService";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  lessonTypeId: z.string().min(1, "Lesson type is required"),
  instructorId: z.string().min(1, "Instructor is required"),
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  maxParticipants: z.coerce.number().min(1).optional(),
  isActive: z.boolean().optional(),
  effectiveFrom: z.date().optional(),
  effectiveUntil: z.date().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

const generateSchema = z.object({
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
});

type GenerateFormData = z.infer<typeof generateSchema>;

interface ScheduleTemplatesTabProps {
  templates: LessonScheduleTemplate[];
  lessonTypes: LessonType[];
  instructors: Instructor[];
  onCreate: (data: CreateScheduleTemplateData) => Promise<void>;
  onGenerate: (
    startDate: string,
    endDate: string,
  ) => Promise<{ createdCount: number }>;
}

export function ScheduleTemplatesTab({
  templates,
  lessonTypes,
  instructors,
  onCreate,
  onGenerate,
}: ScheduleTemplatesTabProps) {
  const { t, i18n } = useTranslation(["lessons", "common"]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generateResult, setGenerateResult] = useState<number | null>(null);

  const locale = i18n.language === "sv" ? sv : enUS;

  const createForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      lessonTypeId: "",
      instructorId: "",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      isActive: true,
    },
  });

  const generateForm = useForm<GenerateFormData>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: addWeeks(new Date(), 4),
    },
  });

  async function handleCreateSubmit(data: TemplateFormData) {
    setIsSubmitting(true);
    try {
      await onCreate({
        name: data.name,
        lessonTypeId: data.lessonTypeId,
        instructorId: data.instructorId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location || undefined,
        maxParticipants: data.maxParticipants || undefined,
        isActive: data.isActive,
        effectiveFrom: data.effectiveFrom?.toISOString(),
        effectiveUntil: data.effectiveUntil?.toISOString(),
      });
      setCreateDialogOpen(false);
      createForm.reset();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateSubmit(data: GenerateFormData) {
    setIsSubmitting(true);
    try {
      const result = await onGenerate(
        format(data.startDate, "yyyy-MM-dd"),
        format(data.endDate, "yyyy-MM-dd"),
      );
      setGenerateResult(result.createdCount);
    } finally {
      setIsSubmitting(false);
    }
  }

  function getLessonTypeName(id: string) {
    return lessonTypes.find((lt) => lt.id === id)?.name || "-";
  }

  function getInstructorName(id: string) {
    return instructors.find((i) => i.id === id)?.name || "-";
  }

  function getLessonTypeColor(id: string) {
    return lessonTypes.find((lt) => lt.id === id)?.color || "#6b7280";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("lessons:templates.title")}</CardTitle>
              <CardDescription>
                {t("lessons:templates.description")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setGenerateDialogOpen(true)}
              >
                <Play className="h-4 w-4 mr-2" />
                {t("lessons:templates.generate")}
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("lessons:templates.create")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">
                {t("lessons:templates.empty")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("lessons:templates.description")}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("lessons:templates.create")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("lessons:templates.fields.name")}</TableHead>
                  <TableHead>
                    {t("lessons:templates.fields.dayOfWeek")}
                  </TableHead>
                  <TableHead>{t("lessons:fields.startTime")}</TableHead>
                  <TableHead>{t("lessons:fields.lessonType")}</TableHead>
                  <TableHead>{t("lessons:fields.instructor")}</TableHead>
                  <TableHead>{t("common:status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell>
                      {t(`lessons:templates.days.${template.dayOfWeek}`)}
                    </TableCell>
                    <TableCell>
                      {template.startTime} - {template.endTime}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: getLessonTypeColor(
                              template.lessonTypeId,
                            ),
                          }}
                        />
                        {getLessonTypeName(template.lessonTypeId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getInstructorName(template.instructorId)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={template.isActive ? "default" : "secondary"}
                      >
                        {template.isActive
                          ? t("common:active")
                          : t("common:inactive")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("lessons:templates.create")}</DialogTitle>
            <DialogDescription>
              {t("lessons:templates.description")}
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(handleCreateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessons:templates.fields.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="lessonTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessons:fields.lessonType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("lessons:list.filters.allTypes")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lessonTypes
                          .filter((lt) => lt.isActive)
                          .map((lessonType) => (
                            <SelectItem
                              key={lessonType.id}
                              value={lessonType.id}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor:
                                      lessonType.color || "#6b7280",
                                  }}
                                />
                                {lessonType.name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="instructorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessons:fields.instructor")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "lessons:list.filters.allInstructors",
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instructors
                          .filter((i) => i.isActive)
                          .map((instructor) => (
                            <SelectItem
                              key={instructor.id}
                              value={instructor.id}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor:
                                      instructor.color || "#6b7280",
                                  }}
                                />
                                {instructor.name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("lessons:templates.fields.dayOfWeek")}
                    </FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {t(`lessons:templates.days.${day}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lessons:fields.startTime")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lessons:fields.endTime")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessons:fields.location")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessons:fields.maxParticipants")}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("common:active")}</FormLabel>
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
                  onClick={() => setCreateDialogOpen(false)}
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

      {/* Generate Lessons Dialog */}
      <Dialog
        open={generateDialogOpen}
        onOpenChange={(open) => {
          setGenerateDialogOpen(open);
          if (!open) setGenerateResult(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("lessons:templates.generate")}</DialogTitle>
            <DialogDescription>
              {t("lessons:templates.generateDescription")}
            </DialogDescription>
          </DialogHeader>

          {generateResult !== null ? (
            <div className="py-6 text-center">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-lg font-medium">
                {t("lessons:templates.generated", { count: generateResult })}
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setGenerateDialogOpen(false);
                  setGenerateResult(null);
                }}
              >
                {t("common:close")}
              </Button>
            </div>
          ) : (
            <Form {...generateForm}>
              <form
                onSubmit={generateForm.handleSubmit(handleGenerateSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={generateForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        {t("lessons:templates.fields.effectiveFrom")}
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale })
                              ) : (
                                <span>{t("common:select")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={generateForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        {t("lessons:templates.fields.effectiveUntil")}
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale })
                              ) : (
                                <span>{t("common:select")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setGenerateDialogOpen(false)}
                  >
                    {t("common:cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? t("common:saving")
                      : t("lessons:templates.generate")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
