/**
 * Subscription Limit Enforcement Middleware
 *
 * Reusable Fastify preHandler factory that checks if an organization
 * has reached its subscription limit for a given resource type.
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import type { SubscriptionLimits, SubscriptionTier } from "@equiduty/shared";
import { TIER_LIMITS } from "@equiduty/shared";

/**
 * Get the effective limit for a resource type.
 * Reads from org's subscription.limits first, falls back to tier defaults.
 */
async function getEffectiveLimit(
  orgId: string,
  limitKey: keyof SubscriptionLimits,
): Promise<number> {
  const orgDoc = await db.collection("organizations").doc(orgId).get();
  if (!orgDoc.exists) return 0;

  const data = orgDoc.data()!;

  // Check subscription object first (admin-set custom limits)
  const subLimit = data.subscription?.limits?.[limitKey];
  if (subLimit !== undefined) {
    return subLimit;
  }

  // Fall back to tier defaults
  const tier: SubscriptionTier =
    data.subscriptionTier || data.subscription?.tier || "free";
  return TIER_LIMITS[tier]?.[limitKey] ?? 0;
}

/**
 * Create a Fastify preHandler that checks subscription limits
 * before allowing resource creation.
 *
 * @param limitKey - The limit to check (e.g., "horses", "stables", "members")
 * @param countCollection - The Firestore collection to count existing resources
 * @param countField - The field name to match organizationId (default: "organizationId")
 */
export function checkSubscriptionLimit(
  limitKey: keyof SubscriptionLimits,
  countCollection: string,
  countField: string = "organizationId",
) {
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
      // If no orgId available, skip the check (route-level validation should catch this)
      return;
    }

    try {
      const limit = await getEffectiveLimit(organizationId, limitKey);

      // -1 means unlimited
      if (limit === -1) {
        return;
      }

      // Count current resources
      const countSnapshot = await db
        .collection(countCollection)
        .where(countField, "==", organizationId)
        .count()
        .get();

      const currentCount = countSnapshot.data().count;

      if (currentCount >= limit) {
        return reply.status(403).send({
          error: "Subscription limit reached",
          message: `Your subscription allows a maximum of ${limit} ${limitKey}. Please upgrade to add more.`,
          limitKey,
          currentCount,
          limit,
        });
      }
    } catch (error) {
      request.log.error(
        { error, limitKey, countCollection, organizationId },
        "Failed to check subscription limit",
      );
      // Don't block on limit check failure — allow the request through
    }
  };
}
