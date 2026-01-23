import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckSquare, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

interface MyTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  isCompleted: boolean;
  type: "feeding" | "routine" | "cleaning" | "other";
}

/**
 * My Tasks Page - Personal task aggregation
 *
 * Shows all tasks assigned to the current user
 */
export default function MyTasksPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Placeholder data - will be replaced with actual data fetching
  const [tasks] = useState<MyTask[]>([
    {
      id: "1",
      title: "Morgonfoder - Stall A",
      description: "Utfodring av 8 hästar",
      dueDate: "Idag",
      dueTime: "07:00",
      isCompleted: true,
      type: "feeding",
    },
    {
      id: "2",
      title: "Eftermiddagsfoder - Stall A",
      dueDate: "Idag",
      dueTime: "14:00",
      isCompleted: false,
      type: "feeding",
    },
    {
      id: "3",
      title: "Mocka boxar - Sektion 1",
      description: "Rengöring av boxar 1-10",
      dueDate: "Imorgon",
      dueTime: "09:00",
      isCompleted: false,
      type: "cleaning",
    },
  ]);

  const pendingTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  const getTaskTypeColor = (type: MyTask["type"]) => {
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

  const renderTaskList = (taskList: MyTask[]) => (
    <div className="space-y-3">
      {taskList.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("common:tasks.emptyState.today")}</p>
        </div>
      ) : (
        taskList.map((task) => (
          <Card key={task.id} className={task.isCompleted ? "opacity-60" : ""}>
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <Checkbox checked={task.isCompleted} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={`font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}
                    >
                      {task.title}
                    </h3>
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
                      <Calendar className="h-3 w-3" />
                      {task.dueDate}
                    </span>
                    {task.dueTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.dueTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:myPage.tasks.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("common:myPage.tasks.subtitle")}
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant="outline" className="text-sm py-1 px-3">
          <CheckSquare className="h-4 w-4 mr-1" />
          {completedTasks.length}/{tasks.length}{" "}
          {t("common:status.completed").toLowerCase()}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            {t("common:status.pending")} ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t("common:status.completed")} ({completedTasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          {renderTaskList(pendingTasks)}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {renderTaskList(completedTasks)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
