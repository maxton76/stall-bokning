import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { canAccessHorse } from "../utils/authorization.js";
import type {
  TeamMember,
  HorseTeam,
  TeamMemberInput,
} from "@stall-bokning/shared";
import type { AuthenticatedRequest } from "../types/index.js";

interface TeamParams {
  horseId: string;
  index?: string;
}

export async function horseTeamRoutes(fastify: FastifyInstance) {
  const db = getFirestore();

  // Get horse team
  fastify.get(
    "/horses/:horseId/team",
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

      // Get horse document which contains the team data
      const horseDoc = await db.collection("horses").doc(horseId).get();

      if (!horseDoc.exists) {
        return reply.status(404).send({ error: "Horse not found" });
      }

      const horseData = horseDoc.data();
      const team: HorseTeam = horseData?.team || { additionalContacts: [] };

      return reply.send(team);
    },
  );

  // Add team member
  fastify.post(
    "/horses/:horseId/team",
    async (
      request: FastifyRequest<{
        Params: { horseId: string };
        Body: TeamMemberInput;
      }>,
      reply: FastifyReply,
    ) => {
      const { horseId } = request.params;
      const userId = (request as AuthenticatedRequest).user?.uid;
      const memberData = request.body;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      // Get current horse document
      const horseRef = db.collection("horses").doc(horseId);
      const horseDoc = await horseRef.get();

      if (!horseDoc.exists) {
        return reply.status(404).send({ error: "Horse not found" });
      }

      const horseData = horseDoc.data();
      const currentTeam: HorseTeam = horseData?.team || {
        additionalContacts: [],
      };

      // Build the team member object
      const newMember: TeamMember = {
        role: memberData.role,
        displayName: memberData.displayName,
        email: memberData.email,
        phone: memberData.phone,
        isPrimary: memberData.isPrimary,
        notes: memberData.notes,
        externalName: memberData.externalName || memberData.displayName,
      };

      // If this is a primary role, update the default field
      if (memberData.isPrimary) {
        const roleFieldMap: Record<string, keyof HorseTeam> = {
          rider: "defaultRider",
          groom: "defaultGroom",
          farrier: "defaultFarrier",
          veterinarian: "defaultVet",
          trainer: "defaultTrainer",
          dentist: "defaultDentist",
        };

        const fieldName = roleFieldMap[memberData.role];
        if (fieldName) {
          (currentTeam as Record<string, unknown>)[fieldName] = newMember;
        } else {
          // Add to additional contacts
          if (!currentTeam.additionalContacts) {
            currentTeam.additionalContacts = [];
          }
          currentTeam.additionalContacts.push(newMember);
        }
      } else {
        // Add to additional contacts
        if (!currentTeam.additionalContacts) {
          currentTeam.additionalContacts = [];
        }
        currentTeam.additionalContacts.push(newMember);
      }

      // Update timestamps
      currentTeam.updatedAt =
        FieldValue.serverTimestamp() as unknown as typeof currentTeam.updatedAt;
      currentTeam.lastModifiedBy = userId;

      // Save to database
      await horseRef.update({ team: currentTeam });

      return reply.status(201).send({
        message: "Team member added successfully",
        member: newMember,
      });
    },
  );

  // Update team member
  fastify.put(
    "/horses/:horseId/team/:index",
    async (
      request: FastifyRequest<{
        Params: TeamParams;
        Body: TeamMemberInput;
      }>,
      reply: FastifyReply,
    ) => {
      const { horseId, index } = request.params;
      const userId = (request as AuthenticatedRequest).user?.uid;
      const memberData = request.body;
      const memberIndex = parseInt(index || "0", 10);

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      // Get current horse document
      const horseRef = db.collection("horses").doc(horseId);
      const horseDoc = await horseRef.get();

      if (!horseDoc.exists) {
        return reply.status(404).send({ error: "Horse not found" });
      }

      const horseData = horseDoc.data();
      const currentTeam: HorseTeam = horseData?.team || {
        additionalContacts: [],
      };

      // Build updated member
      const updatedMember: TeamMember = {
        role: memberData.role,
        displayName: memberData.displayName,
        email: memberData.email,
        phone: memberData.phone,
        isPrimary: memberData.isPrimary,
        notes: memberData.notes,
        externalName: memberData.externalName || memberData.displayName,
      };

      // Count existing members to find which one to update
      const allMembers: {
        member: TeamMember;
        source: string;
        fieldName?: keyof HorseTeam;
      }[] = [];

      // Collect default role members
      const defaultRoles: { role: string; field: keyof HorseTeam }[] = [
        { role: "rider", field: "defaultRider" },
        { role: "groom", field: "defaultGroom" },
        { role: "farrier", field: "defaultFarrier" },
        { role: "veterinarian", field: "defaultVet" },
        { role: "trainer", field: "defaultTrainer" },
        { role: "dentist", field: "defaultDentist" },
      ];

      defaultRoles.forEach(({ field }) => {
        const member = currentTeam[field] as TeamMember | undefined;
        if (member) {
          allMembers.push({ member, source: "default", fieldName: field });
        }
      });

      // Collect additional contacts
      if (currentTeam.additionalContacts) {
        currentTeam.additionalContacts.forEach(
          (member: TeamMember, idx: number) => {
            allMembers.push({ member, source: `additional-${idx}` });
          },
        );
      }

      if (memberIndex >= allMembers.length) {
        return reply.status(404).send({ error: "Team member not found" });
      }

      const targetMember = allMembers[memberIndex];

      // Update the member based on its location
      if (targetMember.source === "default" && targetMember.fieldName) {
        // Update a default role member
        if (memberData.isPrimary) {
          // Keep as default role member
          (currentTeam as Record<string, unknown>)[targetMember.fieldName] =
            updatedMember;
        } else {
          // Remove from default and add to additional contacts
          delete (currentTeam as Record<string, unknown>)[
            targetMember.fieldName
          ];
          if (!currentTeam.additionalContacts) {
            currentTeam.additionalContacts = [];
          }
          currentTeam.additionalContacts.push(updatedMember);
        }
      } else if (targetMember.source.startsWith("additional-")) {
        const additionalIndex = parseInt(targetMember.source.split("-")[1], 10);

        if (memberData.isPrimary) {
          // Move to default role
          const roleFieldMap: Record<string, keyof HorseTeam> = {
            rider: "defaultRider",
            groom: "defaultGroom",
            farrier: "defaultFarrier",
            veterinarian: "defaultVet",
            trainer: "defaultTrainer",
            dentist: "defaultDentist",
          };

          const fieldName = roleFieldMap[memberData.role];
          if (fieldName) {
            // Move existing default to additional if it exists
            const existingDefault = currentTeam[fieldName] as
              | TeamMember
              | undefined;
            if (existingDefault) {
              existingDefault.isPrimary = false;
              currentTeam.additionalContacts?.push(existingDefault);
            }
            (currentTeam as Record<string, unknown>)[fieldName] = updatedMember;
          }

          // Remove from additional contacts
          currentTeam.additionalContacts?.splice(additionalIndex, 1);
        } else {
          // Update in place in additional contacts
          if (currentTeam.additionalContacts) {
            currentTeam.additionalContacts[additionalIndex] = updatedMember;
          }
        }
      }

      // Update timestamps
      currentTeam.updatedAt =
        FieldValue.serverTimestamp() as unknown as typeof currentTeam.updatedAt;
      currentTeam.lastModifiedBy = userId;

      // Save to database
      await horseRef.update({ team: currentTeam });

      return reply.send({
        message: "Team member updated successfully",
        member: updatedMember,
      });
    },
  );

  // Delete team member
  fastify.delete(
    "/horses/:horseId/team/:index",
    async (
      request: FastifyRequest<{ Params: TeamParams }>,
      reply: FastifyReply,
    ) => {
      const { horseId, index } = request.params;
      const userId = (request as AuthenticatedRequest).user?.uid;
      const memberIndex = parseInt(index || "0", 10);

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Check authorization
      const hasAccess = await canAccessHorse(horseId, userId);
      if (!hasAccess) {
        return reply.status(403).send({ error: "Access denied to this horse" });
      }

      // Get current horse document
      const horseRef = db.collection("horses").doc(horseId);
      const horseDoc = await horseRef.get();

      if (!horseDoc.exists) {
        return reply.status(404).send({ error: "Horse not found" });
      }

      const horseData = horseDoc.data();
      const currentTeam: HorseTeam = horseData?.team || {
        additionalContacts: [],
      };

      // Count existing members to find which one to delete
      const allMembers: { source: string; fieldName?: keyof HorseTeam }[] = [];

      // Collect default role members
      const defaultRoles: { field: keyof HorseTeam }[] = [
        { field: "defaultRider" },
        { field: "defaultGroom" },
        { field: "defaultFarrier" },
        { field: "defaultVet" },
        { field: "defaultTrainer" },
        { field: "defaultDentist" },
      ];

      defaultRoles.forEach(({ field }) => {
        if (currentTeam[field]) {
          allMembers.push({ source: "default", fieldName: field });
        }
      });

      // Collect additional contacts
      if (currentTeam.additionalContacts) {
        currentTeam.additionalContacts.forEach((_: TeamMember, idx: number) => {
          allMembers.push({ source: `additional-${idx}` });
        });
      }

      if (memberIndex >= allMembers.length) {
        return reply.status(404).send({ error: "Team member not found" });
      }

      const targetMember = allMembers[memberIndex];

      // Delete the member based on its location
      if (targetMember.source === "default" && targetMember.fieldName) {
        delete (currentTeam as Record<string, unknown>)[targetMember.fieldName];
      } else if (targetMember.source.startsWith("additional-")) {
        const additionalIndex = parseInt(targetMember.source.split("-")[1], 10);
        currentTeam.additionalContacts?.splice(additionalIndex, 1);
      }

      // Update timestamps
      currentTeam.updatedAt =
        FieldValue.serverTimestamp() as unknown as typeof currentTeam.updatedAt;
      currentTeam.lastModifiedBy = userId;

      // Save to database
      await horseRef.update({ team: currentTeam });

      return reply.send({
        message: "Team member deleted successfully",
      });
    },
  );
}
