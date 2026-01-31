import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import type {
  OnboardingState,
  OnboardingGuideVariant,
  UpdateOnboardingInput,
} from "@equiduty/shared";

/** Allowlist of valid onboarding step IDs to prevent Firestore path injection */
const VALID_STEP_IDS = new Set([
  // Current step IDs
  "complete-profile",
  "org-settings",
  "stable-choice",
  "invite-member",
  "add-horse",
  "health-activities",
  "planning-activities",
  "feeding-settings",
  "feeding-schedule",
  "routine-templates",
  "schedule-routines",
  // Guest steps
  "join-stable",
  "view-horses",
  "view-schedule",
  // Deprecated IDs kept for backwards compatibility
  "name-organization",
  "create-stable",
]);

/** Migration map: old step IDs → new step IDs */
const STEP_MIGRATION_MAP: Record<string, string> = {
  "name-organization": "org-settings",
  "create-stable": "stable-choice",
};

/**
 * Determine guide variant from user's Firestore profile
 */
async function getGuideVariant(_uid: string): Promise<OnboardingGuideVariant> {
  // All users get the full 11-step onboarding flow
  return "stable_owner";
}

/**
 * Create default onboarding state for a new user
 */
function createDefaultState(variant: OnboardingGuideVariant): OnboardingState {
  const now = Timestamp.now();
  return {
    guideVariant: variant,
    completedSteps: {},
    dismissed: false,
    minimized: false,
    startedAt: now as unknown as Date,
    updatedAt: now as unknown as Date,
  };
}

export async function onboardingRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // ONBOARDING GUIDE STATE
  // ============================================================================

  /**
   * GET /api/v1/settings/onboarding
   * Get or initialize onboarding state for the current user
   */
  fastify.get(
    "/onboarding",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const docRef = db
          .collection("users")
          .doc(user.uid)
          .collection("settings")
          .doc("onboarding");

        const doc = await docRef.get();

        if (!doc.exists) {
          // Auto-initialize onboarding state on first access
          const variant = await getGuideVariant(user.uid);
          const defaultState = createDefaultState(variant);
          await docRef.set(defaultState);
          return { onboarding: serializeTimestamps(defaultState) };
        }

        const data = doc.data() as OnboardingState;
        const currentVariant = await getGuideVariant(user.uid);

        if (data.guideVariant !== currentVariant) {
          // Variant changed — reset to new variant with fresh state
          const freshState = createDefaultState(currentVariant);
          await docRef.set(freshState);
          return { onboarding: serializeTimestamps(freshState) };
        }

        // One-time migration: remap deprecated step IDs to new ones
        const completedSteps = data?.completedSteps || {};
        const migrationUpdates: Record<string, unknown> = {};

        for (const [oldId, newId] of Object.entries(STEP_MIGRATION_MAP)) {
          if (completedSteps[oldId] && !completedSteps[newId]) {
            migrationUpdates[`completedSteps.${newId}`] = completedSteps[oldId];
          }
        }

        if (Object.keys(migrationUpdates).length > 0) {
          migrationUpdates.updatedAt = Timestamp.now();
          await docRef.update(migrationUpdates);
          const migratedDoc = await docRef.get();
          return { onboarding: serializeTimestamps(migratedDoc.data()) };
        }

        return { onboarding: serializeTimestamps(data) };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch onboarding state");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch onboarding state",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/settings/onboarding
   * Update onboarding state (complete step, dismiss, toggle minimize)
   */
  fastify.patch(
    "/onboarding",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const input = request.body as UpdateOnboardingInput;

        if (!input || Object.keys(input).length === 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "No update fields provided",
          });
        }

        const docRef = db
          .collection("users")
          .doc(user.uid)
          .collection("settings")
          .doc("onboarding");

        // Ensure doc exists
        let doc = await docRef.get();
        if (!doc.exists) {
          const variant = await getGuideVariant(user.uid);
          const defaultState = createDefaultState(variant);
          await docRef.set(defaultState);
          doc = await docRef.get();
        }

        const updates: Record<string, unknown> = {
          updatedAt: Timestamp.now(),
        };

        // Complete a step
        if (input.completeStep) {
          const { stepId, resourceId } = input.completeStep;
          if (!stepId) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "stepId is required when completing a step",
            });
          }

          if (!VALID_STEP_IDS.has(stepId)) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Invalid stepId",
            });
          }

          updates[`completedSteps.${stepId}`] = {
            completedAt: Timestamp.now(),
            ...(resourceId ? { resourceId } : {}),
          };
        }

        // Dismiss guide
        if (input.dismissed !== undefined) {
          if (typeof input.dismissed !== "boolean") {
            return reply.status(400).send({
              error: "Bad Request",
              message: "dismissed must be a boolean",
            });
          }
          updates.dismissed = input.dismissed;
        }

        // Toggle minimize
        if (input.minimized !== undefined) {
          if (typeof input.minimized !== "boolean") {
            return reply.status(400).send({
              error: "Bad Request",
              message: "minimized must be a boolean",
            });
          }
          updates.minimized = input.minimized;
        }

        await docRef.update(updates);

        // Fetch updated document
        const updatedDoc = await docRef.get();
        return { onboarding: serializeTimestamps(updatedDoc.data()) };
      } catch (error) {
        request.log.error({ error }, "Failed to update onboarding state");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update onboarding state",
        });
      }
    },
  );
}
