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

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  typescript: true,
});
