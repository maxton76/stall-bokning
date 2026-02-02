import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckSquare,
  Wheat,
  Calendar,
  ArrowRight,
  ListChecks,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

/**
 * Overview Page - Today's Dashboard
 *
 * Aggregates:
 * - Today's tasks and their status
 * - Upcoming feedings
 * - Overdue items
 * - Active routines
 * - Quick-complete actions
 */
export default function OverviewPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:overview.title")}
        </h1>
        <p className="text-muted-foreground">{t("common:overview.subtitle")}</p>
      </div>

      {/* My Tasks Today & Active Routines */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("common:overview.sections.myTasks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("common:overview.emptyState.noTasks")}</p>
              <Button asChild variant="link" className="mt-2">
                <Link to="/activities">
                  {t("common:buttons.viewAll")}{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("common:overview.sections.activeRoutines")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("common:overview.emptyState.allDone")}</p>
              <Button asChild variant="link" className="mt-2">
                <Link to="/activities">
                  {t("common:buttons.viewAll")}{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("common:overview.sections.quickActions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/activities">
                <Play className="h-6 w-6 mb-2" />
                <span>{t("common:navigation.todaysWork")}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/feeding/today">
                <Wheat className="h-6 w-6 mb-2" />
                <span>{t("common:navigation.feedingToday")}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/schedule/week">
                <Calendar className="h-6 w-6 mb-2" />
                <span>{t("common:navigation.schedule")}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
