import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialog } from "@/hooks/useDialog";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import type { Horse } from "@/types/roles";
import type { HealthRecord, HealthRecordType } from "@shared/types/health";
import { toDate } from "@/utils/timestampUtils";
import { HealthRecordForm } from "./HealthRecordForm";

interface HealthRecordsCardProps {
  horse: Horse;
}

const RECORD_TYPE_COLORS: Record<HealthRecordType, string> = {
  veterinary: "bg-blue-100 text-blue-800",
  farrier: "bg-amber-100 text-amber-800",
  dental: "bg-purple-100 text-purple-800",
  medication: "bg-green-100 text-green-800",
  injury: "bg-red-100 text-red-800",
  deworming: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-800",
};

const RECORD_TYPE_LABELS: Record<HealthRecordType, { en: string; sv: string }> =
  {
    veterinary: { en: "Veterinary", sv: "Veterinär" },
    farrier: { en: "Farrier", sv: "Hovslagare" },
    dental: { en: "Dental", sv: "Tandvård" },
    medication: { en: "Medication", sv: "Medicinering" },
    injury: { en: "Injury", sv: "Skada" },
    deworming: { en: "Deworming", sv: "Avmaskning" },
    other: { en: "Other", sv: "Annat" },
  };

export function HealthRecordsCard({ horse }: HealthRecordsCardProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>("all");

  // Dialog states
  const recordDialog = useDialog<HealthRecord>();
  const deleteDialog = useDialog<HealthRecord>();

  // Fetch health records
  const {
    data: records = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["healthRecords", horse.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== "all") {
        params.append("recordType", filterType);
      }
      const response = await authFetch(
        `/api/v1/health-records/horse/${horse.id}?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch health records");
      const data = await response.json();
      return data.records as HealthRecord[];
    },
    enabled: !!horse.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch health stats
  const { data: stats } = useQuery({
    queryKey: ["healthRecords", horse.id, "stats"],
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/health-records/horse/${horse.id}/stats`,
      );
      if (!response.ok) throw new Error("Failed to fetch health stats");
      return response.json();
    },
    enabled: !!horse.id,
    staleTime: 5 * 60 * 1000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (record: HealthRecord) => {
      const response = await authFetch(
        `/api/v1/health-records/${record.id}?horseId=${horse.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete health record");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthRecords", horse.id] });
      deleteDialog.closeDialog();
    },
  });

  const handleAdd = () => {
    recordDialog.openDialog(undefined);
  };

  const handleEdit = (record: HealthRecord) => {
    recordDialog.openDialog(record);
  };

  const handleDelete = (record: HealthRecord) => {
    deleteDialog.openDialog(record);
  };

  const confirmDelete = () => {
    if (!deleteDialog.data) return;
    deleteMutation.mutate(deleteDialog.data);
  };

  const handleSuccess = () => {
    recordDialog.closeDialog();
    queryClient.invalidateQueries({ queryKey: ["healthRecords", horse.id] });
  };

  const getRecordTypeLabel = (type: HealthRecordType) => {
    const locale = i18n.language === "sv" ? "sv" : "en";
    return RECORD_TYPE_LABELS[type]?.[locale] || type;
  };

  // Filter records if needed
  const filteredRecords =
    filterType === "all"
      ? records
      : records.filter((r) => r.recordType === filterType);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
              <CardTitle>
                {t("horses:health.title", "Health Records")}
              </CardTitle>
            </div>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              {t("common:buttons.add", "Add")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stats Summary */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{stats.totalRecords}</p>
                <p className="text-xs text-muted-foreground">
                  {t("horses:health.totalRecords", "Total Records")}
                </p>
              </div>
              {stats.lastVeterinaryVisit && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-sm font-medium">
                    {format(new Date(stats.lastVeterinaryVisit), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("horses:health.lastVetVisit", "Last Vet Visit")}
                  </p>
                </div>
              )}
              {stats.lastFarrierVisit && (
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-sm font-medium">
                    {format(new Date(stats.lastFarrierVisit), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("horses:health.lastFarrier", "Last Farrier")}
                  </p>
                </div>
              )}
              {stats.upcomingFollowUps > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-lg font-bold text-amber-700">
                      {stats.upcomingFollowUps}
                    </p>
                  </div>
                  <p className="text-xs text-amber-600">
                    {t("horses:health.followUps", "Follow-ups")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Filter */}
          <div className="flex items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue
                  placeholder={t(
                    "horses:health.filterByType",
                    "Filter by type",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("horses:health.allTypes", "All Types")}
                </SelectItem>
                {Object.entries(RECORD_TYPE_LABELS).map(([value, labels]) => (
                  <SelectItem key={value} value={value}>
                    {i18n.language === "sv" ? labels.sv : labels.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Records Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Stethoscope className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("horses:health.noRecords", "No health records yet")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("horses:health.addFirst", "Add First Record")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("horses:health.date", "Date")}</TableHead>
                    <TableHead>{t("horses:health.type", "Type")}</TableHead>
                    <TableHead>
                      {t("horses:health.titleColumn", "Title")}
                    </TableHead>
                    <TableHead>
                      {t("horses:health.provider", "Provider")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("common:actions", "Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const recordDate = toDate(record.date);
                    const followUpDate = record.followUpDate
                      ? toDate(record.followUpDate)
                      : null;
                    const hasUpcomingFollowUp =
                      record.requiresFollowUp &&
                      followUpDate &&
                      followUpDate >= new Date();

                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {recordDate && format(recordDate, "MMM d, yyyy")}
                            {hasUpcomingFollowUp && (
                              <Calendar className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={RECORD_TYPE_COLORS[record.recordType]}
                          >
                            {getRecordTypeLabel(record.recordType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.provider || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(record)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(record)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={recordDialog.open}
        onOpenChange={(open) => !open && recordDialog.closeDialog()}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {recordDialog.data
                ? t("horses:health.editRecord", "Edit Health Record")
                : t("horses:health.addRecord", "Add Health Record")}
            </DialogTitle>
          </DialogHeader>
          <HealthRecordForm
            horseId={horse.id}
            record={recordDialog.data}
            onSuccess={handleSuccess}
            onCancel={() => recordDialog.closeDialog()}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && deleteDialog.closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("horses:health.deleteRecord", "Delete Health Record")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "horses:health.deleteConfirm",
                "Are you sure you want to delete this health record? This action cannot be undone.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:buttons.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common:buttons.delete", "Delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
