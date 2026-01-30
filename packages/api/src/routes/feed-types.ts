import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  canAccessOrganization,
  canManageOrganization,
  isSystemAdmin,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  created,
  ok,
} from "../utils/responses.js";

export async function feedTypesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/feed-types/organization/:organizationId
   * Get all feed types for an organization
   * Query params: activeOnly (boolean, default: true)
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
        const { activeOnly = "true" } = request.query as {
          activeOnly?: string;
        };

        // Check organization access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            organizationId,
          );
          if (!hasAccess) {
            return forbidden(
              reply,
              "You do not have permission to access this organization",
            );
          }
        }

        // Build query
        let query = db
          .collection("feedTypes")
          .where("organizationId", "==", organizationId);

        if (activeOnly === "true") {
          query = query.where("isActive", "==", true) as any;
        }

        query = query.orderBy("name", "asc") as any;

        const snapshot = await query.get();

        const feedTypes = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { feedTypes };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch feed types");
        return serverError(reply, error, "fetch feed types");
      }
    },
  );

  /**
   * GET /api/v1/feed-types/:id
   * Get a single feed type by ID
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

        const doc = await db.collection("feedTypes").doc(id).get();

        if (!doc.exists) {
          return notFound(reply, "Feed type", id);
        }

        const feedType = doc.data()!;

        // Check organization access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            feedType.organizationId,
          );
          if (!hasAccess) {
            return forbidden(
              reply,
              "You do not have permission to access this feed type",
            );
          }
        }

        return serializeTimestamps({ id: doc.id, ...feedType });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch feed type");
        return serverError(reply, error, "fetch feed type");
      }
    },
  );

  /**
   * POST /api/v1/feed-types
   * Create a new feed type
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

        if (!data.organizationId) {
          return badRequest(reply, "organizationId is required");
        }

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            data.organizationId,
          );
          if (!canManage) {
            return forbidden(
              reply,
              "You do not have permission to create feed types for this organization",
            );
          }
        }

        // Validate required fields
        if (
          !data.name ||
          !data.category ||
          !data.quantityMeasure ||
          data.defaultQuantity === undefined
        ) {
          return badRequest(
            reply,
            "name, category, quantityMeasure, and defaultQuantity are required",
          );
        }

        const feedTypeData = {
          organizationId: data.organizationId,
          name: data.name,
          brand: data.brand || null,
          category: data.category,
          quantityMeasure: data.quantityMeasure,
          defaultQuantity: data.defaultQuantity,
          warning: data.warning || null,
          isActive: true,
          createdBy: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await db.collection("feedTypes").add(feedTypeData);

        return created(reply, docRef.id, serializeTimestamps(feedTypeData));
      } catch (error) {
        request.log.error({ error }, "Failed to create feed type");
        return serverError(reply, error, "create feed type");
      }
    },
  );

  /**
   * PUT /api/v1/feed-types/:id
   * Update a feed type
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

        const docRef = db.collection("feedTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return notFound(reply, "Feed type", id);
        }

        const existing = doc.data()!;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            existing.organizationId,
          );
          if (!canManage) {
            return forbidden(
              reply,
              "You do not have permission to update this feed type",
            );
          }
        }

        // Prevent changing organizationId
        if (
          updates.organizationId &&
          updates.organizationId !== existing.organizationId
        ) {
          return badRequest(reply, "Cannot change organizationId");
        }

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
        };
        delete updateData.organizationId; // Ensure organizationId is not updated
        delete updateData.createdBy; // Ensure createdBy is not updated
        delete updateData.createdAt; // Ensure createdAt is not updated

        await docRef.update(updateData);

        return ok(
          reply,
          serializeTimestamps({ id, ...existing, ...updateData }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to update feed type");
        return serverError(reply, error, "update feed type");
      }
    },
  );

  /**
   * DELETE /api/v1/feed-types/:id
   * Delete a feed type
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

        const docRef = db.collection("feedTypes").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return notFound(reply, "Feed type", id);
        }

        const existing = doc.data()!;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            existing.organizationId,
          );
          if (!canManage) {
            return forbidden(
              reply,
              "You do not have permission to delete this feed type",
            );
          }
        }

        // Check if feed type is being used in horse feedings
        const usageSnapshot = await db
          .collection("horseFeedings")
          .where("feedTypeId", "==", id)
          .where("isActive", "==", true)
          .limit(1)
          .get();

        if (!usageSnapshot.empty) {
          // Soft delete - mark as inactive
          await docRef.update({
            isActive: false,
            updatedAt: Timestamp.now(),
          });
          return ok(reply, { success: true, id, softDeleted: true });
        }

        // Hard delete if not in use
        await docRef.delete();

        return ok(reply, { success: true, id });
      } catch (error) {
        request.log.error({ error }, "Failed to delete feed type");
        return serverError(reply, error, "delete feed type");
      }
    },
  );
}
