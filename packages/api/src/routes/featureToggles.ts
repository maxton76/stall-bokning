import { FastifyInstance } from "fastify";
import {
  UpdateFeatureToggleRequest,
  CheckFeaturesRequest,
  FeatureToggleMap,
} from "@equiduty/shared";
import {
  getGlobalFeatureToggles,
  updateFeatureToggle,
  isFeatureEnabledForOrg,
  invalidateFeatureToggleCache,
} from "../services/featureToggleService.js";
import { authenticate } from "../middleware/auth.js";
import { requireSystemAdmin } from "../middleware/requireSystemAdmin.js";
import { hasOrganizationAccess } from "../utils/authorization.js";
import type { AuthenticatedRequest } from "../types/index.js";

const adminPreHandler = [authenticate, requireSystemAdmin];

/**
 * Feature toggle routes
 *
 * Admin routes (protected):
 * - GET /api/v1/admin/feature-toggles - List all global feature toggles
 * - PUT /api/v1/admin/feature-toggles/:key - Update specific feature toggle
 * - POST /api/v1/admin/feature-toggles/cache/invalidate - Manually invalidate cache
 *
 * Public routes (organization-scoped):
 * - POST /api/v1/feature-toggles/check - Check if features are enabled for current org
 */
export default async function featureToggleRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  /**
   * GET /api/v1/admin/feature-toggles
   * List all global feature toggles (admin only)
   */
  fastify.get(
    "/admin/feature-toggles",
    {
      preHandler: adminPreHandler,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    async (_request, reply) => {
      try {
        const toggles = await getGlobalFeatureToggles();

        return reply.code(200).send({
          success: true,
          data: toggles,
        });
      } catch (error: unknown) {
        fastify.log.error({ error }, "Error fetching feature toggles");
        return reply.code(500).send({
          success: false,
          error: "Failed to fetch feature toggles",
        });
      }
    },
  );

  /**
   * PUT /api/v1/admin/feature-toggles/:key
   * Update a specific feature toggle (admin only)
   */
  const updateToggleSchema = {
    params: {
      type: "object" as const,
      required: ["key"],
      properties: {
        key: {
          type: "string" as const,
          pattern: "^[a-zA-Z0-9_-]+$",
          minLength: 1,
          maxLength: 64,
        },
      },
    },
    body: {
      type: "object" as const,
      required: ["enabled"],
      properties: {
        enabled: { type: "boolean" as const },
        rolloutPhase: {
          type: "string" as const,
          enum: ["internal", "beta", "general"],
        },
      },
    },
  };

  fastify.put<{
    Params: { key: string };
    Body: UpdateFeatureToggleRequest;
  }>(
    "/admin/feature-toggles/:key",
    {
      preHandler: adminPreHandler,
      schema: updateToggleSchema,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      try {
        const update = request.body as UpdateFeatureToggleRequest;
        const userId = (request as AuthenticatedRequest).user?.uid;

        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: "Unauthorized",
          });
        }

        // Validate request body
        if (typeof update.enabled !== "boolean") {
          return reply.code(400).send({
            success: false,
            error: "enabled field is required and must be a boolean",
          });
        }

        if (
          update.rolloutPhase &&
          !["internal", "beta", "general"].includes(update.rolloutPhase)
        ) {
          return reply.code(400).send({
            success: false,
            error: "rolloutPhase must be one of: internal, beta, general",
          });
        }

        // Validate rollout phase progression (no rollback)
        if (update.rolloutPhase) {
          const PHASE_ORDER: Record<string, number> = {
            internal: 1,
            beta: 2,
            general: 3,
          };

          const toggles = await getGlobalFeatureToggles();
          const existingToggle = toggles[key];

          if (existingToggle?.rolloutPhase) {
            const currentPhase = PHASE_ORDER[existingToggle.rolloutPhase];
            const newPhase = PHASE_ORDER[update.rolloutPhase];

            if (newPhase < currentPhase) {
              return reply.code(400).send({
                success: false,
                error: `Cannot rollback from ${existingToggle.rolloutPhase} to ${update.rolloutPhase}`,
              });
            }
          }
        }

        await updateFeatureToggle(key, update, userId);

        return reply.code(200).send({
          success: true,
          message: `Feature toggle '${key}' updated successfully`,
        });
      } catch (error: unknown) {
        fastify.log.error(
          { error, featureKey: key },
          "Error updating feature toggle",
        );

        if (error instanceof Error && error.message?.includes("not found")) {
          return reply.code(404).send({
            success: false,
            error: "Resource not found",
          });
        }

        if (
          error instanceof Error &&
          error.message?.includes("Operation not permitted")
        ) {
          return reply.code(400).send({
            success: false,
            error: "Operation not permitted",
          });
        }

        return reply.code(500).send({
          success: false,
          error: "Failed to update feature toggle",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/admin/feature-toggles/:key
   * Delete a feature toggle (admin only)
   * Prevents deletion if feature has active beta users or dependents
   */
  const deleteToggleSchema = {
    params: {
      type: "object" as const,
      required: ["key"],
      properties: {
        key: {
          type: "string" as const,
          pattern: "^[a-zA-Z0-9_-]+$",
          minLength: 1,
          maxLength: 64,
        },
      },
    },
  };

  fastify.delete<{
    Params: { key: string };
  }>(
    "/admin/feature-toggles/:key",
    {
      preHandler: adminPreHandler,
      schema: deleteToggleSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { key } = request.params as { key: string };
      try {
        const { getFirestore } = await import("firebase-admin/firestore");
        const db = getFirestore();

        // Check if any org has beta access
        const orgsWithBeta = await db
          .collection("organizations")
          .where("betaFeatures", "array-contains", key)
          .limit(1)
          .get();

        if (!orgsWithBeta.empty) {
          return reply.code(409).send({
            success: false,
            error: "Cannot delete feature toggle with active beta users",
          });
        }

        // Check if any features depend on this one
        const toggles = await getGlobalFeatureToggles();
        const dependents = Object.entries(toggles).filter(
          ([, toggle]) => toggle.dependsOn === key,
        );

        if (dependents.length > 0) {
          return reply.code(409).send({
            success: false,
            error: "Cannot delete feature toggle with dependent features",
          });
        }

        // Delete using transaction
        const docRef = db.doc("featureToggles/global");
        await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(docRef);
          if (!doc.exists) {
            throw new Error("Feature toggles document not found");
          }

          const allToggles = doc.data() as FeatureToggleMap;
          const { [key]: _, ...remainingToggles } = allToggles;

          transaction.set(docRef, remainingToggles);
        });

        // Invalidate cache
        invalidateFeatureToggleCache();

        return reply.code(200).send({
          success: true,
          message: `Feature toggle '${key}' deleted successfully`,
        });
      } catch (error: unknown) {
        fastify.log.error(
          { error, featureKey: key },
          "Error deleting feature toggle",
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to delete feature toggle",
        });
      }
    },
  );

  /**
   * POST /api/v1/admin/feature-toggles/cache/invalidate
   * Manually invalidate feature toggle cache (admin only)
   * Useful for forcing immediate refresh after updates
   */
  fastify.post(
    "/admin/feature-toggles/cache/invalidate",
    {
      preHandler: adminPreHandler,
      config: {
        rateLimit: {
          max: 10, // 10 requests
          timeWindow: "1 minute",
        },
      },
    },
    async (_request, reply) => {
      try {
        invalidateFeatureToggleCache();

        return reply.code(200).send({
          success: true,
          message: "Feature toggle cache invalidated successfully",
        });
      } catch (error: unknown) {
        fastify.log.error({ error }, "Error invalidating cache");
        return reply.code(500).send({
          success: false,
          error: "Failed to invalidate cache",
        });
      }
    },
  );

  /**
   * POST /api/v1/feature-toggles/check
   * Check if features are enabled for the current organization
   * Public endpoint (requires authentication but not admin)
   */
  const checkFeaturesSchema = {
    body: {
      type: "object" as const,
      required: ["features"],
      additionalProperties: false,
      properties: {
        features: {
          type: "array" as const,
          minItems: 1,
          maxItems: 50, // Prevent DoS
          items: {
            type: "string" as const,
            minLength: 1,
            maxLength: 64,
            pattern: "^[a-zA-Z0-9_-]+$", // Only valid feature key chars
          },
        },
      },
    },
    headers: {
      type: "object" as const,
      required: ["x-organization-id"],
      properties: {
        "x-organization-id": {
          type: "string" as const,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
  };

  fastify.post<{
    Body: CheckFeaturesRequest;
  }>(
    "/feature-toggles/check",
    {
      preHandler: authenticate,
      schema: checkFeaturesSchema,
      bodyLimit: 10 * 1024, // 10KB limit for this route
      config: {
        rateLimit: {
          max: 100,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = (request as AuthenticatedRequest).user?.uid;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: "Unauthorized",
          });
        }

        // Get organization ID from request header with proper type handling
        const orgIdHeader = request.headers["x-organization-id"];
        const organizationId = Array.isArray(orgIdHeader)
          ? orgIdHeader[0]
          : orgIdHeader;

        if (!organizationId || typeof organizationId !== "string") {
          return reply.code(400).send({
            success: false,
            error: "x-organization-id header is required and must be a string",
          });
        }

        // AUTHORIZATION CHECK: Verify user has access to this organization
        const user = (request as AuthenticatedRequest).user;
        if (user?.role !== "system_admin") {
          const hasAccess = await hasOrganizationAccess(userId, organizationId);

          if (!hasAccess) {
            return reply.code(403).send({
              success: false,
              error: "Forbidden: You do not have access to this organization",
            });
          }
        }

        const { features } = request.body as CheckFeaturesRequest;

        // Batch parallel reads to prevent resource exhaustion
        const BATCH_SIZE = 10;
        const results: Record<string, any> = {};
        const errors: string[] = [];

        for (let i = 0; i < features.length; i += BATCH_SIZE) {
          const batch = features.slice(i, i + BATCH_SIZE);
          const batchChecks = batch.map((featureKey) =>
            isFeatureEnabledForOrg(featureKey, organizationId).then(
              (result) => ({
                featureKey,
                result,
              }),
            ),
          );

          const batchResults = await Promise.allSettled(batchChecks);
          batchResults.forEach((promiseResult, index) => {
            const featureKey = batch[index];
            if (promiseResult.status === "fulfilled") {
              results[featureKey] = promiseResult.value.result;
            } else {
              errors.push(featureKey);
              results[featureKey] = { enabled: false, reason: "error" };
              fastify.log.error(
                { featureKey, error: promiseResult.reason },
                "Failed to check feature",
              );
            }
          });
        }

        return reply.code(200).send({
          success: errors.length === 0,
          data: {
            features: results,
          },
          ...(errors.length > 0 && {
            partialFailure: true,
            failedFeatures: errors,
          }),
        });
      } catch (error: unknown) {
        fastify.log.error({ error }, "Error checking features");
        return reply.code(500).send({
          success: false,
          error: "Failed to check features",
        });
      }
    },
  );
}
