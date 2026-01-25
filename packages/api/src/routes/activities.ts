import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { hasStableAccess } from "../utils/authorization.js";

/**
 * Result of horse access check including visibility constraints
 */
interface HorseAccessResult {
  hasAccess: boolean;
  isOwner: boolean;
  historyCutoffDate?: Timestamp; // If set, only show activities after this date
}

/**
 * Check if user has access to a horse and determine history visibility
 */
async function getHorseAccessInfo(
  horseId: string,
  userId: string,
  userRole: string,
): Promise<HorseAccessResult> {
  if (userRole === "system_admin") {
    return { hasAccess: true, isOwner: true };
  }

  const horseDoc = await db.collection("horses").doc(horseId).get();
  if (!horseDoc.exists) {
    return { hasAccess: false, isOwner: false };
  }

  const horse = horseDoc.data()!;

  // Check direct ownership
  if (horse.ownerId === userId) {
    return { hasAccess: true, isOwner: true };
  }

  // Check owner organization membership
  if (horse.ownerOrganizationId) {
    const ownerMemberId = `${userId}_${horse.ownerOrganizationId}`;
    const ownerMemberDoc = await db
      .collection("organizationMembers")
      .doc(ownerMemberId)
      .get();
    if (ownerMemberDoc.exists && ownerMemberDoc.data()?.status === "active") {
      // User is member of owner's org - full access
      return { hasAccess: true, isOwner: true };
    }
  }

  // Check placement organization membership
  if (horse.placementOrganizationId) {
    const placementMemberId = `${userId}_${horse.placementOrganizationId}`;
    const placementMemberDoc = await db
      .collection("organizationMembers")
      .doc(placementMemberId)
      .get();
    if (
      placementMemberDoc.exists &&
      placementMemberDoc.data()?.status === "active"
    ) {
      // User is member of placement org - check historyVisibility
      if (horse.historyVisibility === "full") {
        return { hasAccess: true, isOwner: false };
      }
      // Default: 'from_placement' - only show activities after placement date
      return {
        hasAccess: true,
        isOwner: false,
        historyCutoffDate: horse.placementDate,
      };
    }
  }

  // Check stable membership via organization (legacy path)
  if (horse.currentStableId) {
    if (await hasStableAccess(horse.currentStableId, userId, userRole)) {
      // Stable access without org membership - check historyVisibility
      if (horse.historyVisibility === "full") {
        return { hasAccess: true, isOwner: false };
      }
      return {
        hasAccess: true,
        isOwner: false,
        historyCutoffDate: horse.placementDate || horse.assignedAt,
      };
    }
  }

  return { hasAccess: false, isOwner: false };
}

/**
 * Check if user has access to a horse (backward compatibility wrapper)
 */
async function hasHorseAccess(
  horseId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  const result = await getHorseAccessInfo(horseId, userId, userRole);
  return result.hasAccess;
}

/**
 * Check if user has access to an activity (for update/delete operations)
 */
async function hasActivityAccess(
  activityId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  const activityDoc = await db.collection("activities").doc(activityId).get();
  if (!activityDoc.exists) return false;

  const activity = activityDoc.data()!;

  // Check if activity belongs to a stable the user has access to
  if (activity.stableId) {
    return await hasStableAccess(activity.stableId, userId, userRole);
  }

  return false;
}

export async function activitiesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/activities/horse/:horseId
   * Get activities for a specific horse
   * Respects historyVisibility settings for placement org members
   */
  fastify.get(
    "/horse/:horseId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const { limit: limitParam } = request.query as { limit?: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check access and get visibility constraints
        const accessInfo = await getHorseAccessInfo(
          horseId,
          user.uid,
          user.role,
        );
        if (!accessInfo.hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        // Parse limit with default
        const limitCount = limitParam ? parseInt(limitParam, 10) : 10;
        if (isNaN(limitCount) || limitCount < 1 || limitCount > 100) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Limit must be between 1 and 100",
          });
        }

        // Build query with optional history cutoff
        let query = db
          .collection("activities")
          .where("type", "==", "activity")
          .where("horseId", "==", horseId);

        // Apply history cutoff if user is not owner
        if (accessInfo.historyCutoffDate) {
          query = query.where("date", ">=", accessInfo.historyCutoffDate);
        }

        const snapshot = await query
          .orderBy("date", "desc")
          .limit(limitCount)
          .get();

        const activities = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { activities };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse activities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch activities",
        });
      }
    },
  );

  /**
   * GET /api/v1/activities/horse/:horseId/unfinished
   * Get unfinished activities for a specific horse (past due but not completed)
   * Respects historyVisibility settings for placement org members
   */
  fastify.get(
    "/horse/:horseId/unfinished",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { horseId } = request.params as { horseId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check access and get visibility constraints
        const accessInfo = await getHorseAccessInfo(
          horseId,
          user.uid,
          user.role,
        );
        if (!accessInfo.hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse",
          });
        }

        const now = Timestamp.now();

        // Query unfinished activities
        const snapshot = await db
          .collection("activities")
          .where("type", "==", "activity")
          .where("horseId", "==", horseId)
          .where("status", "!=", "completed")
          .where("date", "<", now)
          .orderBy("status", "asc")
          .orderBy("date", "asc")
          .get();

        // Filter by history cutoff if applicable (Firestore doesn't support multiple inequality filters)
        let activities = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        // Apply history cutoff filter in memory if needed
        if (accessInfo.historyCutoffDate) {
          const cutoffMs = accessInfo.historyCutoffDate.toMillis();
          activities = activities.filter((activity: any) => {
            const activityDate =
              activity.date instanceof Date
                ? activity.date.getTime()
                : typeof activity.date === "string"
                  ? new Date(activity.date).getTime()
                  : activity.date;
            return activityDate >= cutoffMs;
          });
        }

        return { activities };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch unfinished activities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch unfinished activities",
        });
      }
    },
  );

  /**
   * GET /api/v1/activities/stable/:stableId
   * Get activities for a stable with optional date range and type filtering
   * Query params:
   *   - startDate: ISO date string for range start
   *   - endDate: ISO date string for range end
   *   - types: comma-separated list of entry types
   *   - includeOverdue: "true" to include non-completed activities before startDate
   */
  fastify.get(
    "/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const { startDate, endDate, types, includeOverdue } = request.query as {
          startDate?: string;
          endDate?: string;
          types?: string;
          includeOverdue?: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        // Check access
        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        // Build query for main date range
        let q = db.collection("activities").where("stableId", "==", stableId);

        // Date range filtering
        if (startDate) {
          q = q.where(
            "date",
            ">=",
            Timestamp.fromDate(new Date(startDate)),
          ) as any;
        }
        if (endDate) {
          q = q.where(
            "date",
            "<=",
            Timestamp.fromDate(new Date(endDate)),
          ) as any;
        }

        q = q.orderBy("date", "asc") as any;

        const snapshot = await q.get();
        let activities = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        // Fetch overdue activities if requested
        if (includeOverdue === "true" && startDate) {
          const overdueQuery = db
            .collection("activities")
            .where("stableId", "==", stableId)
            .where("status", "!=", "completed")
            .where("date", "<", Timestamp.fromDate(new Date(startDate)))
            .orderBy("status", "asc")
            .orderBy("date", "asc");

          const overdueSnapshot = await overdueQuery.get();
          const overdueActivities = overdueSnapshot.docs.map((doc) =>
            serializeTimestamps({
              id: doc.id,
              ...doc.data(),
            }),
          );

          // Merge overdue activities first, then regular activities
          activities = [...overdueActivities, ...activities];
        }

        // Filter by types if specified
        if (types) {
          const typeArray = types.split(",");
          activities = activities.filter((activity: any) =>
            typeArray.includes(activity.type),
          );
        }

        return { activities };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable activities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable activities",
        });
      }
    },
  );

  /**
   * GET /api/v1/activities/care
   * Get care-focused activities across multiple stables
   */
  fastify.get(
    "/care",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableIds } = request.query as { stableIds?: string };
        const user = (request as AuthenticatedRequest).user!;

        if (!stableIds) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableIds query parameter is required",
          });
        }

        const stableIdArray = stableIds.split(",");
        if (stableIdArray.length === 0) {
          return { activities: [] };
        }

        // Verify access to all stables
        for (const stableId of stableIdArray) {
          const hasAccess = await hasStableAccess(
            stableId,
            user.uid,
            user.role,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: `You do not have permission to access stable: ${stableId}`,
            });
          }
        }

        // Load activity type configs for Care category
        const activityTypeConfigsMap = new Map<string, any>();
        for (const stableId of stableIdArray) {
          const configQuery = db
            .collection("activityTypes")
            .where("stableId", "==", stableId)
            .where("category", "==", "Care");
          const configSnapshot = await configQuery.get();
          configSnapshot.docs.forEach((doc) => {
            activityTypeConfigsMap.set(doc.id, { id: doc.id, ...doc.data() });
          });
        }

        // Fetch activities for all stables
        const allActivities: any[] = [];
        const careTypes = [
          "dentist",
          "farrier",
          "vet",
          "deworm",
          "vaccination",
          "chiropractic",
          "massage",
        ];

        for (const stableId of stableIdArray) {
          const q = db
            .collection("activities")
            .where("stableId", "==", stableId)
            .where("type", "==", "activity")
            .orderBy("date", "asc");

          const snapshot = await q.get();
          const activities = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          allActivities.push(...activities);
        }

        // Filter by care types (support both legacy and new field)
        const careActivities = allActivities.filter((activity: any) => {
          if (
            activity.activityType &&
            careTypes.includes(activity.activityType)
          ) {
            return true;
          }
          if (
            activity.activityTypeConfigId &&
            activityTypeConfigsMap.has(activity.activityTypeConfigId)
          ) {
            return true;
          }
          return false;
        });

        // Sort by date
        careActivities.sort((a, b) => {
          const aDate = a.date?.toMillis?.() || 0;
          const bDate = b.date?.toMillis?.() || 0;
          return aDate - bDate;
        });

        return { activities: careActivities.map(serializeTimestamps) };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch care activities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch care activities",
        });
      }
    },
  );

  /**
   * GET /api/v1/activities/my/:userId
   * Get activities assigned to a specific user
   */
  fastify.get(
    "/my/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { stableId } = request.query as { stableId?: string };
        const user = (request as AuthenticatedRequest).user!;

        // Only allow users to query their own activities (unless system_admin)
        if (user.uid !== userId && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only query your own activities",
          });
        }

        // Build query
        let q = db.collection("activities").where("assignedTo", "==", userId);

        if (stableId) {
          // Verify stable access
          const hasAccess = await hasStableAccess(
            stableId,
            user.uid,
            user.role,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this stable",
            });
          }
          q = q.where("stableId", "==", stableId) as any;
        }

        q = q.orderBy("date", "asc") as any;

        const snapshot = await q.get();
        const activities = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { activities };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch user activities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch user activities",
        });
      }
    },
  );

  /**
   * POST /api/v1/activities
   * Create a new activity, task, or message
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Validate required fields
        if (
          !data.type ||
          !["activity", "task", "message"].includes(data.type)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "type must be one of: activity, task, message",
          });
        }

        if (!data.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId is required",
          });
        }

        // Check stable access
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(404).send({ error: "Resource not found" });
        }

        // If horseId is provided, verify user has access to the horse
        if (data.horseId) {
          const horseAccessCheck = await hasHorseAccess(
            data.horseId,
            user.uid,
            user.role,
          );
          if (!horseAccessCheck) {
            return reply.status(404).send({ error: "Resource not found" });
          }
        }

        // Prepare document data
        const docData: any = {
          type: data.type,
          stableId: data.stableId,
          stableName: data.stableName || "",
          status: "pending",
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        // Type-specific fields
        if (data.type === "activity") {
          if (!data.horseId || !data.date) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "horseId and date are required for activities",
            });
          }
          docData.horseId = data.horseId;
          docData.horseName = data.horseName || "";
          docData.date = Timestamp.fromDate(new Date(data.date));
          docData.activityType = data.activityType || "other";
          docData.activityTypeConfigId = data.activityTypeConfigId || null;
          docData.activityTypeColor = data.activityTypeColor || null;
          docData.note = data.note || "";
          docData.assignedTo = data.assignedTo || null;
          docData.assignedToName = data.assignedToName || null;

          // Denormalize hasSpecialInstructions from horse
          try {
            const horseDoc = await db
              .collection("horses")
              .doc(data.horseId)
              .get();
            if (horseDoc.exists) {
              const horseData = horseDoc.data();
              docData.horseHasSpecialInstructions =
                horseData?.hasSpecialInstructions || false;
            } else {
              docData.horseHasSpecialInstructions = false;
            }
          } catch {
            docData.horseHasSpecialInstructions = false;
          }
        } else if (data.type === "task") {
          if (!data.title || !data.date) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "title and date are required for tasks",
            });
          }
          docData.title = data.title;
          docData.date = Timestamp.fromDate(new Date(data.date));
          docData.description = data.description || "";
          docData.assignedTo = data.assignedTo || null;
          docData.assignedToName = data.assignedToName || null;
        } else if (data.type === "message") {
          if (!data.title || !data.message) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "title and message are required for messages",
            });
          }
          docData.title = data.title;
          docData.message = data.message;
          docData.date = Timestamp.now();
        }

        // Create document
        const docRef = await db.collection("activities").add(docData);

        return { id: docRef.id, ...serializeTimestamps(docData) };
      } catch (error) {
        request.log.error({ error }, "Failed to create activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create activity",
        });
      }
    },
  );

  /**
   * PUT /api/v1/activities/:activityId
   * Update an existing activity
   */
  fastify.put(
    "/:activityId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { activityId } = request.params as { activityId: string };
        const user = (request as AuthenticatedRequest).user!;
        const updates = request.body as any;

        // Check access
        const hasAccess = await hasActivityAccess(
          activityId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this activity",
          });
        }

        // Prepare updates
        const updateData: any = {
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        // Allow updating specific fields
        if (updates.date)
          updateData.date = Timestamp.fromDate(new Date(updates.date));
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.note !== undefined) updateData.note = updates.note;
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined)
          updateData.description = updates.description;
        if (updates.message !== undefined) updateData.message = updates.message;
        if (updates.assignedTo !== undefined)
          updateData.assignedTo = updates.assignedTo;
        if (updates.assignedToName !== undefined)
          updateData.assignedToName = updates.assignedToName;
        if (updates.activityTypeConfigId !== undefined)
          updateData.activityTypeConfigId = updates.activityTypeConfigId;
        if (updates.activityTypeColor !== undefined)
          updateData.activityTypeColor = updates.activityTypeColor;

        await db.collection("activities").doc(activityId).update(updateData);

        // Get updated document
        const doc = await db.collection("activities").doc(activityId).get();
        return serializeTimestamps({ id: doc.id, ...doc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to update activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update activity",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/activities/:activityId
   * Delete an activity
   */
  fastify.delete(
    "/:activityId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { activityId } = request.params as { activityId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check access
        const hasAccess = await hasActivityAccess(
          activityId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this activity",
          });
        }

        await db.collection("activities").doc(activityId).delete();

        return { success: true, id: activityId };
      } catch (error) {
        request.log.error({ error }, "Failed to delete activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete activity",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/activities/:activityId/complete
   * Mark an activity as completed
   */
  fastify.patch(
    "/:activityId/complete",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { activityId } = request.params as { activityId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Check access
        const hasAccess = await hasActivityAccess(
          activityId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to complete this activity",
          });
        }

        const updateData = {
          status: "completed",
          completedAt: Timestamp.now(),
          completedBy: user.uid,
          lastModifiedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        await db.collection("activities").doc(activityId).update(updateData);

        // Get updated document
        const doc = await db.collection("activities").doc(activityId).get();
        return serializeTimestamps({ id: doc.id, ...doc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to complete activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to complete activity",
        });
      }
    },
  );

  /**
   * GET /api/v1/activities/:activityId/available-staff
   * Get available staff members for an activity, taking leave requests into account
   */
  fastify.get(
    "/:activityId/available-staff",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { activityId } = request.params as { activityId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Get activity to find stable and date
        const activityDoc = await db
          .collection("activities")
          .doc(activityId)
          .get();
        if (!activityDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity not found",
          });
        }

        const activity = activityDoc.data()!;

        // Check access
        const hasAccess = await hasStableAccess(
          activity.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this activity",
          });
        }

        // Get activity date
        const activityDate = activity.date?.toDate
          ? activity.date.toDate()
          : new Date(activity.date);

        // Get stable to find organization
        const stableDoc = await db
          .collection("stables")
          .doc(activity.stableId)
          .get();
        if (!stableDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Stable not found",
          });
        }
        const stable = stableDoc.data()!;
        const organizationId = stable.organizationId;

        if (!organizationId) {
          return { availableStaff: [], unavailableStaff: [] };
        }

        // Get all active members of the organization
        const membersSnapshot = await db
          .collection("organizationMembers")
          .where("organizationId", "==", organizationId)
          .where("status", "==", "active")
          .get();

        const members = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Get user profiles for these members
        const userIds = members.map((m: any) => m.userId);
        const userProfiles = new Map<string, any>();

        if (userIds.length > 0) {
          // Fetch user profiles in batches of 10 (Firestore limit)
          for (let i = 0; i < userIds.length; i += 10) {
            const batch = userIds.slice(i, i + 10);
            const usersSnapshot = await db
              .collection("users")
              .where("__name__", "in", batch)
              .get();
            usersSnapshot.docs.forEach((doc) => {
              userProfiles.set(doc.id, { id: doc.id, ...doc.data() });
            });
          }
        }

        // Get leave requests for the activity date
        const activityDateStart = new Date(activityDate);
        activityDateStart.setHours(0, 0, 0, 0);
        const activityDateEnd = new Date(activityDate);
        activityDateEnd.setHours(23, 59, 59, 999);

        const leaveSnapshot = await db
          .collection("leaveRequests")
          .where("organizationId", "==", organizationId)
          .where("startDate", "<=", Timestamp.fromDate(activityDateEnd))
          .get();

        // Build map of users on leave
        const usersOnLeave = new Map<
          string,
          { status: string; isPartial: boolean; leaveType?: string }
        >();
        leaveSnapshot.docs.forEach((doc) => {
          const leave = doc.data();
          const leaveStart = leave.startDate?.toDate
            ? leave.startDate.toDate()
            : new Date(leave.startDate);
          const leaveEnd = leave.endDate?.toDate
            ? leave.endDate.toDate()
            : new Date(leave.endDate);

          // Check if activity date falls within leave period
          if (activityDate >= leaveStart && activityDate <= leaveEnd) {
            if (leave.status === "approved" || leave.status === "pending") {
              usersOnLeave.set(leave.userId, {
                status: leave.status,
                isPartial: leave.isPartialDay || false,
                leaveType: leave.leaveType,
              });
            }
          }
        });

        // Categorize staff
        const availableStaff: any[] = [];
        const unavailableStaff: any[] = [];

        members.forEach((member: any) => {
          const profile = userProfiles.get(member.userId);
          const leaveInfo = usersOnLeave.get(member.userId);

          const staffInfo = {
            userId: member.userId,
            displayName:
              profile?.displayName || member.displayName || "Unknown",
            email: profile?.email || member.email,
            roles: member.roles || [],
            leaveStatus: leaveInfo?.status || null,
            isPartialLeave: leaveInfo?.isPartial || false,
            leaveType: leaveInfo?.leaveType || null,
          };

          if (!leaveInfo) {
            availableStaff.push(staffInfo);
          } else if (leaveInfo.status === "approved" && !leaveInfo.isPartial) {
            unavailableStaff.push(staffInfo);
          } else if (leaveInfo.status === "pending") {
            // Pending leave - staff is technically available but with warning
            availableStaff.push({
              ...staffInfo,
              warning: "pending_leave",
            });
          } else if (leaveInfo.isPartial) {
            // Partial leave - may be available depending on time
            availableStaff.push({
              ...staffInfo,
              warning: "partial_leave",
            });
          }
        });

        return {
          activityDate: activityDate.toISOString(),
          availableStaff,
          unavailableStaff,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to get available staff");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get available staff",
        });
      }
    },
  );

  /**
   * POST /api/v1/activities/check-availability
   * Check if a user is available for a specific date/time
   */
  fastify.post(
    "/check-availability",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { userId, organizationId, date, startTime, endTime } =
          request.body as {
            userId: string;
            organizationId: string;
            date: string;
            startTime?: string;
            endTime?: string;
          };

        if (!userId || !organizationId || !date) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "userId, organizationId, and date are required",
          });
        }

        // Verify caller has access to organization
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(`${user.uid}_${organizationId}`)
          .get();

        if (!memberDoc.exists && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this organization",
          });
        }

        const checkDate = new Date(date);
        const dateStart = new Date(checkDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(checkDate);
        dateEnd.setHours(23, 59, 59, 999);

        // Check leave requests
        const leaveSnapshot = await db
          .collection("leaveRequests")
          .where("organizationId", "==", organizationId)
          .where("userId", "==", userId)
          .where("startDate", "<=", Timestamp.fromDate(dateEnd))
          .get();

        const conflicts: any[] = [];

        leaveSnapshot.docs.forEach((doc) => {
          const leave = doc.data();
          const leaveStart = leave.startDate?.toDate
            ? leave.startDate.toDate()
            : new Date(leave.startDate);
          const leaveEnd = leave.endDate?.toDate
            ? leave.endDate.toDate()
            : new Date(leave.endDate);

          // Check if date falls within leave period
          if (checkDate >= leaveStart && checkDate <= leaveEnd) {
            const conflictType =
              leave.status === "approved" ? "blocked" : "warning";

            // For partial day leave, check if times overlap
            if (leave.isPartialDay && startTime && endTime) {
              const leaveStartTime = leave.partialDayStartTime || "00:00";
              const leaveEndTime = leave.partialDayEndTime || "23:59";

              // Simple time overlap check
              const timesOverlap = !(
                endTime <= leaveStartTime || startTime >= leaveEndTime
              );

              if (timesOverlap) {
                conflicts.push({
                  type: conflictType,
                  reason:
                    leave.status === "approved"
                      ? "approved_partial_leave"
                      : "pending_partial_leave",
                  leaveType: leave.leaveType,
                  startTime: leaveStartTime,
                  endTime: leaveEndTime,
                  leaveId: doc.id,
                });
              }
            } else {
              conflicts.push({
                type: conflictType,
                reason:
                  leave.status === "approved"
                    ? "approved_leave"
                    : "pending_leave",
                leaveType: leave.leaveType,
                isPartialDay: leave.isPartialDay || false,
                leaveId: doc.id,
              });
            }
          }
        });

        // Check availability constraints
        const constraintsSnapshot = await db
          .collection("availabilityConstraints")
          .where("organizationId", "==", organizationId)
          .where("userId", "==", userId)
          .get();

        constraintsSnapshot.docs.forEach((doc) => {
          const constraint = doc.data();
          const dayOfWeek = checkDate.getDay();

          // Check recurring constraints
          if (constraint.isRecurring && constraint.dayOfWeek === dayOfWeek) {
            if (constraint.type === "never_available") {
              // Check time overlap if times provided
              if (
                startTime &&
                endTime &&
                constraint.startTime &&
                constraint.endTime
              ) {
                const timesOverlap = !(
                  endTime <= constraint.startTime ||
                  startTime >= constraint.endTime
                );
                if (timesOverlap) {
                  conflicts.push({
                    type: "blocked",
                    reason: "availability_constraint",
                    startTime: constraint.startTime,
                    endTime: constraint.endTime,
                    constraintId: doc.id,
                  });
                }
              } else if (constraint.isAllDay) {
                conflicts.push({
                  type: "blocked",
                  reason: "availability_constraint_all_day",
                  constraintId: doc.id,
                });
              }
            }
          }

          // Check specific date constraints
          if (constraint.specificDate) {
            const constraintDate = constraint.specificDate?.toDate
              ? constraint.specificDate.toDate()
              : new Date(constraint.specificDate);

            if (constraintDate.toDateString() === checkDate.toDateString()) {
              conflicts.push({
                type: "blocked",
                reason: "specific_date_constraint",
                constraintId: doc.id,
              });
            }
          }
        });

        const isAvailable =
          conflicts.filter((c) => c.type === "blocked").length === 0;
        const hasWarnings =
          conflicts.filter((c) => c.type === "warning").length > 0;

        return {
          userId,
          date,
          isAvailable,
          hasWarnings,
          conflicts,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to check availability");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to check availability",
        });
      }
    },
  );
}
