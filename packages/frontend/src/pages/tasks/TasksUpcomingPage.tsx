import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Clock, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

interface UpcomingTask {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  type: "feeding" | "routine" | "cleaning" | "other";
}

/**
 * Tasks Upcoming Page - View planned tasks for upcoming days
 */
export default function TasksUpcomingPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Placeholder data - will be replaced with actual data fetching
  const [tasks] = useState<UpcomingTask[]>([
    {
      id: "1",
      title: "Morgonfoder - Stall A",
      description: "Utfodring av 8 hästar",
      date: "Imorgon",
      time: "07:00",
      type: "feeding",
    },
    {
      id: "2",
      title: "Veterinärkontroll - Storm",
      description: "Årlig hälsokontroll",
      date: "Om 2 dagar",
      type: "routine",
    },
    {
      id: "3",
      title: "Mocka boxar - Sektion 2",
      description: "Rengöring av boxar 11-20",
      date: "Om 3 dagar",
      time: "09:00",
      type: "cleaning",
    },
  ]);

  const getTaskTypeColor = (type: UpcomingTask["type"]) => {
    switch (type) {
      case "feeding":
        return "bg-amber-100 text-amber-800";
      case "routine":
        return "bg-blue-100 text-blue-800";
      case "cleaning":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Group tasks by date
  const tasksByDate = tasks.reduce<Record<string, UpcomingTask[]>>(
    (acc, task) => {
      const existing = acc[task.date] ?? [];
      acc[task.date] = [...existing, task];
      return acc;
    },
    {},
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:tasks.upcoming.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("common:tasks.upcoming.subtitle")}
        </p>
      </div>

      {/* Task List by Date */}
      <div className="space-y-6">
        {Object.keys(tasksByDate).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("common:tasks.emptyState.upcoming")}</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(tasksByDate).map(([date, dateTasks]) => (
            <div key={date} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {date}
              </h2>
              {dateTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <CheckSquare className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{task.title}</h3>
                          <Badge
                            className={getTaskTypeColor(task.type)}
                            variant="secondary"
                          >
                            {task.type}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        {task.time && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {task.time}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
