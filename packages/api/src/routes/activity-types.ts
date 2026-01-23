import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Standard activity types for seeding
 * Consolidated from @shared/constants/activity
 * Each type has a `key` field for i18n translation lookup
 */
const STANDARD_ACTIVITY_TYPES = [
  // === Care Category (sortOrder 1-6) ===
  {
    name: "Dentist",
    key: "dentist",
    color: "#22c55e",
    category: "Care",
    roles: ["dentist"],
    icon: "🦷",
    sortOrder: 1,
  },
  {
    name: "Deworm",
    key: "deworm",
    color: "#a855f7",
    category: "Care",
    roles: ["veterinarian", "stable-hand"],
    icon: "💊",
    sortOrder: 2,
  },
  {
    name: "Farrier",
    key: "farrier",
    color: "#f97316",
    category: "Care",
    roles: ["farrier"],
    icon: "🔨",
    sortOrder: 3,
  },
  {
    name: "Influenza",
    key: "influenza",
    color: "#3b82f6",
    category: "Care",
    roles: ["veterinarian"],
    icon: "💉",
    sortOrder: 4,
  },
  {
    name: "Rhino",
    key: "rhino",
    color: "#06b6d4",
    category: "Care",
    roles: ["veterinarian"],
    icon: "💉",
    sortOrder: 5,
  },
  {
    name: "Vet",
    key: "vet",
    color: "#ef4444",
    category: "Care",
    roles: ["veterinarian"],
    icon: "🏥",
    sortOrder: 6,
  },
  // === Sport Category (sortOrder 7-12) ===
  {
    name: "Client",
    key: "client",
    color: "#eab308",
    category: "Sport",
    roles: ["rider", "instructor"],
    icon: "👤",
    sortOrder: 7,
  },
  {
    name: "Lesson",
    key: "lesson",
    color: "#22c55e",
    category: "Sport",
    roles: ["instructor", "rider"],
    icon: "📚",
    sortOrder: 8,
  },
  {
    name: "Lunging",
    key: "lunging",
    color: "#8b5cf6",
    category: "Sport",
    roles: ["trainer", "rider"],
    icon: "🎯",
    sortOrder: 9,
  },
  {
    name: "Paddock",
    key: "paddock",
    color: "#84cc16",
    category: "Sport",
    roles: ["stable-hand"],
    icon: "🏞️",
    sortOrder: 10,
  },
  {
    name: "Riding",
    key: "riding",
    color: "#6366f1",
    category: "Sport",
    roles: ["rider"],
    icon: "🏇",
    sortOrder: 11,
  },
  {
    name: "Show",
    key: "show",
    color: "#ec4899",
    category: "Sport",
    roles: ["rider", "trainer"],
    icon: "🏆",
    sortOrder: 12,
  },
  // === Breeding Category (sortOrder 13-16) ===
  {
    name: "Foaling",
    key: "foaling",
    color: "#f43f5e",
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "🐴",
    sortOrder: 13,
  },
  {
    name: "Insemination",
    key: "insemination",
    color: "#d946ef",
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "🧬",
    sortOrder: 14,
  },
  {
    name: "Mare Cycle Check",
    key: "mareCycleCheck",
    color: "#14b8a6",
    category: "Breeding",
    roles: ["veterinarian", "breeder"],
    icon: "📅",
    sortOrder: 15,
  },
  {
    name: "Stallion Mount",
    key: "stallionMount",
    color: "#0ea5e9",
    category: "Breeding",
    roles: ["breeder", "handler"],
    icon: "🐎",
    sortOrder: 16,
  },
];

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
 * Check if user has access to a stable
 */
async function hasStableAccess(
  stableId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  // Check if user is stable owner
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (stableDoc.exists && stableDoc.data()?.ownerId === userId) {
    return true;
  }

  // Check organization membership with stable access
  if (await hasOrgStableAccess(stableId, userId)) {
    return true;
  }

  return false;
}

export async function activityTypesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/activity-types/stable/:stableId
   * Get all activity types for a stable
   * Query params: activeOnly (boolean, default: true)
   */
  fastify.get(
    "/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { stableId } = request.params as { stableId: string };
        const { activeOnly = "true" } = request.query as {
          activeOnly?: string;
        };

        // Check stable access
        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        // Build query
        let query = db
          .collection("activityTypes")
          .where("stableId", "==", stableId);

        if (activeOnly === "true") {
          query = query.where("isActive", "==", true) as any;
        }

        query = query.orderBy("sortOrder", "asc") as any;

        const snapshot = await query.get();

        const activityTypes = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { activityTypes };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch activity types");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch activity types",
        });
      }
    },
  );

  /**
   * GET /api/v1/activity-types/:id
   * Get a single activity type by ID
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const doc = await db.collection("activityTypes").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity type not found",
          });
        }

        const activityType = doc.data()!;

        // Check stable access
        const hasAccess = await hasStableAccess(
          activityType.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this activity type",
          });
        }

        return serializeTimestamps({ id: doc.id, ...activityType });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch activity type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch activity type",
        });
      }
    },
  );

  /**
   * POST /api/v1/activity-types
   * Create a new activity type
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
              "You do not have permission to create activity types for this stable",
          });
        }

        // Prevent creating standard types
        if (data.isStandard) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Cannot create custom activity types with isStandard=true",
          });
        }

        const activityTypeData = {
          ...data,
          createdBy: user.uid,
          lastModifiedBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await db
          .collection("activityTypes")
          .add(activityTypeData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(activityTypeData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create activity type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create activity type",
        });
      }
    },
  );

  /**
   * PUT /api/v1/activity-types/:id
   * Update an activity type
   */
  fastify.put(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const updates = request.body as any;

        const docRef = db.collection("activityTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity type not found",
          });
        }

        const existing = doc.data()!;

        // Check stable access
        const hasAccess = await hasStableAccess(
          existing.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this activity type",
          });
        }

        // For standard types, only allow specific field updates
        if (existing.isStandard) {
          const allowedFields = ["color", "icon", "isActive", "sortOrder"];
          const attemptedFields = Object.keys(updates);
          const invalidFields = attemptedFields.filter(
            (field) => !allowedFields.includes(field),
          );

          if (invalidFields.length > 0) {
            return reply.status(400).send({
              error: "Bad Request",
              message: `Cannot modify fields [${invalidFields.join(", ")}] on standard activity type. Only [${allowedFields.join(", ")}] can be modified.`,
            });
          }
        }

        const updateData = {
          ...updates,
          lastModifiedBy: user.uid,
          updatedAt: Timestamp.now(),
        };

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update activity type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update activity type",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/activity-types/:id
   * Delete an activity type (soft delete for standard types, hard delete for custom)
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const docRef = db.collection("activityTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity type not found",
          });
        }

        const existing = doc.data()!;

        // Check stable access
        const hasAccess = await hasStableAccess(
          existing.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this activity type",
          });
        }

        if (existing.isStandard) {
          // Soft delete for standard types
          await docRef.update({
            isActive: false,
            lastModifiedBy: user.uid,
            updatedAt: Timestamp.now(),
          });
        } else {
          // Hard delete for custom types
          await docRef.delete();
        }

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete activity type");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete activity type",
        });
      }
    },
  );

  /**
   * POST /api/v1/activity-types/seed/:stableId
   * Seed standard activity types for a stable
   * Creates all 16 standard types if none exist
   */
  fastify.post(
    "/seed/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { stableId } = request.params as { stableId: string };

        // Check stable access
        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to seed activity types for this stable",
          });
        }

        // Check if types already exist for this stable
        const existingSnapshot = await db
          .collection("activityTypes")
          .where("stableId", "==", stableId)
          .limit(1)
          .get();

        if (!existingSnapshot.empty) {
          return reply.status(409).send({
            error: "Conflict",
            message: "Activity types already exist for this stable",
            count: 0,
          });
        }

        // Create all standard types in a batch
        const batch = db.batch();
        const now = Timestamp.now();
        const createdIds: string[] = [];

        for (const type of STANDARD_ACTIVITY_TYPES) {
          const docRef = db.collection("activityTypes").doc();
          createdIds.push(docRef.id);

          batch.set(docRef, {
            name: type.name,
            key: type.key, // Translation key for i18n lookup
            color: type.color,
            category: type.category,
            roles: type.roles,
            icon: type.icon,
            sortOrder: type.sortOrder,
            stableId,
            isStandard: true,
            isActive: true,
            createdBy: user.uid,
            lastModifiedBy: user.uid,
            createdAt: now,
            updatedAt: now,
          });
        }

        await batch.commit();

        request.log.info(
          { stableId, count: createdIds.length },
          "Seeded standard activity types",
        );

        return reply.status(201).send({
          success: true,
          message: `Seeded ${createdIds.length} standard activity types`,
          count: createdIds.length,
          ids: createdIds,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to seed activity types");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to seed activity types",
        });
      }
    },
  );
}
