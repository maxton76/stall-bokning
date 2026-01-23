import { useTranslation } from "react-i18next";
import {
  CheckSquare,
  Clock,
  Wheat,
  TrendingUp,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

/**
 * My Statistics Page - Personal activity overview
 *
 * Shows user's statistics:
 * - Tasks completed
 * - Hours worked
 * - Feedings completed
 * - Activity trends
 */
export default function MyStatisticsPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Placeholder data - will be replaced with actual data fetching
  const stats = {
    tasksCompleted: 42,
    tasksThisWeek: 12,
    hoursWorked: 28,
    hoursThisWeek: 8,
    feedingsCompleted: 84,
    feedingsThisWeek: 21,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:myPage.statistics.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("common:myPage.statistics.subtitle")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Tasks Completed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("common:myPage.statistics.tasksCompleted")}
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasksCompleted}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />+
              {stats.tasksThisWeek} denna vecka
            </p>
          </CardContent>
        </Card>

        {/* Hours Worked */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("common:myPage.statistics.hoursWorked")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hoursWorked}h</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />+
              {stats.hoursThisWeek}h denna vecka
            </p>
          </CardContent>
        </Card>

        {/* Feedings Completed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("common:myPage.statistics.feedingsCompleted")}
            </CardTitle>
            <Wheat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.feedingsCompleted}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />+
              {stats.feedingsThisWeek} denna vecka
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Aktivitetsöversikt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Diagram kommer snart</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Senaste aktivitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <CheckSquare className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">Morgonfoder - Stall A</p>
                <p className="text-sm text-muted-foreground">Idag 07:15</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <CheckSquare className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">Mocka boxar - Sektion 1</p>
                <p className="text-sm text-muted-foreground">Igår 09:30</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <Wheat className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium">Kvällsfoder - Stall A</p>
                <p className="text-sm text-muted-foreground">Igår 18:05</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
