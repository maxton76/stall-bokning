import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  canAccessOrganization,
  canManageOrganization,
  isSystemAdmin,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";

export async function chargeableItemsRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing addon required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  /**
   * GET /:organizationId/chargeable-items
   * List chargeable items for an organization
   * Query params: category, isActive, limit
   */
  fastify.get(
    "/:organizationId/chargeable-items",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const {
          category,
          isActive = "true",
          limit = "100",
        } = request.query as {
          category?: string;
          isActive?: string;
          limit?: string;
        };

        // Check organization access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        // Build query
        let query = db
          .collection("chargeableItems")
          .where("organizationId", "==", organizationId);

        // Filter by active status (default: true)
        const activeFilter = isActive !== "false";
        query = query.where("isActive", "==", activeFilter) as any;

        if (category) {
          query = query.where("category", "==", category) as any;
        }

        query = query.orderBy("name", "asc").limit(parseInt(limit)) as any;

        const snapshot = await query.get();

        const items = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { items };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch chargeable items");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch chargeable items",
        });
      }
    },
  );

  /**
   * GET /:organizationId/chargeable-items/:id
   * Get a single chargeable item by ID
   */
  fastify.get(
    "/:organizationId/chargeable-items/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, id } = request.params as {
          organizationId: string;
          id: string;
        };

        // Check organization access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        const doc = await db.collection("chargeableItems").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Chargeable item not found",
          });
        }

        const item = doc.data()!;

        // Verify item belongs to the organization
        if (item.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Chargeable item not found",
          });
        }

        return serializeTimestamps({ id: doc.id, ...item });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch chargeable item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch chargeable item",
        });
      }
    },
  );

  /**
   * POST /:organizationId/chargeable-items
   * Create a new chargeable item
   */
  fastify.post(
    "/:organizationId/chargeable-items",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const data = request.body as any;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage chargeable items for this organization",
            });
          }
        }

        // Validate required fields
        const requiredFields = [
          "name",
          "unitType",
          "defaultUnitPrice",
          "vatRate",
          "vatCategory",
          "category",
        ];
        const missingFields = requiredFields.filter(
          (field) => data[field] === undefined || data[field] === null,
        );

        if (missingFields.length > 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Missing required fields: ${missingFields.join(", ")}`,
          });
        }

        const itemData = {
          organizationId,
          name: data.name,
          description: data.description || null,
          unitType: data.unitType,
          defaultUnitPrice: data.defaultUnitPrice,
          vatRate: data.vatRate,
          vatCategory: data.vatCategory,
          category: data.category,
          isActive: true,

          // Optional fields
          articleNumber: data.articleNumber || null,
          unit: data.unit || null,
          currency: data.currency || "SEK",
          accountingCode: data.accountingCode || null,
          tags: data.tags || [],

          // Metadata
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        const docRef = await db.collection("chargeableItems").add(itemData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(itemData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create chargeable item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create chargeable item",
        });
      }
    },
  );

  /**
   * PATCH /:organizationId/chargeable-items/:id
   * Update a chargeable item (partial update)
   */
  fastify.patch(
    "/:organizationId/chargeable-items/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, id } = request.params as {
          organizationId: string;
          id: string;
        };
        const updates = request.body as any;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage chargeable items for this organization",
            });
          }
        }

        const docRef = db.collection("chargeableItems").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Chargeable item not found",
          });
        }

        const existing = doc.data()!;

        // Verify item belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Chargeable item not found",
          });
        }

        // Prevent changing immutable fields
        delete updates.organizationId;
        delete updates.createdAt;
        delete updates.createdBy;

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update chargeable item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update chargeable item",
        });
      }
    },
  );

  /**
   * DELETE /:organizationId/chargeable-items/:id
   * Soft delete a chargeable item (set isActive=false)
   */
  fastify.delete(
    "/:organizationId/chargeable-items/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, id } = request.params as {
          organizationId: string;
          id: string;
        };

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage chargeable items for this organization",
            });
          }
        }

        const docRef = db.collection("chargeableItems").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Chargeable item not found",
          });
        }

        const existing = doc.data()!;

        // Verify item belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Chargeable item not found",
          });
        }

        // Soft delete: set isActive to false
        await docRef.update({
          isActive: false,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete chargeable item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete chargeable item",
        });
      }
    },
  );
}
