import { useState, useMemo } from "react";
import { Plus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useDialog } from "@/hooks/useDialog";
import { RequestLeaveDialog } from "@/components/availability/RequestLeaveDialog";
import { ReportSickDialog } from "@/components/availability/ReportSickDialog";
import { BalanceSection } from "@/components/availability/BalanceSection";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  useAvailabilityData,
  useCreateLeaveRequest,
  useReportSickLeave,
} from "@/hooks/useAvailability";
import { formatPeriodDisplay } from "@/services/availabilityService";
import { useToast } from "@/hooks/use-toast";
import {
  LEAVE_TYPE_LABELS,
  STATUS_BADGES,
  DAY_NAMES_SHORT,
  DEFAULT_SCHEDULE,
} from "@/lib/availabilityConstants";

export default function MyAvailabilityPage() {
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationContext();
  const { toast } = useToast();
  const requestLeaveDialog = useDialog();
  const reportSickDialog = useDialog();

  // Collapsible state for balance sections
  const [buildUpOpen, setBuildUpOpen] = useState(true);
  const [correctionsOpen, setCorrectionsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [overtimeOpen, setOvertimeOpen] = useState(false);

  // API hooks
  const { leaveRequests, workSchedule, timeBalance, isLoading } =
    useAvailabilityData(currentOrganizationId);
  const createLeaveRequest = useCreateLeaveRequest();
  const reportSickLeave = useReportSickLeave();

  // Extract data with fallbacks
  const leaveRequestsData = leaveRequests.data ?? [];
  const workScheduleData =
    workSchedule.data?.weeklySchedule ?? DEFAULT_SCHEDULE;
  const timeBalanceData = timeBalance.data ?? {
    year: new Date().getFullYear(),
    currentBalance: 0,
    endOfYearProjection: 0,
    carryoverFromPreviousYear: 0,
    buildUpHours: 0,
    corrections: 0,
    approvedLeave: 0,
    tentativeLeave: 0,
    approvedOvertime: 0,
  };

  // Get work days in order starting from Monday
  const orderedSchedule = useMemo(() => {
    // Reorder to start from Monday (1) and end with Sunday (0)
    const schedule = [...workScheduleData];
    const sunday = schedule.shift(); // Remove Sunday from start
    if (sunday) schedule.push(sunday); // Add Sunday to end
    return schedule;
  }, [workScheduleData]);

  const handleSaveLeaveRequest = async (data: {
    firstDay: string;
    lastDay: string;
    note?: string;
  }) => {
    if (!currentOrganizationId) return;

    try {
      await createLeaveRequest.mutateAsync({
        organizationId: currentOrganizationId,
        firstDay: data.firstDay,
        lastDay: data.lastDay,
        note: data.note,
      });
      toast({
        title: "Leave request created",
        description: "Your leave request has been submitted for approval.",
      });
      requestLeaveDialog.closeDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create leave request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSickLeave = async (data: {
    firstSickDay: string;
    note?: string;
  }) => {
    if (!currentOrganizationId) return;

    try {
      await reportSickLeave.mutateAsync({
        organizationId: currentOrganizationId,
        firstSickDay: data.firstSickDay,
        note: data.note,
      });
      toast({
        title: "Sick leave reported",
        description: "Your sick leave has been recorded.",
      });
      reportSickDialog.closeDialog();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to report sick leave. Please try again.",
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
        <h1 className="text-3xl font-bold tracking-tight">My availability</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => reportSickDialog.openDialog()}
            disabled={reportSickLeave.isPending}
          >
            <Stethoscope className="mr-2 h-4 w-4" />
            Report sick
          </Button>
          <Button
            onClick={() => requestLeaveDialog.openDialog()}
            disabled={createLeaveRequest.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add leave request
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner centered />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Leave Requests Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Type</TableHead>
                    <TableHead className="w-[200px]">Period</TableHead>
                    <TableHead className="w-[100px]">Impact</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequestsData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No leave requests yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaveRequestsData.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{LEAVE_TYPE_LABELS[request.type]}</TableCell>
                        <TableCell>
                          {formatPeriodDisplay(
                            request.firstDay,
                            request.lastDay,
                          )}
                        </TableCell>
                        <TableCell>{request.impactHours}h</TableCell>
                        <TableCell>
                          <Badge
                            variant={STATUS_BADGES[request.status].variant}
                          >
                            {STATUS_BADGES[request.status].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Work Schedule Card */}
            <Card>
              <CardHeader>
                <CardTitle>Work schedule</CardTitle>
              </CardHeader>
              <CardContent>
                {workSchedule.data ? (
                  <div className="grid grid-cols-7 gap-2">
                    {orderedSchedule.map((day) => (
                      <div
                        key={day.dayOfWeek}
                        className="text-center p-4 border rounded-lg"
                      >
                        <div className="font-medium text-sm mb-2">
                          {DAY_NAMES_SHORT[day.dayOfWeek]}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Start
                        </div>
                        <div className="font-semibold mb-3">
                          {day.isWorkDay ? day.startTime : "-"}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Hours
                        </div>
                        <div className="text-3xl font-bold">
                          {day.hours || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No work schedule assigned yet. Contact your administrator.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Balance Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Balance</CardTitle>
                <p className="text-sm text-muted-foreground">Per today</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Balance */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current balance
                    </p>
                    <p className="text-3xl font-bold">
                      {timeBalanceData.currentBalance}h
                    </p>
                    <p className="text-sm text-muted-foreground">
                      End of {timeBalanceData.year}:{" "}
                      {timeBalanceData.endOfYearProjection}h
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <BalanceSection
                    title="Build up"
                    total={
                      timeBalanceData.carryoverFromPreviousYear +
                      timeBalanceData.buildUpHours
                    }
                    isOpen={buildUpOpen}
                    onToggle={setBuildUpOpen}
                    details={[
                      {
                        label: `From ${timeBalanceData.year - 1}`,
                        value: timeBalanceData.carryoverFromPreviousYear,
                      },
                      {
                        label: "Build up",
                        value: timeBalanceData.buildUpHours,
                      },
                    ]}
                  />

                  <BalanceSection
                    title="Corrections"
                    total={timeBalanceData.corrections}
                    isOpen={correctionsOpen}
                    onToggle={setCorrectionsOpen}
                    details={[
                      {
                        label: "Corrected",
                        value: timeBalanceData.corrections,
                      },
                    ]}
                  />

                  <BalanceSection
                    title="Leave"
                    total={
                      timeBalanceData.approvedLeave +
                      timeBalanceData.tentativeLeave
                    }
                    isOpen={leaveOpen}
                    onToggle={setLeaveOpen}
                    details={[
                      {
                        label: "Approved",
                        value: timeBalanceData.approvedLeave,
                      },
                      {
                        label: "Tentative",
                        value: timeBalanceData.tentativeLeave,
                      },
                    ]}
                  />

                  <BalanceSection
                    title="Overtime"
                    total={timeBalanceData.approvedOvertime}
                    isOpen={overtimeOpen}
                    onToggle={setOvertimeOpen}
                    details={[
                      {
                        label: "Approved",
                        value: timeBalanceData.approvedOvertime,
                      },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <RequestLeaveDialog
        open={requestLeaveDialog.open}
        onOpenChange={requestLeaveDialog.closeDialog}
        onSave={handleSaveLeaveRequest}
        organizationId={currentOrganizationId}
      />
      <ReportSickDialog
        open={reportSickDialog.open}
        onOpenChange={reportSickDialog.closeDialog}
        onSave={handleSaveSickLeave}
        organizationId={currentOrganizationId}
      />
    </div>
  );
}
