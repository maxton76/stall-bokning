import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import {
  authenticate,
  requireStableAccess,
  requireStableOwnership,
} from "../middleware/auth.js";
import type { AuthenticatedRequest, Stable } from "../types/index.js";
import { canCreateStable, getMaxStables } from "@equiduty/shared";

const pointsSystemSchema = z
  .object({
    resetPeriod: z
      .enum(["monthly", "quarterly", "yearly", "rolling", "never"])
      .optional(),
    memoryHorizonDays: z.number().int().min(30).max(365).optional(),
    holidayMultiplier: z.number().min(0.1).max(5.0).optional(),
  })
  .optional();

const schedulingConfigSchema = z
  .object({
    scheduleHorizonDays: z.number().int().min(7).max(90).optional(),
    autoAssignment: z.boolean().optional(),
    allowSwaps: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
  })
  .optional();

const notificationConfigSchema = z
  .object({
    emailNotifications: z.boolean().optional(),
    shiftReminders: z.boolean().optional(),
    schedulePublished: z.boolean().optional(),
    memberJoined: z.boolean().optional(),
    shiftSwapRequests: z.boolean().optional(),
  })
  .optional();

const createStableSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  address: z.string().optional(),
  facilityNumber: z.string().max(50).optional(), // Anläggningsnummer - Jordbruksverket registration
  organizationId: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  // Optional marketplace fields
  capacity: z.number().int().positive().optional(),
  availableStalls: z.number().int().min(0).optional(),
  pricePerMonth: z.number().positive().optional(),
  amenities: z.array(z.string()).default([]),
  // Configuration objects
  pointsSystem: pointsSystemSchema,
  schedulingConfig: schedulingConfigSchema,
  notificationConfig: notificationConfigSchema,
});

const updateStableSchema = createStableSchema.partial();

export async function stablesRoutes(fastify: FastifyInstance) {
  // Get all stables (requires authentication)
  // Returns only stables where user is a member or owner
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { ownedOnly, ownerId } = request.query as {
          ownedOnly?: string;
          ownerId?: string;
        };

        // If ownerId is specified (admin or self), filter by that owner
        const targetOwnerId =
          ownerId || (ownedOnly === "true" ? user.uid : null);

        // System admins can see all stables (or filter by ownerId)
        if (user.role === "system_admin") {
          let query = db.collection("stables");
          if (targetOwnerId) {
            query = query.where("ownerId", "==", targetOwnerId) as any;
          }
          const snapshot = await query.get();
          const stables = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          return { stables };
        }

        // If requesting owned stables only
        if (ownedOnly === "true") {
          const snapshot = await db
            .collection("stables")
            .where("ownerId", "==", user.uid)
            .get();
          const stables = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          return { stables };
        }

        // Regular users: get stables where they are owner or have org membership access
        const [ownedStables, orgMemberships] = await Promise.all([
          // Stables owned by user
          db.collection("stables").where("ownerId", "==", user.uid).get(),
          // Organization memberships for this user
          db
            .collection("organizationMembers")
            .where("userId", "==", user.uid)
            .where("status", "==", "active")
            .get(),
        ]);

        const ownedStablesList = ownedStables.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Get stables from organizations the user is a member of
        const memberStablesList: any[] = [];

        for (const memberDoc of orgMemberships.docs) {
          const memberData = memberDoc.data();
          const organizationId = memberData.organizationId;

          // Query stables belonging to this organization
          const orgStables = await db
            .collection("stables")
            .where("organizationId", "==", organizationId)
            .get();

          for (const stableDoc of orgStables.docs) {
            const stableId = stableDoc.id;

            // Check if user has access to this specific stable
            if (memberData.stableAccess === "all") {
              memberStablesList.push({
                id: stableId,
                ...stableDoc.data(),
              });
            } else if (memberData.stableAccess === "specific") {
              const assignedStables = memberData.assignedStableIds || [];
              if (assignedStables.includes(stableId)) {
                memberStablesList.push({
                  id: stableId,
                  ...stableDoc.data(),
                });
              }
            }
          }
        }

        // Combine and deduplicate
        const allStables = [...ownedStablesList, ...memberStablesList];
        const uniqueStables = Array.from(
          new Map(allStables.map((stable) => [stable.id, stable])).values(),
        );

        return { stables: uniqueStables };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stables");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stables",
        });
      }
    },
  );

  // Get single stable (requires authentication and membership)
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const doc = await db.collection("stables").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Stable not found",
          });
        }

        return {
          id: doc.id,
          ...doc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable",
        });
      }
    },
  );

  // Create stable (any authenticated user can create a stable)
  // The user becomes the owner of the stable via ownerId field
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = createStableSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;

        // Feature gate: Check if organization can create more stables
        if (validation.data.organizationId) {
          const orgDoc = await db
            .collection("organizations")
            .doc(validation.data.organizationId)
            .get();

          if (orgDoc.exists) {
            const org = orgDoc.data()!;

            // Check if user has permission to create stables for this org
            const memberId = `${user.uid}_${validation.data.organizationId}`;
            const memberDoc = await db
              .collection("organizationMembers")
              .doc(memberId)
              .get();

            if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
              return reply.status(403).send({
                error: "Forbidden",
                message: "You do not have access to this organization",
              });
            }

            // Check stable creation limits (use subscription obj if available)
            if (!canCreateStable(org as any, org.subscription)) {
              const maxStables = getMaxStables(org as any, org.subscription);
              return reply.status(403).send({
                error: "Forbidden",
                message: `You have reached the maximum number of stables (${maxStables}) for your subscription tier. Please upgrade to create more stables.`,
                code: "STABLE_LIMIT_REACHED",
              });
            }
          }
        }

        const stableData: Stable = {
          ...validation.data,
          ownerId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const docRef = await db.collection("stables").add(stableData);
        const doc = await docRef.get();

        // Update organization stableCount if linked to an organization
        if (validation.data.organizationId) {
          const currentCount = await db
            .collection("stables")
            .where("organizationId", "==", validation.data.organizationId)
            .count()
            .get();

          await db
            .collection("organizations")
            .doc(validation.data.organizationId)
            .update({
              "stats.stableCount": currentCount.data().count,
              updatedAt: new Date(),
            });
        }

        return reply.status(201).send({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create stable",
        });
      }
    },
  );

  // Update stable (requires authentication and ownership or admin)
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate, requireStableOwnership()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = updateStableSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const docRef = db.collection("stables").doc(id);

        // Middleware already verified ownership, no need to check again
        const updateData = {
          ...validation.data,
          updatedAt: new Date(),
        };

        await docRef.update(updateData);
        const updatedDoc = await docRef.get();

        return {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to update stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update stable",
        });
      }
    },
  );

  // Delete stable (requires authentication and ownership or admin)
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate, requireStableOwnership()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const docRef = db.collection("stables").doc(id);

        // Middleware already verified ownership and existence, no need to check again
        await docRef.delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete stable");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete stable",
        });
      }
    },
  );

  // Get members for a stable (queries organizationMembers with stable access)
  fastify.get(
    "/:id/members",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { id: stableId } = request.params as { id: string };
        const { includeUserDetails } = request.query as {
          includeUserDetails?: string;
        };

        // Get the stable to find its organization
        const stableDoc = await db.collection("stables").doc(stableId).get();
        if (!stableDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Stable not found",
          });
        }

        const stable = stableDoc.data();
        const organizationId = stable?.organizationId;

        if (!organizationId) {
          // Stable has no organization - return empty members list
          return { members: [] };
        }

        // Query active organization members
        const membersSnapshot = await db
          .collection("organizationMembers")
          .where("organizationId", "==", organizationId)
          .where("status", "==", "active")
          .get();

        // Filter members who have access to this stable
        const membersWithAccess = membersSnapshot.docs.filter((doc) => {
          const data = doc.data();
          if (data.stableAccess === "all") return true;
          if (data.stableAccess === "specific") {
            const assignedStables = data.assignedStableIds || [];
            return assignedStables.includes(stableId);
          }
          return false;
        });

        if (includeUserDetails === "true") {
          const userIds = membersWithAccess.map((doc) => doc.data().userId);

          if (userIds.length === 0) {
            return { members: [] };
          }

          // Batch fetch user details
          const userRefs = userIds.map((id) => db.collection("users").doc(id));
          const usersSnapshot = await db.getAll(...userRefs);

          const userMap = new Map();
          usersSnapshot.forEach((doc) => {
            if (doc.exists) {
              userMap.set(doc.id, doc.data());
            }
          });

          const members = membersWithAccess.map((doc) => {
            const memberData = doc.data();
            const userData = userMap.get(memberData.userId) || {};

            return {
              id: doc.id,
              ...memberData,
              displayName:
                userData.displayName ||
                `${memberData.firstName || ""} ${memberData.lastName || ""}`.trim(),
              email: userData.email || memberData.userEmail,
              firstName: userData.firstName || memberData.firstName,
              lastName: userData.lastName || memberData.lastName,
            };
          });

          return { members };
        } else {
          const members = membersWithAccess.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return { members };
        }
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable members");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable members",
        });
      }
    },
  );

  // Remove a member's access to a stable (updates organizationMember's assignedStableIds)
  fastify.delete(
    "/:stableId/members/:memberId",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { stableId, memberId } = request.params as {
          stableId: string;
          memberId: string;
        };

        // Get the organization member document
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (!memberDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member not found",
          });
        }

        const memberData = memberDoc.data();

        // Verify this stable belongs to the member's organization
        const stableDoc = await db.collection("stables").doc(stableId).get();
        if (!stableDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Stable not found",
          });
        }

        const stableData = stableDoc.data();
        if (stableData?.organizationId !== memberData?.organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Stable does not belong to member's organization",
          });
        }

        // If member has "all" access, we can't remove individual stable access
        if (memberData?.stableAccess === "all") {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Cannot remove stable access from member with 'all' access. Update their access level first.",
          });
        }

        // Remove stableId from assignedStableIds
        const assignedStables = memberData?.assignedStableIds || [];
        const updatedStables = assignedStables.filter(
          (id: string) => id !== stableId,
        );

        await db.collection("organizationMembers").doc(memberId).update({
          assignedStableIds: updatedStables,
        });

        return reply.status(204).send();
      } catch (error) {
        request.log.error(
          { error },
          "Failed to remove stable access for member",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to remove stable access for member",
        });
      }
    },
  );

  // Get invites for a stable
  fastify.get(
    "/:id/invites",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { id: stableId } = request.params as { id: string };

        // Query all invites for this stable
        const invitesSnapshot = await db
          .collection("invites")
          .where("stableId", "==", stableId)
          .get();

        const invites = invitesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return { invites };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable invites");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable invites",
        });
      }
    },
  );
}
