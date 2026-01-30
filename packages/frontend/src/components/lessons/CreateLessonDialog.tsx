import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LessonType, Instructor } from "@equiduty/shared";

const createLessonSchema = z.object({
  lessonTypeId: z.string().min(1, "Lesson type is required"),
  instructorId: z.string().min(1, "Instructor is required"),
  date: z.date({ message: "Date is required" }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  maxParticipants: z.coerce.number().min(1).optional(),
  notes: z.string().optional(),
});

type CreateLessonFormData = z.infer<typeof createLessonSchema>;

export interface CreateLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonTypes: LessonType[];
  instructors: Instructor[];
  onSuccess?: () => void;
  onSubmit?: (data: {
    lessonTypeId: string;
    instructorId: string;
    startTime: string;
    endTime: string;
    location?: string;
    maxParticipants?: number;
    notes?: string;
  }) => Promise<void>;
  selectedDate?: Date;
}

export function CreateLessonDialog({
  open,
  onOpenChange,
  lessonTypes,
  instructors,
  onSuccess,
  onSubmit,
  selectedDate,
}: CreateLessonDialogProps) {
  const { t } = useTranslation(["lessons", "common"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateLessonFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createLessonSchema as any),
    defaultValues: {
      lessonTypeId: "",
      instructorId: "",
      date: selectedDate || new Date(),
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      notes: "",
    },
  });

  const selectedLessonType = lessonTypes.find(
    (lt) => lt.id === form.watch("lessonTypeId"),
  );

  async function handleSubmit(data: CreateLessonFormData) {
    setIsSubmitting(true);
    try {
      const dateStr = format(data.date, "yyyy-MM-dd");
      const startTime = new Date(
        `${dateStr}T${data.startTime}:00`,
      ).toISOString();
      const endTime = new Date(`${dateStr}T${data.endTime}:00`).toISOString();

      if (onSubmit) {
        await onSubmit({
          lessonTypeId: data.lessonTypeId,
          instructorId: data.instructorId,
          startTime,
          endTime,
          location: data.location || undefined,
          maxParticipants: data.maxParticipants || undefined,
          notes: data.notes || undefined,
        });
      }
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("lessons:lesson.create")}</DialogTitle>
          <DialogDescription>{t("lessons:description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
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
                          <SelectItem key={lessonType.id} value={lessonType.id}>
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
              control={form.control}
              name="instructorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lessons:fields.instructor")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("lessons:list.filters.allInstructors")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {instructors
                        .filter((i) => i.isActive)
                        .map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
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
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("lessons:fields.date")}</FormLabel>
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
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("common:select")}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
              control={form.control}
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
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lessons:fields.maxParticipants")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder={
                        selectedLessonType?.maxParticipants?.toString() || "1"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("lessons:fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
  );
}
