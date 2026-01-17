import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Calendar,
  List,
  Users,
  BookOpen,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  getLessons,
  getLessonTypes,
  getInstructors,
  getLessonStatusVariant,
  type LessonsResponse,
  type LessonTypesResponse,
  type InstructorsResponse,
} from "@/services/lessonService";
import { formatCurrency } from "@/services/portalService";
import { cn } from "@/lib/utils";
import { CreateLessonDialog } from "@/components/lessons/CreateLessonDialog";
import { LessonDetailDialog } from "@/components/lessons/LessonDetailDialog";
import { LessonTypesTab } from "@/components/lessons/LessonTypesTab";
import { InstructorsTab } from "@/components/lessons/InstructorsTab";
import { ScheduleTemplatesTab } from "@/components/lessons/ScheduleTemplatesTab";
import type { Lesson, LessonType, Instructor } from "@stall-bokning/shared";

export default function LessonsPage() {
  const { t, i18n } = useTranslation(["lessons", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const locale = i18n.language === "sv" ? sv : enUS;

  const [activeTab, setActiveTab] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Filters for list view
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [instructorFilter, setInstructorFilter] = useState<string>("all");

  const organizationId = currentOrganization;

  // Compute week range for calendar view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const lessons = useAsyncData<LessonsResponse>({
    loadFn: async () => {
      if (!organizationId) throw new Error("No organization");
      return getLessons(organizationId, {
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        limit: 100,
      });
    },
  });

  const lessonTypes = useAsyncData<LessonTypesResponse>({
    loadFn: async () => {
      if (!organizationId) throw new Error("No organization");
      return getLessonTypes(organizationId);
    },
  });

  const instructors = useAsyncData<InstructorsResponse>({
    loadFn: async () => {
      if (!organizationId) throw new Error("No organization");
      return getInstructors(organizationId);
    },
  });

  useEffect(() => {
    if (organizationId) {
      lessons.load();
      lessonTypes.load();
      instructors.load();
    }
  }, [organizationId, weekStart.toISOString()]);

  // Group lessons by day for calendar view
  const lessonsByDay = useMemo(() => {
    if (!lessons.data?.lessons) return {};

    const grouped: Record<string, Lesson[]> = {};
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dateKey = format(day, "yyyy-MM-dd");
      grouped[dateKey] = [];
    }

    lessons.data.lessons.forEach((lesson) => {
      const lessonDate = new Date(lesson.startTime as unknown as string);
      const dateKey = format(lessonDate, "yyyy-MM-dd");
      if (grouped[dateKey]) {
        grouped[dateKey].push(lesson);
      }
    });

    // Sort lessons by start time
    Object.keys(grouped).forEach((key) => {
      const lessons = grouped[key];
      if (lessons) {
        lessons.sort((a, b) => {
          const aTime = new Date(a.startTime as unknown as string).getTime();
          const bTime = new Date(b.startTime as unknown as string).getTime();
          return aTime - bTime;
        });
      }
    });

    return grouped;
  }, [lessons.data?.lessons, weekStart]);

  // Filter lessons for list view
  const filteredLessons = useMemo(() => {
    if (!lessons.data?.lessons) return [];

    return lessons.data.lessons.filter((lesson) => {
      if (statusFilter !== "all" && lesson.status !== statusFilter)
        return false;
      if (typeFilter !== "all" && lesson.lessonTypeId !== typeFilter)
        return false;
      if (
        instructorFilter !== "all" &&
        lesson.instructorId !== instructorFilter
      )
        return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          lesson.lessonTypeName?.toLowerCase().includes(query) ||
          lesson.instructorName?.toLowerCase().includes(query) ||
          lesson.location?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [
    lessons.data?.lessons,
    statusFilter,
    typeFilter,
    instructorFilter,
    searchQuery,
  ]);

  const handlePreviousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setDetailDialogOpen(true);
  };

  const handleLessonCreated = () => {
    setCreateDialogOpen(false);
    lessons.load();
    toast({ title: t("lessons:messages.created") });
  };

  const handleLessonUpdated = () => {
    setDetailDialogOpen(false);
    setSelectedLesson(null);
    lessons.load();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("lessons:title")}</h1>
          <p className="text-muted-foreground">{t("lessons:description")}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("lessons:lesson.create")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t("lessons:tabs.calendar")}
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            {t("lessons:tabs.list")}
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t("lessons:tabs.types")}
          </TabsTrigger>
          <TabsTrigger value="instructors" className="gap-2">
            <Users className="h-4 w-4" />
            {t("lessons:tabs.instructors")}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Clock className="h-4 w-4" />
            {t("lessons:tabs.templates")}
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                {t("lessons:calendar.today")}
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-lg font-semibold">
              {format(weekStart, "d MMM", { locale })} -{" "}
              {format(weekEnd, "d MMM yyyy", { locale })}
            </h2>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
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
                    {lessons.isLoading ? (
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
                          const lessonType = lessonTypes.data?.lessonTypes.find(
                            (lt) => lt.id === lesson.lessonTypeId,
                          );

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => handleLessonClick(lesson)}
                              className={cn(
                                "w-full rounded-md p-1.5 text-left text-xs transition-colors hover:opacity-80",
                                lesson.status === "cancelled"
                                  ? "bg-muted line-through"
                                  : "text-white",
                              )}
                              style={{
                                backgroundColor:
                                  lesson.status !== "cancelled"
                                    ? lessonType?.color || "#3b82f6"
                                    : undefined,
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
                                {lesson.currentParticipants}/
                                {lesson.maxParticipants}
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
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common:search.placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue
                  placeholder={t("lessons:list.filters.allStatuses")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("lessons:list.filters.allStatuses")}
                </SelectItem>
                <SelectItem value="scheduled">
                  {t("lessons:status.scheduled")}
                </SelectItem>
                <SelectItem value="confirmed">
                  {t("lessons:status.confirmed")}
                </SelectItem>
                <SelectItem value="completed">
                  {t("lessons:status.completed")}
                </SelectItem>
                <SelectItem value="cancelled">
                  {t("lessons:status.cancelled")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("lessons:list.filters.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("lessons:list.filters.allTypes")}
                </SelectItem>
                {lessonTypes.data?.lessonTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={instructorFilter}
              onValueChange={setInstructorFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue
                  placeholder={t("lessons:list.filters.allInstructors")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("lessons:list.filters.allInstructors")}
                </SelectItem>
                {instructors.data?.instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lessons List */}
          <Card>
            <CardContent className="p-0">
              {lessons.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredLessons.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("lessons:list.empty")}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredLessons.map((lesson) => {
                    const startTime = new Date(
                      lesson.startTime as unknown as string,
                    );
                    const endTime = new Date(
                      lesson.endTime as unknown as string,
                    );

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson)}
                        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="h-10 w-1 rounded-full"
                              style={{
                                backgroundColor:
                                  lessonTypes.data?.lessonTypes.find(
                                    (lt) => lt.id === lesson.lessonTypeId,
                                  )?.color || "#3b82f6",
                              }}
                            />
                            <div>
                              <p className="font-medium">
                                {lesson.lessonTypeName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {lesson.instructorName}
                                {lesson.location && ` • ${lesson.location}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {format(startTime, "EEE, d MMM", { locale })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(startTime, "HH:mm")} -{" "}
                              {format(endTime, "HH:mm")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={getLessonStatusVariant(lesson.status)}
                            >
                              {t(`lessons:status.${lesson.status}`)}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {t("lessons:lesson.participantsCount", {
                                current: lesson.currentParticipants,
                                max: lesson.maxParticipants,
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lesson Types Tab */}
        <TabsContent value="types">
          <LessonTypesTab
            lessonTypes={lessonTypes.data?.lessonTypes || []}
            isLoading={lessonTypes.isLoading}
            onRefresh={() => lessonTypes.load()}
          />
        </TabsContent>

        {/* Instructors Tab */}
        <TabsContent value="instructors">
          <InstructorsTab
            instructors={instructors.data?.instructors || []}
            isLoading={instructors.isLoading}
            onRefresh={() => instructors.load()}
          />
        </TabsContent>

        {/* Schedule Templates Tab */}
        <TabsContent value="templates">
          <ScheduleTemplatesTab
            lessonTypes={lessonTypes.data?.lessonTypes || []}
            instructors={instructors.data?.instructors || []}
            onLessonsGenerated={() => lessons.load()}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateLessonDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        lessonTypes={lessonTypes.data?.lessonTypes || []}
        instructors={instructors.data?.instructors || []}
        onSuccess={handleLessonCreated}
      />

      {selectedLesson && (
        <LessonDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          lesson={selectedLesson}
          lessonType={lessonTypes.data?.lessonTypes.find(
            (lt) => lt.id === selectedLesson.lessonTypeId,
          )}
          onUpdate={handleLessonUpdated}
        />
      )}
    </div>
  );
}
