import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Convert Firestore Timestamps to ISO date strings
 */
function serializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Timestamp || (obj && typeof obj.toDate === "function")) {
    return obj.toDate().toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeTimestamps(item));
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeTimestamps(obj[key]);
      }
    }
    return serialized;
  }
  return obj;
}

/**
 * Check if user has access to an organization
 */
async function hasOrganizationAccess(
  organizationId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  // Check if user is organization owner
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  if (orgDoc.exists && orgDoc.data()?.ownerId === userId) {
    return true;
  }

  // Check if user is organization member
  const memberId = `${userId}_${organizationId}`;
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();
  if (memberDoc.exists && memberDoc.data()?.status === "active") {
    return true;
  }

  return false;
}

/**
 * Check if user has admin access to an organization (owner or administrator role)
 */
async function hasOrganizationAdminAccess(
  organizationId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  // Check if user is organization owner
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  if (orgDoc.exists && orgDoc.data()?.ownerId === userId) {
    return true;
  }

  // Check if user is organization administrator
  const memberId = `${userId}_${organizationId}`;
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();
  if (memberDoc.exists) {
    const memberData = memberDoc.data();
    if (
      memberData?.status === "active" &&
      (memberData?.roles?.includes("administrator") ||
        memberData?.primaryRole === "administrator")
    ) {
      return true;
    }
  }

  return false;
}

export async function horseGroupsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/horse-groups/organization/:organizationId
   * Get all horse groups for an organization
   */
  fastify.get(
    "/organization/:organizationId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as { organizationId: string };

        // Check organization access
        const hasAccess = await hasOrganizationAccess(
          organizationId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this organization",
          });
        }

        const snapshot = await db
          .collection("horseGroups")
          .where("organizationId", "==", organizationId)
          .orderBy("createdAt", "desc")
          .get();

        const horseGroups = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { horseGroups };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse groups");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse groups",
        });
      }
    },
  );

  /**
   * GET /api/v1/horse-groups/:id
   * Get a single horse group by ID
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

        const doc = await db.collection("horseGroups").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse group not found",
          });
        }

        const horseGroup = doc.data()!;

        // Check organization access
        const hasAccess = await hasOrganizationAccess(
          horseGroup.organizationId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this horse group",
          });
        }

        return serializeTimestamps({ id: doc.id, ...horseGroup });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse group",
        });
      }
    },
  );

  /**
   * POST /api/v1/horse-groups
   * Create a new horse group
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as {
          organizationId: string;
          name: string;
          description?: string;
          color?: string;
        };

        if (!data.organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "organizationId is required",
          });
        }

        if (!data.name) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "name is required",
          });
        }

        // Check organization admin access (only admins can create groups)
        const hasAccess = await hasOrganizationAdminAccess(
          data.organizationId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create horse groups for this organization",
          });
        }

        const horseGroupData = {
          organizationId: data.organizationId,
          name: data.name,
          description: data.description || null,
          color: data.color || null,
          createdBy: user.uid,
          lastModifiedBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await db.collection("horseGroups").add(horseGroupData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(horseGroupData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create horse group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create horse group",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/horse-groups/:id
   * Update a horse group
   */
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const updates = request.body as Partial<{
          name: string;
          description: string;
          color: string;
        }>;

        const docRef = db.collection("horseGroups").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse group not found",
          });
        }

        const existing = doc.data()!;

        // Check organization admin access
        const hasAccess = await hasOrganizationAdminAccess(
          existing.organizationId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this horse group",
          });
        }

        const updateData = {
          ...updates,
          lastModifiedBy: user.uid,
          updatedAt: Timestamp.now(),
        };

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update horse group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update horse group",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/horse-groups/:id
   * Delete a horse group
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

        const docRef = db.collection("horseGroups").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse group not found",
          });
        }

        const existing = doc.data()!;

        // Check organization admin access
        const hasAccess = await hasOrganizationAdminAccess(
          existing.organizationId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this horse group",
          });
        }

        // Check if any horses are using this group
        const horsesUsingGroup = await db
          .collection("horses")
          .where("horseGroupId", "==", id)
          .limit(1)
          .get();

        if (!horsesUsingGroup.empty) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Cannot delete horse group that is assigned to horses. Please reassign horses first.",
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete horse group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete horse group",
        });
      }
    },
  );
}
