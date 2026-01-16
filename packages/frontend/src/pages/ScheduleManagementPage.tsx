import { useState } from "react";
import { Calendar, Loader2, Settings, Clock, PiggyBank } from "lucide-react";
import { format } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useQuery } from "@tanstack/react-query";
import {
  useSetWorkSchedule,
  useAdjustTimeBalance,
} from "@/hooks/useAvailability";
import { useToast } from "@/hooks/use-toast";
import { WorkScheduleDialog } from "@/components/availability/WorkScheduleDialog";
import { BalanceAdjustmentDialog } from "@/components/availability/BalanceAdjustmentDialog";
import type { DaySchedule, WorkScheduleDisplay } from "@stall-bokning/shared";

interface TimeBalance {
  id: string;
  userId: string;
  organizationId: string;
  year: number;
  carryoverFromPreviousYear: number;
  buildUpHours: number;
  corrections: number;
  approvedLeave: number;
  tentativeLeave: number;
  approvedOvertime: number;
  currentBalance: number;
  endOfYearProjection: number;
}

interface OrganizationMember {
  id: string;
  odataKeys: string;
  odataMembers: string;
  userId: string;
  organizationId: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  status: string;
  workSchedule?: WorkScheduleDisplay;
  timeBalance?: TimeBalance;
}

const API_URL = import.meta.env.VITE_API_URL;

export default function ScheduleManagementPage() {
  const { currentOrganizationId } = useOrganizationContext();
  const { toast } = useToast();

  // Schedule dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<OrganizationMember | null>(null);

  // Balance dialog state
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [balanceMember, setBalanceMember] = useState<OrganizationMember | null>(
    null,
  );

  // Fetch organization members with their work schedules
  const {
    data: members,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["organizationMembersWithSchedules", currentOrganizationId],
    queryFn: async () => {
      const { authFetchJSON } = await import("@/utils/authFetch");
      const response = await authFetchJSON<{ members: OrganizationMember[] }>(
        `${API_URL}/api/v1/availability/admin/members-with-schedules?organizationId=${currentOrganizationId}`,
        { method: "GET" },
      );
      return response.members;
    },
    enabled: !!currentOrganizationId,
  });

  const setWorkSchedule = useSetWorkSchedule();
  const adjustTimeBalance = useAdjustTimeBalance();

  const handleOpenScheduleDialog = (member: OrganizationMember) => {
    setSelectedMember(member);
    setScheduleDialogOpen(true);
  };

  const handleOpenBalanceDialog = (member: OrganizationMember) => {
    setBalanceMember(member);
    setBalanceDialogOpen(true);
  };

  const handleSaveSchedule = async (data: {
    weeklySchedule: DaySchedule[];
    effectiveFrom: string;
    effectiveUntil?: string;
  }) => {
    if (!selectedMember || !currentOrganizationId) return;

    try {
      await setWorkSchedule.mutateAsync({
        userId: selectedMember.userId,
        organizationId: currentOrganizationId,
        weeklySchedule: data.weeklySchedule,
        effectiveFrom: data.effectiveFrom,
        effectiveUntil: data.effectiveUntil,
      });
      toast({
        title: "Schedule saved",
        description: `Work schedule for ${selectedMember.displayName || selectedMember.email} has been updated.`,
      });
      setScheduleDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save work schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveBalance = async (data: {
    year: number;
    corrections: number;
    reason: string;
  }) => {
    if (!balanceMember || !currentOrganizationId) return;

    try {
      await adjustTimeBalance.mutateAsync({
        userId: balanceMember.userId,
        organizationId: currentOrganizationId,
        year: data.year,
        corrections: data.corrections,
        reason: data.reason,
      });
      toast({
        title: "Balance adjusted",
        description: `Time balance for ${balanceMember.displayName || balanceMember.email} has been updated.`,
      });
      setBalanceDialogOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to adjust time balance. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (member: OrganizationMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    if (member.displayName) {
      const parts = member.displayName.split(" ");
      return parts.length > 1
        ? `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
        : member.displayName.slice(0, 2).toUpperCase();
    }
    return member.email.slice(0, 2).toUpperCase();
  };

  const getTotalHours = (schedule?: WorkScheduleDisplay) => {
    if (!schedule) return 0;
    return schedule.weeklySchedule.reduce(
      (sum, day) => sum + (day.isWorkDay ? day.hours : 0),
      0,
    );
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
            Schedule Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure work schedules and time balances for your team
          </p>
        </div>
      </div>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Work Schedules
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Time Balances
          </TabsTrigger>
        </TabsList>

        {/* Work Schedules Tab */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Team Work Schedules
              </CardTitle>
              <CardDescription>
                {members?.length ?? 0} member(s) in organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Weekly Hours</TableHead>
                      <TableHead>Schedule Status</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!members || members.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          No members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="" />
                                <AvatarFallback>
                                  {getInitials(member)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {member.displayName ||
                                    `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
                                    "Unknown"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {member.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.workSchedule ? (
                              <span className="font-medium">
                                {getTotalHours(member.workSchedule)}h
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {member.workSchedule ? (
                              <Badge variant="default">Configured</Badge>
                            ) : (
                              <Badge variant="secondary">Not set</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {member.workSchedule ? (
                              format(
                                new Date(member.workSchedule.effectiveFrom),
                                "MMM d, yyyy",
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenScheduleDialog(member)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              {member.workSchedule ? "Edit" : "Set"} Schedule
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Balances Tab */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5" />
                Time Balances
              </CardTitle>
              <CardDescription>
                View and adjust time balances for team members (
                {new Date().getFullYear()})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Carryover</TableHead>
                      <TableHead>Build Up</TableHead>
                      <TableHead>Corrections</TableHead>
                      <TableHead>Used Leave</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!members || members.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          No members found
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => {
                        const balance = member.timeBalance;
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="" />
                                  <AvatarFallback>
                                    {getInitials(member)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {member.displayName ||
                                      `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
                                      "Unknown"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  balance?.carryoverFromPreviousYear
                                    ? "font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {balance?.carryoverFromPreviousYear ?? 0}h
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  balance?.buildUpHours
                                    ? "font-medium text-green-600"
                                    : "text-muted-foreground"
                                }
                              >
                                +{balance?.buildUpHours ?? 0}h
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  balance?.corrections
                                    ? balance.corrections > 0
                                      ? "font-medium text-green-600"
                                      : "font-medium text-red-600"
                                    : "text-muted-foreground"
                                }
                              >
                                {balance?.corrections
                                  ? `${balance.corrections > 0 ? "+" : ""}${balance.corrections}h`
                                  : "0h"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  balance?.approvedLeave
                                    ? "font-medium text-red-600"
                                    : "text-muted-foreground"
                                }
                              >
                                -{balance?.approvedLeave ?? 0}h
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-lg">
                                {balance?.currentBalance ?? 0}h
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBalanceDialog(member)}
                              >
                                <PiggyBank className="h-4 w-4 mr-1" />
                                Adjust
                              </Button>
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
        </TabsContent>
      </Tabs>

      {/* Work Schedule Dialog */}
      {selectedMember && (
        <WorkScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          onSave={handleSaveSchedule}
          existingSchedule={selectedMember.workSchedule}
          userName={
            selectedMember.displayName ||
            `${selectedMember.firstName || ""} ${selectedMember.lastName || ""}`.trim() ||
            selectedMember.email
          }
          isLoading={setWorkSchedule.isPending}
        />
      )}

      {/* Balance Adjustment Dialog */}
      {balanceMember && (
        <BalanceAdjustmentDialog
          open={balanceDialogOpen}
          onOpenChange={setBalanceDialogOpen}
          onSave={handleSaveBalance}
          userName={
            balanceMember.displayName ||
            `${balanceMember.firstName || ""} ${balanceMember.lastName || ""}`.trim() ||
            balanceMember.email
          }
          currentBalance={balanceMember.timeBalance?.currentBalance ?? 0}
          isLoading={adjustTimeBalance.isPending}
        />
      )}
    </div>
  );
}
