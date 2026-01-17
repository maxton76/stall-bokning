import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Syringe, Loader2Icon } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialog } from "@/hooks/useDialog";
import { VaccinationHistoryTable } from "@/components/VaccinationHistoryTable";
import { VaccinationRecordDialog } from "@/components/VaccinationRecordDialog";
import {
  getHorseVaccinationRecords,
  deleteVaccinationRecord,
} from "@/services/vaccinationService";
import { queryKeys } from "@/lib/queryClient";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import type { Horse } from "@/types/roles";
import type { VaccinationRecord } from "@shared/types/vaccination";
import { toDate } from "@/utils/timestampUtils";

interface VaccinationCardProps {
  horse: Horse;
}

export function VaccinationCard({ horse }: VaccinationCardProps) {
  const { t } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationContext();

  // Dialog states
  const recordDialog = useDialog<VaccinationRecord>();
  const deleteDialog = useDialog<VaccinationRecord>();

  // Fetch vaccination records with TanStack Query
  const {
    data: records = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: queryKeys.vaccinations.byHorse(horse.id),
    queryFn: () => getHorseVaccinationRecords(horse.id),
    enabled: !!horse.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVaccinationRecord(id),
    onSuccess: () => {
      // Invalidate and refetch vaccination records
      queryClient.invalidateQueries({
        queryKey: queryKeys.vaccinations.byHorse(horse.id),
      });
      // Also invalidate horses query to update vaccination status badge
      queryClient.invalidateQueries({
        queryKey: queryKeys.horses.detail(horse.id),
      });
      deleteDialog.closeDialog();
    },
    onError: (error) => {
      console.error("Failed to delete vaccination record:", error);
    },
  });

  // Handlers
  const handleAdd = () => {
    recordDialog.openDialog(undefined);
  };

  const handleEdit = (record: VaccinationRecord) => {
    recordDialog.openDialog(record);
  };

  const handleDelete = (record: VaccinationRecord) => {
    deleteDialog.openDialog(record);
  };

  const confirmDelete = async () => {
    if (!deleteDialog.data) return;
    deleteMutation.mutate(deleteDialog.data.id);
  };

  const handleSuccess = () => {
    recordDialog.closeDialog();
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({
      queryKey: queryKeys.vaccinations.byHorse(horse.id),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.horses.detail(horse.id),
    });
  };

  // Handle query error
  if (error) {
    console.error("Failed to load vaccination records:", error);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("horses:detail.vaccination.title")}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 overflow-hidden">
          {/* Vaccination Status Section */}
          {horse.vaccinationRuleId && horse.vaccinationRuleName ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">
                    {t("horses:detail.vaccination.currentVaccinationRule")}
                  </h3>
                  <p className="font-medium mt-1">
                    {horse.vaccinationRuleName}
                  </p>
                </div>
                {horse.vaccinationStatus && (
                  <Badge
                    variant={
                      horse.vaccinationStatus === "current"
                        ? "default"
                        : horse.vaccinationStatus === "expiring_soon"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {horse.vaccinationStatus === "current" &&
                      t("horses:detail.vaccination.status.upToDate")}
                    {horse.vaccinationStatus === "expiring_soon" &&
                      t("horses:detail.vaccination.status.dueSoon")}
                    {horse.vaccinationStatus === "expired" &&
                      t("horses:detail.vaccination.status.overdue")}
                    {horse.vaccinationStatus === "no_records" &&
                      t("horses:detail.vaccination.status.noRecords")}
                  </Badge>
                )}
              </div>

              {/* Next Due Date */}
              {horse.nextVaccinationDue && (
                <div className="flex items-baseline gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {t("horses:detail.vaccination.nextDue")}
                  </span>
                  <span
                    className={`font-medium ${
                      horse.vaccinationStatus === "expired"
                        ? "text-destructive"
                        : horse.vaccinationStatus === "expiring_soon"
                          ? "text-amber-600"
                          : ""
                    }`}
                  >
                    {toDate(horse.nextVaccinationDue) &&
                      format(toDate(horse.nextVaccinationDue)!, "MMM d, yyyy")}
                  </span>
                </div>
              )}

              {/* Last Vaccination Date */}
              {horse.lastVaccinationDate &&
                toDate(horse.lastVaccinationDate) && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">
                      {t("horses:detail.vaccination.lastVaccination")}
                    </span>
                    <span className="text-sm">
                      {format(
                        toDate(horse.lastVaccinationDate)!,
                        "MMM d, yyyy",
                      )}
                    </span>
                  </div>
                )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("horses:detail.vaccination.noVaccinationRuleAssigned")}
              </p>
            </div>
          )}

          {/* Vaccination History Table */}
          <div className="border-t pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <VaccinationHistoryTable
                records={records}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={loading}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <VaccinationRecordDialog
        open={recordDialog.open}
        onOpenChange={(open) => !open && recordDialog.closeDialog()}
        horse={horse}
        organizationId={currentOrganizationId || ""}
        record={recordDialog.data}
        onSuccess={handleSuccess}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && deleteDialog.closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("horses:detail.vaccination.deleteRecordTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.data &&
                toDate(deleteDialog.data.vaccinationDate) && (
                  <>
                    {t("horses:detail.vaccination.deleteRecordConfirm", {
                      date: format(
                        toDate(deleteDialog.data.vaccinationDate)!,
                        "MMM d, yyyy",
                      ),
                    })}
                  </>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common:buttons.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
