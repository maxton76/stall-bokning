import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  Plus,
  Search,
  Calendar,
  Users,
  BookOpen,
  Clock,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { useApiQuery } from "@/hooks/useApiQuery";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys, cacheInvalidation } from "@/lib/queryClient";
import {
  getLessons,
  getLessonTypes,
  getInstructors,
  getLessonSettings,
  getLessonStatusVariant,
  type LessonsResponse,
  type LessonTypesResponse,
  type InstructorsResponse,
  type LessonSettingsResponse,
} from "@/services/lessonService";
import { cn } from "@/lib/utils";
import { CreateLessonDialog } from "@/components/lessons/CreateLessonDialog";
import { LessonDetailDialog } from "@/components/lessons/LessonDetailDialog";
import { LessonTypesTab } from "@/components/lessons/LessonTypesTab";
import { InstructorsTab } from "@/components/lessons/InstructorsTab";
import { ScheduleTemplatesTab } from "@/components/lessons/ScheduleTemplatesTab";
import { LessonSettingsForm } from "@/components/lessons/LessonSettingsForm";
import { TrainerAvailabilityManager } from "@/components/lessons/TrainerAvailabilityManager";
import type { Lesson } from "@equiduty/shared";

export default function ManageLessonsPage() {
  const { t, i18n } = useTranslation(["lessons", "common"]);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const locale = i18n.language === "sv" ? sv : enUS;

  const [activeTab, setActiveTab] = useState("myLessons");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const organizationId = currentOrganization;

  const lessonsQuery = useApiQuery<LessonsResponse>(
    queryKeys.lessons.byOrganization(organizationId || "", "", ""),
    () => getLessons(organizationId!, { limit: 200 }),
    { enabled: !!organizationId, staleTime: 2 * 60 * 1000 },
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

  const lessonSettingsQuery = useApiQuery<LessonSettingsResponse>(
    queryKeys.lessonSettings.byOrganization(organizationId || ""),
    () => getLessonSettings(organizationId!),
    { enabled: !!organizationId, staleTime: 5 * 60 * 1000 },
  );

  // Filter lessons for "my lessons" (where user is instructor)
  const myLessons = useMemo(() => {
    if (!lessonsQuery.data?.lessons || !user) return [];
    return lessonsQuery.data.lessons.filter((lesson) => {
      if (statusFilter !== "all" && lesson.status !== statusFilter)
        return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !lesson.lessonTypeName?.toLowerCase().includes(query) &&
          !lesson.instructorName?.toLowerCase().includes(query)
        )
          return false;
      }
      // Match by instructor userId
      return lesson.instructorUserId === user.uid;
    });
  }, [lessonsQuery.data?.lessons, user, statusFilter, searchQuery]);

  const allLessons = useMemo(() => {
    if (!lessonsQuery.data?.lessons) return [];
    return lessonsQuery.data.lessons.filter((lesson) => {
      if (statusFilter !== "all" && lesson.status !== statusFilter)
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
  }, [lessonsQuery.data?.lessons, statusFilter, searchQuery]);

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setDetailDialogOpen(true);
  };

  const handleLessonCreated = async () => {
    setCreateDialogOpen(false);
    await cacheInvalidation.lessons.all();
    toast({ title: t("lessons:messages.created") });
  };

  const handleLessonUpdated = async () => {
    setDetailDialogOpen(false);
    setSelectedLesson(null);
    await cacheInvalidation.lessons.all();
  };

  const LessonsList = ({ lessons }: { lessons: Lesson[] }) => (
    <Card>
      <CardContent className="p-0">
        {lessonsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Calendar className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{t("lessons:list.empty")}</p>
          </div>
        ) : (
          <div className="divide-y">
            {lessons.map((lesson) => {
              const startTime = new Date(lesson.startTime as unknown as string);
              const endTime = new Date(lesson.endTime as unknown as string);

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
                            lessonTypesQuery.data?.lessonTypes.find(
                              (lt) => lt.id === lesson.lessonTypeId,
                            )?.color || "#3b82f6",
                        }}
                      />
                      <div>
                        <p className="font-medium">{lesson.lessonTypeName}</p>
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
                      <Badge variant={getLessonStatusVariant(lesson.status)}>
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
  );

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
          <h1 className="text-2xl font-bold">{t("lessons:manage.title")}</h1>
          <p className="text-muted-foreground">{t("lessons:description")}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("lessons:lesson.create")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="myLessons" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t("lessons:manage.tabs.myLessons")}
          </TabsTrigger>
          <TabsTrigger value="allLessons" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t("lessons:manage.tabs.allLessons")}
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
          <TabsTrigger value="availability" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t("lessons:trainerAvailability.title")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            {t("lessons:manage.tabs.settings")}
          </TabsTrigger>
        </TabsList>

        {/* Shared filters for lesson lists */}
        {(activeTab === "myLessons" || activeTab === "allLessons") && (
          <div className="flex flex-wrap items-center gap-4 mt-4">
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
          </div>
        )}

        <TabsContent value="myLessons">
          <LessonsList lessons={myLessons} />
        </TabsContent>

        <TabsContent value="allLessons">
          <LessonsList lessons={allLessons} />
        </TabsContent>

        <TabsContent value="types">
          <LessonTypesTab
            lessonTypes={lessonTypesQuery.data?.lessonTypes || []}
            skillLevels={lessonSettingsQuery.data?.settings?.skillLevels || []}
            isLoading={lessonTypesQuery.isLoading}
            onRefresh={async () => await cacheInvalidation.lessonTypes.all()}
          />
        </TabsContent>

        <TabsContent value="instructors">
          <InstructorsTab
            instructors={instructorsQuery.data?.instructors || []}
            isLoading={instructorsQuery.isLoading}
            onRefresh={async () => await cacheInvalidation.instructors.all()}
          />
        </TabsContent>

        <TabsContent value="templates">
          <ScheduleTemplatesTab
            lessonTypes={lessonTypesQuery.data?.lessonTypes || []}
            instructors={instructorsQuery.data?.instructors || []}
            onLessonsGenerated={async () =>
              await cacheInvalidation.lessons.all()
            }
          />
        </TabsContent>

        <TabsContent value="availability">
          <TrainerAvailabilityManager />
        </TabsContent>

        <TabsContent value="settings">
          <LessonSettingsForm />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateLessonDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        lessonTypes={lessonTypesQuery.data?.lessonTypes || []}
        instructors={instructorsQuery.data?.instructors || []}
        onSuccess={handleLessonCreated}
      />

      {selectedLesson && (
        <LessonDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          lesson={selectedLesson}
          lessonType={lessonTypesQuery.data?.lessonTypes.find(
            (lt) => lt.id === selectedLesson.lessonTypeId,
          )}
          onUpdate={handleLessonUpdated}
        />
      )}
    </div>
  );
}
