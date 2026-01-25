import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { hasStableAccess } from "../utils/authorization.js";
import type { RoutineInstance } from "@stall-bokning/shared";

// ==================== Types ====================

export interface MemberFairnessData {
  userId: string;
  displayName: string;
  email: string;
  avatar?: string;

  // Points data
  totalPoints: number;
  pointsThisPeriod: number;

  // Task counts
  tasksCompleted: number;
  tasksThisPeriod: number;

  // Estimated hours (points * 30 min estimated per point)
  estimatedHoursWorked: number;

  // Fairness metrics
  fairnessScore: number; // 0-100, 50 = average
  percentageOfTotal: number;
  deviationFromAverage: number; // Negative = under, Positive = over

  // Trend data
  trend: "up" | "down" | "stable";
  trendValue: number; // How much change
}

export interface FairnessDistribution {
  stableId: string;
  stableName?: string;
  period: "week" | "month" | "quarter" | "year";
  periodStartDate: string;
  periodEndDate: string;

  // Aggregate stats
  totalPoints: number;
  totalTasks: number;
  averagePointsPerMember: number;
  averageTasksPerMember: number;
  activeMemberCount: number;

  // Member data
  members: MemberFairnessData[];

  // Fairness metrics
  fairnessIndex: number; // 0-100, higher = more fair
  giniCoefficient: number; // 0 = perfect equality, 1 = max inequality

  // Generated timestamp
  generatedAt: string;
}

export interface MemberPointsHistory {
  userId: string;
  displayName: string;
  history: {
    date: string;
    points: number;
    cumulativePoints: number;
    tasksCompleted: number;
  }[];
  totalPoints: number;
  averagePointsPerDay: number;
}

// ==================== Helper Functions ====================

/**
 * Calculate Gini coefficient for fairness measurement
 * 0 = perfect equality, 1 = complete inequality
 */
function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;

  if (mean === 0) return 0;

  let sumOfAbsoluteDifferences = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfAbsoluteDifferences += Math.abs(sorted[i] - sorted[j]);
    }
  }

  return sumOfAbsoluteDifferences / (2 * n * n * mean);
}

/**
 * Calculate fairness score (0-100) from Gini coefficient
 * Higher = more fair
 */
function giniToFairnessScore(gini: number): number {
  return Math.round((1 - gini) * 100);
}

/**
 * Calculate member fairness score (0-100, 50 = average)
 */
function calculateMemberFairnessScore(
  memberPoints: number,
  averagePoints: number,
): number {
  if (averagePoints === 0) return 50;

  const ratio = memberPoints / averagePoints;
  // Scale: 0.5x average = 25, 1x average = 50, 1.5x average = 75
  const score = ratio * 50;

  // Clamp between 0 and 100
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculate trend based on recent vs older points
 */
function calculateTrend(
  recentPoints: number,
  olderPoints: number,
): { trend: "up" | "down" | "stable"; trendValue: number } {
  const diff = recentPoints - olderPoints;
  const threshold = Math.max(1, olderPoints * 0.1); // 10% threshold

  if (Math.abs(diff) < threshold) {
    return { trend: "stable", trendValue: 0 };
  }

  return {
    trend: diff > 0 ? "up" : "down",
    trendValue: Math.abs(diff),
  };
}

/**
 * Get date range for period
 */
function getPeriodDateRange(period: string): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (period) {
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 1); // Default to month
  }

  return { startDate, endDate };
}

/**
 * Get midpoint of period for trend calculation
 */
function getPeriodMidpoint(startDate: Date, endDate: Date): Date {
  const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
  return midpoint;
}

// ==================== Routes ====================

export async function fairnessRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/fairness/distribution/:stableId
   * Get fairness distribution data for a stable
   */
  fastify.get(
    "/distribution/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as { period?: string };

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        const period = (query.period || "month") as
          | "week"
          | "month"
          | "quarter"
          | "year";
        const { startDate, endDate } = getPeriodDateRange(period);
        const midpoint = getPeriodMidpoint(startDate, endDate);

        // Get stable info
        const stableDoc = await db.collection("stables").doc(stableId).get();
        const stableName = stableDoc.exists
          ? stableDoc.data()?.name
          : undefined;

        // Get completed routine instances for the period
        const instancesSnapshot = await db
          .collection("routineInstances")
          .where("stableId", "==", stableId)
          .where("status", "==", "completed")
          .where("completedAt", ">=", Timestamp.fromDate(startDate))
          .where("completedAt", "<=", Timestamp.fromDate(endDate))
          .get();

        // Aggregate points by user
        const memberMap = new Map<
          string,
          {
            userId: string;
            displayName: string;
            email: string;
            totalPoints: number;
            recentPoints: number; // Second half of period
            olderPoints: number; // First half of period
            tasksCompleted: number;
          }
        >();

        for (const doc of instancesSnapshot.docs) {
          const instance = doc.data() as RoutineInstance;

          if (!instance.completedBy) continue;

          const userId = instance.completedBy;
          const displayName = instance.completedByName || "Unknown";
          const points = instance.pointsAwarded || instance.pointsValue || 0;

          let completedDate: Date;
          if (instance.completedAt) {
            if (typeof (instance.completedAt as any).toDate === "function") {
              completedDate = (instance.completedAt as any).toDate();
            } else {
              completedDate = new Date(instance.completedAt as any);
            }
          } else {
            continue;
          }

          const existing = memberMap.get(userId) || {
            userId,
            displayName,
            email: "",
            totalPoints: 0,
            recentPoints: 0,
            olderPoints: 0,
            tasksCompleted: 0,
          };

          existing.totalPoints += points;
          existing.tasksCompleted += 1;

          // Split into recent vs older for trend calculation
          if (completedDate >= midpoint) {
            existing.recentPoints += points;
          } else {
            existing.olderPoints += points;
          }

          memberMap.set(userId, existing);
        }

        // Convert to array and calculate metrics
        const memberArray = Array.from(memberMap.values());
        const totalPoints = memberArray.reduce(
          (sum, m) => sum + m.totalPoints,
          0,
        );
        const totalTasks = memberArray.reduce(
          (sum, m) => sum + m.tasksCompleted,
          0,
        );
        const activeMemberCount = memberArray.length;
        const averagePoints =
          activeMemberCount > 0 ? totalPoints / activeMemberCount : 0;
        const averageTasks =
          activeMemberCount > 0 ? totalTasks / activeMemberCount : 0;

        // Calculate fairness metrics
        const pointValues = memberArray.map((m) => m.totalPoints);
        const giniCoefficient = calculateGiniCoefficient(pointValues);
        const fairnessIndex = giniToFairnessScore(giniCoefficient);

        // Build member fairness data
        const members: MemberFairnessData[] = memberArray.map((member) => {
          const { trend, trendValue } = calculateTrend(
            member.recentPoints,
            member.olderPoints,
          );
          const fairnessScore = calculateMemberFairnessScore(
            member.totalPoints,
            averagePoints,
          );
          const percentageOfTotal =
            totalPoints > 0 ? (member.totalPoints / totalPoints) * 100 : 0;
          const deviationFromAverage = member.totalPoints - averagePoints;

          // Estimate hours: assume 30 min per point on average
          const estimatedHoursWorked = (member.totalPoints * 30) / 60;

          return {
            userId: member.userId,
            displayName: member.displayName,
            email: member.email,
            totalPoints: member.totalPoints,
            pointsThisPeriod: member.totalPoints,
            tasksCompleted: member.tasksCompleted,
            tasksThisPeriod: member.tasksCompleted,
            estimatedHoursWorked: Math.round(estimatedHoursWorked * 10) / 10,
            fairnessScore,
            percentageOfTotal: Math.round(percentageOfTotal * 10) / 10,
            deviationFromAverage: Math.round(deviationFromAverage * 10) / 10,
            trend,
            trendValue,
          };
        });

        // Sort by total points descending
        members.sort((a, b) => b.totalPoints - a.totalPoints);

        const distribution: FairnessDistribution = {
          stableId,
          stableName,
          period,
          periodStartDate: startDate.toISOString().split("T")[0],
          periodEndDate: endDate.toISOString().split("T")[0],
          totalPoints,
          totalTasks,
          averagePointsPerMember: Math.round(averagePoints * 10) / 10,
          averageTasksPerMember: Math.round(averageTasks * 10) / 10,
          activeMemberCount,
          members,
          fairnessIndex,
          giniCoefficient: Math.round(giniCoefficient * 100) / 100,
          generatedAt: new Date().toISOString(),
        };

        return { distribution };
      } catch (error) {
        request.log.error({ error }, "Failed to get fairness distribution");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get fairness distribution",
        });
      }
    },
  );

  /**
   * GET /api/v1/fairness/member/:userId/history
   * Get points history for a specific member
   */
  fastify.get(
    "/member/:userId/history",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as { stableId?: string; days?: string };

        if (!query.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId query parameter is required",
          });
        }

        const hasAccess = await hasStableAccess(
          query.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        const days = parseInt(query.days || "90", 10);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Get completed routine instances for this user
        const instancesSnapshot = await db
          .collection("routineInstances")
          .where("stableId", "==", query.stableId)
          .where("completedBy", "==", userId)
          .where("status", "==", "completed")
          .where("completedAt", ">=", Timestamp.fromDate(startDate))
          .orderBy("completedAt", "asc")
          .get();

        // Group by date
        const dateMap = new Map<string, { points: number; tasks: number }>();
        let displayName = "Unknown";

        for (const doc of instancesSnapshot.docs) {
          const instance = doc.data() as RoutineInstance;

          if (instance.completedByName) {
            displayName = instance.completedByName;
          }

          let dateStr: string;
          if (instance.completedAt) {
            if (typeof (instance.completedAt as any).toDate === "function") {
              dateStr = (instance.completedAt as any)
                .toDate()
                .toISOString()
                .split("T")[0];
            } else {
              dateStr = new Date(instance.completedAt as any)
                .toISOString()
                .split("T")[0];
            }
          } else {
            continue;
          }

          const points = instance.pointsAwarded || instance.pointsValue || 0;
          const existing = dateMap.get(dateStr) || { points: 0, tasks: 0 };
          existing.points += points;
          existing.tasks += 1;
          dateMap.set(dateStr, existing);
        }

        // Build history array with cumulative points
        const history: MemberPointsHistory["history"] = [];
        let cumulativePoints = 0;

        // Sort dates
        const sortedDates = Array.from(dateMap.keys()).sort();

        for (const date of sortedDates) {
          const data = dateMap.get(date)!;
          cumulativePoints += data.points;

          history.push({
            date,
            points: data.points,
            cumulativePoints,
            tasksCompleted: data.tasks,
          });
        }

        const totalPoints = cumulativePoints;
        const averagePointsPerDay = days > 0 ? totalPoints / days : 0;

        const memberHistory: MemberPointsHistory = {
          userId,
          displayName,
          history,
          totalPoints,
          averagePointsPerDay: Math.round(averagePointsPerDay * 100) / 100,
        };

        return { memberHistory };
      } catch (error) {
        request.log.error({ error }, "Failed to get member points history");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get member points history",
        });
      }
    },
  );

  /**
   * GET /api/v1/fairness/suggestions/:stableId
   * Get assignment suggestions based on fairness algorithm
   */
  fastify.get(
    "/suggestions/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as { limit?: string };

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        // Get historical points for all members (last 90 days)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);

        const instancesSnapshot = await db
          .collection("routineInstances")
          .where("stableId", "==", stableId)
          .where("status", "==", "completed")
          .where("completedAt", ">=", Timestamp.fromDate(startDate))
          .get();

        // Aggregate points by user
        const memberPoints = new Map<
          string,
          { points: number; name: string }
        >();

        for (const doc of instancesSnapshot.docs) {
          const instance = doc.data() as RoutineInstance;
          if (!instance.completedBy) continue;

          const existing = memberPoints.get(instance.completedBy) || {
            points: 0,
            name: instance.completedByName || "Unknown",
          };
          existing.points +=
            instance.pointsAwarded || instance.pointsValue || 0;
          memberPoints.set(instance.completedBy, existing);
        }

        // Get stable members for those not in history
        const stableDoc = await db.collection("stables").doc(stableId).get();
        const memberIds: string[] =
          stableDoc.exists && stableDoc.data()?.memberIds
            ? stableDoc.data()!.memberIds
            : [];

        // Add members with zero points if not in history
        for (const memberId of memberIds) {
          if (!memberPoints.has(memberId)) {
            // Try to get user info
            const userDoc = await db.collection("users").doc(memberId).get();
            const userName = userDoc.exists
              ? userDoc.data()?.displayName ||
                userDoc.data()?.email ||
                "Unknown"
              : "Unknown";

            memberPoints.set(memberId, { points: 0, name: userName });
          }
        }

        // Sort by points ascending (lowest first = most fair to assign)
        const suggestions = Array.from(memberPoints.entries())
          .map(([userId, data]) => ({
            userId,
            displayName: data.name,
            historicalPoints: data.points,
            priority:
              data.points === 0
                ? 1
                : Math.min(10, Math.ceil(10 / (data.points / 10 + 1))),
          }))
          .sort((a, b) => a.historicalPoints - b.historicalPoints);

        const limit = parseInt(query.limit || "5", 10);

        return {
          suggestions: suggestions.slice(0, limit),
          totalMembers: suggestions.length,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to get assignment suggestions");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get assignment suggestions",
        });
      }
    },
  );
}
