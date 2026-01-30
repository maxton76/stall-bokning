/**
 * Module Flag Enforcement Middleware
 *
 * Reusable Fastify preHandler factory that checks if an organization
 * has a specific module or addon enabled in its subscription.
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import type {
  ModuleFlags,
  SubscriptionAddons,
  SubscriptionTier,
} from "@equiduty/shared";
import { TIER_MODULES, TIER_ADDONS } from "@equiduty/shared";

type ModuleOrAddonKey = keyof ModuleFlags | keyof SubscriptionAddons;

/**
 * Create a Fastify preHandler that checks if a module or addon is enabled
 * for the requesting organization.
 *
 * @param moduleKey - The module or addon key to check (e.g., "analytics", "portal")
 */
export function checkModuleAccess(moduleKey: ModuleOrAddonKey) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    // Extract organizationId from query, params, or body
    const query = request.query as Record<string, string>;
    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown> | null;

    const organizationId =
      query?.organizationId ||
      params?.organizationId ||
      (body?.organizationId as string) ||
      undefined;

    if (!organizationId) {
      // If no orgId available, skip the check
      return;
    }

    try {
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

      const data = orgDoc.data()!;
      const tier: SubscriptionTier =
        data.subscriptionTier || data.subscription?.tier || "free";

      // Check module flags first (from subscription object)
      const subModules = data.subscription?.modules;
      const subAddons = data.subscription?.addons;

      let isEnabled = false;

      // Check in modules
      if (subModules && moduleKey in subModules) {
        isEnabled = subModules[moduleKey as keyof ModuleFlags];
      } else if (subAddons && moduleKey in subAddons) {
        isEnabled = subAddons[moduleKey as keyof SubscriptionAddons];
      } else {
        // Fall back to tier defaults
        const tierModules = TIER_MODULES[tier];
        const tierAddons = TIER_ADDONS[tier];

        if (moduleKey in (tierModules || {})) {
          isEnabled = tierModules[moduleKey as keyof ModuleFlags];
        } else if (moduleKey in (tierAddons || {})) {
          isEnabled = tierAddons[moduleKey as keyof SubscriptionAddons];
        }
      }

      if (!isEnabled) {
        return reply.status(403).send({
          error: "Module not available",
          message: `The "${moduleKey}" feature is not included in your subscription. Please upgrade to access this feature.`,
          moduleKey,
        });
      }
    } catch (error) {
      request.log.error(
        { error, moduleKey, organizationId },
        "Failed to check module access",
      );
      // Don't block on check failure — allow the request through
    }
  };
}
