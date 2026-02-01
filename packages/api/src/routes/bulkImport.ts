/**
 * Bulk Import API Route
 *
 * POST /organizations/:id/bulk-import
 * Creates a bulk import job for inviting multiple members at once.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { getDefaultTierDefinition } from "@equiduty/shared";
import type { OrganizationRole } from "@equiduty/shared";
import { getTierDefaults } from "../utils/tierDefaults.js";

// Valid organization roles (must match OrganizationRole type)
const VALID_ROLES = [
  "administrator",
  "schedule_planner",
  "veterinarian",
  "dentist",
  "farrier",
  "customer",
  "groom",
  "saddle_maker",
  "horse_owner",
  "rider",
  "inseminator",
  "trainer",
  "training_admin",
  "support_contact",
] as const satisfies readonly OrganizationRole[];

const organizationRoleSchema = z.enum(
  VALID_ROLES as unknown as [OrganizationRole, ...OrganizationRole[]],
);

// Zod schema for bulk import request validation
const bulkImportMemberSchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((e) => e.toLowerCase()),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[\d\s\-()]{7,15}$/, "Invalid phone number format")
      .optional(),
    roles: z.array(organizationRoleSchema).min(1),
    primaryRole: organizationRoleSchema,
  })
  .refine((data) => data.roles.includes(data.primaryRole), {
    message: "primaryRole must be included in roles array",
    path: ["primaryRole"],
  });

const bulkImportRequestSchema = z
  .object({
    members: z.array(bulkImportMemberSchema).min(1).max(100),
  })
  .refine(
    (data) => {
      const emails = data.members.map((m) => m.email);
      return new Set(emails).size === emails.length;
    },
    {
      message: "Duplicate emails found in members array",
      path: ["members"],
    },
  );

export async function bulkImportRoutes(fastify: FastifyInstance) {
  // POST /organizations/:id/bulk-import
  fastify.post(
    "/:id/bulk-import",
    {
      preHandler: [authenticate],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: 60 * 60 * 1000,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id: organizationId } = request.params as { id: string };
        const validation = bulkImportRequestSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const { members } = validation.data;

        // Get organization
        const orgDoc = await db
          .collection("organizations")
          .doc(organizationId)
          .get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const org = orgDoc.data()!;

        // Check permissions: owner, administrator, or system_admin
        const userMemberId = `${user.uid}_${organizationId}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();
        const userMemberData = userMemberDoc.data();
        const isAdministrator =
          userMemberData?.status === "active" &&
          userMemberData?.roles?.includes("administrator");

        if (
          org.ownerId !== user.uid &&
          !isAdministrator &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to bulk import members",
          });
        }

        // Check subscription member limit
        const tier: string =
          org.subscriptionTier ||
          org.subscription?.tier ||
          getDefaultTierDefinition().tier;
        const tierDef = await getTierDefaults(tier);
        const memberLimit =
          org.subscription?.limits?.members ?? tierDef?.limits?.members ?? 0;

        if (memberLimit !== -1) {
          // Count current active members + pending members + pending invites
          const [
            activeMembersSnapshot,
            pendingMembersSnapshot,
            invitesSnapshot,
          ] = await Promise.all([
            db
              .collection("organizationMembers")
              .where("organizationId", "==", organizationId)
              .where("status", "==", "active")
              .count()
              .get(),
            db
              .collection("organizationMembers")
              .where("organizationId", "==", organizationId)
              .where("status", "==", "pending")
              .count()
              .get(),
            db
              .collection("invites")
              .where("organizationId", "==", organizationId)
              .where("status", "==", "pending")
              .count()
              .get(),
          ]);

          const currentCount =
            activeMembersSnapshot.data().count +
            pendingMembersSnapshot.data().count +
            invitesSnapshot.data().count;
          const newTotal = currentCount + members.length;

          if (newTotal > memberLimit) {
            return reply.status(403).send({
              error: "Subscription limit exceeded",
              message: `This import would bring your member count to ${newTotal}, exceeding your limit of ${memberLimit}. Please upgrade your subscription or reduce the number of members to import.`,
              currentCount,
              importCount: members.length,
              limit: memberLimit,
            });
          }
        }

        // Create bulk import job document
        const jobId = uuidv4();
        const now = Timestamp.now();

        await db
          .collection("bulkImportJobs")
          .doc(jobId)
          .set({
            id: jobId,
            organizationId,
            createdBy: user.uid,
            status: "pending",
            members,
            progress: {
              total: members.length,
              processed: 0,
              succeeded: 0,
              failed: 0,
            },
            results: [],
            createdAt: now,
            updatedAt: now,
          });

        return reply.status(202).send({
          jobId,
        });
      } catch (error: any) {
        request.log.error({ error }, "Bulk import failed");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create bulk import job",
        });
      }
    },
  );
}
