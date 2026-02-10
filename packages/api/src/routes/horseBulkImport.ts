/**
 * Horse Bulk Import API Routes
 *
 * POST /organizations/:id/bulk-import-horses
 * POST /organizations/:id/resolve-member-emails
 * GET /organizations/:id/horse-count
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { getDefaultTierDefinition } from "@equiduty/shared";
import { getTierDefaults } from "../utils/tierDefaults.js";

// Zod schema for horse bulk import
const bulkImportHorseSchema = z.object({
  name: z.string().min(1),
  ownerEmail: z
    .string()
    .email()
    .transform((e) => e.toLowerCase()),
  ownerId: z.string().min(1),
  ownerName: z.string(),
  color: z.string().default("brown"),
  currentStableId: z.string().min(1),
  currentStableName: z.string().min(1),
  // NEW optional fields
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  ueln: z.string().min(1).max(30).optional(), // Permissive - UELN formats vary by country
  chipNumber: z
    .string()
    .regex(/^\d{10,20}$/)
    .optional(),
});

const horseBulkImportRequestSchema = z
  .object({
    horses: z.array(bulkImportHorseSchema).min(1).max(500),
  })
  .refine(
    (data) => {
      // Check for duplicate horse names per owner
      const seen = new Set<string>();
      for (const h of data.horses) {
        const key = `${h.ownerId}:${h.name.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    },
    {
      message: "Duplicate horse names found for the same owner",
      path: ["horses"],
    },
  );

const resolveEmailsSchema = z.object({
  emails: z
    .array(
      z
        .string()
        .email()
        .transform((e) => e.toLowerCase()),
    )
    .min(1)
    .max(500),
});

export async function horseBulkImportRoutes(fastify: FastifyInstance) {
  /**
   * POST /organizations/:id/bulk-import-horses
   * Creates a bulk import job for importing horses.
   */
  fastify.post(
    "/:id/bulk-import-horses",
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
        const validation = horseBulkImportRequestSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const { horses } = validation.data;

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
            message: "You do not have permission to bulk import horses",
          });
        }

        // Check subscription horse limit
        const tier: string =
          org.subscriptionTier ||
          org.subscription?.tier ||
          getDefaultTierDefinition().tier;
        const tierDef = await getTierDefaults(tier);
        const horseLimit =
          org.subscription?.limits?.horses ?? tierDef?.limits?.horses ?? 0;

        if (horseLimit !== -1) {
          const horsesSnapshot = await db
            .collection("horses")
            .where("ownerOrganizationId", "==", organizationId)
            .where("status", "==", "active")
            .count()
            .get();

          const currentHorseCount = horsesSnapshot.data().count;
          const newTotal = currentHorseCount + horses.length;

          if (newTotal > horseLimit) {
            return reply.status(403).send({
              error: "Subscription limit exceeded",
              message: `This import would bring your horse count to ${newTotal}, exceeding your limit of ${horseLimit}. Please upgrade your subscription or reduce the number of horses to import.`,
              currentCount: currentHorseCount,
              importCount: horses.length,
              limit: horseLimit,
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
            type: "horses",
            organizationId,
            createdBy: user.uid,
            status: "pending",
            horses,
            progress: {
              total: horses.length,
              processed: 0,
              succeeded: 0,
              failed: 0,
            },
            horseResults: [],
            createdAt: now,
            updatedAt: now,
          });

        return reply.status(202).send({
          jobId,
        });
      } catch (error: any) {
        request.log.error({ error }, "Horse bulk import failed");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create horse bulk import job",
        });
      }
    },
  );

  /**
   * POST /organizations/:id/resolve-member-emails
   * Batch resolve emails to member user IDs and names.
   */
  fastify.post(
    "/:id/resolve-member-emails",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id: organizationId } = request.params as { id: string };
        const validation = resolveEmailsSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const { emails } = validation.data;

        // Verify user is member of org
        const userMemberId = `${user.uid}_${organizationId}`;
        const userMemberDoc = await db
          .collection("organizationMembers")
          .doc(userMemberId)
          .get();

        if (
          !userMemberDoc.exists ||
          userMemberDoc.data()?.status !== "active"
        ) {
          // Allow org owner too
          const orgDoc = await db
            .collection("organizations")
            .doc(organizationId)
            .get();
          if (!orgDoc.exists || orgDoc.data()?.ownerId !== user.uid) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "Not a member of this organization",
            });
          }
        }

        // Get all active members of the organization
        const membersSnapshot = await db
          .collection("organizationMembers")
          .where("organizationId", "==", organizationId)
          .where("status", "==", "active")
          .get();

        // Build email-to-member map
        const emailToMember = new Map<
          string,
          { userId: string; name: string }
        >();
        for (const doc of membersSnapshot.docs) {
          const data = doc.data();
          const memberEmail = (data.userEmail || "").toLowerCase();
          if (memberEmail) {
            const name =
              `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
              memberEmail;
            emailToMember.set(memberEmail, {
              userId: data.userId,
              name,
            });
          }
        }

        const resolved: Array<{
          email: string;
          userId: string;
          name: string;
        }> = [];
        const unresolved: string[] = [];

        for (const email of emails) {
          const member = emailToMember.get(email);
          if (member) {
            resolved.push({ email, ...member });
          } else {
            unresolved.push(email);
          }
        }

        return reply.send({ resolved, unresolved });
      } catch (error: any) {
        request.log.error({ error }, "Resolve member emails failed");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to resolve member emails",
        });
      }
    },
  );

  /**
   * GET /organizations/:id/horse-count
   * Return current active horse count for the organization.
   */
  fastify.get(
    "/:id/horse-count",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id: organizationId } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        // Verify user is member of org or owner
        const userMemberId = `${user.uid}_${organizationId}`;
        const [userMemberDoc, orgDoc] = await Promise.all([
          db.collection("organizationMembers").doc(userMemberId).get(),
          db.collection("organizations").doc(organizationId).get(),
        ]);

        const isMember =
          userMemberDoc.exists && userMemberDoc.data()?.status === "active";
        const isOwner = orgDoc.exists && orgDoc.data()?.ownerId === user.uid;

        if (!isMember && !isOwner && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Not authorized",
          });
        }

        const horsesSnapshot = await db
          .collection("horses")
          .where("ownerOrganizationId", "==", organizationId)
          .where("status", "==", "active")
          .count()
          .get();

        return reply.send({
          count: horsesSnapshot.data().count,
        });
      } catch (error: any) {
        request.log.error({ error }, "Get horse count failed");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get horse count",
        });
      }
    },
  );
}
