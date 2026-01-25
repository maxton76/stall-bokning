import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  ChevronLeft,
  Rabbit,
  Calendar,
  Activity,
  Heart,
  MapPin,
} from "lucide-react";
// Note: Horse icon doesn't exist in lucide-react, using Rabbit as placeholder
const Horse = Rabbit;
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import {
  getPortalHorseDetail,
  getActivityStatusVariant,
  type PortalHorseDetailResponse,
} from "@/services/portalService";

export default function PortalHorseDetailPage() {
  const { horseId } = useParams<{ horseId: string }>();
  const { t, i18n } = useTranslation(["portal", "common", "horses"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  const horseQuery = useApiQuery<PortalHorseDetailResponse>(
    queryKeys.portal.horseDetail(horseId || ""),
    () => getPortalHorseDetail(horseId!),
    { enabled: !!horseId, staleTime: 5 * 60 * 1000 },
  );
  const horseData = horseQuery.data;
  const horseLoading = horseQuery.isLoading;
  const horseError = horseQuery.error;

  if (horseLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (horseError || !horseData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-4">
            <Horse className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("portal:horses.notFound")}
            </p>
            <Link to="/portal/horses">
              <Button variant="outline">{t("common:buttons.back")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { horse: horseDetails, activities, healthSummary } = horseData;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/portal/horses">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{horseDetails.name}</h1>
          <p className="text-muted-foreground">
            {horseDetails.breed}
            {horseDetails.color && ` • ${horseDetails.color}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Horse Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src={horseDetails.photoUrl}
                  alt={horseDetails.name}
                />
                <AvatarFallback className="text-3xl">
                  {horseDetails.name?.charAt(0) || "H"}
                </AvatarFallback>
              </Avatar>

              <div className="text-center">
                <h2 className="text-xl font-semibold">{horseDetails.name}</h2>
                {horseDetails.ownershipType !== "owner" && (
                  <Badge variant="secondary" className="mt-1">
                    {t(`portal:horses.ownership.${horseDetails.ownershipType}`)}
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="w-full space-y-3 text-sm">
                {horseDetails.registrationNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("horses:fields.registrationNumber")}
                    </span>
                    <span className="font-medium">
                      {horseDetails.registrationNumber}
                    </span>
                  </div>
                )}
                {horseDetails.age && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("horses:fields.age")}
                    </span>
                    <span className="font-medium">
                      {t("portal:horses.age", { age: horseDetails.age })}
                    </span>
                  </div>
                )}
                {horseDetails.gender && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("horses:fields.gender")}
                    </span>
                    <span className="font-medium">
                      {t(`horses:gender.${horseDetails.gender}`)}
                    </span>
                  </div>
                )}
                {horseDetails.stableName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("horses:fields.stable")}
                    </span>
                    <span className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {horseDetails.stableName}
                      {horseDetails.stallNumber &&
                        ` (${horseDetails.stallNumber})`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Section */}
        <div className="space-y-6 lg:col-span-2">
          {/* Health Summary */}
          {healthSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5" />
                  {t("portal:horses.healthSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {healthSummary.lastVetVisit && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("portal:horses.lastVetVisit")}
                      </p>
                      <p className="font-medium">
                        {format(new Date(healthSummary.lastVetVisit), "PP", {
                          locale,
                        })}
                      </p>
                    </div>
                  )}
                  {healthSummary.lastFarrierVisit && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("portal:horses.lastFarrierVisit")}
                      </p>
                      <p className="font-medium">
                        {format(
                          new Date(healthSummary.lastFarrierVisit),
                          "PP",
                          {
                            locale,
                          },
                        )}
                      </p>
                    </div>
                  )}
                  {healthSummary.nextVaccination && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("portal:horses.nextVaccination")}
                      </p>
                      <p className="font-medium">
                        {format(new Date(healthSummary.nextVaccination), "PP", {
                          locale,
                        })}
                      </p>
                    </div>
                  )}
                  {healthSummary.nextDeworming && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("portal:horses.nextDeworming")}
                      </p>
                      <p className="font-medium">
                        {format(new Date(healthSummary.nextDeworming), "PP", {
                          locale,
                        })}
                      </p>
                    </div>
                  )}
                </div>
                {healthSummary.notes && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {healthSummary.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                {t("portal:horses.upcomingActivitiesTitle")}
              </CardTitle>
              <CardDescription>
                {t("portal:horses.upcomingActivitiesDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("portal:horses.noUpcomingActivities")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: "#6b7280",
                          }}
                        />
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.activityTypeName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {format(new Date(activity.scheduledDate), "PP", {
                            locale,
                          })}
                        </p>
                        <Badge
                          variant={getActivityStatusVariant(activity.status)}
                        >
                          {t(`portal:activities.status.${activity.status}`)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
