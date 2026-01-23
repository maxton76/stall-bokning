import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Syringe,
  Plus,
  Trash2,
  ClipboardPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialog } from "@/hooks/useDialog";
import { toast } from "@/hooks/use-toast";
import {
  getHorseVaccinationRuleAssignments,
  removeVaccinationRule,
} from "@/services/vaccinationService";
import { VaccinationRecordDialog } from "@/components/VaccinationRecordDialog";
import { VaccinationRuleAssignmentDialog } from "@/components/VaccinationRuleAssignmentDialog";
import { queryKeys } from "@/lib/queryClient";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { toDate } from "@/utils/timestampUtils";
import type { Horse } from "@/types/roles";
import type {
  HorseVaccinationAssignment,
  VaccinationStatus,
} from "@shared/types/vaccination";

interface VaccinationRuleAssignmentProps {
  horse: Horse;
  /** Show header with title and add button */
  showHeader?: boolean;
}

/**
 * Get status badge configuration
 */
function getStatusBadgeConfig(status: VaccinationStatus) {
  switch (status) {
    case "current":
      return {
        variant: "default" as const,
        icon: CheckCircle2,
        colorClass: "text-green-600",
      };
    case "expiring_soon":
      return {
        variant: "secondary" as const,
        icon: Clock,
        colorClass: "text-amber-600",
      };
    case "expired":
      return {
        variant: "destructive" as const,
        icon: AlertCircle,
        colorClass: "text-destructive",
      };
    case "no_records":
      return {
        variant: "outline" as const,
        icon: AlertCircle,
        colorClass: "text-muted-foreground",
      };
    default:
      return {
        variant: "outline" as const,
        icon: AlertCircle,
        colorClass: "text-muted-foreground",
      };
  }
}

/**
 * Format period for display (e.g., "6m 21d" or "12m")
 */
function formatPeriod(months: number, days: number): string {
  const parts: string[] = [];
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);
  return parts.join(" ") || "0d";
}

/**
 * Section component without Card wrapper - for embedding in other cards
 */
export function VaccinationRuleAssignmentSection({
  horse,
  showHeader = true,
}: VaccinationRuleAssignmentProps) {
  const { t } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationContext();

  // Dialog states
  const assignDialog = useDialog();
  const recordDialog = useDialog<{ ruleId: string; ruleName: string }>();
  const removeDialog = useDialog<HorseVaccinationAssignment>();

  // Track which rule we're removing
  const [removingRuleId, setRemovingRuleId] = useState<string | null>(null);

  // Fetch vaccination rule assignments
  const {
    data: assignmentsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.horses.vaccinationRules(horse.id),
    queryFn: () => getHorseVaccinationRuleAssignments(horse.id),
    enabled: !!horse.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Remove rule mutation
  const removeMutation = useMutation({
    mutationFn: (ruleId: string) => removeVaccinationRule(horse.id, ruleId),
    onMutate: (ruleId) => {
      setRemovingRuleId(ruleId);
    },
    onSuccess: () => {
      toast({
        title: t(
          "horses:detail.vaccination.removeSuccess",
          "Vaccination rule removed",
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.horses.vaccinationRules(horse.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.horses.detail(horse.id),
      });
      removeDialog.closeDialog();
    },
    onError: (error) => {
      console.error("Failed to remove vaccination rule:", error);
      toast({
        title: t(
          "horses:detail.vaccination.removeError",
          "Failed to remove vaccination rule",
        ),
        variant: "destructive",
      });
    },
    onSettled: () => {
      setRemovingRuleId(null);
    },
  });

  // Handlers
  const handleAssignRule = () => {
    assignDialog.openDialog();
  };

  const handleRecordVaccination = (assignment: HorseVaccinationAssignment) => {
    recordDialog.openDialog({
      ruleId: assignment.ruleId,
      ruleName: assignment.ruleName,
    });
  };

  const handleRemoveRule = (assignment: HorseVaccinationAssignment) => {
    removeDialog.openDialog(assignment);
  };

  const confirmRemove = () => {
    if (!removeDialog.data) return;
    removeMutation.mutate(removeDialog.data.ruleId);
  };

  const handleAssignSuccess = () => {
    assignDialog.closeDialog();
    queryClient.invalidateQueries({
      queryKey: queryKeys.horses.vaccinationRules(horse.id),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.horses.detail(horse.id),
    });
  };

  const handleRecordSuccess = () => {
    recordDialog.closeDialog();
    queryClient.invalidateQueries({
      queryKey: queryKeys.horses.vaccinationRules(horse.id),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.vaccinations.byHorse(horse.id),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.horses.detail(horse.id),
    });
  };

  const assignments = assignmentsData?.assignments || [];
  const assignedRuleIds = assignments.map((a) => a.ruleId);

  return (
    <>
      <div>
        {/* Optional Header */}
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Syringe className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {t(
                  "horses:detail.vaccination.schedules",
                  "Vaccination Schedules",
                )}
              </h3>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleAssignRule}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("horses:detail.vaccination.assignRule", "Assign Rule")}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>{t("common:errors.loadFailed", "Failed to load data")}</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Syringe className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-3">
              {t(
                "horses:detail.vaccination.noRulesAssigned",
                "No vaccination rules assigned",
              )}
            </p>
            <Button variant="outline" size="sm" onClick={handleAssignRule}>
              <Plus className="h-4 w-4 mr-2" />
              {t("horses:detail.vaccination.assignRule", "Assign Rule")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {!showHeader && (
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={handleAssignRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("horses:detail.vaccination.assignRule", "Assign Rule")}
                </Button>
              </div>
            )}
            {assignments.map((assignment) => {
              const config = getStatusBadgeConfig(assignment.status);
              const StatusIcon = config.icon;
              const isRemoving = removingRuleId === assignment.ruleId;
              const nextDue = assignment.nextDueDate
                ? toDate(assignment.nextDueDate)
                : null;

              return (
                <div
                  key={assignment.ruleId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusIcon
                        className={`h-4 w-4 flex-shrink-0 ${config.colorClass}`}
                      />
                      <p className="font-medium truncate">
                        {assignment.ruleName}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        (
                        {formatPeriod(
                          assignment.rulePeriodMonths,
                          assignment.rulePeriodDays,
                        )}
                        )
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      {nextDue ? (
                        <span
                          className={
                            assignment.status === "expired"
                              ? "text-destructive"
                              : assignment.status === "expiring_soon"
                                ? "text-amber-600"
                                : ""
                          }
                        >
                          {t("horses:detail.care.nextDue", "Due:")}{" "}
                          {format(nextDue, "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span>
                          {t(
                            "horses:detail.vaccination.noRecordsYet",
                            "No records yet",
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <Badge variant={config.variant} className="mr-2">
                      {assignment.status === "current" &&
                        t(
                          "horses:detail.vaccination.status.upToDate",
                          "Current",
                        )}
                      {assignment.status === "expiring_soon" &&
                        t(
                          "horses:detail.vaccination.status.dueSoon",
                          "Due Soon",
                        )}
                      {assignment.status === "expired" &&
                        t(
                          "horses:detail.vaccination.status.overdue",
                          "Overdue",
                        )}
                      {assignment.status === "no_records" &&
                        t(
                          "horses:detail.vaccination.status.noRecords",
                          "No Records",
                        )}
                    </Badge>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRecordVaccination(assignment)}
                        >
                          <ClipboardPlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t(
                          "horses:detail.vaccination.recordVaccination",
                          "Record Vaccination",
                        )}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveRule(assignment)}
                          disabled={isRemoving}
                        >
                          {isRemoving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t(
                          "horses:detail.vaccination.removeRule",
                          "Remove Rule",
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <VaccinationRuleAssignmentDialog
        open={assignDialog.open}
        onOpenChange={(open) => !open && assignDialog.closeDialog()}
        horse={horse}
        organizationId={currentOrganizationId || ""}
        assignedRuleIds={assignedRuleIds}
        onSuccess={handleAssignSuccess}
      />

      {recordDialog.data && (
        <VaccinationRecordDialog
          open={recordDialog.open}
          onOpenChange={(open) => !open && recordDialog.closeDialog()}
          horse={horse}
          organizationId={currentOrganizationId || ""}
          preselectedRuleId={recordDialog.data.ruleId}
          onSuccess={handleRecordSuccess}
        />
      )}

      <AlertDialog
        open={removeDialog.open}
        onOpenChange={(open) => !open && removeDialog.closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "horses:detail.vaccination.removeRuleTitle",
                "Remove Vaccination Rule",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeDialog.data && (
                <>
                  {t(
                    "horses:detail.vaccination.removeRuleConfirm",
                    'Are you sure you want to remove "{{ruleName}}" from this horse? Existing vaccination records will not be deleted.',
                    { ruleName: removeDialog.data.ruleName },
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common:buttons.remove", "Remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Standalone Card component for vaccination rule management
 */
export function VaccinationRuleAssignmentCard({ horse }: { horse: Horse }) {
  const { t } = useTranslation(["horses"]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Syringe className="h-5 w-5 text-muted-foreground" />
          {t("horses:detail.vaccination.schedules", "Vaccination Schedules")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <VaccinationRuleAssignmentSection horse={horse} showHeader={false} />
      </CardContent>
    </Card>
  );
}
