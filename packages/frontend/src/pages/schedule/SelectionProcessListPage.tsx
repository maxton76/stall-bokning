import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  AlertCircle,
  Calendar,
  Users,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { useSelectionProcesses } from "@/hooks/useSelectionProcess";
import { useCanManageSelectionProcesses } from "@/hooks/useCanManageSelectionProcesses";
import { CreateSelectionProcessModal } from "@/components/schedule/CreateSelectionProcessModal";
import { AlgorithmInfoSheet } from "@/components/selectionProcess";
import type { SelectionProcessStatus } from "@equiduty/shared";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

/**
 * Selection Process List Page
 *
 * Lists all selection processes for the current stable
 * Allows filtering by status and creating new processes (for admins)
 */
export default function SelectionProcessListPage() {
  const { t } = useTranslation(["selectionProcess", "common"]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedStableId, setSelectedStableId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    SelectionProcessStatus | "all"
  >("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Load user's stables
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Auto-select first stable if none selected
  const activeStableId = selectedStableId || stables[0]?.id || "";
  const activeStable = stables.find((s) => s.id === activeStableId);

  // Fetch selection processes
  const { processes, loading, error, refetch } = useSelectionProcesses({
    stableId: activeStableId,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Check if current user can manage selection processes
  const { canManage, isLoading: permissionLoading } =
    useCanManageSelectionProcesses(
      activeStable?.ownerId,
      activeStable?.organizationId,
    );

  const getStatusBadgeVariant = (
    status: SelectionProcessStatus,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "draft":
      default:
        return "outline";
    }
  };

  const handleProcessClick = (processId: string) => {
    navigate(`/schedule/selection/${processId}`);
  };

  // Loading state
  if (stablesLoading || loading || permissionLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>

        {/* List Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  // No stables state
  if (stables.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t("common:messages.noStables")}
            </h3>
            <p className="text-muted-foreground">
              {t("common:messages.joinStableFirst")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("selectionProcess:messages.errors.loadFailed")}:{" "}
            {error?.message || t("common:messages.unknownError")}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common:buttons.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("selectionProcess:titles.list")}
          </h1>
          <p className="text-muted-foreground">
            {t("selectionProcess:descriptions.list")}
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <HelpCircle className="h-4 w-4" />
            {t("selectionProcess:algorithm.help.learnMore")}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Stable selector */}
          {stables.length > 1 && (
            <Select value={activeStableId} onValueChange={setSelectedStableId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("common:labels.selectStable")} />
              </SelectTrigger>
              <SelectContent>
                {stables.map((stable) => (
                  <SelectItem key={stable.id} value={stable.id}>
                    {stable.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) =>
              setStatusFilter(val as SelectionProcessStatus | "all")
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("selectionProcess:filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("selectionProcess:filters.all")}
              </SelectItem>
              <SelectItem value="draft">
                {t("selectionProcess:status.draft")}
              </SelectItem>
              <SelectItem value="active">
                {t("selectionProcess:status.active")}
              </SelectItem>
              <SelectItem value="completed">
                {t("selectionProcess:status.completed")}
              </SelectItem>
              <SelectItem value="cancelled">
                {t("selectionProcess:status.cancelled")}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Create button - only visible to users with manage permission */}
          {canManage && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("selectionProcess:buttons.create")}
            </Button>
          )}
        </div>
      </div>

      {/* Process List */}
      {processes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("selectionProcess:emptyStates.noProcesses")}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("selectionProcess:emptyStates.noProcessesDescription")}
            </p>
            {canManage && (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("selectionProcess:buttons.create")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {processes.map((process) => (
            <Card
              key={process.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleProcessClick(process.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{process.name}</h3>
                      <Badge variant={getStatusBadgeVariant(process.status)}>
                        {t(`selectionProcess:status.${process.status}`)}
                      </Badge>
                      {process.isCurrentTurn && (
                        <Badge className="bg-green-500 text-white">
                          {t("selectionProcess:messages.yourTurn")}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(
                            new Date(process.selectionStartDate),
                            "d MMM",
                            {
                              locale: sv,
                            },
                          )}{" "}
                          -{" "}
                          {format(new Date(process.selectionEndDate), "d MMM", {
                            locale: sv,
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>
                          {process.completedTurns} / {process.totalMembers}{" "}
                          {t("selectionProcess:labels.completedTurns")}
                        </span>
                      </div>

                      {process.currentTurnUserName && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {t("selectionProcess:labels.currentTurn")}:
                          </span>
                          <span>{process.currentTurnUserName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {activeStableId && activeStable?.organizationId && (
        <CreateSelectionProcessModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          organizationId={activeStable.organizationId}
          stableId={activeStableId}
          onSuccess={(processId) => {
            setCreateModalOpen(false);
            navigate(`/schedule/selection/${processId}`);
          }}
        />
      )}

      <AlgorithmInfoSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
