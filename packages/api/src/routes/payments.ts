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
} from "@equiduty/shared";

// Note: Stripe would be imported and configured here in production
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { returnUrl: _returnUrl, refreshUrl: _refreshUrl } = result.data;

      // In production, this would create a Stripe Connect account
      // and generate an account link for onboarding
      // const account = await stripe.accounts.create({ type: 'standard' });
      // const accountLink = await stripe.accountLinks.create({
      //   account: account.id,
      //   refresh_url: refreshUrl,
      //   return_url: returnUrl,
      //   type: 'account_onboarding',
      // });

      // Placeholder response for development
      const mockAccountLinkUrl = `https://connect.stripe.com/setup/s/mock_${organizationId}`;

      // Store initial settings
      const settingsRef = db
        .collection("organizationStripeSettings")
        .doc(organizationId);
      await settingsRef.set(
        {
          organizationId,
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
        accountLinkUrl: mockAccountLinkUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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

      const { sessionId } = request.params;

      const sessionRef = db.collection("checkoutSessions").doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        return reply.status(404).send({ error: "Checkout session not found" });
      }

      const session = sessionSnap.data();
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

  // Create refund
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

      // Get payment intent
      const intentRef = db.collection("paymentIntents").doc(paymentIntentId);
      const intentSnap = await intentRef.get();

      if (!intentSnap.exists) {
        return reply.status(404).send({ error: "Payment intent not found" });
      }

      const intent = intentSnap.data() as PaymentIntent;
      if (intent.organizationId !== organizationId) {
        return reply.status(403).send({ error: "Access denied" });
      }

      if (intent.status !== "succeeded") {
        return reply.status(400).send({
          error: "Can only refund successful payments",
        });
      }

      const refundAmount = amount || intent.amount - intent.totalRefunded;
      if (refundAmount > intent.amount - intent.totalRefunded) {
        return reply.status(400).send({
          error: "Refund amount exceeds available balance",
        });
      }

      // In production, create Stripe refund
      // const refund = await stripe.refunds.create({
      //   payment_intent: intent.stripePaymentIntentId,
      //   amount: refundAmount,
      //   reason: reason === 'duplicate' ? 'duplicate' : reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
      // });

      // Mock refund for development
      const refundId = `re_${Date.now()}`;
      const refundRecord = {
        id: refundId,
        stripeRefundId: refundId,
        amount: refundAmount,
        currency: intent.currency,
        reason,
        status: "succeeded" as const,
        createdAt: Timestamp.now(),
        createdBy: (request as AuthenticatedRequest).user?.uid,
      };

      // Update payment intent
      await intentRef.update({
        refunds: FieldValue.arrayUnion(refundRecord),
        totalRefunded: FieldValue.increment(refundAmount),
        status:
          refundAmount >= intent.amount - intent.totalRefunded
            ? "refunded"
            : "partially_refunded",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // If linked to invoice, update invoice
      if (intent.invoiceId) {
        await db
          .collection("invoices")
          .doc(intent.invoiceId)
          .update({
            refundedAmount: FieldValue.increment(refundAmount),
            updatedAt: FieldValue.serverTimestamp(),
          });
      }

      return { success: true, refund: refundRecord };
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
}
