import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Convert Firestore Timestamps to ISO date strings for JSON serialization
 */
function serializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

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
 * Check if user has access to a stable
 */
async function hasStableAccess(
  stableId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return false;

  const stable = stableDoc.data()!;

  // Check ownership
  if (stable.ownerId === userId) return true;

  // Check stable membership
  const memberId = `${userId}_${stableId}`;
  const memberDoc = await db.collection("stableMembers").doc(memberId).get();
  if (memberDoc.exists && memberDoc.data()?.status === "active") return true;

  return false;
}

export async function facilitiesRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/facilities
   * Create a new facility
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
        if (!data.stableId || !data.name || !data.type) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: stableId, name, type",
          });
        }

        // Check access to stable
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create facilities for this stable",
          });
        }

        // Create facility
        const facilityData = {
          stableId: data.stableId,
          name: data.name,
          type: data.type,
          description: data.description || null,
          capacity: data.capacity || null,
          bookingRules: data.bookingRules || null,
          status: data.status || "active",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: user.uid,
          lastModifiedBy: user.uid,
        };

        const docRef = await db.collection("facilities").add(facilityData);

        return { id: docRef.id, ...serializeTimestamps(facilityData) };
      } catch (error) {
        request.log.error({ error }, "Failed to create facility");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create facility",
        });
      }
    },
  );

  /**
   * GET /api/v1/facilities/:id
   * Get a facility by ID
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("facilities").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = doc.data()!;

        // Check access to stable
        const hasAccess = await hasStableAccess(
          facility.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this facility",
          });
        }

        return serializeTimestamps({ id: doc.id, ...facility });
      } catch (error) {
        request.log.error({ error }, "Failed to get facility");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get facility",
        });
      }
    },
  );

  /**
   * GET /api/v1/facilities
   * Get facilities by stable (query param: stableId)
   * Optional: filter by status (query param: status)
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId, status } = request.query as {
          stableId?: string;
          status?: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        if (!stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required query parameter: stableId",
          });
        }

        // Check access to stable
        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to access facilities for this stable",
          });
        }

        // Query facilities
        let query = db
          .collection("facilities")
          .where("stableId", "==", stableId);

        if (status) {
          query = query.where("status", "==", status);
        }

        const snapshot = await query.get();

        const facilities = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { facilities };
      } catch (error) {
        request.log.error({ error }, "Failed to get facilities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get facilities",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/facilities/:id
   * Update a facility
   */
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        // Get existing facility
        const docRef = db.collection("facilities").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = doc.data()!;

        // Check access to stable
        const hasAccess = await hasStableAccess(
          facility.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this facility",
          });
        }

        // Update facility
        const updates: any = {
          updatedAt: Timestamp.now(),
          lastModifiedBy: user.uid,
        };

        if (data.name !== undefined) updates.name = data.name;
        if (data.type !== undefined) updates.type = data.type;
        if (data.description !== undefined)
          updates.description = data.description;
        if (data.capacity !== undefined) updates.capacity = data.capacity;
        if (data.bookingRules !== undefined)
          updates.bookingRules = data.bookingRules;
        if (data.status !== undefined) updates.status = data.status;

        await docRef.update(updates);

        return { id, ...serializeTimestamps({ ...facility, ...updates }) };
      } catch (error) {
        request.log.error({ error }, "Failed to update facility");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update facility",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/facilities/:id
   * Delete a facility (hard delete)
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        // Get existing facility
        const docRef = db.collection("facilities").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Facility not found",
          });
        }

        const facility = doc.data()!;

        // Check access to stable
        const hasAccess = await hasStableAccess(
          facility.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this facility",
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete facility");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete facility",
        });
      }
    },
  );
}
