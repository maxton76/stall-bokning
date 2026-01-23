import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckSquare,
  Clock,
  MessageSquare,
  AlertTriangle,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

interface Task {
  id: string;
  title: string;
  description?: string;
  dueTime?: string;
  isOverdue?: boolean;
  isCompleted: boolean;
  assignee?: string;
  type: "feeding" | "routine" | "cleaning" | "other";
}

/**
 * Tasks Today Page - Daily chores/shifts execution
 *
 * Shows tasks to be completed today with:
 * - Quick complete actions
 * - Comments and issue reporting
 * - Overdue highlighting
 */
export default function TasksTodayPage() {
  const { t } = useTranslation(["common"]);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // Placeholder data - will be replaced with actual data fetching
  const [tasks] = useState<Task[]>([
    {
      id: "1",
      title: "Morgonfoder - Stall A",
      description: "Utfodring av 8 hästar",
      dueTime: "07:00",
      isOverdue: true,
      isCompleted: false,
      type: "feeding",
    },
    {
      id: "2",
      title: "Mocka boxar - Sektion 1",
      description: "Rengöring av boxar 1-10",
      dueTime: "09:00",
      isOverdue: false,
      isCompleted: true,
      type: "cleaning",
    },
    {
      id: "3",
      title: "Eftermiddagsfoder - Stall A",
      description: "Utfodring av 8 hästar",
      dueTime: "14:00",
      isOverdue: false,
      isCompleted: false,
      type: "feeding",
    },
  ]);

  const handleTaskComplete = (taskId: string) => {
    // TODO: Implement task completion
    console.log("Complete task:", taskId);
  };

  const handleAddComment = (taskId: string) => {
    // TODO: Implement add comment
    console.log("Add comment to task:", taskId);
  };

  const handleReportIssue = (taskId: string) => {
    // TODO: Implement report issue
    console.log("Report issue for task:", taskId);
  };

  const getTaskTypeColor = (type: Task["type"]) => {
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

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const overdueCount = tasks.filter(
    (t) => t.isOverdue && !t.isCompleted,
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("common:tasks.today.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("common:tasks.today.subtitle")}
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant="outline" className="text-sm py-1 px-3">
          <CheckSquare className="h-4 w-4 mr-1" />
          {completedCount}/{tasks.length}{" "}
          {t("common:status.completed").toLowerCase()}
        </Badge>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-sm py-1 px-3">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {overdueCount} {t("common:overview.sections.overdue").toLowerCase()}
          </Badge>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("common:tasks.emptyState.today")}</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card
              key={task.id}
              className={
                task.isOverdue && !task.isCompleted
                  ? "border-destructive/50"
                  : task.isCompleted
                    ? "opacity-60"
                    : ""
              }
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={() => handleTaskComplete(task.id)}
                    className="mt-1"
                  />
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
                      {task.isOverdue && !task.isCompleted && (
                        <Badge variant="destructive">
                          {t("common:overview.sections.overdue")}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    {task.dueTime && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {task.dueTime}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleTaskComplete(task.id)}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        {t("common:tasks.actions.complete")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAddComment(task.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t("common:tasks.actions.comment")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleReportIssue(task.id)}
                        className="text-destructive"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {t("common:tasks.actions.reportIssue")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
