import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  CalendarIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  UsersIcon,
  Loader2Icon,
  ArrowLeft,
  MoreHorizontalIcon,
  CheckIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShiftActions } from "@/hooks/useSchedules";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";
import type { Shift, ShiftStatus } from "@/types/schedule";
import { getStable } from "@/services/stableService";
import { getPublishedShiftsForStable } from "@/services/scheduleService";
import { toDate } from "@/utils/timestampUtils";

// Helper to get badge for shift status
function getStatusBadge(
  status: ShiftStatus,
  assignedToEmail?: string | null,
  currentUserEmail?: string,
) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckIcon className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          <XCircleIcon className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      );
    case "missed":
      return (
        <Badge
          variant="destructive"
          className="bg-orange-100 text-orange-800 hover:bg-orange-100"
        >
          <AlertTriangleIcon className="h-3 w-3 mr-1" />
          Missed
        </Badge>
      );
    case "assigned":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Assigned
        </Badge>
      );
    case "unassigned":
    default:
      return <Badge variant="destructive">Unassigned</Badge>;
  }
}

type FilterType =
  | "all"
  | "unassigned"
  | "assigned"
  | "completed"
  | "cancelled"
  | "missed";

export default function StableSchedulePage() {
  const { stableId } = useParams<{ stableId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [filter, setFilter] = useState<FilterType>("all");
  const { assign, unassign, complete, cancel, markMissed } = useShiftActions();

  // Dialog state for completion actions
  const [completionDialog, setCompletionDialog] = useState<{
    open: boolean;
    type: "complete" | "cancel" | "missed" | null;
    shiftId: string;
    shiftName: string;
  }>({ open: false, type: null, shiftId: "", shiftName: "" });
  const [dialogInput, setDialogInput] = useState("");

  // Fetch stable info
  const { data: stableName = "" } = useQuery({
    queryKey: queryKeys.stables.detail(stableId || ""),
    queryFn: async () => {
      if (!stableId) return "";
      const stable = await getStable(stableId);
      return stable?.name || "Unnamed Stable";
    },
    enabled: !!stableId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch shifts for this stable
  const { data: shifts = [], isLoading: loading } = useQuery({
    queryKey: ["shifts", "stable", stableId],
    queryFn: async () => {
      if (!user || !stableId) return [];
      return getPublishedShiftsForStable(stableId);
    },
    enabled: !!user && !!stableId,
    staleTime: 2 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const getShiftCoverageForDate = (date: Date) => {
    const dateStr = date.toDateString();
    const shiftsOnDate = shifts.filter((s) => {
      const shiftDate = toDate(s.date);
      return shiftDate && shiftDate.toDateString() === dateStr;
    });

    if (shiftsOnDate.length === 0)
      return { total: 0, assigned: 0, status: "none" };

    const assigned = shiftsOnDate.filter((s) => s.status === "assigned").length;
    const total = shiftsOnDate.length;
    const percentage = (assigned / total) * 100;

    let status = "partial";
    if (percentage === 100) status = "full";
    else if (percentage === 0) status = "empty";

    return { total, assigned, status };
  };

  const stats = useMemo(() => {
    const totalShifts = shifts.length;
    const unassigned = shifts.filter((s) => s.status === "unassigned").length;
    const assigned = shifts.filter((s) => s.status === "assigned").length;
    const completed = shifts.filter((s) => s.status === "completed").length;
    const cancelled = shifts.filter((s) => s.status === "cancelled").length;
    const missed = shifts.filter((s) => s.status === "missed").length;
    const activeShifts = totalShifts - cancelled;
    const coverage =
      activeShifts > 0
        ? Math.round(((assigned + completed) / activeShifts) * 100)
        : 0;

    return {
      totalShifts,
      unassigned,
      assigned,
      completed,
      cancelled,
      missed,
      coverage,
    };
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      if (filter === "all") return true;
      return shift.status === filter;
    });
  }, [shifts, filter]);

  const upcomingUnassigned = useMemo(() => {
    const now = new Date();
    return shifts
      .filter((s) => {
        const shiftDate = toDate(s.date);
        return s.status === "unassigned" && shiftDate && shiftDate >= now;
      })
      .sort((a, b) => {
        const aTime = toDate(a.date)?.getTime() ?? 0;
        const bTime = toDate(b.date)?.getTime() ?? 0;
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [shifts]);

  const handleAssignShift = async (shift: Shift) => {
    if (!user) return;

    try {
      await assign(
        shift.id,
        user.uid,
        user.email || "Unknown",
        user.email || "",
      );
      queryClient.invalidateQueries({
        queryKey: ["shifts", "stable", stableId],
      });
    } catch (error) {
      console.error("Error assigning shift:", error);
    }
  };

  const handleUnassignShift = async (shiftId: string) => {
    try {
      await unassign(shiftId);
      queryClient.invalidateQueries({
        queryKey: ["shifts", "stable", stableId],
      });
    } catch (error) {
      console.error("Error unassigning shift:", error);
    }
  };

  const openCompletionDialog = (
    type: "complete" | "cancel" | "missed",
    shiftId: string,
    shiftName: string,
  ) => {
    setCompletionDialog({ open: true, type, shiftId, shiftName });
    setDialogInput("");
  };

  const handleCompletionAction = async () => {
    const { type, shiftId } = completionDialog;
    if (!type || !shiftId) return;

    try {
      if (type === "complete") {
        await complete(shiftId, dialogInput || undefined);
      } else if (type === "cancel") {
        if (!dialogInput.trim()) {
          alert("Please provide a reason for cancellation");
          return;
        }
        await cancel(shiftId, dialogInput);
      } else if (type === "missed") {
        await markMissed(shiftId, dialogInput || undefined);
      }

      queryClient.invalidateQueries({
        queryKey: ["shifts", "stable", stableId],
      });
      setCompletionDialog({
        open: false,
        type: null,
        shiftId: "",
        shiftName: "",
      });
      setDialogInput("");
    } catch (error) {
      console.error(`Error ${type}ing shift:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to={`/stables/${stableId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stable
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {stableName} - Schedule
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage shifts for this stable
            </p>
          </div>
          <Link to={`/stables/${stableId}/schedules/create`}>
            <Button>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShifts}</div>
            <p className="text-xs text-muted-foreground">All upcoming shifts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertCircleIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.unassigned}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.assigned}
            </div>
            <p className="text-xs text-muted-foreground">Covered shifts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coverage}%</div>
            <p className="text-xs text-muted-foreground">Overall coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Calendar View */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>
              Days are color-coded: 🟢 All assigned • 🟡 Partially assigned • 🔴
              Unassigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              components={
                {
                  DayContent: ({ date }: any) => {
                    const coverage = getShiftCoverageForDate(date);

                    return (
                      <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <span>{date.getDate()}</span>
                        {coverage.total > 0 && (
                          <div className="absolute bottom-1 flex gap-0.5">
                            <div
                              className={cn(
                                "h-1 w-1 rounded-full",
                                coverage.status === "full" && "bg-green-600",
                                coverage.status === "partial" &&
                                  "bg-yellow-600",
                                coverage.status === "empty" && "bg-red-600",
                              )}
                            />
                          </div>
                        )}
                      </div>
                    );
                  },
                } as any
              }
            />
          </CardContent>
        </Card>

        {/* Urgent Unassigned */}
        <Card>
          <CardHeader>
            <CardTitle>Urgent Unassigned</CardTitle>
            <CardDescription>Next 5 unassigned shifts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingUnassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No unassigned shifts
              </p>
            ) : (
              upcomingUnassigned.map((shift) => (
                <div
                  key={shift.id}
                  className="flex flex-col space-y-2 p-3 border rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {shift.shiftTypeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {toDate(shift.date)?.toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shift.time}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {shift.points} pts
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleAssignShift(shift)}
                  >
                    Take Shift
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Shifts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Shifts</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All ({stats.totalShifts})
              </Button>
              <Button
                variant={filter === "unassigned" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unassigned")}
              >
                Unassigned ({stats.unassigned})
              </Button>
              <Button
                variant={filter === "assigned" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("assigned")}
              >
                Assigned ({stats.assigned})
              </Button>
              <Button
                variant={filter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("completed")}
              >
                Completed ({stats.completed})
              </Button>
              <Button
                variant={filter === "cancelled" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("cancelled")}
              >
                Cancelled ({stats.cancelled})
              </Button>
              <Button
                variant={filter === "missed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("missed")}
              >
                Missed ({stats.missed})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredShifts.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">No shifts found</p>
                {shifts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Create a schedule to generate shifts from your shift types
                  </p>
                )}
              </div>
            ) : (
              filteredShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{shift.shiftTypeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {toDate(shift.date)?.toLocaleDateString()} •{" "}
                          {shift.time}
                          {shift.assignedToName &&
                            shift.status !== "unassigned" && (
                              <span className="ml-2">
                                • {shift.assignedToName}
                              </span>
                            )}
                        </p>
                      </div>
                      <Badge variant="outline">{shift.points} pts</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(
                      shift.status,
                      shift.assignedToEmail ?? undefined,
                      user?.email ?? undefined,
                    )}
                    {/* Action buttons based on status */}
                    {shift.status === "unassigned" && (
                      <Button
                        size="sm"
                        onClick={() => handleAssignShift(shift)}
                      >
                        Take Shift
                      </Button>
                    )}
                    {shift.status === "assigned" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              openCompletionDialog(
                                "complete",
                                shift.id,
                                shift.shiftTypeName,
                              )
                            }
                          >
                            <CheckIcon className="mr-2 h-4 w-4 text-green-600" />
                            Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              openCompletionDialog(
                                "cancel",
                                shift.id,
                                shift.shiftTypeName,
                              )
                            }
                          >
                            <XCircleIcon className="mr-2 h-4 w-4 text-gray-500" />
                            Cancel Shift
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              openCompletionDialog(
                                "missed",
                                shift.id,
                                shift.shiftTypeName,
                              )
                            }
                          >
                            <AlertTriangleIcon className="mr-2 h-4 w-4 text-orange-500" />
                            Mark Missed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleUnassignShift(shift.id)}
                          >
                            Unassign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {(shift.status === "completed" ||
                      shift.status === "cancelled" ||
                      shift.status === "missed") && (
                      <div className="w-9" /> // Spacer for alignment
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completion Dialog */}
      <Dialog
        open={completionDialog.open}
        onOpenChange={(open) =>
          !open &&
          setCompletionDialog({
            open: false,
            type: null,
            shiftId: "",
            shiftName: "",
          })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {completionDialog.type === "complete" && "Complete Shift"}
              {completionDialog.type === "cancel" && "Cancel Shift"}
              {completionDialog.type === "missed" && "Mark Shift as Missed"}
            </DialogTitle>
            <DialogDescription>
              {completionDialog.type === "complete" &&
                `Mark "${completionDialog.shiftName}" as completed. You can optionally add notes.`}
              {completionDialog.type === "cancel" &&
                `Cancel "${completionDialog.shiftName}". Please provide a reason.`}
              {completionDialog.type === "missed" &&
                `Mark "${completionDialog.shiftName}" as missed. You can optionally add a reason.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-input">
                {completionDialog.type === "complete" && "Notes (optional)"}
                {completionDialog.type === "cancel" && "Reason (required)"}
                {completionDialog.type === "missed" && "Reason (optional)"}
              </Label>
              <Textarea
                id="dialog-input"
                placeholder={
                  completionDialog.type === "complete"
                    ? "Add any notes about this shift..."
                    : completionDialog.type === "cancel"
                      ? "Why is this shift being cancelled?"
                      : "Why was this shift missed?"
                }
                value={dialogInput}
                onChange={(e) => setDialogInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCompletionDialog({
                  open: false,
                  type: null,
                  shiftId: "",
                  shiftName: "",
                })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleCompletionAction}>
              {completionDialog.type === "complete" && "Complete"}
              {completionDialog.type === "cancel" && "Cancel Shift"}
              {completionDialog.type === "missed" && "Mark Missed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
