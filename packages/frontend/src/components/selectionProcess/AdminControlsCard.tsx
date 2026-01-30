/**
 * Admin Controls Card for Selection Process
 *
 * Displays admin-only controls for managing a selection process:
 * - Draft: Start button, Delete button
 * - Active: Date edit section, Cancel button
 * - Cancelled: Delete button only
 *
 * Only visible to users with canManage permission (owner, administrator, schedule_planner)
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, XCircle, Trash2, Calendar, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SelectionProcessWithContext } from "@equiduty/shared";
import { toDate } from "@equiduty/shared";
import { DateEditSection } from "./DateEditSection";

interface AdminControlsCardProps {
  process: SelectionProcessWithContext;
  onCancel: () => void;
  onDelete: () => void;
  onStart: () => void;
  onDateChange: (dates: {
    selectionStartDate?: string;
    selectionEndDate?: string;
  }) => void;
  isCancelling: boolean;
  isDeleting: boolean;
  isStarting: boolean;
  isUpdatingDates: boolean;
}

export function AdminControlsCard({
  process,
  onCancel,
  onDelete,
  onStart,
  onDateChange,
  isCancelling,
  isDeleting,
  isStarting,
  isUpdatingDates,
}: AdminControlsCardProps) {
  const { t } = useTranslation(["selectionProcess", "common"]);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const [editingDates, setEditingDates] = useState(false);

  // Don't render if user doesn't have permission
  if (!process.canManage) {
    return null;
  }

  // Parse current dates using shared utility
  const currentStartDate = toDate(process.selectionStartDate);
  const currentEndDate = toDate(process.selectionEndDate);

  const handleDateSave = (dates: {
    selectionStartDate?: string;
    selectionEndDate?: string;
  }) => {
    onDateChange(dates);
    setEditingDates(false);
  };

  const handleCancelConfirm = () => {
    onCancel();
    setConfirmCancelOpen(false);
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setConfirmDeleteOpen(false);
  };

  const handleStartConfirm = () => {
    onStart();
    setConfirmStartOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t("selectionProcess:admin.title")}
          </CardTitle>
          <CardDescription>
            {process.status === "draft" &&
              t("selectionProcess:descriptions.create")}
            {process.status === "active" &&
              t("selectionProcess:admin.editDates")}
            {process.status === "cancelled" &&
              t("selectionProcess:admin.deleteDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Draft Status Actions */}
          {process.status === "draft" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={() => setConfirmStartOpen(true)}
                disabled={isStarting}
              >
                <Play className="h-4 w-4 mr-2" />
                {isStarting
                  ? t("common:labels.loading")
                  : t("selectionProcess:admin.startProcess")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting
                  ? t("common:labels.loading")
                  : t("selectionProcess:admin.deleteProcess")}
              </Button>
            </div>
          )}

          {/* Active Status Actions */}
          {process.status === "active" && (
            <>
              {/* Date Edit Section */}
              {!editingDates ? (
                <Button variant="outline" onClick={() => setEditingDates(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  {t("selectionProcess:admin.editDates")}
                </Button>
              ) : (
                <DateEditSection
                  currentStartDate={currentStartDate}
                  currentEndDate={currentEndDate}
                  onSave={handleDateSave}
                  onCancel={() => setEditingDates(false)}
                  isSaving={isUpdatingDates}
                />
              )}

              <Separator />

              {/* Cancel Button */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("selectionProcess:admin.cancelDescription")}
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmCancelOpen(true)}
                  disabled={isCancelling}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {isCancelling
                    ? t("common:labels.loading")
                    : t("selectionProcess:admin.cancelProcess")}
                </Button>
              </div>
            </>
          )}

          {/* Cancelled Status Actions */}
          {process.status === "cancelled" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("selectionProcess:admin.deleteDescription")}
              </p>
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting
                  ? t("common:labels.loading")
                  : t("selectionProcess:admin.deleteProcess")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Start Dialog */}
      <Dialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("selectionProcess:modals.confirmStart.title")}
            </DialogTitle>
            <DialogDescription>
              {t("selectionProcess:modals.confirmStart.description", {
                name: process.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmStartOpen(false)}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button onClick={handleStartConfirm} disabled={isStarting}>
              {isStarting
                ? t("common:labels.loading")
                : t("selectionProcess:modals.confirmStart.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Cancel Dialog */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("selectionProcess:modals.confirmCancel.title")}
            </DialogTitle>
            <DialogDescription>
              {t("selectionProcess:modals.confirmCancel.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmCancelOpen(false)}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling
                ? t("common:labels.loading")
                : t("selectionProcess:buttons.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("selectionProcess:modals.confirmDelete.title")}
            </DialogTitle>
            <DialogDescription>
              {t("selectionProcess:modals.confirmDelete.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting
                ? t("common:labels.loading")
                : t("selectionProcess:buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
