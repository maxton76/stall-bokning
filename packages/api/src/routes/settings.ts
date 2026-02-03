import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import type { UserPreferences } from "@equiduty/shared";

// Zod schema for preferences update
const preferencesUpdateSchema = z.object({
  defaultStableId: z.string().nullable().optional(),
  defaultOrganizationId: z.string().nullable().optional(),
  language: z.enum(["sv", "en"]).optional(),
});

// Default preferences when none exist
const DEFAULT_PREFERENCES: Omit<UserPreferences, "updatedAt"> = {
  language: "sv",
};

export async function settingsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  /**
   * GET /api/v1/settings/preferences
   * Get user preferences for the current user
   */
  fastify.get(
    "/preferences",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db
          .collection("users")
          .doc(user.uid)
          .collection("settings")
          .doc("preferences")
          .get();

        if (!doc.exists) {
          // Return default preferences
          return {
            preferences: {
              ...DEFAULT_PREFERENCES,
              updatedAt: new Date().toISOString(),
            },
          };
        }

        return { preferences: serializeTimestamps(doc.data()) };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch user preferences");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch preferences",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/settings/preferences
   * Update user preferences (partial update)
   */
  fastify.patch(
    "/preferences",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const validation = preferencesUpdateSchema.safeParse(request.body);
        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const input = validation.data;

        // Validate defaultStableId if provided (not null)
        if (input.defaultStableId) {
          // Check if user has access to this stable via organization membership
          const stableDoc = await db
            .collection("stables")
            .doc(input.defaultStableId)
            .get();

          if (!stableDoc.exists) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Stable not found",
            });
          }

          const stableData = stableDoc.data()!;

          // Check if user is stable owner
          const isOwner = stableData.ownerId === user.uid;

          // Check if user is member of the organization
          let hasOrgAccess = false;
          if (stableData.organizationId) {
            const memberId = `${user.uid}_${stableData.organizationId}`;
            const memberDoc = await db
              .collection("organizationMembers")
              .doc(memberId)
              .get();

            if (memberDoc.exists) {
              const memberData = memberDoc.data()!;
              if (memberData.status === "active") {
                // Check stable access
                if (
                  memberData.stableAccess === "all" ||
                  (memberData.stableAccess === "specific" &&
                    memberData.assignedStableIds?.includes(
                      input.defaultStableId,
                    ))
                ) {
                  hasOrgAccess = true;
                }
              }
            }
          }

          if (!isOwner && !hasOrgAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have access to this stable",
            });
          }
        }

        // Validate defaultOrganizationId if provided (not null)
        if (input.defaultOrganizationId) {
          const memberId = `${user.uid}_${input.defaultOrganizationId}`;
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(memberId)
            .get();

          if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You are not a member of this organization",
            });
          }
        }

        const prefRef = db
          .collection("users")
          .doc(user.uid)
          .collection("settings")
          .doc("preferences");

        const existingDoc = await prefRef.get();
        const existingData = existingDoc.exists
          ? existingDoc.data()
          : DEFAULT_PREFERENCES;

        // Build update object, handling null values for clearing
        const updates: Record<string, unknown> = {
          updatedAt: Timestamp.now(),
        };

        if (input.language !== undefined) {
          updates.language = input.language;
        }

        if (input.defaultStableId !== undefined) {
          // null means clear, undefined means don't change
          updates.defaultStableId =
            input.defaultStableId === null ? null : input.defaultStableId;
        }

        if (input.defaultOrganizationId !== undefined) {
          // null means clear, undefined means don't change
          updates.defaultOrganizationId =
            input.defaultOrganizationId === null
              ? null
              : input.defaultOrganizationId;
        }

        // Merge with existing data
        const updatedPreferences = {
          ...existingData,
          ...updates,
        };

        await prefRef.set(updatedPreferences, { merge: true });

        return { preferences: serializeTimestamps(updatedPreferences) };
      } catch (error) {
        request.log.error({ error }, "Failed to update user preferences");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update preferences",
        });
      }
    },
  );
}
