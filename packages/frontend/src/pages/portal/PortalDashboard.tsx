import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import {
  AlertTriangle,
  CreditCard,
  Calendar,
  MessageSquare,
  ChevronRight,
  Rabbit,
  FileText,
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
import { useApiQuery } from "@/hooks/useApiQuery";
import { queryKeys } from "@/lib/queryClient";
import {
  getPortalDashboard,
  formatCurrency,
  getInvoiceStatusVariant,
} from "@/services/portalService";
import type { PortalDashboardData } from "@stall-bokning/shared";
import { cn } from "@/lib/utils";

export default function PortalDashboard() {
  const { t, i18n } = useTranslation(["portal", "common"]);
  const locale = i18n.language === "sv" ? sv : enUS;

  const dashboardQuery = useApiQuery<PortalDashboardData>(
    queryKeys.portal.dashboard(),
    getPortalDashboard,
    { staleTime: 5 * 60 * 1000 },
  );
  const dashboardData = dashboardQuery.data;
  const dashboardLoading = dashboardQuery.isLoading;
  const dashboardError = dashboardQuery.error;

  if (dashboardLoading) {
    return <PortalDashboardSkeleton />;
  }

  if (dashboardError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {t("common:errors.generic")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = dashboardData;
  if (!data) return null;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {t("portal:dashboard.welcome", { name: data.contactName })}
        </h1>
        <p className="text-muted-foreground">
          {t("portal:dashboard.subtitle", {
            organization: data.organizationName,
          })}
        </p>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-center justify-between rounded-lg border p-4",
                alert.priority === "high" && "border-red-200 bg-red-50",
                alert.priority === "medium" && "border-amber-200 bg-amber-50",
                alert.priority === "low" && "border-blue-200 bg-blue-50",
              )}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={cn(
                    "h-5 w-5",
                    alert.priority === "high" && "text-red-600",
                    alert.priority === "medium" && "text-amber-600",
                    alert.priority === "low" && "text-blue-600",
                  )}
                />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.message}
                  </p>
                </div>
              </div>
              {alert.actionUrl && (
                <Link to={alert.actionUrl}>
                  <Button variant="outline" size="sm">
                    {alert.actionLabel || t("common:buttons.view")}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("portal:dashboard.myHorses")}
            </CardTitle>
            <Horse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.horseCount}</div>
            <Link
              to="/portal/horses"
              className="text-sm text-primary hover:underline"
            >
              {t("common:buttons.viewAll")}
            </Link>
          </CardContent>
        </Card>

        <Card
          className={cn(
            data.unpaidInvoiceCount > 0 && "border-amber-200 bg-amber-50",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("portal:dashboard.outstandingBalance")}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalAmountDue, data.currency)}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("portal:dashboard.invoiceCount", {
                count: data.unpaidInvoiceCount,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("portal:dashboard.upcomingActivities")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.upcomingActivityCount}
            </div>
            <Link
              to="/portal/activities"
              className="text-sm text-primary hover:underline"
            >
              {t("common:buttons.viewAll")}
            </Link>
          </CardContent>
        </Card>

        <Card
          className={cn(
            data.unreadMessageCount > 0 && "border-blue-200 bg-blue-50",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("portal:dashboard.messages")}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.unreadMessageCount}</div>
            <p className="text-sm text-muted-foreground">
              {t("portal:dashboard.unreadMessages")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Horses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("portal:horses.title")}</CardTitle>
              <CardDescription>
                {t("portal:horses.description")}
              </CardDescription>
            </div>
            <Link to="/portal/horses">
              <Button variant="ghost" size="sm">
                {t("common:buttons.viewAll")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.horses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t("portal:horses.noHorses")}
              </p>
            ) : (
              <div className="space-y-3">
                {data.horses.slice(0, 4).map((horse) => (
                  <Link
                    key={horse.id}
                    to={`/portal/horses/${horse.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={horse.photoUrl} alt={horse.name} />
                      <AvatarFallback>
                        {horse.name?.charAt(0) || "H"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{horse.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {horse.breed}{" "}
                        {horse.stableName && `• ${horse.stableName}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("portal:invoices.recent")}</CardTitle>
              <CardDescription>
                {t("portal:invoices.description")}
              </CardDescription>
            </div>
            <Link to="/portal/invoices">
              <Button variant="ghost" size="sm">
                {t("common:buttons.viewAll")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t("portal:invoices.noInvoices")}
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentInvoices.slice(0, 4).map((invoice: any) => (
                  <Link
                    key={invoice.id}
                    to={`/portal/invoices/${invoice.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("portal:invoices.due")}{" "}
                          {format(new Date(invoice.dueDate), "PP", { locale })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(invoice.amountDue, invoice.currency)}
                      </p>
                      <Badge variant={getInvoiceStatusVariant(invoice.status)}>
                        {t(`invoices:status.${invoice.status}`)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("portal:activities.upcoming")}</CardTitle>
            <CardDescription>
              {t("portal:activities.description")}
            </CardDescription>
          </div>
          <Link to="/portal/activities">
            <Button variant="ghost" size="sm">
              {t("common:buttons.viewAll")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data.upcomingActivities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("portal:activities.noActivities")}
            </p>
          ) : (
            <div className="space-y-3">
              {data.upcomingActivities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.horseName && `${activity.horseName} • `}
                        {format(new Date(activity.scheduledDate), "PPp", {
                          locale,
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{activity.activityTypeName}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PortalDashboardSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
