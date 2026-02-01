/**
 * Portal Payment Routes
 *
 * Endpoints for portal users (contacts with login access) to purchase
 * packages (klippkort) via Stripe Checkout and view their payment history.
 * All amounts in ore (1 SEK = 100 ore).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";
import {
  getConnectedAccountId,
  createInvoiceCheckoutSession,
} from "../utils/stripePayments.js";

// ============================================
// Portal Context (mirrors portal.ts pattern)
// ============================================

interface PortalPaymentUser {
  contactId: string;
  contactName: string;
  contactEmail: string;
  organizationId: string;
}

/**
 * Serialize Firestore Timestamps to ISO strings in an object.
 */
function serializeTimestamps(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeTimestamps);
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      result[key] = serializeTimestamps((obj as Record<string, unknown>)[key]);
    }
    return result;
  }

  return obj;
}

/**
 * Portal authentication middleware for payment routes.
 * Finds contact by linkedUserId and verifies hasLoginAccess.
 */
async function requirePortalAccess(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = (request as AuthenticatedRequest).user;

  if (!user) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  try {
    const contactsSnapshot = await db
      .collection("contacts")
      .where("linkedUserId", "==", user.uid)
      .where("hasLoginAccess", "==", true)
      .limit(1)
      .get();

    if (contactsSnapshot.empty) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Portal access not enabled for this account",
      });
    }

    const contactDoc = contactsSnapshot.docs[0];
    const contact = contactDoc.data();

    if (!contact.organizationId) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Contact not associated with an organization",
      });
    }

    const contactName =
      contact.contactType === "Personal"
        ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
        : contact.businessName || "";

    (request as FastifyRequest & { portalUser: PortalPaymentUser }).portalUser =
      {
        contactId: contactDoc.id,
        contactName: contactName || contact.email || "Portal User",
        contactEmail: contact.email || "",
        organizationId: contact.organizationId,
      };
  } catch (error) {
    request.log.error({ error }, "Portal access check failed");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Failed to verify portal access",
    });
  }
}

// ============================================
// Zod Schemas
// ============================================

const purchasePackageSchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  locale: z.string().optional(),
});

// ============================================
// Routes
// ============================================

export async function portalPaymentsRoutes(fastify: FastifyInstance) {
  // Module gates: both portal and invoicing required
  fastify.addHook("preHandler", checkModuleAccess("portal"));
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  // ============================================
  // PACKAGE PURCHASE
  // ============================================

  /**
   * POST /portal/packages/:packageId/purchase
   * Create a Stripe Checkout session to purchase a klippkort package.
   */
  fastify.post<{
    Params: { packageId: string };
  }>(
    "/packages/:packageId/purchase",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (
          request as FastifyRequest & { portalUser: PortalPaymentUser }
        ).portalUser;
        const { packageId } = request.params;

        // Validate body
        const result = purchasePackageSchema.safeParse(request.body);
        if (!result.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: result.error.flatten().fieldErrors,
          });
        }

        const { successUrl, cancelUrl, locale } = result.data;

        // Get package definition
        const packageDoc = await db
          .collection("packageDefinitions")
          .doc(packageId)
          .get();

        if (!packageDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Package not found",
          });
        }

        const packageDef = packageDoc.data()!;

        // Verify package is active
        if (packageDef.status !== "active") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "This package is not currently available for purchase",
          });
        }

        // Verify package belongs to same org as portal user
        if (packageDef.organizationId !== portal.organizationId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Package does not belong to your organization",
          });
        }

        // Get connected Stripe account for the org
        let connectedAccountId: string;
        try {
          connectedAccountId = await getConnectedAccountId(
            portal.organizationId,
          );
        } catch (err) {
          return reply.status(400).send({
            error:
              err instanceof Error
                ? err.message
                : "Online payments not available",
          });
        }

        // Build line items for checkout
        const lineItems = [
          {
            description: packageDef.name || "Klippkort",
            quantity: 1,
            unitAmount: packageDef.price, // already in ore
          },
        ];

        // Create Checkout Session on connected account
        const session = await createInvoiceCheckoutSession({
          organizationId: portal.organizationId,
          connectedAccountId,
          invoiceId: `pkg_${packageId}_${Date.now()}`, // synthetic reference
          invoiceNumber: `PKG-${packageId.substring(0, 8).toUpperCase()}`,
          contactEmail: portal.contactEmail || undefined,
          lineItems,
          totalAmount: packageDef.price,
          currency: packageDef.currency?.toLowerCase() || "sek",
          successUrl,
          cancelUrl,
          locale,
          metadata: {
            type: "package_purchase",
            packageDefinitionId: packageId,
            memberId: portal.contactId,
            organizationId: portal.organizationId,
          },
        });

        return {
          sessionId: session.id,
          url: session.url,
          expiresAt: session.expires_at
            ? new Date(session.expires_at * 1000).toISOString()
            : null,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to create package checkout");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create checkout session",
        });
      }
    },
  );

  // ============================================
  // PAYMENT HISTORY
  // ============================================

  /**
   * GET /portal/payments
   * List portal user's payments.
   */
  fastify.get(
    "/payments",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (
          request as FastifyRequest & { portalUser: PortalPaymentUser }
        ).portalUser;

        const { limit: limitParam = "20", offset: offsetParam = "0" } =
          request.query as {
            limit?: string;
            offset?: string;
          };

        // Enforce limit bounds: min 1, max 100, default 20
        const parsedLimit = Math.max(
          1,
          Math.min(100, parseInt(limitParam, 10) || 20),
        );
        const parsedOffset = Math.max(0, parseInt(offsetParam, 10) || 0);

        const query = db
          .collection("paymentIntents")
          .where("contactId", "==", portal.contactId)
          .where("organizationId", "==", portal.organizationId)
          .orderBy("createdAt", "desc")
          .limit(parsedLimit)
          .offset(parsedOffset);

        const snapshot = await query.get();

        const payments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Get total count
        const countSnapshot = await db
          .collection("paymentIntents")
          .where("contactId", "==", portal.contactId)
          .where("organizationId", "==", portal.organizationId)
          .count()
          .get();

        return {
          payments: (payments as unknown[]).map(serializeTimestamps),
          total: countSnapshot.data().count,
          limit: parsedLimit,
          offset: parsedOffset,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch portal payments");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch payments",
        });
      }
    },
  );

  // ============================================
  // PAYMENT RECEIPT
  // ============================================

  /**
   * GET /portal/payments/:paymentId/receipt
   * Get receipt info for a payment.
   */
  fastify.get<{
    Params: { paymentId: string };
  }>(
    "/payments/:paymentId/receipt",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (
          request as FastifyRequest & { portalUser: PortalPaymentUser }
        ).portalUser;
        const { paymentId } = request.params;

        const paymentDoc = await db
          .collection("paymentIntents")
          .doc(paymentId)
          .get();

        if (!paymentDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Payment not found",
          });
        }

        const payment = paymentDoc.data()!;

        // Verify payment belongs to this portal user
        if (
          payment.contactId !== portal.contactId ||
          payment.organizationId !== portal.organizationId
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this payment",
          });
        }

        return serializeTimestamps({
          id: paymentDoc.id,
          amount: payment.amount,
          amountReceived: payment.amountReceived,
          currency: payment.currency,
          status: payment.status,
          description: payment.description,
          paymentMethodType: payment.paymentMethodType,
          last4: payment.last4,
          receiptUrl: payment.receiptUrl || null,
          receiptNumber: payment.receiptNumber || null,
          invoiceId: payment.invoiceId || null,
          invoiceNumber: payment.invoiceNumber || null,
          createdAt: payment.createdAt,
          succeededAt: payment.succeededAt || null,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch payment receipt");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch receipt",
        });
      }
    },
  );
}
