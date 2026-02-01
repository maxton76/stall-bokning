import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import type {
  OrganizationStripeSettings,
  PaymentIntent,
  CheckoutSession,
  StripeCustomer,
  CreateCheckoutSessionData,
  CreatePaymentIntentData,
  CreateRefundData,
  PrepaidAccount,
  PrepaidTransaction,
  PaymentDashboardData,
} from "@equiduty/shared";

import {
  createConnectedAccount,
  createAccountLink,
  getAccountStatus,
  disconnectAccount,
} from "../utils/stripeConnect.js";
import { createStripeRefund } from "../utils/stripeRefunds.js";

// ============================================
// Zod Schemas
// ============================================

const createCheckoutSessionSchema = z.object({
  invoiceId: z.string().optional(),
  bookingId: z.string().optional(),
  contactId: z.string(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().min(1),
        unitAmount: z.number().min(0),
        currency: z.string().optional(),
      }),
    )
    .optional(),
  customerEmail: z.string().email().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  allowedPaymentMethods: z
    .array(z.enum(["card", "klarna", "swish", "bank_transfer", "sepa_debit"]))
    .optional(),
  expiresInMinutes: z.number().min(10).max(1440).optional(),
  locale: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const createPaymentIntentSchema = z.object({
  amount: z.number().min(100), // Minimum 1 SEK
  currency: z.string().optional().default("sek"),
  contactId: z.string(),
  description: z.string(),
  invoiceId: z.string().optional(),
  bookingId: z.string().optional(),
  paymentMethodTypes: z
    .array(z.enum(["card", "klarna", "swish", "bank_transfer", "sepa_debit"]))
    .optional(),
  metadata: z.record(z.string()).optional(),
});

const createRefundSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().min(1).optional(),
  reason: z
    .enum(["duplicate", "fraudulent", "requested_by_customer", "other"])
    .optional(),
});

const savePaymentMethodSchema = z.object({
  contactId: z.string(),
  paymentMethodId: z.string(),
  setAsDefault: z.boolean().optional(),
});

const depositSchema = z.object({
  amount: z.number().min(100),
  currency: z.string().optional().default("sek"),
});

const connectAccountSchema = z.object({
  returnUrl: z.string().url(),
  refreshUrl: z.string().url(),
});

const updateStripeSettingsSchema = z.object({
  acceptedPaymentMethods: z
    .array(z.enum(["card", "klarna", "swish", "bank_transfer", "sepa_debit"]))
    .optional(),
  passFeesToCustomer: z.boolean().optional(),
  payoutSchedule: z.enum(["daily", "weekly", "monthly", "manual"]).optional(),
  statementDescriptor: z.string().max(22).optional(),
  statementDescriptorSuffix: z.string().max(12).optional(),
});

// ============================================
// Helper Functions
// ============================================

async function requireOrgAccess(
  request: FastifyRequest<{ Params: { organizationId: string } }>,
  reply: FastifyReply,
) {
  const user = (request as AuthenticatedRequest).user;
  if (!user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const { organizationId } = request.params;

  // Check organization membership
  const memberRef = db
    .collection("organizationMembers")
    .where("organizationId", "==", organizationId)
    .where("userId", "==", user.uid)
    .limit(1);

  const memberSnap = await memberRef.get();
  if (memberSnap.empty) {
    return reply.status(403).send({ error: "Access denied to organization" });
  }

  return memberSnap.docs[0].data();
}

// ============================================
// Routes
// ============================================

export async function paymentsRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing addon required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  // ============================================
  // Stripe Connect Account
  // ============================================

  // Get organization's Stripe settings
  fastify.get<{
    Params: { organizationId: string };
  }>(
    "/organizations/:organizationId/payments/settings",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { organizationId } = request.params;

      const settingsRef = db
        .collection("organizationStripeSettings")
        .doc(organizationId);
      const settingsSnap = await settingsRef.get();

      if (!settingsSnap.exists) {
        // Return default settings if not configured
        return {
          organizationId,
          accountStatus: "not_connected",
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          onboardingComplete: false,
          isEnabled: false,
          acceptedPaymentMethods: ["card"],
          defaultCurrency: "sek",
          passFeesToCustomer: false,
          payoutSchedule: "daily",
          payoutDelayDays: 2,
        };
      }

      const data = settingsSnap.data() as OrganizationStripeSettings;

      // If we have a stripeAccountId, sync live status from Stripe
      if (data.stripeAccountId) {
        try {
          const liveStatus = await getAccountStatus(data.stripeAccountId);
          // Update Firestore if status changed
          if (
            liveStatus.accountStatus !== data.accountStatus ||
            liveStatus.chargesEnabled !== data.chargesEnabled ||
            liveStatus.payoutsEnabled !== data.payoutsEnabled
          ) {
            await settingsRef.update({
              ...liveStatus,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          return {
            ...data,
            ...liveStatus,
            connectedAt: data.connectedAt?.toDate?.(),
            lastPayoutAt: data.lastPayoutAt?.toDate?.(),
            createdAt: data.createdAt?.toDate?.(),
            updatedAt: data.updatedAt?.toDate?.(),
          };
        } catch (err) {
          request.log.warn(
            { err, stripeAccountId: data.stripeAccountId },
            "Failed to sync Stripe account status",
          );
        }
      }

      return {
        ...data,
        connectedAt: data.connectedAt?.toDate?.(),
        lastPayoutAt: data.lastPayoutAt?.toDate?.(),
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.(),
      };
    },
  );

  // Create Stripe Connect account link (onboarding)
  fastify.post<{
    Params: { organizationId: string };
    Body: { returnUrl: string; refreshUrl: string };
  }>(
    "/organizations/:organizationId/payments/connect",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      // Check for admin role
      if (!["owner", "admin"].includes(membership.role)) {
        return reply
          .status(403)
          .send({ error: "Only owners/admins can manage payment settings" });
      }

      const result = connectAccountSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { organizationId } = request.params;
      const { returnUrl, refreshUrl } = result.data;

      // Get org email for Stripe account
      const orgDoc = await db
        .collection("organizations")
        .doc(organizationId)
        .get();
      const orgEmail = orgDoc.data()?.email;

      // Create or retrieve Stripe connected account
      const account = await createConnectedAccount(organizationId, orgEmail);

      // Generate onboarding link
      const accountLink = await createAccountLink(
        account.id,
        returnUrl,
        refreshUrl,
      );

      // Store initial settings
      const settingsRef = db
        .collection("organizationStripeSettings")
        .doc(organizationId);
      await settingsRef.set(
        {
          organizationId,
          stripeAccountId: account.id,
          accountStatus: "pending",
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          onboardingComplete: false,
          isEnabled: false,
          acceptedPaymentMethods: ["card"],
          defaultCurrency: "sek",
          passFeesToCustomer: false,
          payoutSchedule: "daily",
          payoutDelayDays: 2,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        accountLinkUrl: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000),
      };
    },
  );

  // Update Stripe settings
  fastify.patch<{
    Params: { organizationId: string };
    Body: z.infer<typeof updateStripeSettingsSchema>;
  }>(
    "/organizations/:organizationId/payments/settings",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      if (!["owner", "admin"].includes(membership.role)) {
        return reply
          .status(403)
          .send({ error: "Only owners/admins can manage payment settings" });
      }

      const result = updateStripeSettingsSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { organizationId } = request.params;

      const settingsRef = db
        .collection("organizationStripeSettings")
        .doc(organizationId);
      await settingsRef.update({
        ...result.data,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const updated = await settingsRef.get();
      return updated.data();
    },
  );

  // Disconnect Stripe account
  fastify.post<{
    Params: { organizationId: string };
  }>(
    "/organizations/:organizationId/payments/disconnect",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      if (!["owner", "admin"].includes(membership.role)) {
        return reply
          .status(403)
          .send({
            error: "Only owners/admins can disconnect payment settings",
          });
      }

      const { organizationId } = request.params;

      const settingsRef = db
        .collection("organizationStripeSettings")
        .doc(organizationId);
      const settingsSnap = await settingsRef.get();

      if (!settingsSnap.exists || !settingsSnap.data()?.stripeAccountId) {
        return reply.status(400).send({ error: "No Stripe account connected" });
      }

      await disconnectAccount(
        organizationId,
        settingsSnap.data()!.stripeAccountId,
      );

      return { success: true };
    },
  );

  // ============================================
  // Checkout Sessions
  // ============================================

  // Create checkout session
  fastify.post<{
    Params: { organizationId: string };
    Body: CreateCheckoutSessionData;
  }>(
    "/organizations/:organizationId/payments/checkout",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const result = createCheckoutSessionSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { organizationId } = request.params;
      const data = result.data;

      // Check if Stripe is enabled for org
      const settingsRef = db
        .collection("organizationStripeSettings")
        .doc(organizationId);
      const settingsSnap = await settingsRef.get();

      if (!settingsSnap.exists || !settingsSnap.data()?.isEnabled) {
        return reply.status(400).send({
          error: "Online payments not enabled for this organization",
        });
      }

      // If invoiceId provided, get invoice details
      let lineItems = data.lineItems;
      let totalAmount = 0;

      if (data.invoiceId) {
        const invoiceRef = db.collection("invoices").doc(data.invoiceId);
        const invoiceSnap = await invoiceRef.get();

        if (!invoiceSnap.exists) {
          return reply.status(404).send({ error: "Invoice not found" });
        }

        const invoice = invoiceSnap.data();
        if (invoice?.organizationId !== organizationId) {
          return reply
            .status(403)
            .send({ error: "Invoice belongs to another organization" });
        }

        // Convert invoice items to checkout line items
        lineItems = invoice.items?.map(
          (item: {
            description: string;
            quantity: number;
            unitPrice: number;
          }) => ({
            description: item.description,
            quantity: item.quantity,
            unitAmount: Math.round(item.unitPrice * 100), // Convert to öre
          }),
        );
        totalAmount = Math.round(invoice.total * 100);
      } else if (lineItems) {
        totalAmount = lineItems.reduce(
          (sum, item) => sum + item.unitAmount * item.quantity,
          0,
        );
      } else {
        return reply.status(400).send({
          error: "Either invoiceId or lineItems must be provided",
        });
      }

      // In production, create Stripe checkout session
      // const session = await stripe.checkout.sessions.create({
      //   mode: 'payment',
      //   payment_method_types: data.allowedPaymentMethods || ['card'],
      //   line_items: lineItems.map(item => ({
      //     price_data: {
      //       currency: 'sek',
      //       product_data: { name: item.description },
      //       unit_amount: item.unitAmount,
      //     },
      //     quantity: item.quantity,
      //   })),
      //   customer_email: data.customerEmail,
      //   success_url: data.successUrl,
      //   cancel_url: data.cancelUrl,
      //   expires_at: Math.floor(Date.now() / 1000) + (data.expiresInMinutes || 60) * 60,
      //   metadata: { ...data.metadata, organizationId, invoiceId: data.invoiceId },
      // });

      // Mock session for development
      const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const expiresAt = new Date(
        Date.now() + (data.expiresInMinutes || 60) * 60 * 1000,
      );

      // Store checkout session
      const checkoutRef = db.collection("checkoutSessions").doc(sessionId);
      await checkoutRef.set({
        id: sessionId,
        stripeSessionId: sessionId,
        organizationId,
        contactId: data.contactId,
        invoiceId: data.invoiceId || null,
        bookingId: data.bookingId || null,
        amount: totalAmount,
        currency: "sek",
        status: "open",
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: Timestamp.fromDate(expiresAt),
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
        metadata: data.metadata || {},
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        id: sessionId,
        stripeSessionId: sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        expiresAt: expiresAt.toISOString(),
        status: "open",
      } as unknown as CheckoutSession;
    },
  );

  // Get checkout session status
  fastify.get<{
    Params: { organizationId: string; sessionId: string };
  }>(
    "/organizations/:organizationId/payments/checkout/:sessionId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { organizationId, sessionId } = request.params;

      const sessionRef = db.collection("checkoutSessions").doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        return reply.status(404).send({ error: "Checkout session not found" });
      }

      const session = sessionSnap.data();

      // Verify session belongs to this organization
      if (session?.organizationId !== organizationId) {
        return reply.status(404).send({ error: "Checkout session not found" });
      }

      return {
        ...session,
        expiresAt: session?.expiresAt?.toDate?.(),
        createdAt: session?.createdAt?.toDate?.(),
      };
    },
  );

  // ============================================
  // Payment Intents
  // ============================================

  // Create payment intent (for custom payment flows)
  fastify.post<{
    Params: { organizationId: string };
    Body: CreatePaymentIntentData;
  }>(
    "/organizations/:organizationId/payments/intents",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const result = createPaymentIntentSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { organizationId } = request.params;
      const data = result.data;

      // Get contact info
      const contactRef = db.collection("contacts").doc(data.contactId);
      const contactSnap = await contactRef.get();

      if (!contactSnap.exists) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const contact = contactSnap.data();

      // In production, create Stripe payment intent
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: data.amount,
      //   currency: data.currency || 'sek',
      //   payment_method_types: data.paymentMethodTypes || ['card'],
      //   metadata: { organizationId, contactId: data.contactId, ...data.metadata },
      // });

      // Mock payment intent for development
      const intentId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Build without explicit type to avoid Timestamp incompatibility
      const paymentIntent = {
        id: intentId,
        organizationId,
        stripePaymentIntentId: intentId,
        amount: data.amount,
        amountReceived: 0,
        currency: data.currency || "sek",
        status: "pending" as const,
        stripeStatus: "requires_payment_method",
        contactId: data.contactId,
        contactEmail: contact?.email || "",
        invoiceId: data.invoiceId,
        bookingId: data.bookingId,
        description: data.description,
        metadata: data.metadata,
        refunds: [],
        totalRefunded: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await db.collection("paymentIntents").doc(intentId).set(paymentIntent);

      return {
        id: intentId,
        clientSecret: `${intentId}_secret_mock`,
        amount: data.amount,
        currency: data.currency || "sek",
        status: "requires_payment_method",
      };
    },
  );

  // List payment intents
  fastify.get<{
    Params: { organizationId: string };
    Querystring: {
      contactId?: string;
      invoiceId?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/organizations/:organizationId/payments/intents",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { organizationId } = request.params;
      const {
        contactId,
        invoiceId,
        status,
        limit = "20",
        offset = "0",
      } = request.query;

      let query = db
        .collection("paymentIntents")
        .where("organizationId", "==", organizationId)
        .orderBy("createdAt", "desc");

      if (contactId) {
        query = query.where("contactId", "==", contactId);
      }
      if (invoiceId) {
        query = query.where("invoiceId", "==", invoiceId);
      }
      if (status) {
        query = query.where("status", "==", status);
      }

      const snap = await query
        .limit(parseInt(limit))
        .offset(parseInt(offset))
        .get();

      const payments = snap.docs.map((doc) => {
        const data = doc.data() as PaymentIntent;
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.(),
          updatedAt: data.updatedAt?.toDate?.(),
          succeededAt: data.succeededAt?.toDate?.(),
          failedAt: data.failedAt?.toDate?.(),
        };
      });

      return { payments, total: snap.size };
    },
  );

  // Get payment intent
  fastify.get<{
    Params: { organizationId: string; intentId: string };
  }>(
    "/organizations/:organizationId/payments/intents/:intentId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { organizationId, intentId } = request.params;

      const intentRef = db.collection("paymentIntents").doc(intentId);
      const intentSnap = await intentRef.get();

      if (!intentSnap.exists) {
        return reply.status(404).send({ error: "Payment intent not found" });
      }

      const data = intentSnap.data() as PaymentIntent;
      if (data.organizationId !== organizationId) {
        return reply.status(403).send({ error: "Access denied" });
      }

      return {
        ...data,
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.(),
      };
    },
  );

  // ============================================
  // Refunds
  // ============================================

  // Create refund via Stripe on connected account
  fastify.post<{
    Params: { organizationId: string };
    Body: CreateRefundData;
  }>(
    "/organizations/:organizationId/payments/refunds",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      if (!["owner", "admin"].includes(membership.role)) {
        return reply
          .status(403)
          .send({ error: "Only owners/admins can create refunds" });
      }

      const result = createRefundSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { organizationId } = request.params;
      const { paymentIntentId, amount, reason } = result.data;
      const performedBy =
        (request as AuthenticatedRequest).user?.uid || "unknown";

      // Validate payment intent exists and belongs to org before calling Stripe
      const intentRef = db.collection("paymentIntents").doc(paymentIntentId);
      const intentSnap = await intentRef.get();

      if (!intentSnap.exists) {
        return reply.status(404).send({ error: "Payment intent not found" });
      }

      const intent = intentSnap.data() as PaymentIntent;
      if (intent.organizationId !== organizationId) {
        return reply.status(403).send({ error: "Access denied" });
      }

      if (
        intent.status !== "succeeded" &&
        intent.status !== "partially_refunded"
      ) {
        return reply.status(400).send({
          error: "Can only refund successful or partially refunded payments",
        });
      }

      try {
        // Map "other" reason to "requested_by_customer" for Stripe compatibility
        const stripeReason =
          reason === "other" || !reason ? "requested_by_customer" : reason;

        const refundResult = await createStripeRefund({
          organizationId,
          paymentIntentId,
          amount: amount || undefined,
          reason: stripeReason as
            | "duplicate"
            | "fraudulent"
            | "requested_by_customer",
          performedBy,
        });

        return {
          success: true,
          refund: {
            id: refundResult.refundId,
            stripeRefundId: refundResult.stripeRefundId,
            amount: refundResult.amount,
            currency: intent.currency,
            status: refundResult.status,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Refund failed";
        request.log.error(
          { err, paymentIntentId, organizationId },
          "Stripe refund failed",
        );
        return reply.status(400).send({ error: message });
      }
    },
  );

  // ============================================
  // Saved Payment Methods
  // ============================================

  // Get customer's saved payment methods
  fastify.get<{
    Params: { organizationId: string; contactId: string };
  }>(
    "/organizations/:organizationId/contacts/:contactId/payment-methods",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { organizationId, contactId } = request.params;

      const customerRef = db
        .collection("stripeCustomers")
        .where("organizationId", "==", organizationId)
        .where("contactId", "==", contactId)
        .limit(1);

      const customerSnap = await customerRef.get();

      if (customerSnap.empty) {
        return { paymentMethods: [] };
      }

      const customer = customerSnap.docs[0].data() as StripeCustomer;
      return { paymentMethods: customer.savedPaymentMethods || [] };
    },
  );

  // Save payment method
  fastify.post<{
    Params: { organizationId: string };
    Body: {
      contactId: string;
      paymentMethodId: string;
      setAsDefault?: boolean;
    };
  }>(
    "/organizations/:organizationId/payments/methods",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const result = savePaymentMethodSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { organizationId } = request.params;
      const { contactId, paymentMethodId, setAsDefault } = result.data;

      // In production, attach payment method to Stripe customer
      // and retrieve card/bank details

      // Mock saved payment method (without explicit type to avoid Timestamp incompatibility)
      const savedMethod = {
        id: `pm_${Date.now()}`,
        stripePaymentMethodId: paymentMethodId,
        type: "card" as const,
        isDefault: setAsDefault || false,
        card: {
          brand: "visa",
          last4: "4242",
          expMonth: 12,
          expYear: 2025,
        },
        createdAt: Timestamp.now(),
      };

      // Update or create customer record
      const customerQuery = db
        .collection("stripeCustomers")
        .where("organizationId", "==", organizationId)
        .where("contactId", "==", contactId)
        .limit(1);

      const customerSnap = await customerQuery.get();

      if (customerSnap.empty) {
        // Create new customer record
        const customerId = `cus_${Date.now()}`;
        await db
          .collection("stripeCustomers")
          .doc(customerId)
          .set({
            id: customerId,
            contactId,
            organizationId,
            stripeCustomerId: customerId,
            savedPaymentMethods: [savedMethod],
            defaultPaymentMethodId: setAsDefault ? savedMethod.id : undefined,
            balance: 0,
            currency: "sek",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
      } else {
        // Update existing customer
        const customerDoc = customerSnap.docs[0];
        const updates: Record<string, unknown> = {
          savedPaymentMethods: FieldValue.arrayUnion(savedMethod),
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (setAsDefault) {
          updates.defaultPaymentMethodId = savedMethod.id;
          updates.defaultPaymentMethodType = savedMethod.type;
          updates.defaultPaymentMethodLast4 = savedMethod.card?.last4;
        }

        await customerDoc.ref.update(updates);
      }

      return { success: true, paymentMethod: savedMethod };
    },
  );

  // Delete payment method
  fastify.delete<{
    Params: { organizationId: string; methodId: string };
    Querystring: { contactId: string };
  }>(
    "/organizations/:organizationId/payments/methods/:methodId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { organizationId, methodId } = request.params;
      const { contactId } = request.query;

      // Only admins/owners can delete payment methods for contacts
      if (!["owner", "admin"].includes(membership.role)) {
        return reply
          .status(403)
          .send({ error: "Only owners/admins can delete payment methods" });
      }

      const customerQuery = db
        .collection("stripeCustomers")
        .where("organizationId", "==", organizationId)
        .where("contactId", "==", contactId)
        .limit(1);

      const customerSnap = await customerQuery.get();

      if (customerSnap.empty) {
        return reply.status(404).send({ error: "Customer not found" });
      }

      const customerDoc = customerSnap.docs[0];
      const customer = customerDoc.data() as StripeCustomer;
      const methodToRemove = customer.savedPaymentMethods?.find(
        (m) => m.id === methodId,
      );

      if (!methodToRemove) {
        return reply.status(404).send({ error: "Payment method not found" });
      }

      // In production, detach from Stripe
      // await stripe.paymentMethods.detach(methodToRemove.stripePaymentMethodId);

      await customerDoc.ref.update({
        savedPaymentMethods: FieldValue.arrayRemove(methodToRemove),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    },
  );

  // ============================================
  // Prepaid Accounts
  // ============================================

  // Get prepaid account balance
  fastify.get<{
    Params: { organizationId: string; contactId: string };
  }>(
    "/organizations/:organizationId/contacts/:contactId/prepaid",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { organizationId, contactId } = request.params;

      const accountRef = db
        .collection("prepaidAccounts")
        .where("organizationId", "==", organizationId)
        .where("contactId", "==", contactId)
        .limit(1);

      const accountSnap = await accountRef.get();

      if (accountSnap.empty) {
        return {
          balance: 0,
          currency: "sek",
          totalDeposited: 0,
          totalSpent: 0,
        };
      }

      const account = accountSnap.docs[0].data() as PrepaidAccount;
      return {
        ...account,
        createdAt: account.createdAt?.toDate?.(),
        updatedAt: account.updatedAt?.toDate?.(),
        lastDepositAt: account.lastDepositAt?.toDate?.(),
        lastUsageAt: account.lastUsageAt?.toDate?.(),
      };
    },
  );

  // Deposit to prepaid account
  fastify.post<{
    Params: { organizationId: string; contactId: string };
    Body: { amount: number; currency?: string };
  }>(
    "/organizations/:organizationId/contacts/:contactId/prepaid/deposit",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      // Only admins/owners can deposit to prepaid accounts
      if (!["owner", "admin"].includes(membership.role)) {
        return reply
          .status(403)
          .send({ error: "Only owners/admins can manage prepaid deposits" });
      }

      const result = depositSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { organizationId, contactId } = request.params;
      const { amount, currency } = result.data;

      // In production, this would create a Stripe checkout session
      // or payment intent for the deposit

      // Get or create prepaid account
      const accountQuery = db
        .collection("prepaidAccounts")
        .where("organizationId", "==", organizationId)
        .where("contactId", "==", contactId)
        .limit(1);

      const accountSnap = await accountQuery.get();
      let accountId: string;
      let newBalance: number;

      if (accountSnap.empty) {
        accountId = `pa_${Date.now()}`;
        newBalance = amount;

        await db
          .collection("prepaidAccounts")
          .doc(accountId)
          .set({
            id: accountId,
            contactId,
            organizationId,
            balance: amount,
            currency: currency || "sek",
            lowBalanceThreshold: 10000, // 100 SEK
            notifyOnLowBalance: true,
            autoRechargeEnabled: false,
            totalDeposited: amount,
            totalSpent: 0,
            lastDepositAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
      } else {
        const accountDoc = accountSnap.docs[0];
        accountId = accountDoc.id;
        const account = accountDoc.data() as PrepaidAccount;
        newBalance = account.balance + amount;

        await accountDoc.ref.update({
          balance: FieldValue.increment(amount),
          totalDeposited: FieldValue.increment(amount),
          lastDepositAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Record transaction
      const transactionId = `pt_${Date.now()}`;
      await db
        .collection("prepaidTransactions")
        .doc(transactionId)
        .set({
          id: transactionId,
          accountId,
          contactId,
          organizationId,
          type: "deposit",
          amount,
          balanceAfter: newBalance,
          currency: currency || "sek",
          description: "Account deposit",
          createdAt: FieldValue.serverTimestamp(),
          createdBy: (request as AuthenticatedRequest).user?.uid,
        });

      return {
        success: true,
        newBalance,
        transaction: { id: transactionId, amount, type: "deposit" },
      };
    },
  );

  // Get prepaid transactions
  fastify.get<{
    Params: { organizationId: string; contactId: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    "/organizations/:organizationId/contacts/:contactId/prepaid/transactions",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { organizationId, contactId } = request.params;
      const { limit = "20", offset = "0" } = request.query;

      const query = db
        .collection("prepaidTransactions")
        .where("organizationId", "==", organizationId)
        .where("contactId", "==", contactId)
        .orderBy("createdAt", "desc")
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      const snap = await query.get();

      const transactions = snap.docs.map((doc) => {
        const data = doc.data() as PrepaidTransaction;
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.(),
        };
      });

      return { transactions };
    },
  );

  // ============================================
  // Analytics
  // ============================================

  /**
   * GET /organizations/:organizationId/payments/analytics
   * Payment analytics dashboard data.
   * Query params: startDate, endDate (ISO strings)
   */
  fastify.get<{
    Params: { organizationId: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>(
    "/organizations/:organizationId/payments/analytics",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      // Admin/owner only
      if (!["owner", "admin"].includes(membership.role)) {
        return reply
          .status(403)
          .send({ error: "Only owners/admins can view payment analytics" });
      }

      const { organizationId } = request.params;
      const { startDate, endDate } = request.query;

      // Default to last 30 days if not provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      let query = db
        .collection("paymentIntents")
        .where("organizationId", "==", organizationId)
        .where("createdAt", ">=", Timestamp.fromDate(start))
        .where("createdAt", "<=", Timestamp.fromDate(end))
        .orderBy("createdAt", "desc");

      const snap = await query.get();

      const payments = snap.docs.map((doc) => doc.data() as PaymentIntent);

      // Aggregate by payment method
      const methodMap = new Map<string, { count: number; amount: number }>();
      const statusMap = new Map<string, { count: number; amount: number }>();
      const dailyMap = new Map<string, { count: number; amount: number }>();

      let totalPayments = 0;
      let totalAmount = 0;
      let totalRefunds = 0;
      let totalRefundAmount = 0;
      let totalApplicationFees = 0;

      for (const p of payments) {
        totalPayments++;
        totalAmount += p.amount || 0;
        totalRefunds += p.refunds?.length || 0;
        totalRefundAmount += p.totalRefunded || 0;
        totalApplicationFees += p.applicationFeeAmount || 0;

        // By method
        const method = p.paymentMethodType || "unknown";
        const methodEntry = methodMap.get(method) || { count: 0, amount: 0 };
        methodEntry.count++;
        methodEntry.amount += p.amount || 0;
        methodMap.set(method, methodEntry);

        // By status
        const status = p.status || "unknown";
        const statusEntry = statusMap.get(status) || { count: 0, amount: 0 };
        statusEntry.count++;
        statusEntry.amount += p.amount || 0;
        statusMap.set(status, statusEntry);

        // Daily trend
        const dateKey = p.createdAt?.toDate?.()
          ? p.createdAt.toDate().toISOString().substring(0, 10)
          : "unknown";
        const dailyEntry = dailyMap.get(dateKey) || { count: 0, amount: 0 };
        dailyEntry.count++;
        dailyEntry.amount += p.amount || 0;
        dailyMap.set(dateKey, dailyEntry);
      }

      // Recent payments (top 10)
      const recentPayments = payments.slice(0, 10).map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        contactName: undefined as string | undefined,
        invoiceNumber: p.invoiceNumber,
        paymentMethodType: p.paymentMethodType,
        createdAt: p.createdAt?.toDate?.()?.toISOString() || "",
      }));

      // Fetch contact names for recent payments
      const contactIds = [
        ...new Set(
          payments
            .slice(0, 10)
            .map((p) => p.contactId)
            .filter(Boolean),
        ),
      ];
      const contactNameMap = new Map<string, string>();
      for (const cid of contactIds) {
        const contactDoc = await db.collection("contacts").doc(cid).get();
        if (contactDoc.exists) {
          const c = contactDoc.data()!;
          const name =
            c.contactType === "Personal"
              ? `${c.firstName || ""} ${c.lastName || ""}`.trim()
              : c.businessName || "";
          contactNameMap.set(cid, name || c.email || cid);
        }
      }

      for (let i = 0; i < Math.min(payments.length, 10); i++) {
        recentPayments[i].contactName =
          contactNameMap.get(payments[i].contactId) || undefined;
      }

      const netAmount = totalAmount - totalRefundAmount;

      const result: PaymentDashboardData = {
        organizationId,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalPayments,
          totalAmount,
          totalRefunds,
          totalRefundAmount,
          netAmount,
          totalApplicationFees,
          currency: "SEK",
        },
        byPaymentMethod: Array.from(methodMap.entries()).map(
          ([method, data]) => ({
            method,
            count: data.count,
            amount: data.amount,
          }),
        ),
        byStatus: Array.from(statusMap.entries()).map(([status, data]) => ({
          status,
          count: data.count,
          amount: data.amount,
        })),
        dailyTrend: Array.from(dailyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            count: data.count,
            amount: data.amount,
          })),
        recentPayments,
      };

      return result;
    },
  );

  /**
   * GET /organizations/:organizationId/payments/application-fees
   * Application fee report.
   * Query params: startDate, endDate (ISO strings)
   */
  fastify.get<{
    Params: { organizationId: string };
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>(
    "/organizations/:organizationId/payments/application-fees",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      // Admin/owner only
      if (!["owner", "admin"].includes(membership.role)) {
        return reply
          .status(403)
          .send({
            error: "Only owners/admins can view application fee reports",
          });
      }

      const { organizationId } = request.params;
      const { startDate, endDate } = request.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Query payment intents with application fees
      const snap = await db
        .collection("paymentIntents")
        .where("organizationId", "==", organizationId)
        .where("createdAt", ">=", Timestamp.fromDate(start))
        .where("createdAt", "<=", Timestamp.fromDate(end))
        .orderBy("createdAt", "desc")
        .get();

      const payments = snap.docs.map((doc) => doc.data() as PaymentIntent);
      const withFees = payments.filter(
        (p) => (p.applicationFeeAmount || 0) > 0,
      );

      let totalFees = 0;
      let totalPaymentAmount = 0;
      const feeEntries = withFees.map((p) => {
        const fee = p.applicationFeeAmount || 0;
        totalFees += fee;
        totalPaymentAmount += p.amount || 0;
        return {
          paymentIntentId: p.id,
          paymentAmount: p.amount,
          applicationFee: fee,
          currency: p.currency,
          status: p.status,
          invoiceNumber: p.invoiceNumber,
          createdAt: p.createdAt?.toDate?.()?.toISOString() || "",
        };
      });

      return {
        organizationId,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalPayments: withFees.length,
          totalPaymentAmount,
          totalApplicationFees: totalFees,
          effectiveRate:
            totalPaymentAmount > 0
              ? Math.round((totalFees / totalPaymentAmount) * 10000) / 100
              : 0,
          currency: "SEK",
        },
        entries: feeEntries,
      };
    },
  );
}
