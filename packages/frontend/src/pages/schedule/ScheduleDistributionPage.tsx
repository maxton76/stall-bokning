import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  RefreshCw,
  Scale,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useFairnessDistribution } from "@/hooks/useFairnessDistribution";
import {
  getFairnessLabel,
  getFairnessColor,
  formatPeriodLabel,
  type FairnessPeriod,
  type MemberFairnessData,
} from "@/services/fairnessService";

/**
 * Schedule Distribution Page - Fairness visualization
 *
 * Shows the fair distribution of tasks with:
 * - Real member workload comparison from API
 * - Fairness scores based on completed routines
 * - Period selection (week/month/quarter/year)
 * - Trend indicators
 */
export default function ScheduleDistributionPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();

  const [period, setPeriod] = useState<FairnessPeriod>("month");
  const [selectedStableId, setSelectedStableId] = useState<string>("");

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable if none selected
  const activeStableId = selectedStableId || stables[0]?.id;

  // Fetch real fairness data
  const {
    data: distribution,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useFairnessDistribution(activeStableId, period);

  const getTrendIcon = (
    trend: MemberFairnessData["trend"],
    isOverAverage: boolean,
  ) => {
    switch (trend) {
      case "up":
        // If over average, trending up is bad (more work)
        return (
          <TrendingUp
            className={`h-4 w-4 ${isOverAverage ? "text-amber-500" : "text-blue-500"}`}
          />
        );
      case "down":
        return (
          <TrendingDown
            className={`h-4 w-4 ${isOverAverage ? "text-green-500" : "text-amber-500"}`}
          />
        );
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProgressColor = (score: number) => {
    if (score < 30) return "bg-blue-500";
    if (score < 45) return "bg-blue-400";
    if (score <= 55) return "bg-green-500";
    if (score < 70) return "bg-amber-400";
    return "bg-amber-500";
  };

  // Loading state
  if (stablesLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Members Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 mt-1" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // No stables state
  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Inga stall</h3>
            <p className="text-muted-foreground">
              Du behöver vara medlem i ett stall för att se fördelningen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Kunde inte ladda fördelningsdata: {error?.message || "Okänt fel"}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Försök igen
        </Button>
      </div>
    );
  }

  // Empty state (no data yet)
  if (!distribution || distribution.members.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("common:schedule.distribution.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("common:schedule.distribution.subtitle")}
            </p>
          </div>
        </div>

        <Card className="p-8 text-center">
          <Scale className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Ingen data ännu</h3>
          <p className="text-muted-foreground mt-2">
            Fördelningsstatistik visas här när rutiner har genomförts.
          </p>
          <Button asChild className="mt-4">
            <Link to="/routines">Gå till rutiner</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("common:schedule.distribution.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("common:schedule.distribution.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stable Selector */}
          {stables.length > 1 && (
            <Select value={activeStableId} onValueChange={setSelectedStableId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Välj stall" />
              </SelectTrigger>
              <SelectContent>
                {stables.map((stable) => (
                  <SelectItem key={stable.id} value={stable.id}>
                    {stable.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Period Selector */}
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as FairnessPeriod)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Välj period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Senaste veckan</SelectItem>
              <SelectItem value="month">Senaste månaden</SelectItem>
              <SelectItem value="quarter">Senaste kvartalet</SelectItem>
              <SelectItem value="year">Senaste året</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link to="/schedule/week">
              {t("common:navigation.scheduleWeek")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/schedule/month">
              {t("common:navigation.scheduleMonth")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt poäng</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{distribution.totalPoints}</div>
            <p className="text-xs text-muted-foreground">
              {formatPeriodLabel(period).toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Genomsnitt/medlem
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {distribution.averagePointsPerMember}
            </div>
            <p className="text-xs text-muted-foreground">
              poäng per aktiv medlem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktiva medlemmar
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {distribution.activeMemberCount}
            </div>
            <p className="text-xs text-muted-foreground">deltar i schema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rättviseindex</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${distribution.fairnessIndex >= 70 ? "text-green-600" : distribution.fairnessIndex >= 50 ? "text-amber-600" : "text-red-600"}`}
            >
              {distribution.fairnessIndex}%
            </div>
            <p className="text-xs text-muted-foreground">
              {distribution.fairnessIndex >= 70
                ? "Bra balans"
                : distribution.fairnessIndex >= 50
                  ? "Acceptabel"
                  : "Behöver förbättras"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Arbetsfördelning per medlem</CardTitle>
          <CardDescription>
            {formatPeriodLabel(period)} ({distribution.periodStartDate} -{" "}
            {distribution.periodEndDate})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {distribution.members.map((member) => {
              const isOverAverage = member.fairnessScore > 55;

              return (
                <div key={member.userId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.displayName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{member.displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.totalPoints} poäng · {member.tasksCompleted}{" "}
                          uppgifter · ~{member.estimatedHoursWorked}h
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getTrendIcon(member.trend, isOverAverage)}
                      <Badge
                        variant="outline"
                        className={getFairnessColor(member.fairnessScore)}
                      >
                        {getFairnessLabel(member.fairnessScore)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getProgressColor(member.fairnessScore)}`}
                        style={{
                          width: `${Math.min(100, member.fairnessScore * 2)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {member.percentageOfTotal.toFixed(1)}%
                    </span>
                  </div>
                  {/* Deviation indicator */}
                  {Math.abs(member.deviationFromAverage) > 0.5 && (
                    <p className="text-xs text-muted-foreground pl-13">
                      {member.deviationFromAverage > 0 ? "+" : ""}
                      {member.deviationFromAverage.toFixed(1)} poäng från
                      genomsnittet
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fairness Explanation */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">
            Hur fungerar rättvis fördelning?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Rättvisepoäng</strong> visar hur jämnt arbetet fördelas. 50%
            = exakt genomsnitt, under 50% = fler pass behövs, över 50% = har
            gjort mer än genomsnittet.
          </p>
          <p>
            <strong>Rättviseindex</strong> ({distribution.fairnessIndex}%) mäter
            den totala jämnheten i stallet. Högre värde = mer rättvis
            fördelning.
          </p>
          <p>
            Vid tilldelning prioriteras medlemmar med lägre poäng för att
            utjämna fördelningen.
          </p>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Balanserad (45-55%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Under genomsnitt (&lt;45%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Över genomsnitt (&gt;55%)</span>
        </div>
      </div>
    </div>
  );
}
