import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { canAccessHorse } from "../utils/authorization";
import type {
  TransportInstructions,
  UpdateTransportInstructionsInput,
} from "@shared/types/transport";

interface TransportParams {
  horseId: string;
}

export async function transportRoutes(fastify: FastifyInstance) {
  const db = getFirestore();

  // Get transport instructions for a horse
  fastify.get(
    "/horses/:horseId/transport",
    async (
      request: FastifyRequest<{ Params: TransportParams }>,
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
      const transport = horseData?.transportInstructions || {};

      return reply.send({
        id: horseId,
        horseId,
        ...transport,
      });
    },
  );

  // Update transport instructions for a horse
  fastify.put(
    "/horses/:horseId/transport",
    async (
      request: FastifyRequest<{
        Params: TransportParams;
        Body: UpdateTransportInstructionsInput;
      }>,
      reply: FastifyReply,
    ) => {
      const { horseId } = request.params;
      const userId = request.user?.uid;
      const transportData = request.body;

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

      // Build transport instructions object
      const transportInstructions: TransportInstructions = {
        // Loading behavior
        loadingBehavior: transportData.loadingBehavior,
        loadingNotes: transportData.loadingNotes,

        // Position preferences
        positionPreference: transportData.positionPreference,
        needsCompanion: transportData.needsCompanion,
        preferredCompanion: transportData.preferredCompanion,

        // Travel requirements
        travelAnxiety: transportData.travelAnxiety,
        travelAnxietyNotes: transportData.travelAnxietyNotes,
        sedationRequired: transportData.sedationRequired,
        sedationNotes: transportData.sedationNotes,

        // Feeding during transport
        feedDuringTransport: transportData.feedDuringTransport,
        feedingInstructions: transportData.feedingInstructions,
        hayNetRequired: transportData.hayNetRequired,
        waterInstructions: transportData.waterInstructions,

        // Equipment
        specialEquipment: transportData.specialEquipment,
        travelBoots: transportData.travelBoots,
        travelBlanket: transportData.travelBlanket,
        headProtection: transportData.headProtection,
        tailGuard: transportData.tailGuard,
        pollGuard: transportData.pollGuard,

        // Health considerations
        motionSickness: transportData.motionSickness,
        ventilationNeeds: transportData.ventilationNeeds,
        temperaturePreference: transportData.temperaturePreference,

        // Rest requirements
        maxTravelTime: transportData.maxTravelTime,
        restBreakFrequency: transportData.restBreakFrequency,
        unloadForRest: transportData.unloadForRest,

        // Emergency contacts
        emergencyContacts: transportData.emergencyContacts,

        // Insurance information
        transportInsurance: transportData.transportInsurance,
        insuranceProvider: transportData.insuranceProvider,
        insurancePolicyNumber: transportData.insurancePolicyNumber,

        // General notes
        notes: transportData.notes,

        // Metadata
        updatedAt: FieldValue.serverTimestamp() as unknown as Timestamp,
        lastModifiedBy: userId,
      };

      // Remove undefined values
      const cleanTransport = Object.fromEntries(
        Object.entries(transportInstructions).filter(
          ([, v]) => v !== undefined,
        ),
      );

      // Update horse document with transport instructions
      await db.collection("horses").doc(horseId).update({
        transportInstructions: cleanTransport,
        updatedAt: FieldValue.serverTimestamp(),
        lastModifiedBy: userId,
      });

      return reply.send({
        message: "Transport instructions updated successfully",
        transportInstructions: cleanTransport,
      });
    },
  );

  // Delete transport instructions for a horse
  fastify.delete(
    "/horses/:horseId/transport",
    async (
      request: FastifyRequest<{ Params: TransportParams }>,
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

      // Update horse document to remove transport instructions
      await db.collection("horses").doc(horseId).update({
        transportInstructions: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
        lastModifiedBy: userId,
      });

      return reply.send({
        message: "Transport instructions deleted successfully",
      });
    },
  );

  // Generate printable transport card
  fastify.get(
    "/horses/:horseId/transport/printable",
    async (
      request: FastifyRequest<{ Params: TransportParams }>,
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
      const transport = horseData?.transportInstructions || {};

      // Return printable format with horse info
      return reply.send({
        horse: {
          id: horseId,
          name: horseData?.name,
          breed: horseData?.breed,
          color: horseData?.color,
          microchipNumber: horseData?.microchipNumber,
          passportNumber: horseData?.passportNumber,
        },
        transportInstructions: transport,
        generatedAt: new Date().toISOString(),
      });
    },
  );
}
