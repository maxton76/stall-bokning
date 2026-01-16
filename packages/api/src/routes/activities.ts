import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Check if user has organization membership with stable access
 */
async function hasOrgStableAccess(
  stableId: string,
  userId: string,
): Promise<boolean> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return false;

  const stable = stableDoc.data()!;
  const organizationId = stable.organizationId;

  if (!organizationId) return false;

  // Check organizationMembers collection
  const memberId = `${userId}_${organizationId}`;
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();

  if (!memberDoc.exists) return false;

  const member = memberDoc.data()!;
  if (member.status !== "active") return false;

  // Check stable access permissions
  if (member.stableAccess === "all") return true;
  if (member.stableAccess === "specific") {
    const assignedStables = member.assignedStableIds || [];
    if (assignedStables.includes(stableId)) return true;
  }

  return false;
}

/**
 * Check if user has access to a horse
 */
async function hasHorseAccess(
  horseId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  const horseDoc = await db.collection("horses").doc(horseId).get();
  if (!horseDoc.exists) return false;

  const horse = horseDoc.data()!;

  // Check ownership
  if (horse.ownerId === userId) return true;

  // Check stable membership via organization
  if (horse.currentStableId) {
    const stableDoc = await db
      .collection("stables")
      .doc(horse.currentStableId)
      .get();
    if (stableDoc.exists && stableDoc.data()?.ownerId === userId) return true;

    // Check organization membership with stable access
    if (await hasOrgStableAccess(horse.currentStableId, userId)) return true;
  }

  return false;
}

/**
 * Check if user has access to a stable
 */
async function hasStableAccess(
  stableId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  // Check stable ownership
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (stableDoc.exists && stableDoc.data()?.ownerId === userId) return true;

  // Check organization membership with stable access
  if (await hasOrgStableAccess(stableId, userId)) return true;

  return false;
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

        // Check access
        const hasAccess = await hasHorseAccess(horseId, user.uid, user.role);
        if (!hasAccess) {
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

        // Query activities
        const snapshot = await db
          .collection("activities")
          .where("type", "==", "activity")
          .where("horseId", "==", horseId)
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

        // Check access
        const hasAccess = await hasHorseAccess(horseId, user.uid, user.role);
        if (!hasAccess) {
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

        const activities = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

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
   */
  fastify.get(
    "/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const { startDate, endDate, types } = request.query as {
          startDate?: string;
          endDate?: string;
          types?: string;
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

        // Build query
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
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create activities in this stable",
          });
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
}
