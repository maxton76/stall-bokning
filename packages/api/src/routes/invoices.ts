import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  canAccessOrganization,
  canManageOrganization,
  isSystemAdmin,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";
import type { InvoiceStatus } from "@stall-bokning/shared";

/**
 * Generate next invoice number for organization
 */
async function generateInvoiceNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);

  // Get invoice settings for organization
  const settingsDoc = await db
    .collection("invoiceSettings")
    .doc(organizationId)
    .get();

  let prefix = "INV";
  let separator = "-";
  let paddingDigits = 4;

  if (settingsDoc.exists) {
    const settings = settingsDoc.data()!;
    if (settings.numbering) {
      prefix = settings.numbering.prefix || "INV";
      separator = settings.numbering.separator || "-";
      paddingDigits = settings.numbering.paddingDigits || 4;
    }
  }

  // Count invoices for this year
  const countSnapshot = await db
    .collection("invoices")
    .where("organizationId", "==", organizationId)
    .where("issueDate", ">=", Timestamp.fromDate(new Date(`${year}-01-01`)))
    .where("issueDate", "<", Timestamp.fromDate(new Date(`${year + 1}-01-01`)))
    .count()
    .get();

  const count = countSnapshot.data().count + 1;
  const paddedNumber = count.toString().padStart(paddingDigits, "0");

  return `${prefix}${separator}${shortYear}${separator}${paddedNumber}`;
}

/**
 * Calculate invoice totals from items
 */
function calculateInvoiceTotals(items: any[]): {
  subtotal: number;
  totalDiscount: number;
  vatBreakdown: { rate: number; baseAmount: number; vatAmount: number }[];
  totalVat: number;
  total: number;
} {
  let subtotal = 0;
  let totalDiscount = 0;
  const vatByRate: Map<number, { base: number; vat: number }> = new Map();

  items.forEach((item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discount
      ? lineSubtotal * (item.discount / 100)
      : 0;
    const lineTotal = lineSubtotal - discountAmount;
    const vatAmount = lineTotal * (item.vatRate / 100);

    subtotal += lineTotal;
    totalDiscount += discountAmount;

    // Aggregate VAT by rate
    const existing = vatByRate.get(item.vatRate) || { base: 0, vat: 0 };
    vatByRate.set(item.vatRate, {
      base: existing.base + lineTotal,
      vat: existing.vat + vatAmount,
    });
  });

  const vatBreakdown = Array.from(vatByRate.entries()).map(
    ([rate, { base, vat }]) => ({
      rate,
      baseAmount: Math.round(base * 100) / 100,
      vatAmount: Math.round(vat * 100) / 100,
    }),
  );

  const totalVat = vatBreakdown.reduce((sum, v) => sum + v.vatAmount, 0);
  const total = Math.round((subtotal + totalVat) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    vatBreakdown,
    totalVat: Math.round(totalVat * 100) / 100,
    total,
  };
}

export async function invoicesRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing addon required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  /**
   * GET /api/v1/invoices/organization/:organizationId
   * Get all invoices for an organization
   * Query params: status, contactId, limit, startAfter
   */
  fastify.get(
    "/organization/:organizationId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as { organizationId: string };
        const {
          status,
          contactId,
          limit = "50",
        } = request.query as {
          status?: InvoiceStatus;
          contactId?: string;
          limit?: string;
        };

        // Check organization access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        // Build query
        let query = db
          .collection("invoices")
          .where("organizationId", "==", organizationId);

        if (status) {
          query = query.where("status", "==", status) as any;
        }

        if (contactId) {
          query = query.where("contactId", "==", contactId) as any;
        }

        query = query
          .orderBy("issueDate", "desc")
          .limit(parseInt(limit)) as any;

        const snapshot = await query.get();

        const invoices = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { invoices };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch invoices");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch invoices",
        });
      }
    },
  );

  /**
   * GET /api/v1/invoices/:id
   * Get a single invoice by ID
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const doc = await db.collection("invoices").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const invoice = doc.data()!;

        // Check organization access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            invoice.organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this invoice",
            });
          }
        }

        return serializeTimestamps({ id: doc.id, ...invoice });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch invoice");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch invoice",
        });
      }
    },
  );

  /**
   * POST /api/v1/invoices
   * Create a new invoice
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const data = request.body as any;

        if (!data.organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "organizationId is required",
          });
        }

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            data.organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to create invoices for this organization",
            });
          }
        }

        // Validate required fields
        if (
          !data.contactId ||
          !data.issueDate ||
          !data.dueDate ||
          !data.items?.length
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "contactId, issueDate, dueDate, and items are required",
          });
        }

        // Fetch contact for denormalization
        const contactDoc = await db
          .collection("contacts")
          .doc(data.contactId)
          .get();
        if (!contactDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Contact not found",
          });
        }
        const contact = contactDoc.data()!;
        const contactName =
          contact.contactType === "Business"
            ? contact.businessName
            : `${contact.firstName} ${contact.lastName}`;

        // Fetch organization for denormalization
        const orgDoc = await db
          .collection("organizations")
          .doc(data.organizationId)
          .get();
        if (!orgDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Organization not found",
          });
        }
        const org = orgDoc.data()!;

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(data.organizationId);

        // Process items with IDs and calculations
        const processedItems = data.items.map((item: any, index: number) => {
          const lineSubtotal = item.quantity * item.unitPrice;
          const discountAmount = item.discount
            ? lineSubtotal * (item.discount / 100)
            : 0;
          const lineTotal = lineSubtotal - discountAmount;
          const vatAmount = lineTotal * (item.vatRate / 100);

          return {
            id: `item-${Date.now()}-${index}`,
            description: item.description,
            itemType: item.itemType || "other",
            quantity: item.quantity,
            unit: item.unit || null,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            discount: item.discount || null,
            discountAmount: Math.round(discountAmount * 100) / 100,
            lineTotal: Math.round(lineTotal * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            horseId: item.horseId || null,
            horseName: item.horseName || null,
            periodStart: item.periodStart
              ? Timestamp.fromDate(new Date(item.periodStart))
              : null,
            periodEnd: item.periodEnd
              ? Timestamp.fromDate(new Date(item.periodEnd))
              : null,
            serviceDate: item.serviceDate
              ? Timestamp.fromDate(new Date(item.serviceDate))
              : null,
            serviceName: item.serviceName || null,
          };
        });

        // Calculate totals
        const totals = calculateInvoiceTotals(processedItems);

        const invoiceData = {
          invoiceNumber,
          organizationId: data.organizationId,
          stableId: data.stableId || null,

          // Customer info
          contactId: data.contactId,
          contactName,
          contactEmail: contact.email,
          contactAddress: contact.address
            ? {
                street: contact.address.street,
                houseNumber: contact.address.houseNumber,
                postcode: contact.address.postcode,
                city: contact.address.city,
                country: contact.address.country,
              }
            : null,

          // Organization info
          organizationName: org.name,
          organizationAddress: org.address || null,
          organizationVatNumber: org.vatNumber || null,
          organizationBankInfo: org.bankInfo || null,

          // Dates
          issueDate: Timestamp.fromDate(new Date(data.issueDate)),
          dueDate: Timestamp.fromDate(new Date(data.dueDate)),
          periodStart: data.periodStart
            ? Timestamp.fromDate(new Date(data.periodStart))
            : null,
          periodEnd: data.periodEnd
            ? Timestamp.fromDate(new Date(data.periodEnd))
            : null,

          // Items and totals
          items: processedItems,
          ...totals,
          currency: data.currency || "SEK",

          // Payment tracking
          amountPaid: 0,
          amountDue: totals.total,
          payments: [],

          // Status
          status: (data.status || "draft") as InvoiceStatus,
          sentAt: null,
          paidAt: null,
          cancelledAt: null,
          voidedAt: null,

          // Document settings
          language: data.language || contact.invoiceLanguage || "sv",
          pdfUrl: null,
          pdfGeneratedAt: null,

          // External integrations
          stripeInvoiceId: null,
          stripeInvoiceUrl: null,
          stripePaymentIntentId: null,

          // Notes
          internalNotes: data.internalNotes || null,
          customerNotes: data.customerNotes || null,
          paymentTerms: data.paymentTerms || null,
          footerText: data.footerText || null,

          // References
          relatedInvoiceId: null,
          templateId: data.templateId || null,

          // Metadata
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        const docRef = await db.collection("invoices").add(invoiceData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(invoiceData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create invoice");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create invoice",
        });
      }
    },
  );

  /**
   * PUT /api/v1/invoices/:id
   * Update an invoice (only draft/pending status)
   */
  fastify.put(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const updates = request.body as any;

        const docRef = db.collection("invoices").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const existing = doc.data()!;

        // Only allow updates for draft/pending invoices
        if (!["draft", "pending"].includes(existing.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Can only update draft or pending invoices",
          });
        }

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            existing.organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to update this invoice",
            });
          }
        }

        // Prevent changing certain fields
        delete updates.organizationId;
        delete updates.invoiceNumber;
        delete updates.createdBy;
        delete updates.createdAt;
        delete updates.amountPaid;
        delete updates.payments;

        // If items are updated, recalculate totals
        if (updates.items) {
          const processedItems = updates.items.map(
            (item: any, index: number) => {
              const lineSubtotal = item.quantity * item.unitPrice;
              const discountAmount = item.discount
                ? lineSubtotal * (item.discount / 100)
                : 0;
              const lineTotal = lineSubtotal - discountAmount;
              const vatAmount = lineTotal * (item.vatRate / 100);

              return {
                id: item.id || `item-${Date.now()}-${index}`,
                description: item.description,
                itemType: item.itemType || "other",
                quantity: item.quantity,
                unit: item.unit || null,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate,
                discount: item.discount || null,
                discountAmount: Math.round(discountAmount * 100) / 100,
                lineTotal: Math.round(lineTotal * 100) / 100,
                vatAmount: Math.round(vatAmount * 100) / 100,
                horseId: item.horseId || null,
                horseName: item.horseName || null,
                periodStart: item.periodStart
                  ? Timestamp.fromDate(new Date(item.periodStart))
                  : null,
                periodEnd: item.periodEnd
                  ? Timestamp.fromDate(new Date(item.periodEnd))
                  : null,
                serviceDate: item.serviceDate
                  ? Timestamp.fromDate(new Date(item.serviceDate))
                  : null,
                serviceName: item.serviceName || null,
              };
            },
          );

          const totals = calculateInvoiceTotals(processedItems);
          updates.items = processedItems;
          Object.assign(updates, totals);
          updates.amountDue = totals.total - existing.amountPaid;
        }

        // Handle date fields
        if (updates.issueDate) {
          updates.issueDate = Timestamp.fromDate(new Date(updates.issueDate));
        }
        if (updates.dueDate) {
          updates.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
        }
        if (updates.periodStart) {
          updates.periodStart = Timestamp.fromDate(
            new Date(updates.periodStart),
          );
        }
        if (updates.periodEnd) {
          updates.periodEnd = Timestamp.fromDate(new Date(updates.periodEnd));
        }

        // Update contact info if changed
        if (updates.contactId && updates.contactId !== existing.contactId) {
          const contactDoc = await db
            .collection("contacts")
            .doc(updates.contactId)
            .get();
          if (contactDoc.exists) {
            const contact = contactDoc.data()!;
            updates.contactName =
              contact.contactType === "Business"
                ? contact.businessName
                : `${contact.firstName} ${contact.lastName}`;
            updates.contactEmail = contact.email;
            updates.contactAddress = contact.address
              ? {
                  street: contact.address.street,
                  houseNumber: contact.address.houseNumber,
                  postcode: contact.address.postcode,
                  city: contact.address.city,
                  country: contact.address.country,
                }
              : null;
          }
        }

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update invoice");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update invoice",
        });
      }
    },
  );

  /**
   * POST /api/v1/invoices/:id/send
   * Mark invoice as sent
   */
  fastify.post(
    "/:id/send",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const docRef = db.collection("invoices").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const existing = doc.data()!;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            existing.organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to send this invoice",
            });
          }
        }

        // Only allow sending draft/pending invoices
        if (!["draft", "pending"].includes(existing.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Can only send draft or pending invoices",
          });
        }

        await docRef.update({
          status: "sent",
          sentAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        // TODO: Trigger email notification

        return {
          success: true,
          message: "Invoice marked as sent",
        };
      } catch (error) {
        request.log.error({ error }, "Failed to send invoice");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to send invoice",
        });
      }
    },
  );

  /**
   * POST /api/v1/invoices/:id/payment
   * Record a payment against an invoice
   */
  fastify.post(
    "/:id/payment",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const data = request.body as any;

        if (!data.amount || data.amount <= 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "amount must be a positive number",
          });
        }

        if (!data.method) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "method is required",
          });
        }

        const docRef = db.collection("invoices").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const existing = doc.data()!;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            existing.organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to record payments for this invoice",
            });
          }
        }

        // Can't add payments to cancelled/void invoices
        if (["cancelled", "void"].includes(existing.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Cannot add payments to cancelled or voided invoices",
          });
        }

        const payment = {
          id: `pay-${Date.now()}`,
          invoiceId: id,
          amount: data.amount,
          currency: existing.currency,
          method: data.method,
          reference: data.reference || null,
          paidAt: data.paidAt
            ? Timestamp.fromDate(new Date(data.paidAt))
            : Timestamp.now(),
          recordedAt: Timestamp.now(),
          recordedBy: user.uid,
          notes: data.notes || null,
          stripePaymentIntentId: data.stripePaymentIntentId || null,
          stripeChargeId: data.stripeChargeId || null,
        };

        const newAmountPaid = existing.amountPaid + data.amount;
        const newAmountDue = Math.max(0, existing.total - newAmountPaid);

        // Determine new status
        let newStatus: InvoiceStatus = existing.status;
        if (newAmountDue <= 0) {
          newStatus = "paid";
        } else if (newAmountPaid > 0) {
          newStatus = "partially_paid";
        }

        await docRef.update({
          payments: [...existing.payments, payment],
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          paidAt: newStatus === "paid" ? Timestamp.now() : existing.paidAt,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        return {
          success: true,
          payment: serializeTimestamps(payment),
          invoice: {
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
          },
        };
      } catch (error) {
        request.log.error({ error }, "Failed to record payment");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to record payment",
        });
      }
    },
  );

  /**
   * POST /api/v1/invoices/:id/cancel
   * Cancel an invoice
   */
  fastify.post(
    "/:id/cancel",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const docRef = db.collection("invoices").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const existing = doc.data()!;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            existing.organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to cancel this invoice",
            });
          }
        }

        // Can't cancel paid or already cancelled invoices
        if (["paid", "cancelled", "void"].includes(existing.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot cancel invoice with status: ${existing.status}`,
          });
        }

        await docRef.update({
          status: "cancelled",
          cancelledAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        return { success: true, message: "Invoice cancelled" };
      } catch (error) {
        request.log.error({ error }, "Failed to cancel invoice");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to cancel invoice",
        });
      }
    },
  );

  /**
   * GET /api/v1/invoices/contact/:contactId
   * Get invoices for a specific contact
   */
  fastify.get(
    "/contact/:contactId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { contactId } = request.params as { contactId: string };
        const { limit = "20" } = request.query as { limit?: string };

        // First get the contact to check organization access
        const contactDoc = await db.collection("contacts").doc(contactId).get();
        if (!contactDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Contact not found",
          });
        }

        const contact = contactDoc.data()!;

        // Check organization access
        if (!isSystemAdmin(user.role) && contact.organizationId) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            contact.organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to view this contact's invoices",
            });
          }
        }

        const snapshot = await db
          .collection("invoices")
          .where("contactId", "==", contactId)
          .orderBy("issueDate", "desc")
          .limit(parseInt(limit))
          .get();

        const invoices = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        // Calculate summary
        let totalInvoiced = 0;
        let totalPaid = 0;
        let totalOutstanding = 0;
        let totalOverdue = 0;

        invoices.forEach((inv: any) => {
          if (!["cancelled", "void"].includes(inv.status)) {
            totalInvoiced += inv.total;
            totalPaid += inv.amountPaid;
            totalOutstanding += inv.amountDue;
            if (inv.status === "overdue") {
              totalOverdue += inv.amountDue;
            }
          }
        });

        return {
          contactId,
          contactName:
            contact.contactType === "Business"
              ? contact.businessName
              : `${contact.firstName} ${contact.lastName}`,
          summary: {
            totalInvoices: invoices.length,
            totalInvoiced,
            totalPaid,
            totalOutstanding,
            totalOverdue,
            currency: "SEK",
          },
          invoices,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch contact invoices");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch contact invoices",
        });
      }
    },
  );

  /**
   * GET /api/v1/invoices/organization/:organizationId/overdue
   * Get overdue invoices for an organization
   */
  fastify.get(
    "/organization/:organizationId/overdue",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as { organizationId: string };

        // Check organization access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        const now = Timestamp.now();

        // Get invoices that are past due date and not fully paid
        const snapshot = await db
          .collection("invoices")
          .where("organizationId", "==", organizationId)
          .where("status", "in", ["sent", "partially_paid", "overdue"])
          .where("dueDate", "<", now)
          .orderBy("dueDate", "asc")
          .get();

        const overdueInvoices = snapshot.docs.map((doc) => {
          const data = doc.data();
          const dueDate = data.dueDate.toDate();
          const daysOverdue = Math.floor(
            (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          return serializeTimestamps({
            id: doc.id,
            ...data,
            daysOverdue,
          });
        });

        // Update status to overdue if not already
        const batch = db.batch();
        let updateCount = 0;
        snapshot.docs.forEach((doc) => {
          if (doc.data().status !== "overdue") {
            batch.update(doc.ref, {
              status: "overdue",
              updatedAt: Timestamp.now(),
            });
            updateCount++;
          }
        });
        if (updateCount > 0) {
          await batch.commit();
        }

        const totalOverdue = overdueInvoices.reduce(
          (sum: number, inv: any) => sum + inv.amountDue,
          0,
        );

        return {
          count: overdueInvoices.length,
          totalOverdue,
          currency: "SEK",
          invoices: overdueInvoices,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch overdue invoices");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch overdue invoices",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/invoices/:id
   * Delete a draft invoice
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const docRef = db.collection("invoices").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const existing = doc.data()!;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            existing.organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to delete this invoice",
            });
          }
        }

        // Only allow deleting draft invoices
        if (existing.status !== "draft") {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Can only delete draft invoices. Use void or cancel for sent invoices.",
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete invoice");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete invoice",
        });
      }
    },
  );
}
