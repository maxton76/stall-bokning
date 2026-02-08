import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import {
  useStablePlanningMembers,
  formatMembersForSelection,
} from "@/hooks/useOrganizationMembers";
import {
  useAssignRoutine,
  useCancelScheduledRoutine,
  useDeleteScheduledRoutine,
  type ScheduleSlot,
} from "@/hooks/useScheduledRoutines";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import {
  logRoutineReassignment,
  safeAuditLog,
} from "@/services/auditLogService";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Clock,
  User,
  Award,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  UserCog,
  XCircle,
  Trash2,
} from "lucide-react";

interface RoutineInstanceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: ScheduleSlot | null;
  stableId: string;
  scheduledDate: Date;
  onStartRoutine: (instanceId: string) => void;
  onDeleted?: () => void;
}

export function RoutineInstanceDetailsModal({
  open,
  onOpenChange,
  slot,
  stableId,
  scheduledDate,
  onStartRoutine,
  onDeleted,
}: RoutineInstanceDetailsModalProps) {
  const { t } = useTranslation(["routines", "common"]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  const { hasPermission } = useOrgPermissions(currentOrganizationId);

  const [showReassignForm, setShowReassignForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch planning members for reassignment dropdown
  const { data: members = [], isLoading: membersLoading } =
    useStablePlanningMembers(currentOrganizationId, stableId);
  const formattedMembers = formatMembersForSelection(members);

  // Debug: Log members and formatted members to investigate duplicate name handling
  useEffect(() => {
    if (open && members.length > 0) {
      console.log("[RoutineInstanceDetailsModal] Members:", {
        count: members.length,
        members: members.map((m) => ({
          userId: m.userId,
          name: `${m.firstName} ${m.lastName}`,
          email: m.userEmail,
          showInPlanning: m.showInPlanning,
          stableAccess: m.stableAccess,
          assignedStableIds: m.assignedStableIds,
        })),
        formattedCount: formattedMembers.length,
        formattedMembers,
      });
    }
  }, [open, members, formattedMembers]);

  // Mutations
  const assignMutation = useAssignRoutine();
  const cancelMutation = useCancelScheduledRoutine();
  const deleteMutation = useDeleteScheduledRoutine();

  const canManageSchedules = hasPermission("manage_schedules");

  // Reset form state when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowReassignForm(false);
      setSelectedMemberId("");
      setConfirmDialogOpen(false);
      setCancelDialogOpen(false);
      setDeleteDialogOpen(false);
    }
    onOpenChange(newOpen);
  };

  if (!slot) return null;

  const canReassign = slot.status === "scheduled";
  const selectedMember = formattedMembers.find(
    (m) => m.id === selectedMemberId,
  );

  const getStatusBadgeVariant = (
    status: ScheduleSlot["status"],
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
      case "started":
        return "secondary";
      case "cancelled":
      case "missed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleStartRoutine = () => {
    onStartRoutine(slot.id);
    handleOpenChange(false);
  };

  const handleReassignClick = () => {
    setShowReassignForm(true);
    // Pre-select current assignee if exists
    if (slot.assigneeId) {
      setSelectedMemberId(slot.assigneeId);
    }
  };

  const handleCancelReassign = () => {
    setShowReassignForm(false);
    setSelectedMemberId("");
  };

  const handleConfirmReassign = () => {
    if (!selectedMemberId || !selectedMember) return;
    setConfirmDialogOpen(true);
  };

  const handleReassign = async () => {
    if (!selectedMemberId || !selectedMember || !user) return;

    try {
      await assignMutation.mutateAsync({
        instanceId: slot.id,
        assignedTo: selectedMemberId,
        assignedToName: selectedMember.name,
      });

      // Log the reassignment to audit log (non-blocking)
      safeAuditLog(() =>
        logRoutineReassignment(
          slot.id,
          slot.title,
          slot.assigneeId || null,
          slot.assignee || null,
          selectedMemberId,
          selectedMember.name,
          user.uid,
          stableId,
          currentOrganizationId || undefined,
        ),
      );

      toast({
        title: t("routines:instance.reassignSuccess"),
        description: t("routines:instance.reassignSuccessMessage", {
          name: selectedMember.name,
        }),
      });

      setConfirmDialogOpen(false);
      handleOpenChange(false);
    } catch (error) {
      console.error("Error reassigning routine:", error);
      toast({
        title: t("routines:instance.reassignError"),
        description: t("routines:instance.reassignErrorMessage"),
        variant: "destructive",
      });
    }
  };

  const handleCancelRoutine = async () => {
    if (!slot) return;

    try {
      await cancelMutation.mutateAsync({ instanceId: slot.id });

      toast({
        title: t("routines:instance.cancelSuccess"),
        description: t("routines:instance.cancelSuccessMessage", {
          name: slot.title,
        }),
      });

      setCancelDialogOpen(false);
      handleOpenChange(false);
    } catch (error) {
      console.error("Error cancelling routine:", error);
      toast({
        title: t("routines:instance.cancelError"),
        description: t("routines:instance.cancelErrorMessage"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteRoutine = async () => {
    if (!slot) return;

    try {
      await deleteMutation.mutateAsync(slot.id);

      toast({
        title: t("routines:instance.deleteSuccess"),
        description: t("routines:instance.deleteSuccessMessage", {
          name: slot.title,
        }),
      });

      setDeleteDialogOpen(false);
      handleOpenChange(false);
      onDeleted?.();
    } catch (error) {
      console.error("Error deleting routine:", error);
      toast({
        title: t("routines:instance.deleteError"),
        description: t("routines:instance.deleteErrorMessage"),
        variant: "destructive",
      });
    }
  };

  const isAssignee = user?.uid === slot?.assigneeId;
  const canCancelInstance =
    (canManageSchedules || isAssignee) &&
    ["scheduled", "started", "in_progress"].includes(slot?.status ?? "");

  const canDeleteInstance =
    canManageSchedules &&
    (slot?.status === "scheduled" || slot?.status === "cancelled");

  const isMutating =
    cancelMutation.isPending ||
    deleteMutation.isPending ||
    assignMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {slot.title}
            </DialogTitle>
            <DialogDescription>
              {format(scheduledDate, "EEEE d MMMM yyyy", { locale: sv })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">
                {t("routines:instance.status")}
              </Label>
              <Badge variant={getStatusBadgeVariant(slot.status)}>
                {t(`routines:status.${slot.status}`)}
              </Badge>
            </div>

            {/* Time */}
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("routines:instance.scheduledTime")}
              </Label>
              <span className="font-medium">{slot.time}</span>
            </div>

            {/* Assigned To */}
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("routines:instance.assignedTo")}
              </Label>
              <span className="font-medium">
                {slot.assignee || t("routines:instance.unassigned")}
              </span>
            </div>

            {/* Points */}
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                {t("routines:instance.pointsValue")}
              </Label>
              <span className="font-medium">{slot.pointsValue} p</span>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground flex items-center gap-2">
                {slot.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {t("routines:instance.progress")}
              </Label>
              <span className="font-medium">
                {slot.progress.stepsCompleted}/{slot.progress.stepsTotal}{" "}
                {t("routines:flow.step").toLowerCase()}
              </span>
            </div>

            {/* Reassignment Form */}
            {showReassignForm && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {t("routines:instance.reassignTitle")}
                  </Label>

                  {/* Current Assignee */}
                  <div className="text-sm text-muted-foreground">
                    {t("routines:instance.currentAssignee")}:{" "}
                    <span className="font-medium text-foreground">
                      {slot.assignee || t("routines:instance.unassigned")}
                    </span>
                  </div>

                  {/* Member Select */}
                  <div className="space-y-2">
                    <Label htmlFor="newAssignee">
                      {t("routines:instance.newAssignee")}
                    </Label>
                    <Select
                      value={selectedMemberId}
                      onValueChange={setSelectedMemberId}
                      disabled={membersLoading}
                    >
                      <SelectTrigger id="newAssignee">
                        <SelectValue
                          placeholder={t("routines:instance.selectMember")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {formattedMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelReassign}
                    >
                      {t("common:buttons.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmReassign}
                      disabled={!selectedMemberId || assignMutation.isPending}
                    >
                      {t("routines:instance.confirmReassign")}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-col gap-2">
            {canDeleteInstance && !showReassignForm && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="w-full"
                disabled={isMutating}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("routines:instance.deleteRoutine")}
              </Button>
            )}
            {canCancelInstance && !showReassignForm && (
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                className="w-full text-destructive border-destructive hover:bg-destructive/10"
                disabled={isMutating}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {t("routines:instance.cancelRoutine")}
              </Button>
            )}
            {canReassign && !showReassignForm && (
              <Button
                variant="outline"
                onClick={handleReassignClick}
                className="w-full"
                disabled={isMutating}
              >
                <UserCog className="h-4 w-4 mr-2" />
                {t("routines:instance.reassign")}
              </Button>
            )}
            <Button
              onClick={handleStartRoutine}
              className="w-full"
              disabled={showReassignForm || isMutating}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {slot.status === "in_progress" || slot.status === "started"
                ? t("routines:actions.continue")
                : t("routines:instance.startRoutine")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("routines:instance.confirmReassignTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("routines:instance.confirmReassignMessage", {
                routineName: slot.title,
                newAssignee: selectedMember?.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assignMutation.isPending}>
              {t("common:buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleReassign();
              }}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending
                ? t("routines:instance.reassigning")
                : t("routines:instance.confirmReassign")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("routines:instance.confirmCancelTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("routines:instance.confirmCancelMessage", {
                routineName: slot.title,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              {t("common:buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelRoutine();
              }}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending
                ? t("routines:instance.cancelling")
                : t("routines:instance.cancelRoutine")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("routines:instance.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {slot?.status === "cancelled"
                ? t("routines:instance.confirmRemoveCancelledMessage", {
                    routineName: slot.title,
                  })
                : t("routines:instance.confirmDeleteMessage", {
                    routineName: slot.title,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("common:buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteRoutine();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? t("routines:instance.deleting")
                : t("routines:instance.deleteRoutine")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
