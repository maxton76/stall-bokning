import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { canAccessHorse } from "../utils/authorization";
import type {
  HorsePedigree,
  PedigreeAncestor,
  HorseTelexSearchResult,
  HorseTelexImportRequest,
  HorseTelexImportResult,
} from "@shared/types/pedigree";

interface PedigreeParams {
  horseId: string;
}

export async function pedigreeRoutes(fastify: FastifyInstance) {
  const db = getFirestore();

  // Get pedigree for a horse
  fastify.get(
    "/horses/:horseId/pedigree",
    async (
      request: FastifyRequest<{ Params: PedigreeParams }>,
      reply: FastifyReply,
    ) => {
      const { horseId } = request.params;
      const userId = request.user?.uid;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      // Get horse document
      const horseDoc = await db.collection("horses").doc(horseId).get();
      if (!horseDoc.exists) {
        return reply.status(404).send({ error: "Horse not found" });
      }

      const horseData = horseDoc.data();
      const pedigree = horseData?.pedigree || {};

      return reply.send({
        id: horseId,
        horseId,
        ...pedigree,
      });
    },
  );

  // Update pedigree for a horse
  fastify.put(
    "/horses/:horseId/pedigree",
    async (
      request: FastifyRequest<{
        Params: PedigreeParams;
        Body: Partial<HorsePedigree>;
      }>,
      reply: FastifyReply,
    ) => {
      const { horseId } = request.params;
      const userId = request.user?.uid;
      const pedigreeData = request.body;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      // Validate horse exists
      const horseDoc = await db.collection("horses").doc(horseId).get();
      if (!horseDoc.exists) {
        return reply.status(404).send({ error: "Horse not found" });
      }

      // Clean and validate pedigree data
      const cleanPedigree: Partial<HorsePedigree> = {
        importSource: pedigreeData.importSource || "manual",
      };

      // Process ancestor fields
      const ancestorFields: (keyof HorsePedigree)[] = [
        "sire",
        "dam",
        "sireSire",
        "sireDam",
        "damSire",
        "damDam",
        "sireSireSire",
        "sireSireDam",
        "sireDamSire",
        "sireDamDam",
        "damSireSire",
        "damSireDam",
        "damDamSire",
        "damDamDam",
      ];

      ancestorFields.forEach((field) => {
        const value = pedigreeData[field] as PedigreeAncestor | undefined;
        if (value && value.name) {
          (cleanPedigree as Record<string, unknown>)[field] = {
            name: value.name,
            registrationNumber: value.registrationNumber,
            ueln: value.ueln,
            breed: value.breed,
            color: value.color,
            birthYear: value.birthYear,
            country: value.country,
            horseTelexId: value.horseTelexId,
            horseTelexUrl: value.horseTelexUrl,
          };
        }
      });

      // Update horse document with pedigree
      await db.collection("horses").doc(horseId).update({
        pedigree: cleanPedigree,
        updatedAt: FieldValue.serverTimestamp(),
        lastModifiedBy: userId,
      });

      return reply.send({
        message: "Pedigree updated successfully",
        pedigree: cleanPedigree,
      });
    },
  );

  // Delete pedigree for a horse
  fastify.delete(
    "/horses/:horseId/pedigree",
    async (
      request: FastifyRequest<{ Params: PedigreeParams }>,
      reply: FastifyReply,
    ) => {
      const { horseId } = request.params;
      const userId = request.user?.uid;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      // Update horse document to remove pedigree
      await db.collection("horses").doc(horseId).update({
        pedigree: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
        lastModifiedBy: userId,
      });

      return reply.send({
        message: "Pedigree deleted successfully",
      });
    },
  );

  // ============================================================================
  // HORSETELEX INTEGRATION (STUB)
  // ============================================================================
  // These endpoints are stubs for future HorseTelex API integration.
  // HorseTelex is a pedigree database service that requires partnership/licensing.

  // Search HorseTelex (stub)
  fastify.get(
    "/horsetelex/search",
    async (
      request: FastifyRequest<{ Querystring: { q: string } }>,
      reply: FastifyReply,
    ) => {
      const userId = request.user?.uid;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const query = request.query.q;
      if (!query || query.length < 2) {
        return reply.status(400).send({ error: "Search query too short" });
      }

      // STUB: Return empty results until HorseTelex integration is implemented
      // In production, this would call the HorseTelex API:
      // const response = await horseTelexClient.search(query);
      // return reply.send(response.results);

      fastify.log.info(
        `HorseTelex search stub called with query: ${query} (integration pending)`,
      );

      // Return empty results with a header indicating stub status
      return reply
        .header("X-Integration-Status", "stub")
        .send([] as HorseTelexSearchResult[]);
    },
  );

  // Get HorseTelex horse details (stub)
  fastify.get(
    "/horsetelex/horse/:horseTelexId",
    async (
      request: FastifyRequest<{ Params: { horseTelexId: string } }>,
      reply: FastifyReply,
    ) => {
      const userId = request.user?.uid;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const { horseTelexId } = request.params;

      // STUB: Return 503 until HorseTelex integration is implemented
      fastify.log.info(
        `HorseTelex details stub called for ID: ${horseTelexId} (integration pending)`,
      );

      return reply.status(503).send({
        error: "Service not available",
        message:
          "HorseTelex integration is pending. This feature will be available when the API partnership is established.",
        integrationStatus: "pending",
      });
    },
  );

  // Import pedigree from HorseTelex (stub)
  fastify.post(
    "/horses/:horseId/pedigree/import",
    async (
      request: FastifyRequest<{
        Params: PedigreeParams;
        Body: Omit<HorseTelexImportRequest, "horseId">;
      }>,
      reply: FastifyReply,
    ) => {
      const { horseId } = request.params;
      const userId = request.user?.uid;
      const { horseTelexId, includeFullPedigree } = request.body;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      if (!horseTelexId) {
        return reply.status(400).send({ error: "HorseTelex ID is required" });
      }

      // STUB: Return 503 until HorseTelex integration is implemented
      // In production, this would:
      // 1. Fetch pedigree data from HorseTelex API
      // 2. Transform the data to our HorsePedigree format
      // 3. Update the horse document with the pedigree
      // 4. Return success with imported fields

      fastify.log.info(
        `HorseTelex import stub called for horse ${horseId} with HorseTelex ID: ${horseTelexId} (integration pending)`,
      );

      const result: HorseTelexImportResult = {
        success: false,
        horseId,
        horseTelexId,
        importedFields: [],
        error:
          "HorseTelex integration is pending. This feature will be available when the API partnership is established.",
      };

      return reply.status(503).send(result);
    },
  );

  // Check HorseTelex integration status
  fastify.get(
    "/horsetelex/status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.uid;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Return integration status
      return reply.send({
        integrationStatus: "pending",
        available: false,
        message:
          "HorseTelex integration requires API partnership. Contact support for more information.",
        expectedAvailability: "Q2 2026",
        features: {
          search: "pending",
          pedigreeImport: "pending",
          profileLink: "pending",
        },
      });
    },
  );
}
