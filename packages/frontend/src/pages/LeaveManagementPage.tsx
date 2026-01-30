import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, Loader2, Filter } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { formatPeriodDisplay } from "@/services/availabilityService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import {
  useOrganizationLeaveRequests,
  useReviewLeaveRequest,
} from "@/hooks/useAvailability";
import { useToast } from "@/hooks/use-toast";
import type {
  LeaveRequestDisplay,
  LeaveType,
  LeaveStatus,
} from "@equiduty/shared";
import { STATUS_BADGES } from "@/lib/availabilityConstants";

export default function LeaveManagementPage() {
  const { t } = useTranslation(["availability", "common"]);
  const { currentOrganizationId } = useOrganizationContext();
  const { toast } = useToast();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<LeaveRequestDisplay | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">(
    "approved",
  );
  const [reviewNote, setReviewNote] = useState("");

  // API hooks
  const { data: leaveRequests, isLoading } = useOrganizationLeaveRequests(
    currentOrganizationId,
    { status: statusFilter === "all" ? undefined : statusFilter },
  );
  const reviewMutation = useReviewLeaveRequest();

  // Get translated leave type label
  const getLeaveTypeLabel = (type: LeaveType): string => {
    return t(`leave.types.${type}`);
  };

  // Get translated status badge
  const getStatusBadge = (status: LeaveStatus) => {
    const badge = STATUS_BADGES[status];
    return {
      variant: badge.variant,
      label: t(`leave.status.${status}`),
    };
  };

  // Status filter options
  const statusOptions = [
    { value: "all", label: t("statusFilter.all") },
    { value: "pending", label: t("statusFilter.pending") },
    { value: "approved", label: t("statusFilter.approved") },
    { value: "rejected", label: t("statusFilter.rejected") },
    { value: "cancelled", label: t("statusFilter.cancelled") },
  ];

  const handleOpenReviewDialog = (
    request: LeaveRequestDisplay,
    action: "approved" | "rejected",
  ) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNote("");
    setReviewDialogOpen(true);
  };

  const handleReview = async () => {
    if (!selectedRequest || !currentOrganizationId) return;

    try {
      await reviewMutation.mutateAsync({
        id: selectedRequest.id,
        organizationId: currentOrganizationId,
        status: reviewAction,
        reviewNote: reviewNote || undefined,
      });
      toast({
        title:
          reviewAction === "approved"
            ? t("toast.requestApproved")
            : t("toast.requestRejected"),
        description: t("toast.reviewDescription", {
          name: selectedRequest.userName || t("common:labels.unknown"),
          status:
            reviewAction === "approved"
              ? t("leave.status.approved")
              : t("leave.status.rejected"),
        }),
      });
      setReviewDialogOpen(false);
    } catch (error) {
      toast({
        title: t("toast.error"),
        description: t("toast.reviewError"),
        variant: "destructive",
      });
    }
  };

  if (!currentOrganizationId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            {t("myAvailability.selectOrganization")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("leaveManagement.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("leaveManagement.description")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t("leaveManagement.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-[200px]">
              <Label className="text-sm text-muted-foreground">
                {t("common:labels.status")}
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common:labels.select")} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("leaveManagement.leaveRequests")}</CardTitle>
          <CardDescription>
            {t("leaveManagement.requestsFound", {
              count: leaveRequests?.length ?? 0,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner centered />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("leaveManagement.table.employee")}</TableHead>
                  <TableHead>{t("leaveManagement.table.type")}</TableHead>
                  <TableHead>{t("leaveManagement.table.period")}</TableHead>
                  <TableHead>{t("leaveManagement.table.impact")}</TableHead>
                  <TableHead>{t("leaveManagement.table.status")}</TableHead>
                  <TableHead>{t("leaveManagement.table.requested")}</TableHead>
                  <TableHead className="text-right">
                    {t("leaveManagement.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!leaveRequests || leaveRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      {t("leaveManagement.noRequests")}
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveRequests.map((request) => {
                    const statusBadge = getStatusBadge(request.status);
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.userName || t("common:labels.unknown")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.userEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getLeaveTypeLabel(request.type)}</TableCell>
                        <TableCell>
                          {formatPeriodDisplay(
                            request.firstDay,
                            request.lastDay,
                          )}
                        </TableCell>
                        <TableCell>{request.impactHours}h</TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(request.requestedAt, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() =>
                                  handleOpenReviewDialog(request, "approved")
                                }
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {t("common:buttons.confirm")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  handleOpenReviewDialog(request, "rejected")
                                }
                              >
                                <X className="h-4 w-4 mr-1" />
                                {t("common:status.rejected")}
                              </Button>
                            </div>
                          )}
                          {request.status !== "pending" &&
                            request.reviewedAt && (
                              <span className="text-sm text-muted-foreground">
                                {format(request.reviewedAt, "MMM d, yyyy")}
                              </span>
                            )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approved"
                ? t("leaveManagement.reviewDialog.approveTitle")
                : t("leaveManagement.reviewDialog.rejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {t("leaveManagement.reviewDialog.description", {
                    name:
                      selectedRequest.userName || t("common:labels.unknown"),
                    type: getLeaveTypeLabel(selectedRequest.type).toLowerCase(),
                    from: format(selectedRequest.firstDay, "MMM d"),
                    to: format(selectedRequest.lastDay, "MMM d, yyyy"),
                    hours: selectedRequest.impactHours,
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reviewNote">
                {t("leaveManagement.reviewDialog.noteLabel")}
              </Label>
              <Textarea
                id="reviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={
                  reviewAction === "approved"
                    ? t("leaveManagement.reviewDialog.approvePlaceholder")
                    : t("leaveManagement.reviewDialog.rejectPlaceholder")
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={reviewMutation.isPending}
            >
              {t("common:buttons.cancel")}
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewMutation.isPending}
              variant={reviewAction === "approved" ? "default" : "destructive"}
            >
              {reviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : reviewAction === "approved" ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {reviewAction === "approved"
                ? t("common:buttons.confirm")
                : t("common:status.rejected")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
