/**
 * Invoice Payment Routes
 *
 * Endpoints for paying invoices via Stripe (Checkout Sessions, saved cards).
 * All payments are made on the organization's connected Stripe account.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  getConnectedAccountId,
  createInvoiceCheckoutSession,
  createSavedCardPayment,
  getOrCreateConnectedCustomer,
} from "../utils/stripePayments.js";

// ============================================
// Zod Schemas
// ============================================

const checkoutSchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  locale: z.string().optional(),
  setupFutureUsage: z.boolean().optional(),
});

const payWithSavedCardSchema = z.object({
  paymentMethodId: z.string(),
  amount: z.number().min(100).optional(), // Optional: partial payment in öre
});

// ============================================
// Helper
// ============================================

async function requireOrgAccess(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply,
) {
  const user = (request as AuthenticatedRequest).user;
  if (!user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const { orgId } = request.params;

  const memberRef = db
    .collection("organizationMembers")
    .where("organizationId", "==", orgId)
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

export async function invoicePaymentsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  /**
   * POST /:orgId/invoices/:invoiceId/checkout
   * Create a Stripe Checkout session for an invoice.
   */
  fastify.post<{
    Params: { orgId: string; invoiceId: string };
    Body: z.infer<typeof checkoutSchema>;
  }>(
    "/:orgId/invoices/:invoiceId/checkout",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const result = checkoutSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { orgId, invoiceId } = request.params;
      const { successUrl, cancelUrl, locale, setupFutureUsage } = result.data;

      // Get invoice
      const invoiceRef = db.collection("invoices").doc(invoiceId);
      const invoiceSnap = await invoiceRef.get();

      if (!invoiceSnap.exists) {
        return reply.status(404).send({ error: "Invoice not found" });
      }

      const invoice = invoiceSnap.data()!;
      if (invoice.organizationId !== orgId) {
        // Return 404 instead of 403 to avoid leaking invoice existence info
        return reply.status(404).send({ error: "Invoice not found" });
      }

      // Validate invoice is payable
      if (!["sent", "overdue", "partially_paid"].includes(invoice.status)) {
        return reply.status(400).send({
          error: `Invoice cannot be paid in status: ${invoice.status}`,
        });
      }

      const amountDue =
        invoice.amountDue || invoice.total - (invoice.amountPaid || 0);
      if (amountDue <= 0) {
        return reply.status(400).send({ error: "Invoice already fully paid" });
      }

      // Get connected account
      let connectedAccountId: string;
      try {
        connectedAccountId = await getConnectedAccountId(orgId);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : "Payment not available",
        });
      }

      // Build line items from invoice
      const lineItems = (invoice.items || []).map(
        (item: {
          description: string;
          quantity: number;
          unitPrice: number;
          vatRate: number;
        }) => ({
          description: item.description,
          quantity: item.quantity,
          unitAmount: Math.round(item.unitPrice * (1 + item.vatRate / 100)),
        }),
      );

      // Get org settings for accepted payment methods
      const settingsSnap = await db
        .collection("organizationStripeSettings")
        .doc(orgId)
        .get();
      const acceptedMethods = settingsSnap.data()?.acceptedPaymentMethods;

      // Create Checkout Session on connected account
      const session = await createInvoiceCheckoutSession({
        organizationId: orgId,
        connectedAccountId,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        contactEmail: invoice.contactEmail,
        lineItems,
        totalAmount: amountDue,
        currency: invoice.currency?.toLowerCase() || "sek",
        successUrl,
        cancelUrl,
        allowedPaymentMethods: acceptedMethods,
        locale,
        setupFutureUsage,
      });

      // Store checkout reference on invoice
      await invoiceRef.update({
        checkoutSessionId: session.id,
        checkoutUrl: session.url,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        sessionId: session.id,
        url: session.url,
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
      };
    },
  );

  /**
   * POST /:orgId/invoices/:invoiceId/pay-saved
   * Pay an invoice using a saved payment method.
   */
  fastify.post<{
    Params: { orgId: string; invoiceId: string };
    Body: z.infer<typeof payWithSavedCardSchema>;
  }>(
    "/:orgId/invoices/:invoiceId/pay-saved",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const result = payWithSavedCardSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        });
      }

      const { orgId, invoiceId } = request.params;
      const { paymentMethodId, amount } = result.data;

      // Get invoice
      const invoiceRef = db.collection("invoices").doc(invoiceId);
      const invoiceSnap = await invoiceRef.get();

      if (!invoiceSnap.exists) {
        return reply.status(404).send({ error: "Invoice not found" });
      }

      const invoice = invoiceSnap.data()!;
      if (invoice.organizationId !== orgId) {
        // Return 404 instead of 403 to avoid leaking invoice existence info
        return reply.status(404).send({ error: "Invoice not found" });
      }

      if (!["sent", "overdue", "partially_paid"].includes(invoice.status)) {
        return reply.status(400).send({
          error: `Invoice cannot be paid in status: ${invoice.status}`,
        });
      }

      const amountDue =
        invoice.amountDue || invoice.total - (invoice.amountPaid || 0);
      const payAmount = amount || amountDue;

      if (payAmount > amountDue) {
        return reply
          .status(400)
          .send({ error: "Payment amount exceeds amount due" });
      }
      if (payAmount <= 0) {
        return reply.status(400).send({ error: "Invoice already fully paid" });
      }

      // Get connected account
      let connectedAccountId: string;
      try {
        connectedAccountId = await getConnectedAccountId(orgId);
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : "Payment not available",
        });
      }

      // Get or create Stripe customer for contact on connected account
      const stripeCustomerId = await getOrCreateConnectedCustomer(
        orgId,
        connectedAccountId,
        invoice.contactId,
        invoice.contactEmail,
        invoice.contactName,
      );

      // Create PaymentIntent with saved method
      try {
        const paymentIntent = await createSavedCardPayment({
          organizationId: orgId,
          connectedAccountId,
          stripeCustomerId,
          paymentMethodId,
          amount: payAmount,
          currency: invoice.currency?.toLowerCase() || "sek",
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          description: `Invoice ${invoice.invoiceNumber}`,
        });

        // Store PaymentIntent record
        await db
          .collection("paymentIntents")
          .doc(paymentIntent.id)
          .set({
            id: paymentIntent.id,
            organizationId: orgId,
            stripePaymentIntentId: paymentIntent.id,
            amount: payAmount,
            amountReceived: paymentIntent.amount_received || 0,
            currency: invoice.currency?.toLowerCase() || "sek",
            status:
              paymentIntent.status === "succeeded" ? "succeeded" : "processing",
            stripeStatus: paymentIntent.status,
            contactId: invoice.contactId,
            contactEmail: invoice.contactEmail,
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            description: `Invoice ${invoice.invoiceNumber}`,
            paymentMethodId,
            refunds: [],
            totalRefunded: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            ...(paymentIntent.status === "succeeded"
              ? { succeededAt: FieldValue.serverTimestamp() }
              : {}),
          });

        // If payment succeeded immediately, update invoice
        if (paymentIntent.status === "succeeded") {
          const newAmountPaid = (invoice.amountPaid || 0) + payAmount;
          const newAmountDue = invoice.total - newAmountPaid;
          const newStatus = newAmountDue <= 0 ? "paid" : "partially_paid";

          await invoiceRef.update({
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus,
            ...(newStatus === "paid"
              ? { paidAt: FieldValue.serverTimestamp() }
              : {}),
            payments: FieldValue.arrayUnion({
              id: paymentIntent.id,
              invoiceId,
              amount: payAmount,
              currency: invoice.currency || "SEK",
              method: "stripe",
              reference: paymentIntent.id,
              paidAt: Timestamp.now(),
              recordedAt: Timestamp.now(),
              recordedBy: "system",
              stripePaymentIntentId: paymentIntent.id,
            }),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        return {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          clientSecret:
            paymentIntent.status === "requires_action"
              ? paymentIntent.client_secret
              : undefined,
          requiresAction: paymentIntent.status === "requires_action",
        };
      } catch (err: unknown) {
        const stripeErr = err as {
          type?: string;
          code?: string;
          message?: string;
        };
        if (stripeErr.type === "StripeCardError") {
          return reply.status(402).send({
            error: "Payment failed",
            code: stripeErr.code,
            message: stripeErr.message,
          });
        }
        throw err;
      }
    },
  );

  /**
   * GET /:orgId/invoices/:invoiceId/payment-status
   * Get payment status for an invoice.
   */
  fastify.get<{
    Params: { orgId: string; invoiceId: string };
  }>(
    "/:orgId/invoices/:invoiceId/payment-status",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const membership = await requireOrgAccess(request, reply);
      if (!membership) return;

      const { orgId, invoiceId } = request.params;

      // Get invoice
      const invoiceRef = db.collection("invoices").doc(invoiceId);
      const invoiceSnap = await invoiceRef.get();

      if (!invoiceSnap.exists) {
        return reply.status(404).send({ error: "Invoice not found" });
      }

      const invoice = invoiceSnap.data()!;
      if (invoice.organizationId !== orgId) {
        // Return 404 instead of 403 to avoid leaking invoice existence info
        return reply.status(404).send({ error: "Invoice not found" });
      }

      // Get payment intents for this invoice
      const paymentsSnap = await db
        .collection("paymentIntents")
        .where("invoiceId", "==", invoiceId)
        .orderBy("createdAt", "desc")
        .get();

      const payments = paymentsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          paymentMethodType: data.paymentMethodType,
          createdAt: data.createdAt?.toDate?.(),
          succeededAt: data.succeededAt?.toDate?.(),
        };
      });

      return {
        invoiceId,
        invoiceStatus: invoice.status,
        total: invoice.total,
        amountPaid: invoice.amountPaid || 0,
        amountDue:
          invoice.amountDue || invoice.total - (invoice.amountPaid || 0),
        currency: invoice.currency || "SEK",
        payments,
      };
    },
  );
}
