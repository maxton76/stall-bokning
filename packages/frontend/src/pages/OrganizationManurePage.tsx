import { useTranslation } from "react-i18next";
import { Tractor, Plus, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrganizationManurePage() {
  const { t } = useTranslation(["organizations", "common"]);

  // Placeholder manure records data
  const manureRecords = [
    {
      id: "1",
      date: "2025-01-15",
      stable: "Green Valley Stables",
      amount: "5 tons",
      destination: "Farm A, Field 3",
      status: "completed" as const,
      notes: t("organizations:manure.records.notes.deliveredToOrganicFarm"),
    },
    {
      id: "2",
      date: "2025-01-08",
      stable: "Green Valley Stables",
      amount: "4.5 tons",
      destination: "Farm B, North Field",
      status: "completed" as const,
      notes: t("organizations:manure.records.notes.regularPickup"),
    },
    {
      id: "3",
      date: "2025-01-22",
      stable: "Sunset Stables",
      amount: t("organizations:manure.records.amountEstimated", {
        amount: "6",
      }),
      destination: t("organizations:manure.records.toBeAssigned"),
      status: "scheduled" as const,
      notes: t("organizations:manure.records.notes.upcomingPickup"),
    },
  ];

  const getStatusBadge = (status: "completed" | "scheduled" | "cancelled") => {
    const variants = {
      completed: {
        labelKey: "manure.status.completed",
        variant: "default" as const,
      },
      scheduled: {
        labelKey: "manure.status.scheduled",
        variant: "secondary" as const,
      },
      cancelled: {
        labelKey: "manure.status.cancelled",
        variant: "outline" as const,
      },
    };
    return variants[status];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("organizations:manure.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("organizations:manure.description")}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("organizations:manure.schedulePickup")}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("organizations:manure.stats.thisMonth")}
            </CardTitle>
            <Tractor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15.5 tons</div>
            <p className="text-xs text-muted-foreground">
              {t("organizations:manure.stats.changeFromLastMonth", {
                change: "+20%",
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("organizations:manure.stats.scheduledPickups")}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              {t("organizations:manure.stats.nextPickupInDays", { days: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("organizations:manure.stats.activeStables")}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              {t("organizations:manure.stats.allStablesReporting")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manure Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("organizations:manure.recentRecords.title")}</CardTitle>
          <CardDescription>
            {t("organizations:manure.recentRecords.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {manureRecords.map((record) => {
              const badge = getStatusBadge(record.status);
              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold">{record.date}</p>
                      <Badge variant={badge.variant}>
                        {t(`organizations:${badge.labelKey}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>{record.stable}</strong> • {record.amount}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {record.destination}
                    </p>
                    {record.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {record.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      {t("organizations:manure.buttons.viewDetails")}
                    </Button>
                    {record.status === "scheduled" && (
                      <Button variant="ghost" size="sm">
                        {t("common:buttons.edit")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Distribution Partners */}
      <Card>
        <CardHeader>
          <CardTitle>{t("organizations:manure.partners.title")}</CardTitle>
          <CardDescription>
            {t("organizations:manure.partners.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Tractor className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("organizations:manure.partners.emptyState")}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("organizations:manure.partners.addButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
