import { useState } from "react";
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
  type ScheduleSlot,
} from "@/hooks/useScheduledRoutines";
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
} from "lucide-react";

interface RoutineInstanceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: ScheduleSlot | null;
  stableId: string;
  scheduledDate: Date;
  onStartRoutine: (instanceId: string) => void;
}

export function RoutineInstanceDetailsModal({
  open,
  onOpenChange,
  slot,
  stableId,
  scheduledDate,
  onStartRoutine,
}: RoutineInstanceDetailsModalProps) {
  const { t } = useTranslation(["routines", "common"]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();

  const [showReassignForm, setShowReassignForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch planning members for reassignment dropdown
  const { data: members = [], isLoading: membersLoading } =
    useStablePlanningMembers(currentOrganizationId, stableId);
  const formattedMembers = formatMembersForSelection(members);

  // Assignment mutation
  const assignMutation = useAssignRoutine();

  // Reset form state when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowReassignForm(false);
      setSelectedMemberId("");
      setConfirmDialogOpen(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
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

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {canReassign && !showReassignForm && (
              <Button
                variant="outline"
                onClick={handleReassignClick}
                className="w-full sm:w-auto"
              >
                <UserCog className="h-4 w-4 mr-2" />
                {t("routines:instance.reassign")}
              </Button>
            )}
            <Button
              onClick={handleStartRoutine}
              className="w-full sm:w-auto"
              disabled={showReassignForm}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {slot.status === "in_progress" || slot.status === "started"
                ? t("routines:actions.continue")
                : t("routines:instance.startRoutine")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
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
    </>
  );
}
