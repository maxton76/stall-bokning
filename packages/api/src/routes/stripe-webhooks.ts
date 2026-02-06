/**
 * Stripe Webhook Handler
 *
 * Processes Stripe events for subscription lifecycle management.
 * No auth middleware - verified by Stripe signature.
 *
 * Events handled:
 * - checkout.session.completed → activate subscription
 * - checkout.session.async_payment_succeeded → activate subscription (delayed payment)
 * - checkout.session.async_payment_failed → log failed async payment
 * - checkout.session.expired → log abandoned checkout
 * - customer.subscription.updated → sync status/tier/period
 * - customer.subscription.deleted → downgrade to starter
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
import {
  syncAccountStatus,
  handleAccountDeauthorized,
} from "../utils/stripeConnect.js";
import { createInAppNotification } from "../utils/notifications.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
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

    // Atomic idempotency check: claim the event before processing
    const eventRef = db.collection("stripeWebhookEvents").doc(event.id);
    let alreadyProcessed = false;

    try {
      await db.runTransaction(async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (eventDoc.exists) {
          const data = eventDoc.data();
          if (data?.status === "processed" || data?.status === "processing") {
            alreadyProcessed = true;
            return;
          }
        }
        // Claim the event atomically to prevent concurrent processing
        transaction.set(eventRef, {
          eventId: event.id,
          type: event.type,
          status: "processing",
          claimedAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      request.log.error(
        { err, eventId: event.id },
        "Failed idempotency check transaction",
      );
      return reply.status(500).send({ error: "Idempotency check failed" });
    }

    if (alreadyProcessed) {
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
        case "checkout.session.async_payment_succeeded":
          await handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
            request.log,
          );
          break;

        case "checkout.session.async_payment_failed":
          await handleCheckoutAsyncPaymentFailed(
            event.data.object as Stripe.Checkout.Session,
            request.log,
          );
          break;

        case "checkout.session.expired":
          await handleCheckoutExpired(
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

  /**
   * POST /webhooks/stripe-connect
   * Webhook endpoint for connected account events.
   * Uses a separate webhook secret (STRIPE_CONNECT_WEBHOOK_SECRET).
   */
  fastify.post("/webhooks/stripe-connect", async (request, reply) => {
    const sig = request.headers["stripe-signature"] as string;

    if (!sig) {
      return reply
        .status(400)
        .send({ error: "Missing stripe-signature header" });
    }

    const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      request.log.error("STRIPE_CONNECT_WEBHOOK_SECRET not configured");
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
      request.log.error(
        { err },
        "Connect webhook signature verification failed",
      );
      return reply.status(400).send({ error: "Invalid signature" });
    }

    // Atomic idempotency check: claim the event before processing
    const eventRef = db.collection("stripeWebhookEvents").doc(event.id);
    let alreadyProcessed = false;

    try {
      await db.runTransaction(async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (eventDoc.exists) {
          const data = eventDoc.data();
          if (data?.status === "processed" || data?.status === "processing") {
            alreadyProcessed = true;
            return;
          }
        }
        // Claim the event atomically to prevent concurrent processing
        transaction.set(eventRef, {
          eventId: event.id,
          type: event.type,
          status: "processing",
          claimedAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      request.log.error(
        { err, eventId: event.id },
        "Failed idempotency check transaction",
      );
      return reply.status(500).send({ error: "Idempotency check failed" });
    }

    if (alreadyProcessed) {
      request.log.info(
        { eventId: event.id },
        "Duplicate connect webhook event, skipping",
      );
      return { received: true };
    }

    try {
      switch (event.type) {
        case "account.updated": {
          const account = event.data.object as Stripe.Account;
          request.log.info(
            { accountId: account.id },
            "Connected account updated",
          );
          await syncAccountStatus(account.id);
          break;
        }

        case "account.application.deauthorized": {
          const account = event.data.object as unknown as Stripe.Account;
          request.log.warn(
            { accountId: account.id },
            "Connected account deauthorized",
          );
          await handleAccountDeauthorized(account.id);
          break;
        }

        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleConnectedCheckoutCompleted(session, request.log);
          break;
        }

        case "payment_intent.succeeded": {
          const pi = event.data.object as Stripe.PaymentIntent;
          await handleConnectedPaymentSucceeded(pi, request.log);
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object as Stripe.PaymentIntent;
          await handleConnectedPaymentFailed(pi, request.log);
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          await handleConnectedChargeRefunded(charge, request.log);
          break;
        }

        default:
          request.log.debug(
            { type: event.type },
            "Unhandled connect webhook event type",
          );
      }

      await eventRef.set({
        eventId: event.id,
        type: event.type,
        status: "processed",
        processedAt: new Date().toISOString(),
      });
    } catch (err) {
      request.log.error(
        { err, eventType: event.type },
        "Failed to process connect webhook event",
      );

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

/**
 * Handle checkout.session.async_payment_failed
 *
 * Fires when a delayed payment method (e.g., bank transfer) fails after the
 * checkout session was created. No subscription should be activated.
 */
async function handleCheckoutAsyncPaymentFailed(
  session: Stripe.Checkout.Session,
  log: any,
) {
  const organizationId = session.metadata?.organizationId;

  log.warn(
    {
      organizationId: organizationId ?? "unknown",
      sessionId: session.id,
      paymentStatus: session.payment_status,
    },
    "Checkout async payment failed — subscription not activated",
  );

  // TODO(Phase 8 — Notification System Integration):
  // Notify org owner that their payment method failed and they need to retry.
}

/**
 * Handle checkout.session.expired
 *
 * Fires when a Checkout Session expires (default 24h) without being completed.
 * The user abandoned the checkout flow. Logged for analytics/visibility.
 */
async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
  log: any,
) {
  const organizationId = session.metadata?.organizationId;

  log.info(
    {
      organizationId: organizationId ?? "unknown",
      sessionId: session.id,
    },
    "Checkout session expired — user abandoned checkout",
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

  // Paused subscriptions (e.g. trial ended without payment method) get downgraded to starter
  const effectiveTier =
    subscription.status === "paused" ? "starter" : tierInfo.tier;

  await db.collection("organizations").doc(organizationId).update({
    subscriptionTier: effectiveTier,
    stripeSubscription,
    updatedAt: new Date(),
  });

  log.info(
    {
      organizationId,
      tier: effectiveTier,
      resolvedTier: tierInfo.tier,
      status: subscription.status,
    },
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
      subscriptionTier: "starter",
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

  log.info({ organizationId }, "Subscription deleted, downgraded to starter");
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

  // Send payment failure notification to org owner
  try {
    const orgDoc = await db
      .collection("organizations")
      .doc(organizationId)
      .get();
    if (!orgDoc.exists) return;

    const org = orgDoc.data()!;
    const ownerId = org.ownerId;
    if (!ownerId) return;

    await createInAppNotification({
      userId: ownerId,
      type: "payment_failed",
      priority: "urgent",
      title: "Payment failed",
      titleKey: "notifications.paymentFailed.title",
      body: `We couldn't process the payment for ${org.name}. Please update your payment method to avoid service interruption.`,
      bodyKey: "notifications.paymentFailed.body",
      bodyParams: {
        organizationName: org.name,
      },
      entityType: "organization",
      entityId: organizationId,
      channels: ["inApp", "email"],
      actionUrl: "/settings/billing",
      organizationId,
    });

    log.info(
      { organizationId, ownerId },
      "Created payment_failed notification for org owner",
    );
  } catch (notifyError) {
    log.error(
      { err: notifyError, organizationId },
      "Failed to create payment_failed notification",
    );
    // Don't throw - the main webhook processing succeeded
  }
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

// ============================================
// Connected Account Event Handlers (Invoice Payments)
// ============================================

/**
 * Handle checkout.session.completed on connected account.
 * Updates invoice payment status when a Checkout payment completes.
 */
async function handleConnectedCheckoutCompleted(
  session: Stripe.Checkout.Session,
  log: any,
) {
  const invoiceId = session.metadata?.invoiceId;
  const organizationId = session.metadata?.organizationId;
  const type = session.metadata?.type;

  if (!invoiceId || type !== "invoice_payment") {
    log.debug(
      { sessionId: session.id, type },
      "Non-invoice checkout on connected account, skipping",
    );
    return;
  }

  log.info(
    { invoiceId, organizationId, sessionId: session.id },
    "Connected account checkout completed for invoice",
  );

  const invoiceRef = db.collection("invoices").doc(invoiceId);
  const amountTotal = session.amount_total || 0;

  const paymentRecord = {
    id: (session.payment_intent as string) || session.id,
    invoiceId,
    amount: amountTotal,
    currency: (session.currency || "sek").toUpperCase(),
    method: "stripe" as const,
    reference: (session.payment_intent as string) || session.id,
    paidAt: Timestamp.now(),
    recordedAt: Timestamp.now(),
    recordedBy: "system",
    stripePaymentIntentId: session.payment_intent as string,
    stripeChargeId: session.id,
  };

  let newStatus = "";
  let oldStatus = "";
  let invoiceData: FirebaseFirestore.DocumentData = {};

  // Atomically update invoice payment inside a transaction
  await db.runTransaction(async (transaction) => {
    const invoiceSnap = await transaction.get(invoiceRef);

    if (!invoiceSnap.exists) {
      throw new Error(`Invoice ${invoiceId} not found for checkout completion`);
    }

    invoiceData = invoiceSnap.data()!;
    oldStatus = invoiceData.status;

    const newAmountPaid = (invoiceData.amountPaid || 0) + amountTotal;
    const newAmountDue = invoiceData.total - newAmountPaid;
    newStatus = newAmountDue <= 0 ? "paid" : "partially_paid";

    transaction.update(invoiceRef, {
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
      status: newStatus,
      ...(newStatus === "paid" ? { paidAt: FieldValue.serverTimestamp() } : {}),
      receiptUrl: session.url || undefined,
      payments: FieldValue.arrayUnion(paymentRecord),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Store PaymentIntent record inside the same transaction
    if (session.payment_intent) {
      const piId = session.payment_intent as string;
      const piRef = db.collection("paymentIntents").doc(piId);
      transaction.set(
        piRef,
        {
          id: piId,
          organizationId,
          stripePaymentIntentId: piId,
          amount: amountTotal,
          amountReceived: amountTotal,
          currency: (session.currency || "sek").toLowerCase(),
          status: "succeeded",
          stripeStatus: "succeeded",
          contactId: invoiceData.contactId,
          contactEmail:
            invoiceData.contactEmail || session.customer_email || "",
          invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          checkoutSessionId: session.id,
          description: `Invoice ${invoiceData.invoiceNumber}`,
          refunds: [],
          totalRefunded: 0,
          succeededAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  // Record audit event (outside transaction -- non-critical)
  await db
    .collection("invoices")
    .doc(invoiceId)
    .collection("statusEvents")
    .add({
      invoiceId,
      fromStatus: oldStatus!,
      toStatus: newStatus!,
      action: newStatus! === "paid" ? "fully_paid" : "payment_recorded",
      performedBy: "system",
      timestamp: Timestamp.now(),
      metadata: {
        amount: amountTotal,
        method: "stripe",
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
      },
    });

  log.info({ invoiceId, newStatus }, "Invoice payment recorded from checkout");
}

/**
 * Handle payment_intent.succeeded on connected account.
 * Updates PaymentIntent record and invoice if not already handled by checkout handler.
 */
async function handleConnectedPaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  log: any,
) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  const organizationId = paymentIntent.metadata?.organizationId;

  if (!invoiceId) {
    log.debug("payment_intent.succeeded without invoiceId metadata, skipping");
    return;
  }

  log.info(
    { invoiceId, paymentIntentId: paymentIntent.id },
    "Connected payment intent succeeded",
  );

  // Atomically update PaymentIntent record and invoice in a transaction
  const piRef = db.collection("paymentIntents").doc(paymentIntent.id);
  const invoiceRef = db.collection("invoices").doc(invoiceId);

  await db.runTransaction(async (transaction) => {
    const [piSnap, invoiceSnap] = await Promise.all([
      transaction.get(piRef),
      transaction.get(invoiceRef),
    ]);

    // Skip if already processed (likely by checkout handler)
    if (piSnap.exists && piSnap.data()?.status === "succeeded") {
      return;
    }

    transaction.set(
      piRef,
      {
        id: paymentIntent.id,
        organizationId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        amountReceived: paymentIntent.amount_received,
        currency: paymentIntent.currency,
        status: "succeeded",
        stripeStatus: paymentIntent.status,
        invoiceId,
        refunds: [],
        totalRefunded: 0,
        succeededAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Update invoice if it exists and is not already paid
    if (!invoiceSnap.exists) return;

    const invoice = invoiceSnap.data()!;
    if (invoice.status === "paid") return; // Already handled

    const newAmountPaid =
      (invoice.amountPaid || 0) + paymentIntent.amount_received;
    const newAmountDue = invoice.total - newAmountPaid;
    const newStatus = newAmountDue <= 0 ? "paid" : "partially_paid";

    transaction.update(invoiceRef, {
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
      status: newStatus,
      ...(newStatus === "paid" ? { paidAt: FieldValue.serverTimestamp() } : {}),
      payments: FieldValue.arrayUnion({
        id: paymentIntent.id,
        invoiceId,
        amount: paymentIntent.amount_received,
        currency: paymentIntent.currency.toUpperCase(),
        method: "stripe",
        reference: paymentIntent.id,
        paidAt: Timestamp.now(),
        recordedAt: Timestamp.now(),
        recordedBy: "system",
        stripePaymentIntentId: paymentIntent.id,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Handle payment_intent.payment_failed on connected account.
 */
async function handleConnectedPaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  log: any,
) {
  const invoiceId = paymentIntent.metadata?.invoiceId;

  log.warn(
    {
      invoiceId,
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
    },
    "Connected payment intent failed",
  );

  // Update PaymentIntent record
  await db.collection("paymentIntents").doc(paymentIntent.id).set(
    {
      id: paymentIntent.id,
      status: "failed",
      stripeStatus: paymentIntent.status,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
      failedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Handle charge.refunded on connected account.
 * Updates PaymentIntent refunds and invoice amounts.
 */
async function handleConnectedChargeRefunded(charge: Stripe.Charge, log: any) {
  const paymentIntentId = charge.payment_intent as string;
  if (!paymentIntentId) return;

  log.info(
    {
      chargeId: charge.id,
      paymentIntentId,
      amountRefunded: charge.amount_refunded,
    },
    "Connected charge refunded",
  );

  // Find PaymentIntent record
  const piRef = db.collection("paymentIntents").doc(paymentIntentId);
  const piSnap = await piRef.get();

  if (!piSnap.exists) {
    log.warn(
      { paymentIntentId },
      "PaymentIntent not found for refunded charge",
    );
    return;
  }

  const piData = piSnap.data()!;
  const totalRefunded = charge.amount_refunded || 0;

  // Update PaymentIntent
  const newStatus =
    totalRefunded >= piData.amount ? "refunded" : "partially_refunded";

  await piRef.update({
    totalRefunded,
    status: newStatus,
    stripeStatus: newStatus === "refunded" ? "refunded" : "succeeded",
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update invoice if linked
  if (piData.invoiceId) {
    const invoiceRef = db.collection("invoices").doc(piData.invoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (invoiceSnap.exists) {
      const invoice = invoiceSnap.data()!;
      const previousRefunded = invoice.refundedAmount || 0;
      const refundDelta = totalRefunded - previousRefunded;

      if (refundDelta > 0) {
        const newAmountPaid = Math.max(
          0,
          (invoice.amountPaid || 0) - refundDelta,
        );
        const newAmountDue = invoice.total - newAmountPaid;

        let newStatus = invoice.status;
        if (newAmountPaid <= 0 && invoice.status === "paid") {
          newStatus = "sent"; // Revert to sent if fully refunded
        } else if (newAmountPaid > 0 && newAmountPaid < invoice.total) {
          newStatus = "partially_paid";
        }

        await invoiceRef.update({
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          refundedAmount: totalRefunded,
          status: newStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
}
