import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Wheat,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  ChevronRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useFeedingToday } from "@/hooks/useFeedingToday";
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
  const [selectedStableId, setSelectedStableId] = useState<string | null>(null);

  // Set initial stable when stables load
  useEffect(() => {
    if (stables.length > 0 && !selectedStableId) {
      setSelectedStableId(stables[0]?.id ?? null);
    }
  }, [stables, selectedStableId]);

  // Find selected stable for display
  const selectedStable = stables.find((s) => s.id === selectedStableId);

  // Fetch feeding sessions from routine instances
  const { sessions, loading, error, refetch, stats } =
    useFeedingToday(selectedStableId);

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

  // Loading feeding data
  if (loading) {
    return (
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
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            {t("common:errors.loadFailed")}: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common:buttons.retry")}
        </Button>
      </div>
    );
  }

  // No feeding sessions
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
          {stables.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("common:labels.stable")}:
              </span>
              <Select
                value={selectedStableId ?? undefined}
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
              {t("feeding:today.noFeedingSessions", "Inga utfodringar idag")}
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
                <Link to="/settings/routines">
                  {t("routines:manageRoutines")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                value={selectedStableId ?? undefined}
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
                {t("feeding:today.feedingsCompleted", "utfodringar klara")}
              </span>
              <span>{stats.progressPercent}%</span>
            </div>
            <Progress value={stats.progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Feeding Sessions */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <Card
            key={`${session.instanceId}-${session.stepId}`}
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
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                {getStatusIcon(session.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{session.name}</h3>
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
                    <span className="text-xs">{session.routineName}</span>
                    {session.status === "in_progress" &&
                      session.horsesTotal > 0 && (
                        <span>
                          {session.horsesCompleted}/{session.horsesTotal}{" "}
                          {t("feeding:today.horsesFed", "hästar utfodrade")}
                        </span>
                      )}
                    {session.status === "completed" &&
                      session.completedByName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {session.completedByName}
                          {session.completedAt && ` (${session.completedAt})`}
                        </span>
                      )}
                  </div>
                  {session.status === "in_progress" &&
                    session.horsesTotal > 0 && (
                      <Progress
                        value={
                          (session.horsesCompleted / session.horsesTotal) * 100
                        }
                        className="h-1 mt-2"
                      />
                    )}
                </div>
                {(session.status === "upcoming" ||
                  session.status === "pending" ||
                  session.status === "active" ||
                  session.status === "overdue") && (
                  <Button size="sm" onClick={() => handleStartSession(session)}>
                    {t("routines:actions.start", "Starta")}
                  </Button>
                )}
                {session.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() => handleContinueSession(session)}
                  >
                    {t("routines:actions.continue", "Fortsätt")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
