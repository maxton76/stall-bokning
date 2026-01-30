import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  hasStableAccess,
  getUserAccessibleStableIds,
  isOrganizationAdmin,
} from "../utils/authorization.js";
import type {
  RoutineInstance,
  FairnessStatusFilter,
  FairnessScope,
  StableFairnessSummary,
  TemplatePointsBreakdown,
  RoutineType,
} from "@stall-bokning/shared";

/**
 * Infer template type from template name using Swedish naming patterns
 */
function inferTemplateType(templateName: string): RoutineType {
  const name = templateName.toLowerCase();
  if (name.includes("morgon") || name.includes("morning")) {
    return "morning";
  }
  if (
    name.includes("middag") ||
    name.includes("lunch") ||
    name.includes("midday")
  ) {
    return "midday";
  }
  if (
    name.includes("kväll") ||
    name.includes("evening") ||
    name.includes("natt")
  ) {
    return "evening";
  }
  return "custom";
}

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

  // Organization scope: which stables the member belongs to
  stables?: Array<{ stableId: string; stableName: string }>;
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

  // Enhanced features
  scope?: FairnessScope;
  stables?: StableFairnessSummary[];
  templateBreakdown?: TemplatePointsBreakdown[];
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
 * @param period - Time period to analyze
 * @param includesFuture - If true, extends endDate to include future scheduled instances
 */
function getPeriodDateRange(
  period: string,
  includesFuture: boolean = false,
): {
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
      if (includesFuture) {
        endDate.setDate(endDate.getDate() + 7); // Include next week
      }
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      if (includesFuture) {
        endDate.setMonth(endDate.getMonth() + 1); // Include next month
      }
      break;
    case "quarter":
      startDate.setMonth(startDate.getMonth() - 3);
      if (includesFuture) {
        endDate.setMonth(endDate.getMonth() + 3); // Include next quarter
      }
      break;
    case "year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      if (includesFuture) {
        endDate.setFullYear(endDate.getFullYear() + 1); // Include next year
      }
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 1); // Default to month
      if (includesFuture) {
        endDate.setMonth(endDate.getMonth() + 1);
      }
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
  // Module gate: analytics module required
  fastify.addHook("preHandler", checkModuleAccess("analytics"));

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
        const query = request.query as {
          period?: string;
          statusFilter?: FairnessStatusFilter;
          scope?: FairnessScope;
          groupByTemplate?: string;
        };

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
        // Default to "completed" for backwards compatibility
        const statusFilter: FairnessStatusFilter =
          query.statusFilter || "completed";
        const scope: FairnessScope = query.scope || "stable";
        const groupByTemplate = query.groupByTemplate === "true";
        // Include future dates when filtering for planned/all instances
        const includesFuture =
          statusFilter === "planned" || statusFilter === "all";
        const { startDate, endDate } = getPeriodDateRange(
          period,
          includesFuture,
        );
        const midpoint = getPeriodMidpoint(startDate, endDate);

        // Get stable info
        const stableDoc = await db.collection("stables").doc(stableId).get();
        const stableName = stableDoc.exists
          ? stableDoc.data()?.name
          : undefined;
        const organizationId = stableDoc.exists
          ? stableDoc.data()?.organizationId
          : undefined;

        // For organization scope, get all stables in the organization
        let stableIds: string[] = [stableId];
        const stableSummaries: StableFairnessSummary[] = [];

        // Track if user is admin (for email visibility)
        let isOrgAdmin = false;
        // Check if user is stable owner
        const isStableOwner =
          stableDoc.exists && stableDoc.data()?.ownerId === user.uid;

        if (scope === "organization" && organizationId) {
          // SECURITY: Validate user has organization-level access or access to multiple stables
          const userAccessibleStables = await getUserAccessibleStableIds(
            user.uid,
          );
          isOrgAdmin = await isOrganizationAdmin(user.uid, organizationId);

          const orgStablesSnapshot = await db
            .collection("stables")
            .where("organizationId", "==", organizationId)
            .get();

          const allOrgStableIds = orgStablesSnapshot.docs.map((doc) => doc.id);

          // SECURITY: Filter to only stables user has access to
          stableIds = allOrgStableIds.filter((sid) =>
            userAccessibleStables.includes(sid),
          );

          // If user only has access to 1 or 0 stables in this org, revert to stable scope
          if (stableIds.length <= 1) {
            stableIds = [stableId];
            // Don't return organization-level data if user doesn't have multi-stable access
          } else {
            // Build stable summaries only for accessible stables
            for (const doc of orgStablesSnapshot.docs) {
              if (stableIds.includes(doc.id)) {
                stableSummaries.push({
                  stableId: doc.id,
                  stableName: doc.data().name || "Unknown",
                  totalPoints: 0,
                  memberCount: 0,
                });
              }
            }
          }
        }

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
            stables: Map<string, string>; // stableId -> stableName
          }
        >();

        // Template breakdown map
        const templateMap = new Map<
          string,
          {
            templateId: string;
            templateName: string;
            templateType: "morning" | "midday" | "evening" | "custom";
            templateColor?: string;
            totalPoints: number;
            instanceCount: number;
          }
        >();

        // Track points per stable for summaries
        const stablePointsMap = new Map<
          string,
          { points: number; members: Set<string> }
        >();

        // Helper function to process routine instances
        const processInstance = (
          instance: RoutineInstance,
          referenceDate: Date,
          instanceStableId: string,
          instanceStableName: string,
        ) => {
          const userId =
            instance.status === "completed"
              ? instance.completedBy
              : instance.assignedTo;
          if (!userId) return;

          const displayName =
            instance.status === "completed"
              ? instance.completedByName || "Unknown"
              : instance.assignedToName || "Unknown";
          const points = instance.pointsAwarded || instance.pointsValue || 0;

          const existing = memberMap.get(userId) || {
            userId,
            displayName,
            email: "",
            totalPoints: 0,
            recentPoints: 0,
            olderPoints: 0,
            tasksCompleted: 0,
            stables: new Map(),
          };

          existing.totalPoints += points;
          existing.tasksCompleted += 1;
          existing.stables.set(instanceStableId, instanceStableName);

          // Split into recent vs older for trend calculation
          if (referenceDate >= midpoint) {
            existing.recentPoints += points;
          } else {
            existing.olderPoints += points;
          }

          memberMap.set(userId, existing);

          // Track stable points for organization scope
          const stableStats = stablePointsMap.get(instanceStableId) || {
            points: 0,
            members: new Set<string>(),
          };
          stableStats.points += points;
          stableStats.members.add(userId);
          stablePointsMap.set(instanceStableId, stableStats);

          // Track template breakdown if requested
          if (groupByTemplate && instance.templateId) {
            const templateKey = instance.templateId;
            const existingTemplate = templateMap.get(templateKey) || {
              templateId: instance.templateId,
              templateName: instance.templateName || "Unknown",
              // Type will be determined from template name pattern or default to custom
              templateType: inferTemplateType(instance.templateName) as
                | "morning"
                | "midday"
                | "evening"
                | "custom",
              templateColor: undefined, // Color would need to come from template lookup
              totalPoints: 0,
              instanceCount: 0,
            };
            existingTemplate.totalPoints += points;
            existingTemplate.instanceCount += 1;
            templateMap.set(templateKey, existingTemplate);
          }
        };

        // Get stable name lookup for organization scope
        const stableNameMap = new Map<string, string>();
        if (scope === "organization") {
          for (const summary of stableSummaries) {
            stableNameMap.set(summary.stableId, summary.stableName);
          }
        } else {
          stableNameMap.set(stableId, stableName || "Unknown");
        }

        // Query instances for each stable (Firestore limits "in" to 10 items)
        // Process stables in batches if needed
        const queryStables = async (stableIdList: string[]) => {
          // Query completed routine instances if needed
          if (statusFilter === "completed" || statusFilter === "all") {
            for (const queryStableId of stableIdList) {
              const completedSnapshot = await db
                .collection("routineInstances")
                .where("stableId", "==", queryStableId)
                .where("status", "==", "completed")
                .where("completedAt", ">=", Timestamp.fromDate(startDate))
                .where("completedAt", "<=", Timestamp.fromDate(endDate))
                .get();

              const queryStableName =
                stableNameMap.get(queryStableId) || "Unknown";

              for (const doc of completedSnapshot.docs) {
                const instance = doc.data() as RoutineInstance;
                if (!instance.completedBy || !instance.completedAt) continue;

                let completedDate: Date;
                if (
                  typeof (instance.completedAt as any).toDate === "function"
                ) {
                  completedDate = (instance.completedAt as any).toDate();
                } else {
                  completedDate = new Date(instance.completedAt as any);
                }

                processInstance(
                  instance,
                  completedDate,
                  queryStableId,
                  queryStableName,
                );
              }
            }
          }

          // Query planned (scheduled/in_progress) routine instances if needed
          // Only count routines with a specific user assigned
          if (statusFilter === "planned" || statusFilter === "all") {
            for (const queryStableId of stableIdList) {
              const plannedSnapshot = await db
                .collection("routineInstances")
                .where("stableId", "==", queryStableId)
                .where("status", "in", ["scheduled", "started", "in_progress"])
                .where("scheduledDate", ">=", Timestamp.fromDate(startDate))
                .where("scheduledDate", "<=", Timestamp.fromDate(endDate))
                .get();

              const queryStableName =
                stableNameMap.get(queryStableId) || "Unknown";

              for (const doc of plannedSnapshot.docs) {
                const instance = doc.data() as RoutineInstance;
                // Only include planned routines with a specific user assigned
                if (!instance.assignedTo) continue;

                let scheduledDateValue: Date;
                if (instance.scheduledDate) {
                  if (
                    typeof (instance.scheduledDate as any).toDate === "function"
                  ) {
                    scheduledDateValue = (
                      instance.scheduledDate as any
                    ).toDate();
                  } else {
                    scheduledDateValue = new Date(
                      instance.scheduledDate as any,
                    );
                  }
                } else {
                  continue;
                }

                processInstance(
                  instance,
                  scheduledDateValue,
                  queryStableId,
                  queryStableName,
                );
              }
            }
          }
        };

        // Execute queries for all stables
        await queryStables(stableIds);

        // Resolve "Unknown" display names by looking up user documents
        const unknownMembers = Array.from(memberMap.entries()).filter(
          ([, member]) => member.displayName === "Unknown",
        );

        if (unknownMembers.length > 0) {
          // Batch lookup user documents for unknown members
          const userLookups = unknownMembers.map(async ([userId, member]) => {
            try {
              const userDoc = await db.collection("users").doc(userId).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                member.displayName =
                  userData?.displayName || userData?.email || "Unknown";
                member.email = userData?.email || "";
                memberMap.set(userId, member);
              }
            } catch (err) {
              // Log but don't fail - keep "Unknown" as fallback
              request.log.warn(
                { userId, error: err },
                "Failed to lookup user for fairness display name",
              );
            }
          });

          await Promise.all(userLookups);
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

          // Convert stables Map to array for organization scope
          const memberStables =
            scope === "organization"
              ? Array.from(member.stables.entries()).map(([sid, sname]) => ({
                  stableId: sid,
                  stableName: sname,
                }))
              : undefined;

          // SECURITY: Only expose email to admins, stable owners, or the member themselves
          const canSeeEmail =
            isOrgAdmin ||
            isStableOwner ||
            user.role === "system_admin" ||
            member.userId === user.uid;

          return {
            userId: member.userId,
            displayName: member.displayName,
            email: canSeeEmail ? member.email : "",
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
            stables: memberStables,
          };
        });

        // Sort by total points descending
        members.sort((a, b) => b.totalPoints - a.totalPoints);

        // Update stable summaries with actual points/members for organization scope
        let finalStableSummaries: StableFairnessSummary[] | undefined;
        if (scope === "organization") {
          finalStableSummaries = stableSummaries.map((summary) => {
            const stats = stablePointsMap.get(summary.stableId);
            return {
              ...summary,
              totalPoints: stats?.points || 0,
              memberCount: stats?.members.size || 0,
            };
          });
        }

        // Build template breakdown if requested
        let templateBreakdown: TemplatePointsBreakdown[] | undefined;
        if (groupByTemplate) {
          templateBreakdown = Array.from(templateMap.values()).sort(
            (a, b) => b.totalPoints - a.totalPoints,
          );
        }

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
          // Enhanced features
          scope,
          stables: finalStableSummaries,
          templateBreakdown,
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
