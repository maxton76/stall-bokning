import { useState } from "react";
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
import type { LeaveRequestDisplay } from "@stall-bokning/shared";
import {
  LEAVE_TYPE_LABELS,
  STATUS_BADGES,
  STATUS_OPTIONS,
} from "@/lib/availabilityConstants";

export default function LeaveManagementPage() {
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
          reviewAction === "approved" ? "Request approved" : "Request rejected",
        description: `Leave request for ${selectedRequest.userName || "user"} has been ${reviewAction}.`,
      });
      setReviewDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to review leave request. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!currentOrganizationId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Please select an organization first.
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
            Leave Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage leave requests from your team
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-[200px]">
              <Label className="text-sm text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
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
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            {leaveRequests?.length ?? 0} request(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner centered />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!leaveRequests || leaveRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No leave requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.userName || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.userEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{LEAVE_TYPE_LABELS[request.type]}</TableCell>
                      <TableCell>
                        {formatPeriodDisplay(request.firstDay, request.lastDay)}
                      </TableCell>
                      <TableCell>{request.impactHours}h</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGES[request.status].variant}>
                          {STATUS_BADGES[request.status].label}
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
                              Approve
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
                              Reject
                            </Button>
                          </div>
                        )}
                        {request.status !== "pending" && request.reviewedAt && (
                          <span className="text-sm text-muted-foreground">
                            {format(request.reviewedAt, "MMM d, yyyy")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
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
              {reviewAction === "approved" ? "Approve" : "Reject"} Leave Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {selectedRequest.userName || "Employee"} requested{" "}
                  {LEAVE_TYPE_LABELS[selectedRequest.type].toLowerCase()} from{" "}
                  {format(selectedRequest.firstDay, "MMM d")} to{" "}
                  {format(selectedRequest.lastDay, "MMM d, yyyy")} (
                  {selectedRequest.impactHours}h impact).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reviewNote">Note (optional)</Label>
              <Textarea
                id="reviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={
                  reviewAction === "approved"
                    ? "Optional note to the employee..."
                    : "Reason for rejection..."
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
              Cancel
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
              {reviewAction === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
