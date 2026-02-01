import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useOrganization } from "@/contexts/OrganizationContext";
import { queryKeys } from "@/lib/queryClient";
import {
  getLessons,
  getLessonTypes,
  getInstructors,
  type LessonsResponse,
  type LessonTypesResponse,
  type InstructorsResponse,
} from "@/services/lessonService";
import { cn } from "@/lib/utils";
import { LessonBookingDialog } from "@/components/lessons/LessonBookingDialog";
import type { Lesson } from "@equiduty/shared";

export default function LessonsCalendarPage() {
  const { t, i18n } = useTranslation(["lessons", "common"]);
  const { currentOrganization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [instructorFilter, setInstructorFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const organizationId = currentOrganization;

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const lessonsQuery = useApiQuery<LessonsResponse>(
    queryKeys.lessons.byOrganization(
      organizationId || "",
      weekStart.toISOString(),
      weekEnd.toISOString(),
    ),
    () =>
      getLessons(organizationId!, {
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        limit: 100,
      }),
    {
      enabled: !!organizationId,
      staleTime: 2 * 60 * 1000,
    },
  );

  const lessonTypesQuery = useApiQuery<LessonTypesResponse>(
    queryKeys.lessonTypes.byOrganization(organizationId || ""),
    () => getLessonTypes(organizationId!),
    { enabled: !!organizationId, staleTime: 5 * 60 * 1000 },
  );

  const instructorsQuery = useApiQuery<InstructorsResponse>(
    queryKeys.instructors.byOrganization(organizationId || ""),
    () => getInstructors(organizationId!),
    { enabled: !!organizationId, staleTime: 5 * 60 * 1000 },
  );

  const lessonsByDay = useMemo(() => {
    if (!lessonsQuery.data?.lessons) return {};

    const grouped: Record<string, Lesson[]> = {};
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      grouped[format(day, "yyyy-MM-dd")] = [];
    }

    lessonsQuery.data.lessons
      .filter((lesson) => {
        if (typeFilter !== "all" && lesson.lessonTypeId !== typeFilter)
          return false;
        if (
          instructorFilter !== "all" &&
          lesson.instructorId !== instructorFilter
        )
          return false;
        // Only show published/scheduled lessons to members
        return lesson.status !== "cancelled";
      })
      .forEach((lesson) => {
        const lessonDate = new Date(lesson.startTime as unknown as string);
        const dateKey = format(lessonDate, "yyyy-MM-dd");
        if (grouped[dateKey]) {
          grouped[dateKey].push(lesson);
        }
      });

    Object.keys(grouped).forEach((key) => {
      grouped[key]?.sort((a, b) => {
        const aTime = new Date(a.startTime as unknown as string).getTime();
        const bTime = new Date(b.startTime as unknown as string).getTime();
        return aTime - bTime;
      });
    });

    return grouped;
  }, [lessonsQuery.data?.lessons, weekStart, typeFilter, instructorFilter]);

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setBookingDialogOpen(true);
  };

  if (!organizationId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:messages.selectOrganization")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("lessons:calendar.title")}</h1>
          <p className="text-muted-foreground">{t("lessons:description")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            {t("lessons:calendar.today")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold">
          {format(weekStart, "d MMM", { locale })} -{" "}
          {format(weekEnd, "d MMM yyyy", { locale })}
        </h2>

        <div className="ml-auto flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("lessons:list.filters.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("lessons:list.filters.allTypes")}
              </SelectItem>
              {lessonTypesQuery.data?.lessonTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={instructorFilter} onValueChange={setInstructorFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue
                placeholder={t("lessons:list.filters.allInstructors")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("lessons:list.filters.allInstructors")}
              </SelectItem>
              {instructorsQuery.data?.instructors.map((instructor) => (
                <SelectItem key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = addDays(weekStart, i);
          const dateKey = format(day, "yyyy-MM-dd");
          const dayLessons = lessonsByDay[dateKey] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={dateKey}
              className={cn("min-h-[200px]", isToday && "border-primary")}
            >
              <CardHeader className="p-2">
                <CardTitle
                  className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary",
                  )}
                >
                  {format(day, "EEE d", { locale })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {lessonsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : dayLessons.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("lessons:calendar.noLessons")}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {dayLessons.map((lesson) => {
                      const startTime = new Date(
                        lesson.startTime as unknown as string,
                      );
                      const lessonType =
                        lessonTypesQuery.data?.lessonTypes.find(
                          (lt) => lt.id === lesson.lessonTypeId,
                        );
                      const spotsLeft =
                        lesson.maxParticipants - lesson.currentParticipants;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleLessonClick(lesson)}
                          className={cn(
                            "w-full rounded-md p-1.5 text-left text-xs transition-colors hover:opacity-80 text-white",
                          )}
                          style={{
                            backgroundColor: lessonType?.color || "#3b82f6",
                          }}
                        >
                          <p className="font-medium truncate">
                            {format(startTime, "HH:mm")} -{" "}
                            {lesson.lessonTypeName}
                          </p>
                          <p className="truncate opacity-90">
                            {lesson.instructorName}
                          </p>
                          <p className="truncate opacity-75">
                            {spotsLeft > 0
                              ? t("lessons:bookingDialog.spotsLeft", {
                                  count: spotsLeft,
                                })
                              : t("lessons:bookingDialog.full")}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Booking Dialog */}
      {selectedLesson && (
        <LessonBookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          lesson={selectedLesson}
          lessonType={lessonTypesQuery.data?.lessonTypes.find(
            (lt) => lt.id === selectedLesson.lessonTypeId,
          )}
        />
      )}
    </div>
  );
}
