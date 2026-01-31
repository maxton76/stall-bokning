/**
 * Subscription Routes
 *
 * Platform-to-organization billing via Stripe Subscriptions.
 * Handles checkout, portal, cancel/resume, and billing history.
 *
 * This is distinct from payments.ts which handles org-to-customer payments (Stripe Connect).
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { stripe } from "../utils/stripe.js";
import { db } from "../utils/firebase.js";
import { authenticate, requireOrganizationAdmin } from "../middleware/auth.js";
import { getPriceIdForTier } from "../utils/stripeTierMapping.js";
import { getOrganizationOrThrow } from "../utils/organizationHelpers.js";
import {
  resolveTierFromSubscription,
  buildStripeSubscriptionData,
} from "../utils/stripeSubscriptionHelpers.js";
import { TRIAL_DAYS, getDefaultTierDefinition } from "@equiduty/shared";
import type {
  SubscriptionDetailsResponse,
  BillingHistoryResponse,
  BillingInvoice,
  CheckoutSessionResponse,
  CustomerPortalResponse,
  OrganizationStripeSubscription,
  VerifyCheckoutResponse,
} from "@equiduty/shared";

// ============================================
// Zod Schemas
// ============================================

const checkoutSchema = z.object({
  tier: z.string().min(1),
  billingInterval: z.enum(["month", "year"]),
});

const verifyCheckoutSchema = z.object({
  sessionId: z.string().min(1),
});

function getFrontendUrl(): string {
  const url = process.env.FRONTEND_URL;
  if (!url) {
    throw new Error("FRONTEND_URL environment variable is not configured");
  }
  return url;
}

/**
 * Strip Stripe internal IDs from subscription data sent to the client.
 * Keeps: status, billingInterval, period dates, cancel info, trial, payment method.
 */
function toSafeSubscription(
  sub: OrganizationStripeSubscription,
): Omit<
  OrganizationStripeSubscription,
  "customerId" | "subscriptionId" | "priceId"
> {
  const { customerId: _, subscriptionId: _s, priceId: _p, ...safe } = sub;
  return safe;
}

// ============================================
// Helpers
// ============================================

/**
 * Verify an existing Stripe customer ID is still valid, or create a new one.
 * Handles stale/deleted customer IDs stored in Firestore.
 */
async function getOrCreateStripeCustomer(
  orgData: Record<string, any>,
  organizationId: string,
  log: { warn: Function; info: Function },
): Promise<string> {
  let customerId = orgData.stripeSubscription?.customerId as
    | string
    | null
    | undefined;

  if (customerId) {
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if ((existing as any).deleted) {
        log.warn(
          { customerId, organizationId },
          "Stripe customer was deleted, creating new one",
        );
        customerId = null;
      }
    } catch (err: any) {
      if (err.code === "resource_missing") {
        log.warn(
          { customerId, organizationId },
          "Stripe customer not found, creating new one",
        );
        customerId = null;
      } else {
        throw err;
      }
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: orgData.ownerEmail || orgData.primaryEmail,
      name: orgData.name,
      metadata: { organizationId, platform: "equiduty" },
    });
    customerId = customer.id;

    await db.collection("organizations").doc(organizationId).update({
      "stripeSubscription.customerId": customerId,
      updatedAt: new Date(),
    });

    log.info({ customerId, organizationId }, "Created new Stripe customer");
  }

  return customerId;
}

// ============================================
// Routes
// ============================================

export async function subscriptionRoutes(fastify: FastifyInstance) {
  // All routes require authentication + org admin access
  const orgAdminPreHandler = [authenticate, requireOrganizationAdmin("params")];

  /**
   * GET /organizations/:organizationId/subscription
   * Get current subscription details
   */
  fastify.get<{
    Params: { organizationId: string };
  }>(
    "/organizations/:organizationId/subscription",
    { preHandler: orgAdminPreHandler },
    async (request, _reply) => {
      const { organizationId } = request.params;
      const { data: orgData } = await getOrganizationOrThrow(organizationId);

      const rawSub = orgData.stripeSubscription as
        | OrganizationStripeSubscription
        | undefined;
      const response: SubscriptionDetailsResponse = {
        subscription: rawSub ? toSafeSubscription(rawSub) : null,
        tier: orgData.subscriptionTier || getDefaultTierDefinition().tier,
      };

      return response;
    },
  );

  /**
   * POST /organizations/:organizationId/subscription/checkout
   * Create a Stripe Checkout session for subscription
   */
  fastify.post<{
    Params: { organizationId: string };
    Body: z.infer<typeof checkoutSchema>;
  }>(
    "/organizations/:organizationId/subscription/checkout",
    { preHandler: orgAdminPreHandler },
    async (request, reply) => {
      const { organizationId } = request.params;
      const result = checkoutSchema.safeParse(request.body);

      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { tier, billingInterval } = result.data;
      const frontendUrl = getFrontendUrl();
      const successUrl = `${frontendUrl}/organizations/${organizationId}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendUrl}/organizations/${organizationId}/subscription/cancel`;

      // Look up Stripe Price ID
      const priceId = await getPriceIdForTier(tier, billingInterval);
      if (!priceId) {
        return reply.status(400).send({
          error: `No Stripe price found for ${tier}/${billingInterval}. Run seed script.`,
        });
      }

      // Get organization
      const { data: orgData } = await getOrganizationOrThrow(organizationId);

      // Get or create Stripe Customer (validates stale IDs)
      const customerId = await getOrCreateStripeCustomer(
        orgData,
        organizationId,
        request.log,
      );

      // Determine trial eligibility (first time only)
      const hasHadTrial = orgData.stripeSubscription?.hasHadTrial === true;

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        ...(hasHadTrial
          ? {}
          : {
              subscription_data: {
                trial_period_days: TRIAL_DAYS,
                trial_settings: {
                  end_behavior: { missing_payment_method: "pause" },
                },
              },
              payment_method_collection: "if_required",
            }),
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale: "sv",
        metadata: {
          organizationId,
          tier,
          billingInterval,
        },
      });

      const response: CheckoutSessionResponse = {
        sessionId: session.id,
        url: session.url!,
      };

      return response;
    },
  );

  /**
   * POST /organizations/:organizationId/subscription/verify-checkout
   * Fallback endpoint to verify and sync a checkout session.
   * Used when the webhook is slow or fails to fire.
   */
  fastify.post<{
    Params: { organizationId: string };
    Body: z.infer<typeof verifyCheckoutSchema>;
  }>(
    "/organizations/:organizationId/subscription/verify-checkout",
    { preHandler: orgAdminPreHandler },
    async (request, reply) => {
      const { organizationId } = request.params;
      const result = verifyCheckoutSchema.safeParse(request.body);

      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { sessionId } = result.data;

      // Fetch the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Validate session belongs to this organization
      if (session.metadata?.organizationId !== organizationId) {
        return reply
          .status(403)
          .send({ error: "Session does not belong to this organization" });
      }

      const { data: orgData } = await getOrganizationOrThrow(organizationId);

      // If subscription is already synced, return current state
      if (orgData.stripeSubscription?.subscriptionId) {
        const rawSub =
          orgData.stripeSubscription as OrganizationStripeSubscription;
        const response: VerifyCheckoutResponse = {
          synced: true,
          subscription: toSafeSubscription(rawSub),
          tier: orgData.subscriptionTier || getDefaultTierDefinition().tier,
        };
        return response;
      }

      // Session not complete yet - nothing to sync
      if (session.status !== "complete" || !session.subscription) {
        const response: VerifyCheckoutResponse = {
          synced: false,
          subscription: null,
          tier: orgData.subscriptionTier || getDefaultTierDefinition().tier,
        };
        return response;
      }

      // Session is complete but webhook hasn't synced yet - do it now
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      const tierInfo = await resolveTierFromSubscription(subscription);
      if (!tierInfo) {
        return reply
          .status(500)
          .send({ error: "Could not resolve tier from subscription" });
      }

      const stripeSubscription = buildStripeSubscriptionData(
        subscription,
        tierInfo.tier,
        tierInfo.billingInterval,
        true,
      );
      if (!stripeSubscription) {
        return reply
          .status(500)
          .send({ error: "Could not build subscription data" });
      }

      await db.collection("organizations").doc(organizationId).update({
        subscriptionTier: tierInfo.tier,
        stripeSubscription,
        updatedAt: new Date(),
      });

      request.log.info(
        { organizationId, tier: tierInfo.tier },
        "Subscription synced via verify-checkout fallback",
      );

      const response: VerifyCheckoutResponse = {
        synced: true,
        subscription: toSafeSubscription(stripeSubscription),
        tier: tierInfo.tier,
      };

      return response;
    },
  );

  /**
   * POST /organizations/:organizationId/subscription/portal
   * Create a Stripe Customer Portal session
   */
  fastify.post<{
    Params: { organizationId: string };
  }>(
    "/organizations/:organizationId/subscription/portal",
    { preHandler: orgAdminPreHandler },
    async (request, reply) => {
      const { organizationId } = request.params;
      const frontendUrl = getFrontendUrl();
      const returnUrl = `${frontendUrl}/organizations/${organizationId}/subscription`;

      const { data: orgData } = await getOrganizationOrThrow(organizationId);

      if (!orgData.stripeSubscription?.customerId) {
        return reply.status(400).send({
          error: "No active subscription. Subscribe first.",
        });
      }

      // Validate customer still exists in Stripe
      const customerId = await getOrCreateStripeCustomer(
        orgData,
        organizationId,
        request.log,
      );

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      const response: CustomerPortalResponse = {
        url: portalSession.url,
      };

      return response;
    },
  );

  /**
   * POST /organizations/:organizationId/subscription/cancel
   * Cancel subscription at period end
   */
  fastify.post<{
    Params: { organizationId: string };
  }>(
    "/organizations/:organizationId/subscription/cancel",
    { preHandler: orgAdminPreHandler },
    async (request, _reply) => {
      const { organizationId } = request.params;
      const { ref: orgRef, data: orgData } =
        await getOrganizationOrThrow(organizationId);
      const subscriptionId = orgData.stripeSubscription?.subscriptionId;

      if (!subscriptionId) {
        return _reply.status(400).send({ error: "No active subscription" });
      }

      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      // Update local state (webhook will also sync)
      await orgRef.update({
        "stripeSubscription.cancelAtPeriodEnd": true,
        "stripeSubscription.canceledAt": new Date().toISOString(),
      });

      return { success: true };
    },
  );

  /**
   * POST /organizations/:organizationId/subscription/resume
   * Resume a canceled subscription (before period end)
   */
  fastify.post<{
    Params: { organizationId: string };
  }>(
    "/organizations/:organizationId/subscription/resume",
    { preHandler: orgAdminPreHandler },
    async (request, _reply) => {
      const { organizationId } = request.params;
      const { ref: orgRef, data: orgData } =
        await getOrganizationOrThrow(organizationId);
      const subscriptionId = orgData.stripeSubscription?.subscriptionId;

      if (!subscriptionId) {
        return _reply.status(400).send({ error: "No active subscription" });
      }

      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update local state (webhook will also sync)
      await orgRef.update({
        "stripeSubscription.cancelAtPeriodEnd": false,
        "stripeSubscription.canceledAt": null,
      });

      return { success: true };
    },
  );

  /**
   * GET /organizations/:organizationId/subscription/invoices
   * Get billing history from Stripe
   */
  const invoiceQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    starting_after: z
      .string()
      .regex(/^in_[a-zA-Z0-9]+$/)
      .optional(),
  });

  fastify.get<{
    Params: { organizationId: string };
    Querystring: { limit?: string; starting_after?: string };
  }>(
    "/organizations/:organizationId/subscription/invoices",
    { preHandler: orgAdminPreHandler },
    async (request, reply) => {
      const { organizationId } = request.params;
      const queryResult = invoiceQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: queryResult.error.flatten().fieldErrors,
        });
      }
      const { limit, starting_after } = queryResult.data;

      const { data: orgData } = await getOrganizationOrThrow(organizationId);

      if (!orgData.stripeSubscription?.customerId) {
        const response: BillingHistoryResponse = {
          invoices: [],
          hasMore: false,
        };
        return response;
      }

      // Validate customer still exists in Stripe
      const customerId = await getOrCreateStripeCustomer(
        orgData,
        organizationId,
        request.log,
      );

      const stripeInvoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        ...(starting_after ? { starting_after } : {}),
      });

      const invoices: BillingInvoice[] = stripeInvoices.data.map(
        (inv, index) => ({
          id: `inv_${index}`,
          amountDue: inv.amount_due,
          amountPaid: inv.amount_paid,
          currency: inv.currency,
          status: inv.status as BillingInvoice["status"],
          created: new Date((inv.created ?? 0) * 1000).toISOString(),
          periodStart: new Date((inv.period_start ?? 0) * 1000).toISOString(),
          periodEnd: new Date((inv.period_end ?? 0) * 1000).toISOString(),
          invoicePdf: inv.invoice_pdf ?? undefined,
          hostedInvoiceUrl: inv.hosted_invoice_url ?? undefined,
        }),
      );

      const response: BillingHistoryResponse = {
        invoices,
        hasMore: stripeInvoices.has_more,
      };

      return response;
    },
  );
}
