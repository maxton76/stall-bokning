import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

interface CompletedTask {
  id: string;
  title: string;
  description?: string;
  completedAt: string;
  completedBy: string;
  type: "feeding" | "routine" | "cleaning" | "other";
}

/**
 * Tasks Completed Page - View completed tasks history
 */
export default function TasksCompletedPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Placeholder data - will be replaced with actual data fetching
  const [tasks] = useState<CompletedTask[]>([
    {
      id: "1",
      title: "Morgonfoder - Stall A",
      description: "Utfodring av 8 hästar",
      completedAt: "Idag 07:15",
      completedBy: "Anna Svensson",
      type: "feeding",
    },
    {
      id: "2",
      title: "Mocka boxar - Sektion 1",
      description: "Rengöring av boxar 1-10",
      completedAt: "Idag 09:30",
      completedBy: "Erik Johansson",
      type: "cleaning",
    },
    {
      id: "3",
      title: "Kvällsfoder - Stall A",
      description: "Utfodring av 8 hästar",
      completedAt: "Igår 18:05",
      completedBy: "Anna Svensson",
      type: "feeding",
    },
  ]);

  const getTaskTypeColor = (type: CompletedTask["type"]) => {
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:tasks.completed.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("common:tasks.completed.subtitle")}
        </p>
      </div>

      {/* Completed Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("common:tasks.emptyState.completed")}</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="opacity-80">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600" />
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
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.completedAt}
                      </span>
                      <span>{task.completedBy}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
