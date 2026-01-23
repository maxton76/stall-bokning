import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Wheat,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

interface FeedingSession {
  id: string;
  name: string;
  time: string;
  status: "completed" | "in-progress" | "upcoming" | "overdue";
  completedBy?: string;
  completedAt?: string;
  horsesCount: number;
  horsesFed: number;
}

/**
 * Feeding Today Page - Today's feeding status
 *
 * Shows today's feeding status across all horses with:
 * - Feeding sessions and their status
 * - Quick complete actions
 * - Progress tracking
 */
export default function FeedingTodayPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Placeholder data - will be replaced with actual data fetching
  const [sessions] = useState<FeedingSession[]>([
    {
      id: "1",
      name: "Morgonfoder",
      time: "07:00",
      status: "completed",
      completedBy: "Anna Svensson",
      completedAt: "07:15",
      horsesCount: 8,
      horsesFed: 8,
    },
    {
      id: "2",
      name: "Lunchfoder",
      time: "12:00",
      status: "in-progress",
      horsesCount: 8,
      horsesFed: 5,
    },
    {
      id: "3",
      name: "Eftermiddagsfoder",
      time: "16:00",
      status: "upcoming",
      horsesCount: 8,
      horsesFed: 0,
    },
    {
      id: "4",
      name: "Kvällsfoder",
      time: "19:00",
      status: "upcoming",
      horsesCount: 8,
      horsesFed: 0,
    },
  ]);

  const getStatusColor = (status: FeedingSession["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: FeedingSession["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "overdue":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const totalHorses = sessions[0]?.horsesCount || 0;
  const completedSessions = sessions.filter(
    (s) => s.status === "completed",
  ).length;
  const progressPercent = (completedSessions / sessions.length) * 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wheat className="h-8 w-8" />
            {t("common:navigation.feedingToday")}
          </h1>
          <Button asChild variant="outline">
            <Link to="/feeding/schedule">
              {t("common:navigation.schedule")}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground">
          Utfodringsstatus för idag - {totalHorses} hästar
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Dagens framsteg</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {completedSessions} av {sessions.length} utfodringar klara
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Feeding Sessions */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <Card
            key={session.id}
            className={
              session.status === "overdue"
                ? "border-destructive/50"
                : session.status === "in-progress"
                  ? "border-primary/50"
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
                      {session.status === "completed"
                        ? t("common:status.completed")
                        : session.status === "in-progress"
                          ? "Pågår"
                          : session.status === "overdue"
                            ? t("common:overview.sections.overdue")
                            : "Kommande"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.time}
                    </span>
                    {session.status === "in-progress" && (
                      <span>
                        {session.horsesFed}/{session.horsesCount} hästar
                        utfodrade
                      </span>
                    )}
                    {session.status === "completed" && session.completedBy && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {session.completedBy} ({session.completedAt})
                      </span>
                    )}
                  </div>
                  {session.status === "in-progress" && (
                    <Progress
                      value={(session.horsesFed / session.horsesCount) * 100}
                      className="h-1 mt-2"
                    />
                  )}
                </div>
                {(session.status === "upcoming" ||
                  session.status === "overdue") && (
                  <Button size="sm">Starta</Button>
                )}
                {session.status === "in-progress" && (
                  <Button size="sm">Fortsätt</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
