import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Wheat,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Info,
  Loader2,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useDefaultStableId } from "@/hooks/useUserPreferences";
import { useFeedingToday } from "@/hooks/useFeedingToday";
import { useDailyNotes } from "@/hooks/useRoutines";
import { useToast } from "@/hooks/use-toast";
import { resolveStepHorses } from "@/utils/routineHorseResolver";
import {
  updateRoutineProgress,
  startRoutineInstance,
} from "@/services/routineService";
import { getHorseFeedingsByStable } from "@/services/horseFeedingService";
import {
  transformHorseFeedingsToMap,
  type FeedingInfoForCard,
} from "@/utils/feedingTransform";
import { HorseContextCard } from "@/components/routines/HorseContextCard";
import type { Horse } from "@/types/roles";
import type {
  FeedingSessionView,
  FeedingSessionStatus,
} from "@/utils/feedingAggregation";

/**
 * Feeding Today Page - Today's feeding status
 *
 * Shows today's feeding status across all horses with:
 * - Feeding sessions aggregated from routine instances
 * - Navigation to routine flow for execution
 * - Progress tracking
 */
export default function FeedingTodayPage() {
  const { t } = useTranslation(["common", "routines", "feeding"]);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);
  const defaultStableId = useDefaultStableId();
  const [selectedStableId, setSelectedStableId] = useState<string>("");

  // Set initial stable: default stable (if accessible) > first stable
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId) {
      const preferred =
        defaultStableId && stables.some((s) => s.id === defaultStableId)
          ? defaultStableId
          : stables[0]?.id;
      setSelectedStableId(preferred ?? "");
    }
  }, [stables, selectedStableId, defaultStableId]);

  // Find selected stable for display
  const selectedStable = stables.find((s) => s.id === selectedStableId);

  // Fetch feeding sessions from routine instances
  const {
    sessions,
    loading,
    error,
    refetch,
    stats,
    query: feedingQuery,
  } = useFeedingToday(selectedStableId);
  const { toast } = useToast();

  // Daily notes for horses
  const { notes: dailyNotes } = useDailyNotes(selectedStableId);

  // Expandable session state
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [sessionHorses, setSessionHorses] = useState<Record<string, Horse[]>>(
    {},
  );
  const [sessionFeedingData, setSessionFeedingData] = useState<
    Record<string, Map<string, FeedingInfoForCard>>
  >({});
  const [loadingHorses, setLoadingHorses] = useState<Set<string>>(new Set());
  const [updatingHorses, setUpdatingHorses] = useState<Set<string>>(new Set());

  // Toggle session expansion
  const toggleSession = useCallback(
    async (session: FeedingSessionView) => {
      const key = `${session.instanceId}-${session.stepId}`;
      const newExpanded = new Set(expandedSessions);

      if (newExpanded.has(key)) {
        newExpanded.delete(key);
        setExpandedSessions(newExpanded);
        return;
      }

      newExpanded.add(key);
      setExpandedSessions(newExpanded);

      // Load horses and feeding data if not already loaded
      if (!sessionHorses[key] && session.instance.organizationId) {
        setLoadingHorses((prev) => new Set(prev).add(key));
        try {
          // Load horses and feeding data in parallel
          const [horses, feedings] = await Promise.all([
            resolveStepHorses(
              session.step,
              session.instance.stableId,
              session.instance.organizationId,
            ),
            session.step.feedingTimeId
              ? getHorseFeedingsByStable(session.instance.stableId, {
                  feedingTimeId: session.step.feedingTimeId,
                  activeOnly: true,
                })
              : Promise.resolve([]),
          ]);
          setSessionHorses((prev) => ({ ...prev, [key]: horses }));
          setSessionFeedingData((prev) => ({
            ...prev,
            [key]: transformHorseFeedingsToMap(feedings),
          }));
        } catch (err) {
          console.error("Failed to load horses for session:", err);
          toast({
            title: t("common:errors.loadFailed"),
            variant: "destructive",
          });
        } finally {
          setLoadingHorses((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      }
    },
    [expandedSessions, sessionHorses, t, toast],
  );

  // Mark a single horse as done
  const markHorseDone = useCallback(
    async (session: FeedingSessionView, horseId: string, horseName: string) => {
      const key = `${session.instanceId}-${session.stepId}-${horseId}`;
      setUpdatingHorses((prev) => new Set(prev).add(key));

      try {
        // Ensure routine is started before updating progress
        if (session.instance.status === "scheduled") {
          await startRoutineInstance(session.instanceId, true);
        }

        await updateRoutineProgress(session.instanceId, {
          stepId: session.stepId,
          horseUpdates: [
            {
              horseId,
              horseName,
              completed: true,
            },
          ],
        });

        await refetch();
        toast({
          title: t(
            "feeding:today.horseMarkedComplete",
            "Häst markerad som klar",
          ),
          description: horseName,
        });
      } catch (err) {
        console.error("Failed to mark horse as done:", err);
        toast({
          title: t("common:errors.saveFailed"),
          variant: "destructive",
        });
      } finally {
        setUpdatingHorses((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [refetch, t, toast],
  );

  // Skip a single horse
  const skipHorse = useCallback(
    async (
      session: FeedingSessionView,
      horseId: string,
      horseName: string,
      reason: string,
    ) => {
      const key = `${session.instanceId}-${session.stepId}-${horseId}`;
      setUpdatingHorses((prev) => new Set(prev).add(key));

      try {
        // Ensure routine is started before updating progress
        if (session.instance.status === "scheduled") {
          await startRoutineInstance(session.instanceId, true);
        }

        await updateRoutineProgress(session.instanceId, {
          stepId: session.stepId,
          horseUpdates: [
            {
              horseId,
              horseName,
              skipped: true,
              skipReason: reason,
            },
          ],
        });

        await refetch();
        toast({
          title: t("routines:horse.skipped", "Häst hoppades över"),
          description: horseName,
        });
      } catch (err) {
        console.error("Failed to skip horse:", err);
        toast({
          title: t("common:errors.saveFailed"),
          variant: "destructive",
        });
      } finally {
        setUpdatingHorses((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [refetch, t, toast],
  );

  // Mark all horses as done
  const markAllHorsesDone = useCallback(
    async (session: FeedingSessionView) => {
      const key = `${session.instanceId}-${session.stepId}`;
      const horses = sessionHorses[key];
      if (!horses?.length) return;

      setUpdatingHorses((prev) => new Set(prev).add(`${key}-all`));

      try {
        // Ensure routine is started before updating progress
        if (session.instance.status === "scheduled") {
          await startRoutineInstance(session.instanceId, true);
        }

        // Get horses that aren't already completed
        const horsesToMark = horses.filter((horse) => {
          const progress = session.horseProgress?.[horse.id];
          return !progress?.completed && !progress?.skipped;
        });

        if (horsesToMark.length === 0) {
          toast({
            title: t(
              "feeding:today.allHorsesAlreadyComplete",
              "Alla hästar är redan klara",
            ),
          });
          return;
        }

        await updateRoutineProgress(session.instanceId, {
          stepId: session.stepId,
          horseUpdates: horsesToMark.map((horse) => ({
            horseId: horse.id,
            horseName: horse.name,
            completed: true,
          })),
        });

        await refetch();
        toast({
          title: t(
            "feeding:today.allHorsesMarkedComplete",
            "Alla hästar markerade som klara",
          ),
          description: `${horsesToMark.length} ${t("common:labels.horse", "hästar")}`,
        });
      } catch (err) {
        console.error("Failed to mark all horses as done:", err);
        toast({
          title: t("common:errors.saveFailed"),
          variant: "destructive",
        });
      } finally {
        setUpdatingHorses((prev) => {
          const next = new Set(prev);
          next.delete(`${key}-all`);
          return next;
        });
      }
    },
    [sessionHorses, refetch, t, toast],
  );

  const getStatusColor = (status: FeedingSessionStatus) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "upcoming":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: FeedingSessionStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "active":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "overdue":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "upcoming":
        return <Clock className="h-5 w-5 text-purple-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: FeedingSessionStatus) => {
    switch (status) {
      case "completed":
        return t("common:status.completed");
      case "in_progress":
        return t("routines:status.in_progress");
      case "active":
        return t("feeding:today.active", "Aktiv");
      case "overdue":
        return t("common:overview.sections.overdue");
      case "upcoming":
        return t("feeding:today.upcoming", "Kommande");
      default:
        return t("routines:status.scheduled");
    }
  };

  const handleStartSession = (session: FeedingSessionView) => {
    // Navigate to routine flow at the feeding step
    navigate(`/routines/flow/${session.instanceId}?step=${session.stepId}`);
  };

  const handleContinueSession = (session: FeedingSessionView) => {
    // Navigate to routine flow at the feeding step
    navigate(`/routines/flow/${session.instanceId}?step=${session.stepId}`);
  };

  // Skeleton component for loading state
  const FeedingSkeleton = () => (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wheat className="h-8 w-8" />
            {t("common:navigation.feedingToday")}
          </h1>
        </div>
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );

  // Loading stables
  if (stablesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // No stables found
  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t("feeding:loadingStates.noStablesForSchedule")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use QueryBoundary for feeding data (handles loading, error, and success states)
  return (
    <QueryBoundary query={feedingQuery} loadingFallback={<FeedingSkeleton />}>
      {() => {
        // No feeding sessions - empty state
        if (sessions.length === 0) {
          return (
            <div className="container mx-auto p-6 space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Wheat className="h-8 w-8" />
                    {t("common:navigation.feedingToday")}
                  </h1>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => refetch()}
                      variant="outline"
                      size="icon"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/feeding/schedule">
                        {t("common:navigation.schedule")}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                {stables.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t("common:labels.stable")}:
                    </span>
                    <Select
                      value={selectedStableId}
                      onValueChange={setSelectedStableId}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stables.map((stable) => (
                          <SelectItem key={stable.id} value={stable.id}>
                            {stable.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wheat className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {t(
                      "feeding:today.noFeedingSessions",
                      "Inga utfodringar idag",
                    )}
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    {t(
                      "feeding:today.noFeedingSessionsDescription",
                      "Det finns inga schemalagda rutiner med utfodringssteg för idag. Skapa rutiner i inställningarna eller vänta på att en rutin schemaläggs.",
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link to="/routines">{t("routines:title")}</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/schedule/routinetemplates">
                        {t("routines:manageRoutines")}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        // Main content - sessions available
        return (
          <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Wheat className="h-8 w-8" />
                  {t("common:navigation.feedingToday")}
                </h1>
                <div className="flex gap-2">
                  <Button onClick={refetch} variant="outline" size="icon">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/feeding/schedule">
                      {t("common:navigation.schedule")}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {stables.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t("common:labels.stable")}:
                    </span>
                    <Select
                      value={selectedStableId}
                      onValueChange={setSelectedStableId}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stables.map((stable) => (
                          <SelectItem key={stable.id} value={stable.id}>
                            {stable.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {t("feeding:today.subtitle", "Utfodringsstatus för idag")} -{" "}
                    {selectedStable?.name}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Overview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {t("feeding:today.progress", "Dagens framsteg")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {stats.completedSessions} {t("common:labels.of")}{" "}
                      {stats.totalSessions}{" "}
                      {t(
                        "feeding:today.feedingsCompleted",
                        "utfodringar klara",
                      )}
                    </span>
                    <span>{stats.progressPercent}%</span>
                  </div>
                  <Progress value={stats.progressPercent} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Feeding Sessions */}
            <div className="space-y-3">
              {sessions.map((session) => {
                const sessionKey = `${session.instanceId}-${session.stepId}`;
                const isExpanded = expandedSessions.has(sessionKey);
                const horses = sessionHorses[sessionKey] || [];
                const isLoadingHorses = loadingHorses.has(sessionKey);
                const isMarkingAll = updatingHorses.has(`${sessionKey}-all`);
                const canExpand = session.step.horseContext !== "none";

                return (
                  <Card
                    key={sessionKey}
                    className={
                      session.status === "overdue"
                        ? "border-destructive/50"
                        : session.status === "in_progress"
                          ? "border-primary/50"
                          : session.status === "active"
                            ? "border-yellow-500/50"
                            : ""
                    }
                  >
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => canExpand && toggleSession(session)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          {getStatusIcon(session.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium">
                                {t(
                                  `routines:categories.${session.step.category}`,
                                )}
                              </h3>
                              <Badge
                                className={getStatusColor(session.status)}
                                variant="secondary"
                              >
                                {getStatusLabel(session.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {session.time}
                              </span>
                              <span className="text-xs">
                                {session.routineName}
                              </span>
                              {(session.status === "in_progress" ||
                                session.horsesTotal > 0) && (
                                <span>
                                  {session.horsesCompleted}/
                                  {session.horsesTotal}{" "}
                                  {t(
                                    "feeding:today.horsesFed",
                                    "hästar utfodrade",
                                  )}
                                </span>
                              )}
                              {session.status === "completed" &&
                                session.completedByName && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {session.completedByName}
                                    {session.completedAt &&
                                      ` (${session.completedAt})`}
                                  </span>
                                )}
                            </div>
                            {session.horsesTotal > 0 && (
                              <Progress
                                value={
                                  (session.horsesCompleted /
                                    session.horsesTotal) *
                                  100
                                }
                                className="h-1 mt-2"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {canExpand && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <span className="ml-1 text-xs">
                                    {t("feeding:today.showHorses", "Hästar")}
                                  </span>
                                </Button>
                              </CollapsibleTrigger>
                            )}
                            {session.status !== "completed" && (
                              <Button
                                size="sm"
                                onClick={() => handleContinueSession(session)}
                              >
                                {session.status === "in_progress"
                                  ? t("routines:actions.continue", "Fortsätt")
                                  : t("routines:actions.start", "Starta")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>

                      <CollapsibleContent>
                        <div className="border-t px-4 py-3 bg-muted/30">
                          {isLoadingHorses ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">
                                {t("common:labels.loading")}
                              </span>
                            </div>
                          ) : horses.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              {t(
                                "feeding:today.noHorsesInStep",
                                "Inga hästar i detta steg",
                              )}
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {/* Mark all button */}
                              {session.status !== "completed" && (
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markAllHorsesDone(session)}
                                    disabled={isMarkingAll}
                                  >
                                    {isMarkingAll ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <Check className="h-4 w-4 mr-2" />
                                    )}
                                    {t(
                                      "feeding:today.markAllComplete",
                                      "Markera alla klara",
                                    )}
                                  </Button>
                                </div>
                              )}

                              {/* Horse list using HorseContextCard */}
                              <div className="grid gap-3">
                                {horses.map((horse) => {
                                  const horseKey = `${sessionKey}-${horse.id}`;
                                  const isUpdating =
                                    updatingHorses.has(horseKey);
                                  const feedingData =
                                    sessionFeedingData[sessionKey];
                                  const feedingInfo = feedingData?.get(
                                    horse.id,
                                  );
                                  const horseProgress =
                                    session.horseProgress?.[horse.id];

                                  return (
                                    <HorseContextCard
                                      key={horse.id}
                                      horse={horse}
                                      step={session.step}
                                      feedingInfo={feedingInfo}
                                      progress={horseProgress}
                                      dailyNotes={dailyNotes}
                                      onMarkDone={(notes) =>
                                        markHorseDone(
                                          session,
                                          horse.id,
                                          horse.name,
                                        )
                                      }
                                      onSkip={(reason) =>
                                        skipHorse(
                                          session,
                                          horse.id,
                                          horse.name,
                                          reason,
                                        )
                                      }
                                      isSubmitting={isUpdating}
                                      readonly={session.status === "completed"}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      }}
    </QueryBoundary>
  );
}
