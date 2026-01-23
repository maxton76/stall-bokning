import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

interface MemberDistribution {
  id: string;
  name: string;
  avatar?: string;
  tasksCompleted: number;
  hoursWorked: number;
  fairnessScore: number; // 0-100, 50 is perfectly fair
  trend: "up" | "down" | "stable";
}

/**
 * Schedule Distribution Page - Fairness visualization
 *
 * Shows the fair distribution of tasks with:
 * - Member workload comparison
 * - Fairness scores
 * - Recommendations
 */
export default function ScheduleDistributionPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Placeholder data - will be replaced with actual data fetching
  const [members] = useState<MemberDistribution[]>([
    {
      id: "1",
      name: "Anna Svensson",
      tasksCompleted: 45,
      hoursWorked: 32,
      fairnessScore: 52,
      trend: "stable",
    },
    {
      id: "2",
      name: "Erik Johansson",
      tasksCompleted: 38,
      hoursWorked: 28,
      fairnessScore: 45,
      trend: "up",
    },
    {
      id: "3",
      name: "Maria Lindgren",
      tasksCompleted: 52,
      hoursWorked: 38,
      fairnessScore: 58,
      trend: "down",
    },
    {
      id: "4",
      name: "Johan Nilsson",
      tasksCompleted: 41,
      hoursWorked: 30,
      fairnessScore: 48,
      trend: "up",
    },
  ]);

  const averageTasks = Math.round(
    members.reduce((sum, m) => sum + m.tasksCompleted, 0) / members.length,
  );
  const averageHours = Math.round(
    members.reduce((sum, m) => sum + m.hoursWorked, 0) / members.length,
  );

  const getFairnessColor = (score: number) => {
    if (score >= 45 && score <= 55) return "text-green-600";
    if (score >= 35 && score <= 65) return "text-yellow-600";
    return "text-red-600";
  };

  const getFairnessLabel = (score: number) => {
    if (score >= 45 && score <= 55) return "Balanserad";
    if (score > 55) return "Över genomsnitt";
    return "Under genomsnitt";
  };

  const getTrendIcon = (trend: MemberDistribution["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Genomsnitt uppgifter
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageTasks}</div>
            <p className="text-xs text-muted-foreground">
              per medlem denna månad
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Genomsnitt timmar
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageHours}h</div>
            <p className="text-xs text-muted-foreground">
              per medlem denna månad
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
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">deltar i schema</p>
          </CardContent>
        </Card>
      </div>

      {/* Member Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Arbetsfördelning per medlem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {members.map((member) => (
              <div key={member.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.tasksCompleted} uppgifter · {member.hoursWorked}
                        h
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getTrendIcon(member.trend)}
                    <Badge
                      variant="outline"
                      className={getFairnessColor(member.fairnessScore)}
                    >
                      {getFairnessLabel(member.fairnessScore)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Progress
                    value={(member.tasksCompleted / (averageTasks * 1.5)) * 100}
                    className="flex-1 h-2"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {member.fairnessScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-600" />
          <span>Balanserad (45-55%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-600" />
          <span>Avvikelse (35-65%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span>Stor avvikelse (&lt;35% eller &gt;65%)</span>
        </div>
      </div>
    </div>
  );
}
