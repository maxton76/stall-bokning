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
  CalendarIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  UsersIcon,
  Loader2Icon,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useShiftActions } from "@/hooks/useSchedules";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";
import type { Shift } from "@/types/schedule";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StableSchedulePage() {
  const { stableId } = useParams<{ stableId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [filter, setFilter] = useState<"all" | "unassigned" | "assigned">(
    "all",
  );
  const { assign, unassign } = useShiftActions();

  // Fetch stable info
  const { data: stableName = "" } = useQuery({
    queryKey: queryKeys.stables.detail(stableId || ""),
    queryFn: async () => {
      if (!stableId) return "";
      const stableDoc = await getDoc(doc(db, "stables", stableId));
      if (stableDoc.exists()) {
        return stableDoc.data().name || "Unnamed Stable";
      }
      return "";
    },
    enabled: !!stableId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch shifts for this stable
  const { data: shifts = [], isLoading: loading } = useQuery({
    queryKey: ["shifts", "stable", stableId],
    queryFn: async () => {
      if (!user || !stableId) return [];

      // Get all published schedules for this stable
      const schedulesQuery = query(
        collection(db, "schedules"),
        where("stableId", "==", stableId),
        where("status", "==", "published"),
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const publishedScheduleIds = schedulesSnapshot.docs.map((doc) => doc.id);

      if (publishedScheduleIds.length === 0) return [];

      // Get all shifts for published schedules
      const shiftsQuery = query(
        collection(db, "shifts"),
        where("scheduleId", "in", publishedScheduleIds),
        orderBy("date", "asc"),
      );

      const shiftsSnapshot = await getDocs(shiftsQuery);
      return shiftsSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Shift,
      );
    },
    enabled: !!user && !!stableId,
    staleTime: 2 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

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

  const stats = useMemo(() => {
    const totalShifts = shifts.length;
    const unassigned = shifts.filter((s) => s.status === "unassigned").length;
    const assigned = shifts.filter((s) => s.status === "assigned").length;
    const coverage =
      totalShifts > 0 ? Math.round((assigned / totalShifts) * 100) : 0;

    return { totalShifts, unassigned, assigned, coverage };
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
      .filter((s) => s.status === "unassigned" && s.date.toDate() >= now)
      .sort((a, b) => a.date.toMillis() - b.date.toMillis())
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
                        </div>
                      )}
                    </div>
                  );
                },
              }}
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
                        {shift.date.toDate().toLocaleDateString()}
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
                          {shift.date.toDate().toLocaleDateString()} •{" "}
                          {shift.time}
                        </p>
                      </div>
                      <Badge variant="outline">{shift.points} pts</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {shift.status === "assigned" ? (
                      <>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {shift.assignedToName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {shift.assignedToEmail}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Assigned
                        </Badge>
                        {shift.assignedTo === user?.uid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnassignShift(shift.id)}
                          >
                            Unassign
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Badge variant="destructive">Unassigned</Badge>
                        <Button
                          size="sm"
                          onClick={() => handleAssignShift(shift)}
                        >
                          Take Shift
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
