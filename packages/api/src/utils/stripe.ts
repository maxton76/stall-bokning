/**
 * Stripe Client Utility
 *
 * Singleton Stripe instance for platform billing.
 * Used by subscription routes and webhook handlers.
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "STRIPE_SECRET_KEY not set. Stripe operations will fail at runtime.",
  );
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn(
    "STRIPE_WEBHOOK_SECRET not set. Stripe webhook verification will fail at runtime.",
  );
}

// Only initialize Stripe if we have a valid API key
// This prevents errors during OpenAPI spec generation when env vars aren't set
const stripeInstance = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    })
  : null;

/**
 * Stripe instance for platform billing.
 * Non-null assertion: in deployed environments STRIPE_SECRET_KEY is always set.
 * During OpenAPI export without env vars, routes using stripe won't be called.
 */
export const stripe = stripeInstance as Stripe;
