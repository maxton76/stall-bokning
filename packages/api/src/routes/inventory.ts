import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  canAccessStable,
  canManageStable,
  isSystemAdmin,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";
import type {
  InventoryStatus,
  InventoryTransactionType,
} from "@stall-bokning/shared";

/**
 * Helper to calculate inventory status based on current quantity and thresholds
 */
function calculateInventoryStatus(
  currentQuantity: number,
  minimumStockLevel: number,
): InventoryStatus {
  if (currentQuantity <= 0) return "out-of-stock";
  if (currentQuantity <= minimumStockLevel) return "low-stock";
  return "in-stock";
}

export async function inventoryRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/inventory/stable/:stableId
   * Get all inventory items for a stable
   * Query params: status (in-stock|low-stock|out-of-stock)
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
        const { status } = request.query as { status?: InventoryStatus };

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this stable",
            });
          }
        }

        // Build query
        let query = db
          .collection("feedInventory")
          .where("stableId", "==", stableId);

        if (status) {
          query = query.where("status", "==", status) as any;
        }

        query = query.orderBy("feedTypeName", "asc") as any;

        const snapshot = await query.get();

        const inventory = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { inventory };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch inventory");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch inventory",
        });
      }
    },
  );

  /**
   * GET /api/v1/inventory/:id
   * Get a single inventory item by ID
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

        const doc = await db.collection("feedInventory").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Inventory item not found",
          });
        }

        const item = doc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, item.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to access this inventory item",
            });
          }
        }

        return serializeTimestamps({ id: doc.id, ...item });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch inventory item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch inventory item",
        });
      }
    },
  );

  /**
   * POST /api/v1/inventory
   * Create a new inventory item
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

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, data.stableId);
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage inventory for this stable",
            });
          }
        }

        // Validate required fields
        if (
          !data.feedTypeId ||
          data.currentQuantity === undefined ||
          !data.unit ||
          data.minimumStockLevel === undefined ||
          data.reorderPoint === undefined
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "feedTypeId, currentQuantity, unit, minimumStockLevel, and reorderPoint are required",
          });
        }

        // Fetch feed type for denormalization
        const feedTypeDoc = await db
          .collection("feedTypes")
          .doc(data.feedTypeId)
          .get();
        if (!feedTypeDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Feed type not found",
          });
        }
        const feedType = feedTypeDoc.data()!;

        // Check if inventory already exists for this feed type
        const existingSnapshot = await db
          .collection("feedInventory")
          .where("stableId", "==", data.stableId)
          .where("feedTypeId", "==", data.feedTypeId)
          .limit(1)
          .get();

        if (!existingSnapshot.empty) {
          return reply.status(409).send({
            error: "Conflict",
            message: "Inventory for this feed type already exists",
            existingId: existingSnapshot.docs[0].id,
          });
        }

        // Fetch supplier if provided
        let supplierName = null;
        let supplierPhone = null;
        let supplierEmail = null;
        if (data.supplierContactId) {
          const supplierDoc = await db
            .collection("contacts")
            .doc(data.supplierContactId)
            .get();
          if (supplierDoc.exists) {
            const supplier = supplierDoc.data()!;
            supplierName =
              supplier.businessName ||
              `${supplier.firstName} ${supplier.lastName}`;
            supplierPhone = supplier.phoneNumber;
            supplierEmail = supplier.email;
          }
        }

        const status = calculateInventoryStatus(
          data.currentQuantity,
          data.minimumStockLevel,
        );

        const inventoryData = {
          stableId: data.stableId,
          organizationId: data.organizationId || null,
          feedTypeId: data.feedTypeId,
          feedTypeName: feedType.name,
          feedTypeCategory: feedType.category || null,
          currentQuantity: data.currentQuantity,
          unit: data.unit,
          minimumStockLevel: data.minimumStockLevel,
          reorderPoint: data.reorderPoint,
          reorderQuantity: data.reorderQuantity || null,
          status,
          supplierContactId: data.supplierContactId || null,
          supplierName,
          supplierPhone,
          supplierEmail,
          unitCost: data.unitCost || null,
          currency: data.currency || "SEK",
          lastPurchaseDate: null,
          lastPurchasePrice: null,
          storageLocation: data.storageLocation || null,
          batchNumber: data.batchNumber || null,
          expirationDate: data.expirationDate
            ? Timestamp.fromDate(new Date(data.expirationDate))
            : null,
          notes: data.notes || null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        const docRef = await db.collection("feedInventory").add(inventoryData);

        // Create initial transaction if starting with stock
        if (data.currentQuantity > 0) {
          await db.collection("inventoryTransactions").add({
            inventoryId: docRef.id,
            stableId: data.stableId,
            organizationId: data.organizationId || null,
            type: "restock" as InventoryTransactionType,
            quantity: data.currentQuantity,
            previousQuantity: 0,
            newQuantity: data.currentQuantity,
            unitCost: data.unitCost || null,
            totalCost: data.unitCost
              ? data.currentQuantity * data.unitCost
              : null,
            reason: "Initial stock",
            createdAt: Timestamp.now(),
            createdBy: user.uid,
            createdByName: user.email,
          });
        }

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(inventoryData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create inventory item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create inventory item",
        });
      }
    },
  );

  /**
   * PUT /api/v1/inventory/:id
   * Update an inventory item
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

        const docRef = db.collection("feedInventory").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Inventory item not found",
          });
        }

        const existing = doc.data()!;

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, existing.stableId);
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to update this inventory item",
            });
          }
        }

        // Prevent changing certain fields
        delete updates.stableId;
        delete updates.feedTypeId;
        delete updates.createdBy;
        delete updates.createdAt;

        // Update supplier info if changed
        if (
          updates.supplierContactId &&
          updates.supplierContactId !== existing.supplierContactId
        ) {
          const supplierDoc = await db
            .collection("contacts")
            .doc(updates.supplierContactId)
            .get();
          if (supplierDoc.exists) {
            const supplier = supplierDoc.data()!;
            updates.supplierName =
              supplier.businessName ||
              `${supplier.firstName} ${supplier.lastName}`;
            updates.supplierPhone = supplier.phoneNumber;
            updates.supplierEmail = supplier.email;
          }
        }

        // Recalculate status if quantity or threshold changed
        const newQuantity = updates.currentQuantity ?? existing.currentQuantity;
        const newMinLevel =
          updates.minimumStockLevel ?? existing.minimumStockLevel;
        updates.status = calculateInventoryStatus(newQuantity, newMinLevel);

        // Handle expiration date
        if (updates.expirationDate) {
          updates.expirationDate = Timestamp.fromDate(
            new Date(updates.expirationDate),
          );
        } else if (updates.expirationDate === null) {
          updates.expirationDate = null;
        }

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update inventory item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update inventory item",
        });
      }
    },
  );

  /**
   * POST /api/v1/inventory/:id/restock
   * Record a restock transaction
   */
  fastify.post(
    "/:id/restock",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const data = request.body as any;

        if (!data.quantity || data.quantity <= 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "quantity must be a positive number",
          });
        }

        const docRef = db.collection("feedInventory").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Inventory item not found",
          });
        }

        const existing = doc.data()!;

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, existing.stableId);
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to restock this inventory",
            });
          }
        }

        const previousQuantity = existing.currentQuantity;
        const newQuantity = previousQuantity + data.quantity;
        const status = calculateInventoryStatus(
          newQuantity,
          existing.minimumStockLevel,
        );

        // Update inventory
        await docRef.update({
          currentQuantity: newQuantity,
          status,
          lastPurchaseDate: Timestamp.now(),
          lastPurchasePrice: data.unitCost || existing.unitCost,
          unitCost: data.unitCost || existing.unitCost,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        // Create transaction record
        const transactionData = {
          inventoryId: id,
          stableId: existing.stableId,
          organizationId: existing.organizationId || null,
          type: "restock" as InventoryTransactionType,
          quantity: data.quantity,
          previousQuantity,
          newQuantity,
          unitCost: data.unitCost || null,
          totalCost: data.unitCost ? data.quantity * data.unitCost : null,
          invoiceNumber: data.invoiceNumber || null,
          invoiceId: data.invoiceId || null,
          notes: data.notes || null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          createdByName: user.email,
        };

        const transRef = await db
          .collection("inventoryTransactions")
          .add(transactionData);

        // Resolve any active alerts for this inventory
        const alertsSnapshot = await db
          .collection("inventoryAlerts")
          .where("inventoryId", "==", id)
          .where("isResolved", "==", false)
          .get();

        const batch = db.batch();
        alertsSnapshot.docs.forEach((alertDoc) => {
          batch.update(alertDoc.ref, {
            isResolved: true,
            resolvedAt: Timestamp.now(),
          });
        });
        if (!alertsSnapshot.empty) {
          await batch.commit();
        }

        return {
          success: true,
          transaction: serializeTimestamps({
            id: transRef.id,
            ...transactionData,
          }),
          inventory: serializeTimestamps({
            id,
            ...existing,
            currentQuantity: newQuantity,
            status,
          }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to record restock");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to record restock",
        });
      }
    },
  );

  /**
   * POST /api/v1/inventory/:id/usage
   * Record usage/consumption transaction
   */
  fastify.post(
    "/:id/usage",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const data = request.body as any;

        if (!data.quantity || data.quantity <= 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "quantity must be a positive number",
          });
        }

        const docRef = db.collection("feedInventory").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Inventory item not found",
          });
        }

        const existing = doc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, existing.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to record usage for this inventory",
            });
          }
        }

        const previousQuantity = existing.currentQuantity;
        const newQuantity = Math.max(0, previousQuantity - data.quantity);
        const status = calculateInventoryStatus(
          newQuantity,
          existing.minimumStockLevel,
        );

        // Update inventory
        await docRef.update({
          currentQuantity: newQuantity,
          status,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        // Fetch related entity names if provided
        let relatedActivityTitle = null;
        let relatedHorseName = null;
        if (data.relatedActivityId) {
          const activityDoc = await db
            .collection("activityInstances")
            .doc(data.relatedActivityId)
            .get();
          if (activityDoc.exists) {
            relatedActivityTitle = activityDoc.data()!.title;
          }
        }
        if (data.relatedHorseId) {
          const horseDoc = await db
            .collection("horses")
            .doc(data.relatedHorseId)
            .get();
          if (horseDoc.exists) {
            relatedHorseName = horseDoc.data()!.name;
          }
        }

        // Create transaction record
        const transactionData = {
          inventoryId: id,
          stableId: existing.stableId,
          organizationId: existing.organizationId || null,
          type: "usage" as InventoryTransactionType,
          quantity: -data.quantity, // Negative for deductions
          previousQuantity,
          newQuantity,
          relatedActivityId: data.relatedActivityId || null,
          relatedActivityTitle,
          relatedHorseId: data.relatedHorseId || null,
          relatedHorseName,
          notes: data.notes || null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          createdByName: user.email,
        };

        const transRef = await db
          .collection("inventoryTransactions")
          .add(transactionData);

        // Create alert if low stock
        if (status === "low-stock" || status === "out-of-stock") {
          // Check if alert already exists
          const existingAlert = await db
            .collection("inventoryAlerts")
            .where("inventoryId", "==", id)
            .where("isResolved", "==", false)
            .limit(1)
            .get();

          if (existingAlert.empty) {
            await db.collection("inventoryAlerts").add({
              inventoryId: id,
              stableId: existing.stableId,
              organizationId: existing.organizationId || null,
              alertType: status,
              feedTypeName: existing.feedTypeName,
              currentQuantity: newQuantity,
              minimumStockLevel: existing.minimumStockLevel,
              unit: existing.unit,
              supplierContactId: existing.supplierContactId || null,
              supplierName: existing.supplierName || null,
              supplierPhone: existing.supplierPhone || null,
              isAcknowledged: false,
              isResolved: false,
              createdAt: Timestamp.now(),
            });
          }
        }

        return {
          success: true,
          transaction: serializeTimestamps({
            id: transRef.id,
            ...transactionData,
          }),
          inventory: serializeTimestamps({
            id,
            ...existing,
            currentQuantity: newQuantity,
            status,
          }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to record usage");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to record usage",
        });
      }
    },
  );

  /**
   * POST /api/v1/inventory/:id/adjustment
   * Record a manual adjustment
   */
  fastify.post(
    "/:id/adjustment",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const data = request.body as any;

        if (data.newQuantity === undefined || data.newQuantity < 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "newQuantity must be a non-negative number",
          });
        }

        if (!data.reason) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "reason is required for adjustments",
          });
        }

        const docRef = db.collection("feedInventory").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Inventory item not found",
          });
        }

        const existing = doc.data()!;

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, existing.stableId);
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to adjust this inventory",
            });
          }
        }

        const previousQuantity = existing.currentQuantity;
        const newQuantity = data.newQuantity;
        const quantityDiff = newQuantity - previousQuantity;
        const status = calculateInventoryStatus(
          newQuantity,
          existing.minimumStockLevel,
        );

        // Update inventory
        await docRef.update({
          currentQuantity: newQuantity,
          status,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        // Create transaction record
        const transactionData = {
          inventoryId: id,
          stableId: existing.stableId,
          organizationId: existing.organizationId || null,
          type: "adjustment" as InventoryTransactionType,
          quantity: quantityDiff,
          previousQuantity,
          newQuantity,
          reason: data.reason,
          notes: data.notes || null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          createdByName: user.email,
        };

        const transRef = await db
          .collection("inventoryTransactions")
          .add(transactionData);

        return {
          success: true,
          transaction: serializeTimestamps({
            id: transRef.id,
            ...transactionData,
          }),
          inventory: serializeTimestamps({
            id,
            ...existing,
            currentQuantity: newQuantity,
            status,
          }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to record adjustment");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to record adjustment",
        });
      }
    },
  );

  /**
   * GET /api/v1/inventory/stable/:stableId/alerts
   * Get active inventory alerts for a stable
   */
  fastify.get(
    "/stable/:stableId/alerts",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { stableId } = request.params as { stableId: string };
        const { includeResolved = "false" } = request.query as {
          includeResolved?: string;
        };

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this stable",
            });
          }
        }

        let query = db
          .collection("inventoryAlerts")
          .where("stableId", "==", stableId);

        if (includeResolved !== "true") {
          query = query.where("isResolved", "==", false) as any;
        }

        query = query.orderBy("createdAt", "desc") as any;

        const snapshot = await query.get();

        const alerts = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { alerts };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch inventory alerts");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch inventory alerts",
        });
      }
    },
  );

  /**
   * PUT /api/v1/inventory/alerts/:alertId/acknowledge
   * Acknowledge an inventory alert
   */
  fastify.put(
    "/alerts/:alertId/acknowledge",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { alertId } = request.params as { alertId: string };

        const docRef = db.collection("inventoryAlerts").doc(alertId);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Alert not found",
          });
        }

        const alert = doc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, alert.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to acknowledge this alert",
            });
          }
        }

        await docRef.update({
          isAcknowledged: true,
          acknowledgedAt: Timestamp.now(),
          acknowledgedBy: user.uid,
        });

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to acknowledge alert");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to acknowledge alert",
        });
      }
    },
  );

  /**
   * GET /api/v1/inventory/:id/transactions
   * Get transaction history for an inventory item
   */
  fastify.get(
    "/:id/transactions",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const { limit = "50", type } = request.query as {
          limit?: string;
          type?: InventoryTransactionType;
        };

        const inventoryDoc = await db.collection("feedInventory").doc(id).get();

        if (!inventoryDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Inventory item not found",
          });
        }

        const inventory = inventoryDoc.data()!;

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, inventory.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to view this inventory's transactions",
            });
          }
        }

        let query = db
          .collection("inventoryTransactions")
          .where("inventoryId", "==", id);

        if (type) {
          query = query.where("type", "==", type) as any;
        }

        query = query
          .orderBy("createdAt", "desc")
          .limit(parseInt(limit)) as any;

        const snapshot = await query.get();

        const transactions = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { transactions };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch inventory transactions");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch inventory transactions",
        });
      }
    },
  );

  /**
   * GET /api/v1/inventory/stable/:stableId/summary
   * Get inventory summary/dashboard data for a stable
   */
  fastify.get(
    "/stable/:stableId/summary",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { stableId } = request.params as { stableId: string };

        // Check stable access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessStable(user.uid, stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this stable",
            });
          }
        }

        // Get all inventory items
        const inventorySnapshot = await db
          .collection("feedInventory")
          .where("stableId", "==", stableId)
          .get();

        // Get active alerts
        const alertsSnapshot = await db
          .collection("inventoryAlerts")
          .where("stableId", "==", stableId)
          .where("isResolved", "==", false)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get();

        let totalItems = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let expiringSoonCount = 0;
        let totalValue = 0;

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        inventorySnapshot.docs.forEach((doc) => {
          const item = doc.data();
          totalItems++;

          if (item.status === "low-stock") lowStockCount++;
          if (item.status === "out-of-stock") outOfStockCount++;

          if (item.expirationDate) {
            const expDate = item.expirationDate.toDate();
            if (expDate <= thirtyDaysFromNow) {
              expiringSoonCount++;
            }
          }

          if (item.unitCost && item.currentQuantity) {
            totalValue += item.unitCost * item.currentQuantity;
          }
        });

        const alerts = alertsSnapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return {
          stableId,
          totalItems,
          lowStockCount,
          outOfStockCount,
          expiringSoonCount,
          totalValue,
          currency: "SEK",
          alerts,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch inventory summary");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch inventory summary",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/inventory/:id
   * Delete an inventory item
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

        const docRef = db.collection("feedInventory").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Inventory item not found",
          });
        }

        const existing = doc.data()!;

        // Check stable management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageStable(user.uid, existing.stableId);
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to delete this inventory item",
            });
          }
        }

        // Delete associated transactions
        const transactionsSnapshot = await db
          .collection("inventoryTransactions")
          .where("inventoryId", "==", id)
          .get();

        const batch = db.batch();
        transactionsSnapshot.docs.forEach((transDoc) => {
          batch.delete(transDoc.ref);
        });

        // Delete associated alerts
        const alertsSnapshot = await db
          .collection("inventoryAlerts")
          .where("inventoryId", "==", id)
          .get();

        alertsSnapshot.docs.forEach((alertDoc) => {
          batch.delete(alertDoc.ref);
        });

        // Delete the inventory item
        batch.delete(docRef);

        await batch.commit();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete inventory item");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete inventory item",
        });
      }
    },
  );
}
