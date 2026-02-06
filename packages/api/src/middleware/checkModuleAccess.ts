/**
 * Module Flag Enforcement Middleware
 *
 * Reusable Fastify preHandler factory that checks if an organization
 * has a specific module or addon enabled in its subscription.
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import type { ModuleFlags, SubscriptionAddons } from "@equiduty/shared";
import { getDefaultTierDefinition } from "@equiduty/shared";
import { getTierDefaults } from "../utils/tierDefaults.js";

export type ModuleOrAddonKey = keyof ModuleFlags | keyof SubscriptionAddons;

/**
 * Check if a module or addon is enabled for a given organization.
 * Reusable logic that can be called from route handlers directly.
 *
 * @returns true if the module is enabled, false otherwise
 */
export async function isModuleEnabled(
  organizationId: string,
  moduleKey: ModuleOrAddonKey,
): Promise<boolean> {
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  if (!orgDoc.exists) return true; // Org not found — don't gate

  const data = orgDoc.data()!;
  const tier: string =
    data.subscriptionTier ||
    data.subscription?.tier ||
    getDefaultTierDefinition().tier;

  const subModules = data.subscription?.modules;
  const subAddons = data.subscription?.addons;

  // Check in modules
  if (subModules && moduleKey in subModules) {
    return subModules[moduleKey as keyof ModuleFlags];
  }
  if (subAddons && moduleKey in subAddons) {
    return subAddons[moduleKey as keyof SubscriptionAddons];
  }

  // Fall back to tier defaults from Firestore/cache
  const tierDef = await getTierDefaults(tier);
  if (tierDef) {
    if (moduleKey in (tierDef.modules || {})) {
      return tierDef.modules[moduleKey as keyof ModuleFlags];
    }
    if (moduleKey in (tierDef.addons || {})) {
      return tierDef.addons[moduleKey as keyof SubscriptionAddons];
    }
  }

  return false;
}

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
    // Extract organizationId only from URL params (never from body to prevent spoofing)
    const params = request.params as Record<string, string>;

    let organizationId = params?.organizationId || params?.orgId || undefined;

    // Fallback: resolve organizationId from stableId if present
    if (!organizationId && params?.stableId) {
      try {
        const stableDoc = await db
          .collection("stables")
          .doc(params.stableId)
          .get();
        if (stableDoc.exists) {
          organizationId = stableDoc.data()?.organizationId;
        }
      } catch {
        // Fall through to the !organizationId check below
      }
    }

    if (!organizationId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Organization ID is required to check module access",
      });
    }

    try {
      const enabled = await isModuleEnabled(organizationId, moduleKey);

      if (!enabled) {
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
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to verify module access. Please try again.",
      });
    }
  };
}
