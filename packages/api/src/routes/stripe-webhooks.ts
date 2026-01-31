/**
 * Stripe Webhook Handler
 *
 * Processes Stripe events for subscription lifecycle management.
 * No auth middleware - verified by Stripe signature.
 *
 * Events handled:
 * - checkout.session.completed → activate subscription
 * - customer.subscription.updated → sync status/tier/period
 * - customer.subscription.deleted → downgrade to free
 * - invoice.paid → record payment
 * - invoice.payment_failed → mark past_due, notify
 * - invoice.payment_action_required → log SCA/3DS action needed
 * - invoice.finalization_failed → log finalization error (revenue risk)
 * - invoice.upcoming → log upcoming renewal
 */

import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { db } from "../utils/firebase.js";
import { stripe } from "../utils/stripe.js";
import {
  findOrgByCustomerId,
  resolveTierFromSubscription,
  buildStripeSubscriptionData,
} from "../utils/stripeSubscriptionHelpers.js";
import type { StripeSubscriptionStatus } from "@equiduty/shared";

export async function stripeWebhookRoutes(fastify: FastifyInstance) {
  // Remove inherited JSON parser and re-register as raw buffer for Stripe signature verification
  fastify.removeContentTypeParser("application/json");
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => {
      done(null, body);
    },
  );

  // NOTE: For production, consider adding @fastify/rate-limit to this endpoint
  // to protect against replay attacks. Stripe webhooks should not exceed ~50 req/s
  // in normal operation. The global rate limiter in index.ts applies, but a
  // tighter per-IP limit (e.g., 100/min) specific to this route is recommended.

  /**
   * POST /webhooks/stripe
   * Main webhook endpoint - verified by Stripe signature
   */
  fastify.post("/webhooks/stripe", async (request, reply) => {
    const sig = request.headers["stripe-signature"] as string;

    if (!sig) {
      return reply
        .status(400)
        .send({ error: "Missing stripe-signature header" });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      request.log.error("STRIPE_WEBHOOK_SECRET not configured");
      return reply.status(500).send({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig,
        webhookSecret,
      );
    } catch (err) {
      request.log.error({ err }, "Webhook signature verification failed");
      return reply.status(400).send({ error: "Invalid signature" });
    }

    // Idempotency check
    const eventRef = db.collection("stripeWebhookEvents").doc(event.id);
    const eventDoc = await eventRef.get();

    if (eventDoc.exists && eventDoc.data()?.status === "processed") {
      request.log.info(
        { eventId: event.id },
        "Duplicate webhook event, skipping",
      );
      return { received: true };
    }

    // Process event — mark idempotency record AFTER handler succeeds
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
            request.log,
          );
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
            request.log,
          );
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
            request.log,
          );
          break;

        case "invoice.paid":
          await handleInvoicePaid(
            event.data.object as Stripe.Invoice,
            request.log,
          );
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
            request.log,
          );
          break;

        case "invoice.payment_action_required":
          await handleInvoicePaymentActionRequired(
            event.data.object as Stripe.Invoice,
            request.log,
          );
          break;

        case "invoice.finalization_failed":
          await handleInvoiceFinalizationFailed(
            event.data.object as Stripe.Invoice,
            request.log,
          );
          break;

        case "invoice.upcoming":
          await handleInvoiceUpcoming(
            event.data.object as Stripe.Invoice,
            request.log,
          );
          break;

        default:
          request.log.debug(
            { type: event.type },
            "Unhandled webhook event type",
          );
      }

      // Mark event as successfully processed (after handler succeeds)
      await eventRef.set({
        eventId: event.id,
        type: event.type,
        status: "processed",
        processedAt: new Date().toISOString(),
      });
    } catch (err) {
      request.log.error(
        { err, eventType: event.type },
        "Failed to process webhook event",
      );

      // Mark as failed so we can investigate, but don't infinitely retry broken events
      await eventRef.set({
        eventId: event.id,
        type: event.type,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
        failedAt: new Date().toISOString(),
      });

      return reply.status(500).send({ error: "Event processing failed" });
    }

    return { received: true };
  });
}

// ============================================
// Event Handlers
// ============================================

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  log: any,
) {
  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    log.warn("checkout.session.completed missing organizationId in metadata");
    return;
  }

  if (session.mode !== "subscription" || !session.subscription) {
    log.debug("Non-subscription checkout, skipping");
    return;
  }

  // Fetch the full subscription
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
  );

  const tierInfo = await resolveTierFromSubscription(subscription);
  if (!tierInfo) {
    log.error("Could not resolve tier from subscription prices");
    return;
  }

  const stripeSubscription = buildStripeSubscriptionData(
    subscription,
    tierInfo.tier,
    tierInfo.billingInterval,
    true, // hasHadTrial = true after checkout
  );
  if (!stripeSubscription) {
    log.error(
      "checkout.session.completed: subscription has no items, cannot build subscription data",
    );
    return;
  }

  // Validate organization exists before writing
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  if (!orgDoc.exists) {
    log.error(
      { organizationId },
      "checkout.session.completed: organization document does not exist, skipping",
    );
    return;
  }

  // Update organization
  await db.collection("organizations").doc(organizationId).update({
    subscriptionTier: tierInfo.tier,
    stripeSubscription,
    updatedAt: new Date(),
  });

  log.info(
    { organizationId, tier: tierInfo.tier },
    "Subscription activated via checkout",
  );
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  log: any,
) {
  const organizationId = await findOrgByCustomerId(
    subscription.customer as string,
  );
  if (!organizationId) {
    log.warn(
      { customerId: subscription.customer },
      "No org found for Stripe customer",
    );
    return;
  }

  const tierInfo = await resolveTierFromSubscription(subscription);
  if (!tierInfo) {
    log.error("Could not resolve tier from subscription prices");
    return;
  }

  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  if (!orgDoc.exists) {
    log.error(
      { organizationId },
      "customer.subscription.updated: organization document does not exist, skipping",
    );
    return;
  }

  const hasHadTrial = orgDoc.data()!.stripeSubscription?.hasHadTrial ?? true;

  const stripeSubscription = buildStripeSubscriptionData(
    subscription,
    tierInfo.tier,
    tierInfo.billingInterval,
    hasHadTrial,
  );
  if (!stripeSubscription) {
    log.error(
      "customer.subscription.updated: subscription has no items, cannot build subscription data",
    );
    return;
  }

  await db.collection("organizations").doc(organizationId).update({
    subscriptionTier: tierInfo.tier,
    stripeSubscription,
    updatedAt: new Date(),
  });

  log.info(
    { organizationId, tier: tierInfo.tier, status: subscription.status },
    "Subscription updated",
  );
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  log: any,
) {
  const organizationId = await findOrgByCustomerId(
    subscription.customer as string,
  );
  if (!organizationId) {
    log.warn(
      { customerId: subscription.customer },
      "No org found for Stripe customer",
    );
    return;
  }

  // Downgrade to free tier, but keep customer ID for future resubscription
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  if (!orgDoc.exists) {
    log.error(
      { organizationId },
      "customer.subscription.deleted: organization document does not exist, skipping",
    );
    return;
  }
  const existingSub = orgDoc.data()!.stripeSubscription;

  await db
    .collection("organizations")
    .doc(organizationId)
    .update({
      subscriptionTier: "free",
      stripeSubscription: {
        customerId:
          existingSub?.customerId ?? (subscription.customer as string),
        subscriptionId: null,
        status: "canceled" as StripeSubscriptionStatus,
        priceId: null,
        billingInterval: existingSub?.billingInterval ?? "month",
        currentPeriodStart: "",
        currentPeriodEnd: "",
        cancelAtPeriodEnd: false,
        hasHadTrial: existingSub?.hasHadTrial ?? true,
      },
      updatedAt: new Date(),
    });

  log.info({ organizationId }, "Subscription deleted, downgraded to free");
}

async function handleInvoicePaid(invoice: Stripe.Invoice, log: any) {
  if (!invoice.parent?.subscription_details?.subscription) return;

  const organizationId = await findOrgByCustomerId(invoice.customer as string);
  if (!organizationId) return;

  // If org was past_due, restore to active (webhook for subscription.updated handles this too)
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  const currentStatus = orgDoc.data()?.stripeSubscription?.status;

  if (currentStatus === "past_due") {
    await db.collection("organizations").doc(organizationId).update({
      "stripeSubscription.status": "active",
      updatedAt: new Date(),
    });
    log.info({ organizationId }, "Restored from past_due after invoice paid");
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, log: any) {
  if (!invoice.parent?.subscription_details?.subscription) return;

  const organizationId = await findOrgByCustomerId(invoice.customer as string);
  if (!organizationId) return;

  // Mark as past_due
  await db.collection("organizations").doc(organizationId).update({
    "stripeSubscription.status": "past_due",
    updatedAt: new Date(),
  });

  log.warn(
    { organizationId, invoiceId: invoice.id },
    "Invoice payment failed, marked past_due",
  );

  // TODO(Phase 8 — Notification System Integration):
  // Send payment failure notification to org owner/admins.
  // Use the notification system (packages/functions/src/lib/smtp.ts for email,
  // plus in-app via Firestore notifications collection).
  // Include: invoice amount, failure reason, link to update payment method.
  // See docs/IMPLEMENTATION_PLAN.md for notification system roadmap.
}

/**
 * Handle invoice.payment_action_required
 *
 * Fires when the customer's bank requires additional authentication (3D Secure / SCA).
 * The subscription status change (incomplete/past_due) is already synced by
 * customer.subscription.updated — this handler logs the event for visibility.
 *
 * Future: send notification with hosted_invoice_url so the user can complete authentication.
 */
async function handleInvoicePaymentActionRequired(
  invoice: Stripe.Invoice,
  log: any,
) {
  const organizationId = invoice.customer
    ? await findOrgByCustomerId(invoice.customer as string)
    : null;

  log.warn(
    {
      organizationId: organizationId ?? "unknown",
      invoiceId: invoice.id,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    },
    "Invoice requires payment action (3D Secure / SCA)",
  );

  // TODO(Phase 8 — Notification System Integration):
  // Send notification to org owner with hosted_invoice_url so they can
  // complete 3D Secure authentication. Include: amount, due date, action link.
}

/**
 * Handle invoice.finalization_failed
 *
 * Fires when Stripe cannot finalize an invoice (e.g., tax calculation failure,
 * invalid customer data). No payment is collected but the subscription may stay
 * active — this is a potential revenue leak that requires admin attention.
 */
async function handleInvoiceFinalizationFailed(
  invoice: Stripe.Invoice,
  log: any,
) {
  const organizationId = invoice.customer
    ? await findOrgByCustomerId(invoice.customer as string)
    : null;

  log.error(
    {
      organizationId: organizationId ?? "unknown",
      invoiceId: invoice.id,
      lastFinalizationError: invoice.last_finalization_error,
    },
    "Invoice finalization failed — revenue at risk",
  );

  // TODO(Phase 8 — Notification System Integration):
  // Alert admin/system operators about the finalization failure.
  // This is a revenue-critical event that may require manual intervention.
}

/**
 * Handle invoice.upcoming
 *
 * Fires X days before a subscription renews (configurable in Stripe Dashboard).
 * Logged for visibility. Future: trigger renewal reminder notification to org owner.
 */
async function handleInvoiceUpcoming(invoice: Stripe.Invoice, log: any) {
  const organizationId = invoice.customer
    ? await findOrgByCustomerId(invoice.customer as string)
    : null;

  log.info(
    {
      organizationId: organizationId ?? "unknown",
      invoiceId: invoice.id,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
    },
    "Upcoming invoice for subscription renewal",
  );

  // TODO(Phase 8 — Notification System Integration):
  // Send renewal reminder notification to org owner.
  // Include: amount, billing date, link to manage subscription.
}
