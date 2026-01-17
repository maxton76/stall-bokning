import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { STATUS_BADGES, DEFAULT_SCHEDULE } from "@/lib/availabilityConstants";
import type { LeaveType, LeaveStatus } from "@stall-bokning/shared";

// Weekday keys in Sunday-first order for translation lookup
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function MyAvailabilityPage() {
  const { t } = useTranslation(["availability", "common"]);
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

  // Get translated weekday name (short)
  const getWeekdayShort = (dayOfWeek: number): string => {
    return t(`weekdaysShort.${WEEKDAY_KEYS[dayOfWeek]}`);
  };

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
        title: t("toast.leaveRequestCreated"),
        description: t("toast.leaveRequestCreatedDescription"),
      });
      requestLeaveDialog.closeDialog();
    } catch (error) {
      toast({
        title: t("toast.error"),
        description: t("toast.createLeaveError"),
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
        title: t("toast.sickLeaveReported"),
        description: t("toast.sickLeaveReportedDescription"),
      });
      reportSickDialog.closeDialog();
    } catch (error) {
      toast({
        title: t("toast.error"),
        description: t("toast.reportSickError"),
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
        <h1 className="text-3xl font-bold tracking-tight">
          {t("myAvailability.title")}
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => reportSickDialog.openDialog()}
            disabled={reportSickLeave.isPending}
          >
            <Stethoscope className="mr-2 h-4 w-4" />
            {t("myAvailability.reportSick")}
          </Button>
          <Button
            onClick={() => requestLeaveDialog.openDialog()}
            disabled={createLeaveRequest.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("myAvailability.addLeaveRequest")}
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
                    <TableHead className="w-[150px]">
                      {t("common:labels.type")}
                    </TableHead>
                    <TableHead className="w-[200px]">
                      {t("leaveManagement.table.period")}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {t("leaveManagement.table.impact")}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {t("common:labels.status")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequestsData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        {t("myAvailability.noLeaveRequests")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaveRequestsData.map((request) => {
                      const statusBadge = getStatusBadge(request.status);
                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            {getLeaveTypeLabel(request.type)}
                          </TableCell>
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
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Work Schedule Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t("workSchedule.title")}</CardTitle>
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
                          {getWeekdayShort(day.dayOfWeek)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {t("workSchedule.start")}
                        </div>
                        <div className="font-semibold mb-3">
                          {day.isWorkDay ? day.startTime : "-"}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {t("workSchedule.hours")}
                        </div>
                        <div className="text-3xl font-bold">
                          {day.hours || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("workSchedule.noSchedule")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Balance Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t("balance.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("balance.perToday")}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Balance */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("balance.currentBalance")}
                    </p>
                    <p className="text-3xl font-bold">
                      {timeBalanceData.currentBalance}h
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("balance.endOfYear", { year: timeBalanceData.year })}:{" "}
                      {timeBalanceData.endOfYearProjection}h
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <BalanceSection
                    title={t("balance.buildUp")}
                    total={
                      timeBalanceData.carryoverFromPreviousYear +
                      timeBalanceData.buildUpHours
                    }
                    isOpen={buildUpOpen}
                    onToggle={setBuildUpOpen}
                    details={[
                      {
                        label: t("balance.from", {
                          year: timeBalanceData.year - 1,
                        }),
                        value: timeBalanceData.carryoverFromPreviousYear,
                      },
                      {
                        label: t("balance.buildUp"),
                        value: timeBalanceData.buildUpHours,
                      },
                    ]}
                  />

                  <BalanceSection
                    title={t("balance.corrections")}
                    total={timeBalanceData.corrections}
                    isOpen={correctionsOpen}
                    onToggle={setCorrectionsOpen}
                    details={[
                      {
                        label: t("balance.corrected"),
                        value: timeBalanceData.corrections,
                      },
                    ]}
                  />

                  <BalanceSection
                    title={t("balance.leave")}
                    total={
                      timeBalanceData.approvedLeave +
                      timeBalanceData.tentativeLeave
                    }
                    isOpen={leaveOpen}
                    onToggle={setLeaveOpen}
                    details={[
                      {
                        label: t("balance.approved"),
                        value: timeBalanceData.approvedLeave,
                      },
                      {
                        label: t("balance.tentative"),
                        value: timeBalanceData.tentativeLeave,
                      },
                    ]}
                  />

                  <BalanceSection
                    title={t("balance.overtime")}
                    total={timeBalanceData.approvedOvertime}
                    isOpen={overtimeOpen}
                    onToggle={setOvertimeOpen}
                    details={[
                      {
                        label: t("balance.approved"),
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
