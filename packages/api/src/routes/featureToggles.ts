import { FastifyInstance } from "fastify";
import {
  UpdateFeatureToggleRequest,
  CheckFeaturesRequest,
  CheckFeaturesResponse,
} from "@equiduty/shared";
import {
  getGlobalFeatureToggles,
  updateFeatureToggle,
  isFeatureEnabledForOrg,
  invalidateFeatureToggleCache,
} from "../services/featureToggleService.js";
import { authenticate } from "../middleware/auth.js";
import { requireSystemAdmin } from "../middleware/requireSystemAdmin.js";
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
  fastify.put<{
    Params: { key: string };
    Body: UpdateFeatureToggleRequest;
  }>(
    "/admin/feature-toggles/:key",
    {
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      try {
        const { key } = request.params as { key: string };
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

        await updateFeatureToggle(key, update, userId);

        return reply.code(200).send({
          success: true,
          message: `Feature toggle '${key}' updated successfully`,
        });
      } catch (error: unknown) {
        fastify.log.error({ error }, "Error updating feature toggle");

        if (error instanceof Error && error.message?.includes("not found")) {
          return reply.code(404).send({
            success: false,
            error: error.message,
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
   * POST /api/v1/admin/feature-toggles/cache/invalidate
   * Manually invalidate feature toggle cache (admin only)
   * Useful for forcing immediate refresh after updates
   */
  fastify.post(
    "/admin/feature-toggles/cache/invalidate",
    {
      preHandler: adminPreHandler,
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
  fastify.post<{
    Body: CheckFeaturesRequest;
  }>(
    "/feature-toggles/check",
    {
      preHandler: authenticate,
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

        // Get organization ID from request header or query param
        const organizationId = request.headers["x-organization-id"] as string;

        if (!organizationId) {
          return reply.code(400).send({
            success: false,
            error: "x-organization-id header is required",
          });
        }

        const { features } = request.body as CheckFeaturesRequest;

        if (!Array.isArray(features) || features.length === 0) {
          return reply.code(400).send({
            success: false,
            error: "features array is required and must not be empty",
          });
        }

        // Check each feature
        const results: CheckFeaturesResponse["features"] = {};

        for (const featureKey of features) {
          const result = await isFeatureEnabledForOrg(
            featureKey,
            organizationId,
          );
          results[featureKey] = result;
        }

        return reply.code(200).send({
          success: true,
          data: {
            features: results,
          },
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
