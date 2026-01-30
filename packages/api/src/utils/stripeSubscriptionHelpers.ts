/**
 * Stripe Subscription Helper Utilities
 *
 * Shared logic for resolving tiers and building subscription data
 * from Stripe subscription objects. Used by webhooks and admin routes.
 */

import Stripe from "stripe";
import { db } from "./firebase.js";
import { getTierFromPriceId } from "./stripeTierMapping.js";
import type {
  OrganizationStripeSubscription,
  StripeSubscriptionStatus,
  SubscriptionTier,
  BillingInterval,
} from "@equiduty/shared";

/**
 * Find the organization ID associated with a Stripe customer ID.
 */
export async function findOrgByCustomerId(
  customerId: string,
): Promise<string | null> {
  const snapshot = await db
    .collection("organizations")
    .where("stripeSubscription.customerId", "==", customerId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].id;
}

/**
 * Resolve a subscription tier and billing interval from a Stripe Subscription object.
 */
export async function resolveTierFromSubscription(
  subscription: Stripe.Subscription,
): Promise<{
  tier: SubscriptionTier;
  billingInterval: BillingInterval;
} | null> {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return null;

  // Try tier mapping cache first
  const mapping = await getTierFromPriceId(priceId);
  if (mapping) return mapping;

  // Fallback: check metadata
  const tier = subscription.metadata?.tier as SubscriptionTier | undefined;
  const interval = subscription.items.data[0]?.price?.recurring?.interval;

  if (tier && (interval === "month" || interval === "year")) {
    return { tier, billingInterval: interval };
  }

  return null;
}

/**
 * Build the OrganizationStripeSubscription data from a Stripe Subscription object.
 *
 * Returns null if the subscription has no items (guard for malformed data).
 */
export function buildStripeSubscriptionData(
  subscription: Stripe.Subscription,
  _tier: SubscriptionTier,
  billingInterval: BillingInterval,
  hasHadTrial: boolean,
): OrganizationStripeSubscription | null {
  const firstItem = subscription.items.data[0];
  if (!firstItem) {
    return null;
  }

  const defaultPaymentMethod = subscription.default_payment_method;
  let paymentMethod: OrganizationStripeSubscription["paymentMethod"];

  if (defaultPaymentMethod && typeof defaultPaymentMethod === "object") {
    const card = (defaultPaymentMethod as Stripe.PaymentMethod).card;
    if (card) {
      paymentMethod = {
        brand: card.brand,
        last4: card.last4 ?? "",
        expMonth: card.exp_month,
        expYear: card.exp_year,
      };
    }
  }

  // In Stripe SDK v20+, period dates are on the subscription item, not the subscription
  const periodStart = firstItem.current_period_start ?? 0;
  const periodEnd = firstItem.current_period_end ?? 0;

  return {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    status: subscription.status as StripeSubscriptionStatus,
    priceId: firstItem.price?.id ?? "",
    billingInterval,
    currentPeriodStart: new Date(periodStart * 1000).toISOString(),
    currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : undefined,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : undefined,
    hasHadTrial,
    paymentMethod,
  };
}
