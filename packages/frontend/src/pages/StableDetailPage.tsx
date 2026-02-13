import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Settings,
  Calendar,
  BarChart3,
  Loader2Icon,
  House as HorseIcon,
  ClipboardList,
  ExternalLink,
  Clock,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HorseCard } from "@/components/HorseCard";
import { EmptyState } from "@/components/EmptyState";
import { getStableHorses } from "@/services/horseService";
import { getStable } from "@/services/stableService";
import { getRoutineTemplates } from "@/services/routineService";
import type { Horse } from "@/types/roles";
import type { RoutineTemplate } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface Stable {
  id: string;
  name: string;
  description?: string;
  address?: string;
  ownerId: string;
  ownerEmail?: string;
  organizationId?: string;
}

export default function StableDetailPage() {
  const { t } = useTranslation([
    "stables",
    "common",
    "horses",
    "schedule",
    "routines",
  ]);
  const { stableId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();

  // Data loading with TanStack Query
  const stableQuery = useApiQuery<Stable | null>(
    queryKeys.stables.detail(stableId || ""),
    () => getStable(stableId!) as Promise<Stable | null>,
    {
      enabled: !!stableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const stableData = stableQuery.data ?? null;
  const stableLoading = stableQuery.isLoading;

  const routinesQuery = useApiQuery<RoutineTemplate[]>(
    queryKeys.routines.templates(stableData?.organizationId, stableId),
    () => getRoutineTemplates(stableData!.organizationId!, stableId),
    {
      enabled: !!stableData?.organizationId && !!stableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const routinesData = routinesQuery.data ?? [];
  const routinesLoading = routinesQuery.isLoading;

  const horsesQuery = useApiQuery<Horse[]>(
    queryKeys.horses.byStable(stableId || ""),
    () => getStableHorses(stableId!),
    {
      enabled: !!stableId,
      staleTime: 5 * 60 * 1000,
    },
  );
  const horsesData = horsesQuery.data ?? [];

  if (stableLoading || !stableData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/stables">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common:navigation.stables")}
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {stableData.name}
            </h1>
            {stableData.description && (
              <p className="text-muted-foreground mt-1">
                {stableData.description}
              </p>
            )}
            {stableData.address && (
              <p className="text-sm text-muted-foreground mt-1">
                {stableData.address}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/stables/${stableId}/schedule`}>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                {t("stables:schedule.title")}
              </Button>
            </Link>
            <Link to={`/stables/${stableId}/settings`}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                {t("common:navigation.settings")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("routines:title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routinesData.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stables:members.owner")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {stableData.ownerEmail || t("common:labels.noData")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("common:labels.status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-green-600">
              {t("common:status.active")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="horses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="horses">
            <HorseIcon className="mr-2 h-4 w-4" />
            {t("common:navigation.horses")}
            <Badge variant="secondary" className="ml-2">
              {horsesData.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="routines">
            <ClipboardList className="mr-2 h-4 w-4" />
            {t("routines:title")}
            <Badge variant="secondary" className="ml-2">
              {routinesData.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            {t("schedule:statistics.title")}
          </TabsTrigger>
        </TabsList>

        {/* Horses Tab */}
        <TabsContent value="horses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {t("stables:horses.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {horsesData.length || 0}{" "}
              {t("common:navigation.horses").toLowerCase()}
            </p>
          </div>

          {horsesData.length === 0 ? (
            <EmptyState
              icon={HorseIcon}
              title={t("horses:emptyState.title")}
              description={t("horses:emptyState.description")}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {horsesData.map((horse) => (
                <HorseCard
                  key={horse.id}
                  horse={horse}
                  showOwner={true}
                  showStable={false}
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Routines Tab */}
        <TabsContent value="routines" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{t("routines:title")}</h2>
            <Link to="/schedule/routinetemplates">
              <Button variant="outline">
                {t("routines:manageRoutines")}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {routinesLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  {t("common:labels.loading")}
                </p>
              </CardContent>
            </Card>
          ) : routinesData.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={t("routines:emptyState.title")}
              description={t("routines:emptyState.description")}
              action={{
                label: t("routines:manageRoutines"),
                onClick: () =>
                  (window.location.href = "/schedule/routinetemplates"),
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {routinesData.map((routine) => (
                <Card key={routine.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {routine.name}
                        </CardTitle>
                        {routine.description && (
                          <CardDescription className="line-clamp-2">
                            {routine.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {routine.steps?.length || 0}{" "}
                        {t("routines:template.steps")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{routine.defaultStartTime || "08:00"}</span>
                        {routine.estimatedDuration && (
                          <span className="text-muted-foreground">
                            (~{routine.estimatedDuration}{" "}
                            {t("common:time.minutes")})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4" />
                        <span>
                          {routine.pointsValue || 10}{" "}
                          {t("schedule:shiftTypes.form.points").toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {t("schedule:statistics.title")}
          </h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-center py-12">
                {t("schedule:statistics.comingSoon")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
