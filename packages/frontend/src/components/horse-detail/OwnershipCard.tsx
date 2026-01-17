import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Mail,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDialog } from "@/hooks/useDialog";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/authFetch";
import type { Horse } from "@/types/roles";
import type { HorseOwnership, OwnershipRole } from "@shared/types/ownership";
import { toDate } from "@/utils/timestampUtils";
import { OwnershipForm } from "./OwnershipForm";

interface OwnershipCardProps {
  horse: Horse;
}

const ROLE_COLORS: Record<OwnershipRole, string> = {
  primary: "bg-blue-100 text-blue-800",
  "co-owner": "bg-green-100 text-green-800",
  syndicate: "bg-purple-100 text-purple-800",
  leaseholder: "bg-amber-100 text-amber-800",
};

const ROLE_LABELS: Record<OwnershipRole, { en: string; sv: string }> = {
  primary: { en: "Primary Owner", sv: "Huvudägare" },
  "co-owner": { en: "Co-Owner", sv: "Delägare" },
  syndicate: { en: "Syndicate", sv: "Syndikat" },
  leaseholder: { en: "Leaseholder", sv: "Hyrägare" },
};

export function OwnershipCard({ horse }: OwnershipCardProps) {
  const { t, i18n } = useTranslation(["horses", "common"]);
  const queryClient = useQueryClient();

  // Dialog states
  const ownershipDialog = useDialog<HorseOwnership>();
  const deleteDialog = useDialog<HorseOwnership>();

  // Fetch ownership records
  const {
    data: ownerships = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["horseOwnership", horse.id],
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/horse-ownership/horse/${horse.id}`,
      );
      if (!response.ok) throw new Error("Failed to fetch ownership data");
      const data = await response.json();
      return data.ownerships as HorseOwnership[];
    },
    enabled: !!horse.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch validation
  const { data: validation } = useQuery({
    queryKey: ["horseOwnership", horse.id, "validate"],
    queryFn: async () => {
      const response = await authFetch(
        `/api/v1/horse-ownership/horse/${horse.id}/validate`,
      );
      if (!response.ok) throw new Error("Failed to validate ownership");
      return response.json();
    },
    enabled: !!horse.id && ownerships.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ownership: HorseOwnership) => {
      const response = await authFetch(
        `/api/v1/horse-ownership/${ownership.id}?horseId=${horse.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete ownership");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["horseOwnership", horse.id],
      });
      deleteDialog.closeDialog();
    },
  });

  const handleAdd = () => {
    ownershipDialog.openDialog(undefined);
  };

  const handleEdit = (ownership: HorseOwnership) => {
    ownershipDialog.openDialog(ownership);
  };

  const handleDelete = (ownership: HorseOwnership) => {
    deleteDialog.openDialog(ownership);
  };

  const confirmDelete = () => {
    if (!deleteDialog.data) return;
    deleteMutation.mutate(deleteDialog.data);
  };

  const handleSuccess = () => {
    ownershipDialog.closeDialog();
    queryClient.invalidateQueries({ queryKey: ["horseOwnership", horse.id] });
  };

  const getRoleLabel = (role: OwnershipRole) => {
    const locale = i18n.language === "sv" ? "sv" : "en";
    return ROLE_LABELS[role]?.[locale] || role;
  };

  const totalPercentage = ownerships.reduce(
    (sum, o) => sum + (o.percentage || 0),
    0,
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("horses:ownership.title", "Ownership")}</CardTitle>
            </div>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              {t("common:buttons.add", "Add")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Percentage Summary */}
          {ownerships.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("horses:ownership.totalOwnership", "Total Ownership")}
                </span>
                <span
                  className={
                    totalPercentage === 100
                      ? "text-green-600 font-medium"
                      : totalPercentage > 100
                        ? "text-destructive font-medium"
                        : "text-amber-600 font-medium"
                  }
                >
                  {totalPercentage}%
                </span>
              </div>
              <Progress
                value={Math.min(totalPercentage, 100)}
                className={
                  totalPercentage === 100
                    ? "[&>div]:bg-green-500"
                    : totalPercentage > 100
                      ? "[&>div]:bg-destructive"
                      : "[&>div]:bg-amber-500"
                }
              />
              {validation && !validation.isValid && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{validation.errors[0]}</span>
                </div>
              )}
              {validation?.warnings?.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{validation.warnings[0]}</span>
                </div>
              )}
            </div>
          )}

          {/* Owners List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ownerships.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                {t("horses:ownership.noOwners", "No ownership records")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "horses:ownership.addOwnerHint",
                  "Add ownership records to track multiple owners and percentages",
                )}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("horses:ownership.addFirst", "Add First Owner")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {ownerships.map((ownership) => {
                const startDate = toDate(ownership.startDate);
                const endDate = ownership.endDate
                  ? toDate(ownership.endDate)
                  : null;
                const isActive = !endDate;

                return (
                  <div
                    key={ownership.id}
                    className={`rounded-lg border p-4 ${!isActive ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {ownership.ownerName}
                          </span>
                          <Badge
                            variant="outline"
                            className={ROLE_COLORS[ownership.role]}
                          >
                            {getRoleLabel(ownership.role)}
                          </Badge>
                          {!isActive && (
                            <Badge variant="outline" className="text-gray-500">
                              {t("horses:ownership.ended", "Ended")}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {ownership.percentage}%
                          </span>
                          {startDate && (
                            <span>
                              {t("horses:ownership.since", "Since")}{" "}
                              {format(startDate, "MMM yyyy")}
                            </span>
                          )}
                        </div>

                        {(ownership.ownerEmail || ownership.ownerPhone) && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {ownership.ownerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {ownership.ownerEmail}
                              </span>
                            )}
                            {ownership.ownerPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {ownership.ownerPhone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(ownership)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(ownership)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legacy single owner display (fallback) */}
          {ownerships.length === 0 && (horse.ownerName || horse.ownerEmail) && (
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                {t("horses:ownership.legacyOwner", "Original Owner (Legacy)")}
              </p>
              <div className="rounded-lg border p-3">
                {horse.ownerName && (
                  <p className="font-medium">{horse.ownerName}</p>
                )}
                {horse.ownerEmail && (
                  <p className="text-sm text-muted-foreground">
                    {horse.ownerEmail}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={ownershipDialog.open}
        onOpenChange={(open) => !open && ownershipDialog.closeDialog()}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {ownershipDialog.data
                ? t("horses:ownership.editOwner", "Edit Owner")
                : t("horses:ownership.addOwner", "Add Owner")}
            </DialogTitle>
          </DialogHeader>
          <OwnershipForm
            horseId={horse.id}
            ownership={ownershipDialog.data ?? undefined}
            currentTotal={
              ownershipDialog.data
                ? totalPercentage - (ownershipDialog.data.percentage || 0)
                : totalPercentage
            }
            onSuccess={handleSuccess}
            onCancel={() => ownershipDialog.closeDialog()}
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
              {t("horses:ownership.deleteOwner", "Remove Owner")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "horses:ownership.deleteConfirm",
                "Are you sure you want to remove this ownership record? This action cannot be undone.",
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
