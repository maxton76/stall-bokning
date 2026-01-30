/**
 * Stripe Tier Mapping Utility
 *
 * Resolves Stripe Price IDs to subscription tiers using
 * the stripeProducts Firestore collection with in-memory caching.
 */

import { db } from "./firebase.js";
import type { SubscriptionTier } from "@equiduty/shared";
import type { StripeProductMapping, BillingInterval } from "@equiduty/shared";

/** In-memory cache: priceId → { tier, billingInterval } */
let priceCache: Map<
  string,
  { tier: SubscriptionTier; billingInterval: BillingInterval }
> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadCache(): Promise<
  Map<string, { tier: SubscriptionTier; billingInterval: BillingInterval }>
> {
  const now = Date.now();
  if (priceCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return priceCache;
  }

  const snapshot = await db.collection("stripeProducts").get();
  const cache = new Map<
    string,
    { tier: SubscriptionTier; billingInterval: BillingInterval }
  >();

  for (const doc of snapshot.docs) {
    const data = doc.data() as StripeProductMapping;
    if (data.prices.month) {
      cache.set(data.prices.month, {
        tier: data.tier,
        billingInterval: "month",
      });
    }
    if (data.prices.year) {
      cache.set(data.prices.year, { tier: data.tier, billingInterval: "year" });
    }
  }

  priceCache = cache;
  cacheTimestamp = now;
  return cache;
}

/**
 * Look up the subscription tier and billing interval for a Stripe Price ID.
 */
export async function getTierFromPriceId(
  priceId: string,
): Promise<{
  tier: SubscriptionTier;
  billingInterval: BillingInterval;
} | null> {
  const cache = await loadCache();
  return cache.get(priceId) ?? null;
}

/**
 * Look up the Stripe Price ID for a given tier and billing interval.
 */
export async function getPriceIdForTier(
  tier: SubscriptionTier,
  billingInterval: BillingInterval,
): Promise<string | null> {
  const doc = await db.collection("stripeProducts").doc(tier).get();
  if (!doc.exists) return null;

  const data = doc.data() as StripeProductMapping;
  return data.prices[billingInterval] ?? null;
}

/**
 * Invalidate the in-memory cache (call after seeding new products).
 */
export function invalidateTierCache(): void {
  priceCache = null;
  cacheTimestamp = 0;
}
