import { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  ClockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  UsersIcon,
  Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSchedules, useShiftActions } from "@/hooks/useSchedules";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStables } from "@/hooks/useUserStables";
import { queryKeys } from "@/lib/queryClient";
import type { Shift } from "@/types/schedule";
import { getAllSchedulesForUser } from "@/services/scheduleService";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SchedulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [filter, setFilter] = useState<"all" | "unassigned" | "assigned">(
    "all",
  );
  const [selectedStable, setSelectedStable] = useState<string>("all"); // Auto-selected by useEffect if only 1 stable
  const { assign, unassign } = useShiftActions();
  const { stables, loading: stablesLoading } = useUserStables(user?.uid);

  // Get stable IDs
  const stableIds = stables.map((stable) => stable.id);

  // Fetch all shifts for user's stables
  const { data: shifts = [], isLoading: loading } = useQuery({
    queryKey: ["shifts", "all", { stableIds }],
    queryFn: async () => {
      if (!user || stableIds.length === 0) {
        return [];
      }

      console.log(
        "Loading shifts for user:",
        user.uid,
        "stableIds:",
        stableIds,
      );

      // Get all published schedules for those stables
      const schedulesQuery = query(
        collection(db, "schedules"),
        where("stableId", "in", stableIds),
        where("status", "==", "published"),
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const publishedScheduleIds = schedulesSnapshot.docs.map((doc) => doc.id);

      if (publishedScheduleIds.length === 0) {
        return [];
      }

      // Get all shifts for published schedules
      const shiftsQuery = query(
        collection(db, "shifts"),
        where("scheduleId", "in", publishedScheduleIds),
        orderBy("date", "asc"),
      );

      const shiftsSnapshot = await getDocs(shiftsQuery);
      const shiftsData = shiftsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Shift,
      );

      console.log("Loaded shifts:", shiftsData.length);
      return shiftsData;
    },
    enabled: !!user && !stablesLoading && stableIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Auto-select stable when user has exactly one
  useEffect(() => {
    if (stables.length === 1 && selectedStable === "all") {
      setSelectedStable(stables[0].id);
    } else if (stables.length === 0) {
      setSelectedStable("all");
    }
  }, [stables, selectedStable]);

  // Reset to 'all' if selected stable no longer exists
  useEffect(() => {
    if (
      selectedStable !== "all" &&
      !stables.some((s) => s.id === selectedStable)
    ) {
      setSelectedStable("all");
    }
  }, [stables, selectedStable]);

  const getShiftCoverageForDate = (date: Date) => {
    const dateStr = date.toDateString();
    const shiftsOnDate = shifts.filter(
      (s) => s.date.toDate().toDateString() === dateStr,
    );

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

  // Filter shifts by selected stable
  const stableFilteredShifts = useMemo(() => {
    if (selectedStable === "all") return shifts;
    return shifts.filter((shift) => shift.stableId === selectedStable);
  }, [shifts, selectedStable]);

  const stats = useMemo(() => {
    const totalShifts = stableFilteredShifts.length;
    const unassigned = stableFilteredShifts.filter(
      (s) => s.status === "unassigned",
    ).length;
    const assigned = stableFilteredShifts.filter(
      (s) => s.status === "assigned",
    ).length;
    const coverage =
      totalShifts > 0 ? Math.round((assigned / totalShifts) * 100) : 0;

    return { totalShifts, unassigned, assigned, coverage };
  }, [stableFilteredShifts]);

  const filteredShifts = useMemo(() => {
    return stableFilteredShifts.filter((shift) => {
      if (filter === "all") return true;
      return shift.status === filter;
    });
  }, [stableFilteredShifts, filter]);

  const upcomingUnassigned = useMemo(() => {
    const now = new Date();
    return stableFilteredShifts
      .filter((s) => s.status === "unassigned" && s.date.toDate() >= now)
      .sort((a, b) => a.date.toMillis() - b.date.toMillis())
      .slice(0, 5);
  }, [stableFilteredShifts]);

  const handleAssignShift = async (shift: Shift) => {
    if (!user) return;

    try {
      await assign(
        shift.id,
        user.uid,
        user.email || "Unknown",
        user.email || "",
      );
      // Invalidate shifts query to refetch
      queryClient.invalidateQueries({
        queryKey: ["shifts", "all", { stableIds }],
      });
    } catch (error) {
      console.error("Error assigning shift:", error);
    }
  };

  const handleUnassignShift = async (shiftId: string) => {
    try {
      await unassign(shiftId);
      // Invalidate shifts query to refetch
      queryClient.invalidateQueries({
        queryKey: ["shifts", "all", { stableIds }],
      });
    } catch (error) {
      console.error("Error unassigning shift:", error);
    }
  };

  if (loading || stablesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Schedule Overview
          </h1>
          <div className="text-muted-foreground mt-1">
            Manage and view all shifts
            {selectedStable !== "all" && stables.length > 0 && (
              <>
                {" "}
                for{" "}
                <Badge variant="secondary" className="font-normal">
                  {stables.find((s) => s.id === selectedStable)?.name ||
                    "Unknown Stable"}
                </Badge>
              </>
            )}
            {selectedStable === "all" && stables.length > 1 && (
              <>
                {" "}
                across{" "}
                <Badge variant="secondary" className="font-normal">
                  all {stables.length} stables
                </Badge>
              </>
            )}
          </div>
        </div>
        {/* Stable Selector - Always visible */}
        <div className="w-64">
          <Select value={selectedStable} onValueChange={setSelectedStable}>
            <SelectTrigger>
              <SelectValue placeholder="Select stable" />
            </SelectTrigger>
            <SelectContent>
              {stables.length > 1 && (
                <SelectItem value="all">All Stables</SelectItem>
              )}
              {stables.map((stable) => (
                <SelectItem key={stable.id} value={stable.id}>
                  {stable.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              components={{
                DayContent: ({ date }) => {
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
                              coverage.status === "partial" && "bg-yellow-600",
                              coverage.status === "empty" && "bg-red-600",
                            )}
                          />
                          <div
                            className={cn(
                              "h-1 w-1 rounded-full",
                              coverage.status === "full" && "bg-green-600",
                              coverage.status === "partial" && "bg-yellow-600",
                              coverage.status === "empty" && "bg-red-600",
                            )}
                          />
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Urgent Shifts Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircleIcon className="h-5 w-5 text-destructive" />
              Urgent Shifts
            </CardTitle>
            <CardDescription>Upcoming unassigned shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingUnassigned.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm">All upcoming shifts are assigned!</p>
                </div>
              ) : (
                upcomingUnassigned.map((shift) => (
                  <div
                    key={shift.id}
                    className="border rounded-lg p-3 space-y-2 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {shift.shiftTypeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {shift.stableName}
                        </p>
                      </div>
                      <Badge variant="destructive">Unassigned</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {shift.date
                          .toDate()
                          .toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {shift.time}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                      onClick={() => handleAssignShift(shift)}
                    >
                      Assign to Me
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Shifts</CardTitle>
              <CardDescription>
                View and manage all scheduled shifts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "unassigned" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unassigned")}
              >
                Unassigned
              </Button>
              <Button
                variant={filter === "assigned" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("assigned")}
              >
                Assigned
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredShifts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shifts found</p>
              <p className="text-sm mt-2">
                {stables.length === 0
                  ? "Join a stable to see schedules"
                  : selectedStable !== "all"
                    ? "No schedules published for this stable yet"
                    : "No schedules published yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{shift.shiftTypeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {shift.stableName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {shift.date
                          .toDate()
                          .toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {shift.time}
                      </span>
                    </div>
                    <div className="w-32">
                      {shift.status === "assigned" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          {shift.assignedToEmail === user?.email
                            ? "You"
                            : shift.assignedToName}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Unassigned</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (shift.status === "assigned") {
                          handleUnassignShift(shift.id);
                        } else {
                          handleAssignShift(shift);
                        }
                      }}
                    >
                      {shift.status === "assigned"
                        ? "Unassign"
                        : "Assign to Me"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
