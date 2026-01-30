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
import { authenticate, requireOrganizationAdmin } from "../middleware/auth.js";
import { getPriceIdForTier } from "../utils/stripeTierMapping.js";
import { getOrganizationOrThrow } from "../utils/organizationHelpers.js";
import { TRIAL_DAYS } from "@equiduty/shared";
import type {
  SubscriptionDetailsResponse,
  BillingHistoryResponse,
  BillingInvoice,
  CheckoutSessionResponse,
  CustomerPortalResponse,
  OrganizationStripeSubscription,
} from "@equiduty/shared";

// ============================================
// Zod Schemas
// ============================================

const checkoutSchema = z.object({
  tier: z.enum(["standard", "pro"]),
  billingInterval: z.enum(["month", "year"]),
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
        tier: orgData.subscriptionTier || "free",
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
      const successUrl = `${frontendUrl}/organizations/${organizationId}/subscription/success`;
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

      // Get or create Stripe Customer
      let customerId = orgData.stripeSubscription?.customerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: orgData.ownerEmail || orgData.primaryEmail,
          name: orgData.name,
          metadata: {
            organizationId,
            platform: "equiduty",
          },
        });
        customerId = customer.id;
      }

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
          : { subscription_data: { trial_period_days: TRIAL_DAYS } }),
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
      const customerId = orgData.stripeSubscription?.customerId;

      if (!customerId) {
        return reply.status(400).send({
          error: "No active subscription. Subscribe first.",
        });
      }

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
      const customerId = orgData.stripeSubscription?.customerId;

      if (!customerId) {
        const response: BillingHistoryResponse = {
          invoices: [],
          hasMore: false,
        };
        return response;
      }

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
