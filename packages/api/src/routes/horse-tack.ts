import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { canAccessHorse } from "../utils/authorization.js";
import type {
  TackItem,
  CreateTackItemInput,
  UpdateTackItemInput,
} from "@stall-bokning/shared";
import type { AuthenticatedRequest } from "../types/index.js";

interface TackParams {
  horseId: string;
  tackId?: string;
}

export async function horseTackRoutes(fastify: FastifyInstance) {
  const db = getFirestore();

  // Get all tack items for a horse
  fastify.get(
    "/horses/:horseId/tack",
    async (
      request: FastifyRequest<{ Params: { horseId: string } }>,
      reply: FastifyReply,
    ) => {
      const { horseId } = request.params;
      const userId = (request as AuthenticatedRequest).user?.uid;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      // Get tack items subcollection
      const tackSnapshot = await db
        .collection("horses")
        .doc(horseId)
        .collection("tack")
        .where("isActive", "!=", false)
        .orderBy("isActive")
        .orderBy("category")
        .orderBy("name")
        .get();

      const items: TackItem[] = tackSnapshot.docs.map((doc) => ({
        id: doc.id,
        horseId,
        ...doc.data(),
      })) as TackItem[];

      return reply.send(items);
    },
  );

  // Get single tack item
  fastify.get(
    "/horses/:horseId/tack/:tackId",
    async (
      request: FastifyRequest<{ Params: TackParams }>,
      reply: FastifyReply,
    ) => {
      const { horseId, tackId } = request.params;
      const userId = (request as AuthenticatedRequest).user?.uid;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      if (!tackId) {
        return reply.status(400).send({ error: "Tack ID is required" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      const tackDoc = await db
        .collection("horses")
        .doc(horseId)
        .collection("tack")
        .doc(tackId)
        .get();

      if (!tackDoc.exists) {
        return reply.status(404).send({ error: "Tack item not found" });
      }

      return reply.send({
        id: tackDoc.id,
        horseId,
        ...tackDoc.data(),
      });
    },
  );

  // Create tack item
  fastify.post(
    "/horses/:horseId/tack",
    async (
      request: FastifyRequest<{
        Params: { horseId: string };
        Body: CreateTackItemInput;
      }>,
      reply: FastifyReply,
    ) => {
      const { horseId } = request.params;
      const userId = (request as AuthenticatedRequest).user?.uid;
      const itemData = request.body;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      // Get horse name for caching
      const horseDoc = await db.collection("horses").doc(horseId).get();
      const horseName = horseDoc.exists ? horseDoc.data()?.name : undefined;

      // Convert dates to Timestamps
      const convertToTimestamp = (date: Date | Timestamp | undefined) => {
        if (!date) return undefined;
        if (date instanceof Date) return Timestamp.fromDate(date);
        return date;
      };

      // Create the tack item (without explicit type to avoid Timestamp incompatibility)
      const newItem = {
        horseId,
        horseName,
        category: itemData.category,
        name: itemData.name,
        description: itemData.description,
        brand: itemData.brand,
        model: itemData.model,
        size: itemData.size,
        color: itemData.color,
        condition: itemData.condition,
        conditionNotes: itemData.conditionNotes,
        purchaseDate: convertToTimestamp(
          itemData.purchaseDate as Date | Timestamp | undefined,
        ),
        purchasePrice: itemData.purchasePrice,
        currency: itemData.currency || "SEK",
        purchasedFrom: itemData.purchasedFrom,
        warrantyExpiry: convertToTimestamp(
          itemData.warrantyExpiry as Date | Timestamp | undefined,
        ),
        warrantyNotes: itemData.warrantyNotes,
        storageLocation: itemData.storageLocation,
        isShared: itemData.isShared,
        nextMaintenanceDate: convertToTimestamp(
          itemData.nextMaintenanceDate as Date | Timestamp | undefined,
        ),
        maintenanceNotes: itemData.maintenanceNotes,
        isActive: true,
        createdAt: FieldValue.serverTimestamp() as unknown as Timestamp,
        createdBy: userId,
        updatedAt: FieldValue.serverTimestamp() as unknown as Timestamp,
        lastModifiedBy: userId,
      };

      // Remove undefined values
      const cleanItem = Object.fromEntries(
        Object.entries(newItem).filter(([, v]) => v !== undefined),
      );

      const docRef = await db
        .collection("horses")
        .doc(horseId)
        .collection("tack")
        .add(cleanItem);

      return reply.status(201).send({
        message: "Tack item created successfully",
        item: { id: docRef.id, ...cleanItem },
      });
    },
  );

  // Update tack item
  fastify.put(
    "/horses/:horseId/tack/:tackId",
    async (
      request: FastifyRequest<{
        Params: TackParams;
        Body: UpdateTackItemInput;
      }>,
      reply: FastifyReply,
    ) => {
      const { horseId, tackId } = request.params;
      const userId = (request as AuthenticatedRequest).user?.uid;
      const updateData = request.body;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      if (!tackId) {
        return reply.status(400).send({ error: "Tack ID is required" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      const tackRef = db
        .collection("horses")
        .doc(horseId)
        .collection("tack")
        .doc(tackId);

      const tackDoc = await tackRef.get();
      if (!tackDoc.exists) {
        return reply.status(404).send({ error: "Tack item not found" });
      }

      // Convert dates to Timestamps
      const convertToTimestamp = (date: Date | Timestamp | undefined) => {
        if (!date) return undefined;
        if (date instanceof Date) return Timestamp.fromDate(date);
        return date;
      };

      // Build update object
      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
        lastModifiedBy: userId,
      };

      if (updateData.name !== undefined) updates.name = updateData.name;
      if (updateData.description !== undefined)
        updates.description = updateData.description;
      if (updateData.brand !== undefined) updates.brand = updateData.brand;
      if (updateData.model !== undefined) updates.model = updateData.model;
      if (updateData.size !== undefined) updates.size = updateData.size;
      if (updateData.color !== undefined) updates.color = updateData.color;
      if (updateData.condition !== undefined)
        updates.condition = updateData.condition;
      if (updateData.conditionNotes !== undefined)
        updates.conditionNotes = updateData.conditionNotes;
      if (updateData.purchaseDate !== undefined)
        updates.purchaseDate = convertToTimestamp(
          updateData.purchaseDate as Date | Timestamp,
        );
      if (updateData.purchasePrice !== undefined)
        updates.purchasePrice = updateData.purchasePrice;
      if (updateData.currency !== undefined)
        updates.currency = updateData.currency;
      if (updateData.purchasedFrom !== undefined)
        updates.purchasedFrom = updateData.purchasedFrom;
      if (updateData.warrantyExpiry !== undefined)
        updates.warrantyExpiry = convertToTimestamp(
          updateData.warrantyExpiry as Date | Timestamp,
        );
      if (updateData.warrantyNotes !== undefined)
        updates.warrantyNotes = updateData.warrantyNotes;
      if (updateData.storageLocation !== undefined)
        updates.storageLocation = updateData.storageLocation;
      if (updateData.isShared !== undefined)
        updates.isShared = updateData.isShared;
      if (updateData.nextMaintenanceDate !== undefined)
        updates.nextMaintenanceDate = convertToTimestamp(
          updateData.nextMaintenanceDate as Date | Timestamp,
        );
      if (updateData.maintenanceNotes !== undefined)
        updates.maintenanceNotes = updateData.maintenanceNotes;
      if (updateData.isActive !== undefined)
        updates.isActive = updateData.isActive;

      await tackRef.update(updates);

      return reply.send({
        message: "Tack item updated successfully",
        item: { id: tackId, ...updates },
      });
    },
  );

  // Delete tack item
  fastify.delete(
    "/horses/:horseId/tack/:tackId",
    async (
      request: FastifyRequest<{ Params: TackParams }>,
      reply: FastifyReply,
    ) => {
      const { horseId, tackId } = request.params;
      const userId = (request as AuthenticatedRequest).user?.uid;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      if (!tackId) {
        return reply.status(400).send({ error: "Tack ID is required" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      const tackRef = db
        .collection("horses")
        .doc(horseId)
        .collection("tack")
        .doc(tackId);

      const tackDoc = await tackRef.get();
      if (!tackDoc.exists) {
        return reply.status(404).send({ error: "Tack item not found" });
      }

      // Soft delete by setting isActive to false
      await tackRef.update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
        lastModifiedBy: userId,
      });

      return reply.send({
        message: "Tack item deleted successfully",
      });
    },
  );
}
