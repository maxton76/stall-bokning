import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { isSystemAdmin } from "../utils/authorization.js";
import { hasPermission } from "../utils/permissionEngine.js";
import { serializeTimestamps } from "../utils/serialization.js";

export async function lineItemsRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing addon required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  /**
   * GET /:organizationId/line-items
   * List pending line items for an organization
   * Query params: memberId, status (default "pending"), sourceType, from, to, limit
   */
  fastify.get(
    "/:organizationId/line-items",
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
          memberId,
          status = "pending",
          sourceType,
          from,
          to,
          limit = "100",
        } = request.query as {
          memberId?: string;
          status?: string;
          sourceType?: string;
          from?: string;
          to?: string;
          limit?: string;
        };

        // Check organization access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(user.uid, organizationId, "view_invoices");
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        // Build query
        let query = db
          .collection("lineItems")
          .where("organizationId", "==", organizationId);

        if (status) {
          query = query.where("status", "==", status) as any;
        }

        if (memberId) {
          query = query.where("memberId", "==", memberId) as any;
        }

        if (sourceType) {
          query = query.where("sourceType", "==", sourceType) as any;
        }

        if (from) {
          const fromDate = new Date(from);
          query = query.where(
            "date",
            ">=",
            Timestamp.fromDate(fromDate),
          ) as any;
        }

        if (to) {
          const toDate = new Date(to);
          query = query.where("date", "<=", Timestamp.fromDate(toDate)) as any;
        }

        query = query.orderBy("date", "desc").limit(parseInt(limit)) as any;

        const snapshot = await query.get();

        const items = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { items };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch line items");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch line items",
        });
      }
    },
  );

  /**
   * POST /:organizationId/line-items
   * Create a manual line item
   */
  fastify.post(
    "/:organizationId/line-items",
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

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(user.uid, organizationId, "manage_invoices");
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage line items for this organization",
            });
          }
        }

        // Validate required fields
        const requiredFields = [
          "memberId",
          "billingContactId",
          "date",
          "description",
          "quantity",
          "unitPrice",
          "vatRate",
          "idempotencyKey",
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

        // Idempotency check
        const existing = await db
          .collection("lineItems")
          .where("idempotencyKey", "==", data.idempotencyKey)
          .where("organizationId", "==", organizationId)
          .limit(1)
          .get();

        if (!existing.empty) {
          return reply.status(409).send({
            error: "Conflict",
            message: "A line item with this idempotency key already exists",
            existingId: existing.docs[0].id,
          });
        }

        // Calculate totals
        const quantity = Number(data.quantity);
        const unitPrice = Number(data.unitPrice);
        const vatRate = Number(data.vatRate);
        const totalExclVat = Math.round(quantity * unitPrice);
        const totalVat = Math.round(totalExclVat * (vatRate / 100));
        const totalInclVat = totalExclVat + totalVat;

        const lineItemData = {
          organizationId,
          memberId: data.memberId,
          billingContactId: data.billingContactId,
          date: Timestamp.fromDate(new Date(data.date)),
          chargeableItemId: data.chargeableItemId || null,
          description: data.description,
          quantity,
          unitPrice,
          vatRate,
          totalExclVat,
          totalVat,
          totalInclVat,
          sourceType: data.sourceType || "manual",
          sourceId: data.sourceId || null,
          horseId: data.horseId || null,
          idempotencyKey: data.idempotencyKey,
          status: "pending",
          packageDeductionId: null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        const docRef = await db.collection("lineItems").add(lineItemData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(lineItemData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create line item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create line item",
        });
      }
    },
  );

  /**
   * PATCH /:organizationId/line-items/:id
   * Update a pending line item
   */
  fastify.patch(
    "/:organizationId/line-items/:id",
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

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(user.uid, organizationId, "manage_invoices");
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage line items for this organization",
            });
          }
        }

        const docRef = db.collection("lineItems").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Line item not found",
          });
        }

        const existing = doc.data()!;

        // Verify item belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Line item not found",
          });
        }

        // Only allow updates to pending line items
        if (existing.status !== "pending") {
          return reply.status(409).send({
            error: "Conflict",
            message: `Cannot update line item with status "${existing.status}". Only pending line items can be updated.`,
          });
        }

        // Only allow specific fields to be updated
        const allowedFields = [
          "description",
          "quantity",
          "unitPrice",
          "vatRate",
          "chargeableItemId",
          "horseId",
        ];
        const updateData: Record<string, any> = {};
        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            updateData[field] = updates[field];
          }
        }

        // Recalculate totals if pricing fields changed
        const quantity =
          updateData.quantity !== undefined
            ? Number(updateData.quantity)
            : existing.quantity;
        const unitPrice =
          updateData.unitPrice !== undefined
            ? Number(updateData.unitPrice)
            : existing.unitPrice;
        const vatRate =
          updateData.vatRate !== undefined
            ? Number(updateData.vatRate)
            : existing.vatRate;

        if (
          updateData.quantity !== undefined ||
          updateData.unitPrice !== undefined ||
          updateData.vatRate !== undefined
        ) {
          updateData.totalExclVat = Math.round(quantity * unitPrice);
          updateData.totalVat = Math.round(
            updateData.totalExclVat * (vatRate / 100),
          );
          updateData.totalInclVat =
            updateData.totalExclVat + updateData.totalVat;
        }

        updateData.updatedAt = Timestamp.now();
        updateData.updatedBy = user.uid;

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update line item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update line item",
        });
      }
    },
  );

  /**
   * DELETE /:organizationId/line-items/:id
   * Delete a pending line item
   */
  fastify.delete(
    "/:organizationId/line-items/:id",
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

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(user.uid, organizationId, "manage_invoices");
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage line items for this organization",
            });
          }
        }

        const docRef = db.collection("lineItems").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Line item not found",
          });
        }

        const existing = doc.data()!;

        // Verify item belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Line item not found",
          });
        }

        // Only allow deletion of pending line items
        if (existing.status !== "pending") {
          return reply.status(409).send({
            error: "Conflict",
            message: `Cannot delete line item with status "${existing.status}". Only pending line items can be deleted.`,
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete line item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete line item",
        });
      }
    },
  );
}
