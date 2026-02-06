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
import { logInvoiceEvent, getInvoiceEvents } from "../utils/invoiceAudit.js";
import type { InvoiceStatus, InvoiceDocumentType } from "@equiduty/shared";
import { generateOCR } from "@equiduty/shared";

/**
 * Generate next invoice number for organization using gap-free sequential numbering.
 * Uses a Firestore transaction on the invoiceNumberSeries collection to guarantee
 * no gaps and no duplicates even under concurrent access.
 *
 * @param organizationId - Organization to generate number for
 * @param type - Document type: 'invoice' or 'credit_note' (credit notes use separate series)
 */
async function generateInvoiceNumber(
  organizationId: string,
  type: "invoice" | "credit_note" = "invoice",
): Promise<string> {
  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);

  // Get invoice settings for organization
  const settingsDoc = await db
    .collection("invoiceSettings")
    .doc(organizationId)
    .get();

  let prefix = type === "credit_note" ? "KF" : "INV";
  let separator = "-";
  let paddingDigits = 4;

  if (settingsDoc.exists) {
    const settings = settingsDoc.data()!;
    if (settings.numbering) {
      if (type === "credit_note") {
        prefix = settings.numbering.creditNotePrefix || "KF";
      } else {
        prefix = settings.numbering.prefix || "INV";
      }
      separator = settings.numbering.separator || "-";
      paddingDigits = settings.numbering.paddingDigits || 4;
    }
  }

  // Gap-free sequential numbering via Firestore transaction
  const seriesField =
    type === "credit_note" ? "nextCreditNoteNumber" : "nextInvoiceNumber";
  const seriesRef = db.collection("invoiceNumberSeries").doc(organizationId);

  const nextNumber = await db.runTransaction(async (transaction) => {
    const seriesDoc = await transaction.get(seriesRef);

    let currentNumber: number;
    if (!seriesDoc.exists) {
      // Initialize both series
      currentNumber = 1;
      transaction.set(seriesRef, {
        nextInvoiceNumber: type === "invoice" ? 2 : 1,
        nextCreditNoteNumber: type === "credit_note" ? 2 : 1,
        organizationId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      currentNumber = seriesDoc.data()![seriesField] || 1;
      transaction.update(seriesRef, {
        [seriesField]: currentNumber + 1,
        updatedAt: Timestamp.now(),
      });
    }

    return currentNumber;
  });

  const paddedNumber = nextNumber.toString().padStart(paddingDigits, "0");
  return `${prefix}${separator}${shortYear}${separator}${paddedNumber}`;
}

/**
 * Calculate invoice totals from items.
 * All amounts are in ore (integer, 1 SEK = 100 ore).
 * Applies oresavrundning: rounds total to nearest 100 ore (1 SEK).
 */
function calculateInvoiceTotals(items: any[]): {
  subtotal: number;
  totalDiscount: number;
  vatBreakdown: { rate: number; baseAmount: number; vatAmount: number }[];
  totalVat: number;
  total: number;
  roundingAmount: number;
} {
  let subtotal = 0;
  let totalDiscount = 0;
  const vatByRate: Map<number, { base: number; vat: number }> = new Map();

  items.forEach((item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discount
      ? Math.round(lineSubtotal * (item.discount / 100))
      : 0;
    const lineTotal = lineSubtotal - discountAmount;
    const vatAmount = Math.round(lineTotal * (item.vatRate / 100));

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
      baseAmount: base,
      vatAmount: vat,
    }),
  );

  const totalVat = vatBreakdown.reduce((sum, v) => sum + v.vatAmount, 0);

  // Oresavrundning: round to nearest 100 ore (1 SEK)
  const exactTotal = subtotal + totalVat;
  const roundedTotal = Math.round(exactTotal / 100) * 100;
  const roundingAmount = roundedTotal - exactTotal;

  return {
    subtotal,
    totalDiscount,
    vatBreakdown,
    totalVat,
    total: roundedTotal,
    roundingAmount,
  };
}

export async function invoicesRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing addon required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  /**
   * POST /api/v1/invoices/organization/:organizationId/generate
   * Batch generate invoices from pending line items.
   * Groups line items by billingContactId and creates one invoice per contact.
   * Skips line items covered by klippkort (packageDeductionId set).
   */
  fastify.post(
    "/organization/:organizationId/generate",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const body = request.body as
          | {
              from?: string;
              to?: string;
            }
          | undefined;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to generate invoices for this organization",
            });
          }
        }

        // Fetch pending line items for this organization
        let lineItemQuery = db
          .collection("lineItems")
          .where("organizationId", "==", organizationId)
          .where("status", "==", "pending");

        if (body?.from) {
          lineItemQuery = lineItemQuery.where(
            "date",
            ">=",
            Timestamp.fromDate(new Date(body.from)),
          ) as any;
        }
        if (body?.to) {
          lineItemQuery = lineItemQuery.where(
            "date",
            "<=",
            Timestamp.fromDate(new Date(body.to)),
          ) as any;
        }

        const lineItemSnapshot = await lineItemQuery.get();

        if (lineItemSnapshot.empty) {
          return reply.status(200).send({
            invoicesCreated: 0,
            lineItemsProcessed: 0,
            invoices: [],
          });
        }

        // Filter out klippkort-covered items and group by billingContactId
        const groupedByContact: Map<
          string,
          Array<{ id: string; data: FirebaseFirestore.DocumentData }>
        > = new Map();

        for (const doc of lineItemSnapshot.docs) {
          const data = doc.data();

          // Skip line items covered by klippkort
          if (data.packageDeductionId) {
            continue;
          }

          const contactId = data.billingContactId;
          if (!contactId) {
            continue;
          }

          if (!groupedByContact.has(contactId)) {
            groupedByContact.set(contactId, []);
          }
          groupedByContact.get(contactId)!.push({ id: doc.id, data });
        }

        if (groupedByContact.size === 0) {
          return reply.status(200).send({
            invoicesCreated: 0,
            lineItemsProcessed: 0,
            invoices: [],
          });
        }

        // Fetch organization info
        const orgDoc = await db
          .collection("organizations")
          .doc(organizationId)
          .get();
        if (!orgDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Organization not found",
          });
        }
        const org = orgDoc.data()!;

        // Fetch invoice settings
        const invoiceSettingsDoc = await db
          .collection("invoiceSettings")
          .doc(organizationId)
          .get();
        const invoiceSettings = invoiceSettingsDoc.exists
          ? invoiceSettingsDoc.data()!
          : null;

        const defaultDueDays = invoiceSettings?.defaultDueDays || 30;

        // Collect unique horse IDs to batch-fetch names
        const horseIds = new Set<string>();
        Array.from(groupedByContact.values()).forEach((items) => {
          items.forEach(({ data }) => {
            if (data.horseId) {
              horseIds.add(data.horseId);
            }
          });
        });

        // Fetch horse names for denormalization
        const horseNameMap: Map<string, string> = new Map();
        if (horseIds.size > 0) {
          const horseIdArray = Array.from(horseIds);
          // Firestore 'in' queries support max 30 items per batch
          for (let i = 0; i < horseIdArray.length; i += 30) {
            const batch = horseIdArray.slice(i, i + 30);
            const horseSnapshot = await db
              .collection("horses")
              .where("__name__", "in", batch)
              .get();
            for (const horseDoc of horseSnapshot.docs) {
              horseNameMap.set(horseDoc.id, horseDoc.data().name || "");
            }
          }
        }

        const now = Timestamp.now();
        const issueDate = now;
        const dueDateObj = new Date();
        dueDateObj.setDate(dueDateObj.getDate() + defaultDueDays);
        const dueDate = Timestamp.fromDate(dueDateObj);

        const createdInvoices: Array<{
          id: string;
          invoiceNumber: string;
          contactName: string;
          total: number;
        }> = [];
        let totalLineItemsProcessed = 0;

        // Generate one invoice per billing contact
        const contactEntries = Array.from(groupedByContact.entries());
        for (const [contactId, lineItems] of contactEntries) {
          // Fetch contact for denormalization
          const contactDoc = await db
            .collection("contacts")
            .doc(contactId)
            .get();
          if (!contactDoc.exists) {
            request.log.warn(
              { contactId },
              "Billing contact not found, skipping group",
            );
            continue;
          }
          const contact = contactDoc.data()!;
          const contactName =
            contact.contactType === "Business"
              ? contact.businessName
              : `${contact.firstName} ${contact.lastName}`;

          // Generate invoice number and OCR
          const invoiceNumber = await generateInvoiceNumber(organizationId);
          const ocrNumber = generateOCR(invoiceNumber);

          // Group line items by memberId for structured invoicing
          const byMember: Map<
            string,
            Array<{ id: string; data: FirebaseFirestore.DocumentData }>
          > = new Map();
          for (const item of lineItems) {
            const memberId = item.data.memberId || "unknown";
            if (!byMember.has(memberId)) {
              byMember.set(memberId, []);
            }
            byMember.get(memberId)!.push(item);
          }

          // Convert line items to invoice items
          const invoiceItems: any[] = [];
          let itemIndex = 0;
          for (const memberItems of Array.from(byMember.values())) {
            for (const { data } of memberItems) {
              const lineSubtotal = data.quantity * data.unitPrice;
              const vatAmount = Math.round(lineSubtotal * (data.vatRate / 100));

              invoiceItems.push({
                id: `item-${Date.now()}-${itemIndex}`,
                description: data.description || "",
                itemType: data.chargeableItemId ? "service" : "other",
                quantity: data.quantity,
                unit: null,
                unitPrice: data.unitPrice,
                vatRate: data.vatRate,
                discount: null,
                discountAmount: 0,
                lineTotal: lineSubtotal,
                vatAmount,
                horseId: data.horseId || null,
                horseName: data.horseId
                  ? horseNameMap.get(data.horseId) || null
                  : null,
                periodStart: null,
                periodEnd: null,
                serviceDate: data.date || null,
                serviceName: null,
              });
              itemIndex++;
            }
          }

          // Calculate totals
          const totals = calculateInvoiceTotals(invoiceItems);

          const invoiceData = {
            invoiceNumber,
            organizationId,
            stableId: null,

            type: "invoice" as InvoiceDocumentType,

            // Customer info
            contactId,
            contactName,
            contactEmail: contact.email || null,
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

            // Swedish compliance fields
            orgNumber: invoiceSettings?.orgNumber || org.orgNumber || null,
            orgBankgiro: invoiceSettings?.bankgiro || null,
            orgPlusgiro: invoiceSettings?.plusgiro || null,
            orgSwish: invoiceSettings?.swishNumber || null,
            ocrNumber,

            // Dates
            issueDate,
            dueDate,
            periodStart: body?.from
              ? Timestamp.fromDate(new Date(body.from))
              : null,
            periodEnd: body?.to ? Timestamp.fromDate(new Date(body.to)) : null,

            // Items and totals
            items: invoiceItems,
            ...totals,
            currency: invoiceSettings?.defaultCurrency || "SEK",

            // Payment tracking
            amountPaid: 0,
            amountDue: totals.total,
            payments: [],

            // Billing group reference
            billingGroupId: null,

            // Status: draft for admin review
            status: "draft" as InvoiceStatus,
            sentAt: null,
            paidAt: null,
            cancelledAt: null,
            voidedAt: null,

            // Document settings
            language:
              contact.invoiceLanguage ||
              invoiceSettings?.defaultLanguage ||
              "sv",
            pdfUrl: null,
            pdfGeneratedAt: null,

            // External integrations
            stripeInvoiceId: null,
            stripeInvoiceUrl: null,
            stripePaymentIntentId: null,

            // Notes
            internalNotes: null,
            customerNotes: null,
            paymentTerms: invoiceSettings?.defaultPaymentTerms || null,
            footerText: invoiceSettings?.defaultFooterText || null,

            // Credit note references
            creditNoteNumber: null,
            originalInvoiceId: null,

            // References
            relatedInvoiceId: null,
            templateId: null,

            // Metadata
            createdAt: now,
            createdBy: user.uid,
            updatedAt: now,
            updatedBy: user.uid,
          };

          // Create invoice document
          const invoiceRef = await db.collection("invoices").add(invoiceData);

          // Update line items in batches of 500 (Firestore batch limit)
          const lineItemIds = lineItems.map((li) => li.id);
          for (let i = 0; i < lineItemIds.length; i += 500) {
            const batchIds = lineItemIds.slice(i, i + 500);
            const writeBatch = db.batch();
            for (const lineItemId of batchIds) {
              writeBatch.update(db.collection("lineItems").doc(lineItemId), {
                invoiceId: invoiceRef.id,
                status: "invoiced",
                updatedAt: now,
                updatedBy: user.uid,
              });
            }
            await writeBatch.commit();
          }

          totalLineItemsProcessed += lineItems.length;

          // Audit trail
          await logInvoiceEvent(
            invoiceRef.id,
            null,
            "draft",
            "created",
            user.uid,
            {
              invoiceNumber,
              generatedFrom: "batch",
              lineItemCount: lineItems.length,
              contactName,
            },
          );

          createdInvoices.push({
            id: invoiceRef.id,
            invoiceNumber,
            contactName,
            total: totals.total,
          });
        }

        return reply.status(201).send({
          invoicesCreated: createdInvoices.length,
          lineItemsProcessed: totalLineItemsProcessed,
          invoices: createdInvoices,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to generate invoices");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to generate invoices",
        });
      }
    },
  );

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

        // Check organization access — return 404 (not 403) to prevent enumeration
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            invoice.organizationId,
          );
          if (!hasAccess) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Invoice not found",
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
   * POST /api/v1/invoices/organization/:organizationId
   * Create a new invoice
   */
  fastify.post(
    "/organization/:organizationId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as { organizationId: string };
        const data = request.body as any;

        // Use organizationId from URL params, ignore body field
        data.organizationId = organizationId;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
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

        // Generate invoice number (supports credit notes with separate series)
        const invoiceType: InvoiceDocumentType = data.type || "invoice";
        const invoiceNumber = await generateInvoiceNumber(
          data.organizationId,
          invoiceType,
        );

        // Generate OCR payment reference
        const ocrNumber = generateOCR(invoiceNumber);

        // Process items with IDs and calculations (all amounts in ore)
        const processedItems = data.items.map((item: any, index: number) => {
          const lineSubtotal = item.quantity * item.unitPrice;
          const discountAmount = item.discount
            ? Math.round(lineSubtotal * (item.discount / 100))
            : 0;
          const lineTotal = lineSubtotal - discountAmount;
          const vatAmount = Math.round(lineTotal * (item.vatRate / 100));

          return {
            id: `item-${Date.now()}-${index}`,
            description: item.description,
            itemType: item.itemType || "other",
            quantity: item.quantity,
            unit: item.unit || null,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            discount: item.discount || null,
            discountAmount,
            lineTotal,
            vatAmount,
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

        // Fetch invoice settings for Swedish compliance fields
        const invoiceSettingsDoc = await db
          .collection("invoiceSettings")
          .doc(data.organizationId)
          .get();
        const invoiceSettings = invoiceSettingsDoc.exists
          ? invoiceSettingsDoc.data()!
          : null;

        const invoiceData = {
          invoiceNumber,
          organizationId: data.organizationId,
          stableId: data.stableId || null,

          // Document type
          type: invoiceType,

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

          // Swedish compliance fields
          orgNumber: invoiceSettings?.orgNumber || org.orgNumber || null,
          orgBankgiro: invoiceSettings?.bankgiro || null,
          orgPlusgiro: invoiceSettings?.plusgiro || null,
          orgSwish: invoiceSettings?.swishNumber || null,
          ocrNumber,

          // Dates
          issueDate: Timestamp.fromDate(new Date(data.issueDate)),
          dueDate: Timestamp.fromDate(new Date(data.dueDate)),
          periodStart: data.periodStart
            ? Timestamp.fromDate(new Date(data.periodStart))
            : null,
          periodEnd: data.periodEnd
            ? Timestamp.fromDate(new Date(data.periodEnd))
            : null,

          // Items and totals (all amounts in ore)
          items: processedItems,
          ...totals,
          currency: data.currency || "SEK",

          // Payment tracking (amounts in ore)
          amountPaid: 0,
          amountDue: totals.total,
          payments: [],

          // Billing group reference
          billingGroupId: data.billingGroupId || null,

          // Status — always default to draft; never accept from client input
          status: "draft" as InvoiceStatus,
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

          // Credit note references
          creditNoteNumber:
            invoiceType === "credit_note" ? invoiceNumber : null,
          originalInvoiceId: data.originalInvoiceId || null,

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

        await logInvoiceEvent(
          docRef.id,
          null,
          invoiceData.status,
          "created",
          user.uid,
          { invoiceNumber, type: invoiceType },
        );

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
            return reply.status(404).send({
              error: "Not Found",
              message: "Invoice not found",
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

        // If items are updated, recalculate totals (all amounts in ore)
        if (updates.items) {
          const processedItems = updates.items.map(
            (item: any, index: number) => {
              const lineSubtotal = item.quantity * item.unitPrice;
              const discountAmount = item.discount
                ? Math.round(lineSubtotal * (item.discount / 100))
                : 0;
              const lineTotal = lineSubtotal - discountAmount;
              const vatAmount = Math.round(lineTotal * (item.vatRate / 100));

              return {
                id: item.id || `item-${Date.now()}-${index}`,
                description: item.description,
                itemType: item.itemType || "other",
                quantity: item.quantity,
                unit: item.unit || null,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate,
                discount: item.discount || null,
                discountAmount,
                lineTotal,
                vatAmount,
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
            return reply.status(404).send({
              error: "Not Found",
              message: "Invoice not found",
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

        await logInvoiceEvent(id, existing.status, "sent", "sent", user.uid);

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
            return reply.status(404).send({
              error: "Not Found",
              message: "Invoice not found",
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

        await logInvoiceEvent(
          id,
          existing.status,
          newStatus,
          "payment_recorded",
          user.uid,
          { paymentId: payment.id, amount: data.amount, method: data.method },
        );

        if (newStatus === "paid" && existing.status !== "paid") {
          await logInvoiceEvent(
            id,
            "partially_paid",
            "paid",
            "fully_paid",
            user.uid,
            { totalPaid: newAmountPaid },
          );
        }

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
            return reply.status(404).send({
              error: "Not Found",
              message: "Invoice not found",
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

        await logInvoiceEvent(
          id,
          existing.status,
          "cancelled",
          "cancelled",
          user.uid,
        );

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

        // Check organization access — return 404 (not 403) to prevent enumeration
        if (!isSystemAdmin(user.role) && contact.organizationId) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            contact.organizationId,
          );
          if (!hasAccess) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Contact not found",
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
   * GET /api/v1/invoices/my/:organizationId
   * Get invoices for the authenticated user's linked contact in this organization.
   * Used by the "My Invoices" page so regular members can see their own invoices
   * without needing portal access.
   */
  fastify.get(
    "/my/:organizationId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { status, limit = "50" } = request.query as {
          status?: string;
          limit?: string;
        };

        // Find contact linked to this user in this organization
        const contactSnapshot = await db
          .collection("contacts")
          .where("linkedUserId", "==", user.uid)
          .where("organizationId", "==", organizationId)
          .limit(1)
          .get();

        if (contactSnapshot.empty) {
          return {
            contactId: null,
            contactName: null,
            summary: {
              totalInvoices: 0,
              totalInvoiced: 0,
              totalPaid: 0,
              totalOutstanding: 0,
              totalOverdue: 0,
              currency: "SEK",
            },
            invoices: [],
          };
        }

        const contactDoc = contactSnapshot.docs[0];
        const contact = contactDoc.data();
        const contactId = contactDoc.id;
        const contactName =
          contact.contactType === "Business"
            ? contact.businessName
            : `${contact.firstName} ${contact.lastName}`;

        // Build query
        let query = db
          .collection("invoices")
          .where("contactId", "==", contactId)
          .orderBy("issueDate", "desc");

        if (status) {
          query = db
            .collection("invoices")
            .where("contactId", "==", contactId)
            .where("status", "==", status)
            .orderBy("issueDate", "desc") as any;
        }

        const snapshot = await query.limit(parseInt(limit)).get();

        // Enrich with overdue + payment info
        const now = new Date();
        let currency = "SEK";
        let totalInvoiced = 0;
        let totalPaid = 0;
        let totalOutstanding = 0;
        let totalOverdue = 0;

        const invoices = snapshot.docs.map((doc) => {
          const data = doc.data();
          const dueDate = data.dueDate?.toDate();
          const isOverdue =
            dueDate &&
            dueDate < now &&
            !["paid", "cancelled", "void"].includes(data.status);
          const daysOverdue = isOverdue
            ? Math.floor(
                (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
              )
            : 0;

          // Accumulate summary
          if (data.currency) currency = data.currency;
          if (!["cancelled", "void"].includes(data.status)) {
            totalInvoiced += data.total || 0;
            totalPaid += data.amountPaid || 0;
            totalOutstanding += data.amountDue || 0;
            if (isOverdue) {
              totalOverdue += data.amountDue || 0;
            }
          }

          return serializeTimestamps({
            id: doc.id,
            ...data,
            isOverdue: !!isOverdue,
            daysOverdue,
            canPayOnline: !!data.stripeInvoiceUrl,
          });
        });

        return {
          contactId,
          contactName,
          summary: {
            totalInvoices: invoices.length,
            totalInvoiced,
            totalPaid,
            totalOutstanding,
            totalOverdue,
            currency,
          },
          invoices,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch user's own invoices");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch invoices",
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
   * POST /api/v1/invoices/:id/credit-note
   * Create a credit note for an existing invoice.
   * Optionally credit specific line items via `items` index array.
   */
  fastify.post(
    "/:id/credit-note",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const body = request.body as
          | {
              reason?: string;
              items?: number[];
            }
          | undefined;

        const docRef = db.collection("invoices").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const original = doc.data()!;

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            original.organizationId,
          );
          if (!canManage) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Invoice not found",
            });
          }
        }

        // Only allow credit notes on eligible statuses
        const creditableStatuses: InvoiceStatus[] = [
          "sent",
          "paid",
          "partially_paid",
          "overdue",
        ];
        if (!creditableStatuses.includes(original.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot create credit note for invoice with status: ${original.status}. Allowed: ${creditableStatuses.join(", ")}`,
          });
        }

        // Determine which items to credit
        const originalItems: any[] = original.items || [];
        let itemsToCredit: any[];

        if (body?.items && body.items.length > 0) {
          // Validate indices
          const invalidIndices = body.items.filter(
            (i) => i < 0 || i >= originalItems.length,
          );
          if (invalidIndices.length > 0) {
            return reply.status(400).send({
              error: "Bad Request",
              message: `Invalid item indices: ${invalidIndices.join(", ")}. Invoice has ${originalItems.length} items (0-indexed).`,
            });
          }
          itemsToCredit = body.items.map((i) => originalItems[i]);
        } else {
          itemsToCredit = originalItems;
        }

        // Negate line item amounts
        const creditItems = itemsToCredit.map((item: any, index: number) => ({
          ...item,
          id: `credit-item-${Date.now()}-${index}`,
          unitPrice: -Math.abs(item.unitPrice),
          lineTotal: -Math.abs(item.lineTotal),
          vatAmount: -Math.abs(item.vatAmount),
          discountAmount: item.discountAmount
            ? -Math.abs(item.discountAmount)
            : 0,
        }));

        // Calculate negated totals
        const subtotal = creditItems.reduce(
          (sum: number, item: any) => sum + item.lineTotal,
          0,
        );
        const totalVat = creditItems.reduce(
          (sum: number, item: any) => sum + item.vatAmount,
          0,
        );
        const totalDiscount = creditItems.reduce(
          (sum: number, item: any) => sum + item.discountAmount,
          0,
        );
        const exactTotal = subtotal + totalVat;
        const roundedTotal = Math.round(exactTotal / 100) * 100;
        const roundingAmount = roundedTotal - exactTotal;

        // Generate credit note number and OCR
        const creditNoteNumber = await generateInvoiceNumber(
          original.organizationId,
          "credit_note",
        );
        const ocrNumber = generateOCR(creditNoteNumber);

        const now = Timestamp.now();

        const creditNoteData = {
          invoiceNumber: creditNoteNumber,
          organizationId: original.organizationId,
          stableId: original.stableId || null,

          // Document type
          type: "credit_note" as InvoiceDocumentType,

          // Customer info (copied from original)
          contactId: original.contactId,
          contactName: original.contactName,
          contactEmail: original.contactEmail,
          contactAddress: original.contactAddress || null,

          // Organization info (copied from original)
          organizationName: original.organizationName,
          organizationAddress: original.organizationAddress || null,
          organizationVatNumber: original.organizationVatNumber || null,
          organizationBankInfo: original.organizationBankInfo || null,

          // Swedish compliance fields (copied from original)
          orgNumber: original.orgNumber || null,
          orgBankgiro: original.orgBankgiro || null,
          orgPlusgiro: original.orgPlusgiro || null,
          orgSwish: original.orgSwish || null,
          ocrNumber,

          // Dates
          issueDate: now,
          dueDate: now, // Credit notes are immediately effective
          periodStart: original.periodStart || null,
          periodEnd: original.periodEnd || null,

          // Items and totals (all negated, in ore)
          items: creditItems,
          subtotal,
          totalDiscount,
          vatBreakdown: [], // Simplified; individual item VAT is tracked
          totalVat,
          total: roundedTotal,
          roundingAmount,
          currency: original.currency || "SEK",

          // Payment tracking
          amountPaid: 0,
          amountDue: roundedTotal,
          payments: [],

          // Billing group reference
          billingGroupId: original.billingGroupId || null,

          // Status: credit notes are immediately effective
          status: "sent" as InvoiceStatus,
          sentAt: now,
          paidAt: null,
          cancelledAt: null,
          voidedAt: null,

          // Document settings
          language: original.language || "sv",
          pdfUrl: null,
          pdfGeneratedAt: null,

          // External integrations
          stripeInvoiceId: null,
          stripeInvoiceUrl: null,
          stripePaymentIntentId: null,

          // Notes
          internalNotes: null,
          customerNotes: body?.reason || null,
          paymentTerms: null,
          footerText: original.footerText || null,

          // Credit note references
          creditNoteNumber,
          originalInvoiceId: id,

          // References
          relatedInvoiceId: id,
          templateId: original.templateId || null,

          // Metadata
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
          updatedBy: user.uid,
        };

        const creditNoteRef = await db
          .collection("invoices")
          .add(creditNoteData);

        // Audit trail: log on original invoice
        await logInvoiceEvent(
          id,
          original.status,
          original.status,
          "credit_note_issued",
          user.uid,
          {
            creditNoteId: creditNoteRef.id,
            creditNoteNumber,
            creditTotal: roundedTotal,
            reason: body?.reason || null,
            partialCredit: !!(body?.items && body.items.length > 0),
          },
        );

        // Audit trail: log on the new credit note
        await logInvoiceEvent(
          creditNoteRef.id,
          null,
          "sent",
          "created",
          user.uid,
          {
            originalInvoiceId: id,
            originalInvoiceNumber: original.invoiceNumber,
            creditTotal: roundedTotal,
          },
        );

        return reply.status(201).send({
          id: creditNoteRef.id,
          ...serializeTimestamps(creditNoteData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create credit note");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create credit note",
        });
      }
    },
  );

  /**
   * GET /api/v1/invoices/:id/events
   * Get the audit trail for an invoice
   */
  fastify.get(
    "/:id/events",
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

        // Check organization access — return 404 (not 403) to prevent enumeration
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            invoice.organizationId,
          );
          if (!hasAccess) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Invoice not found",
            });
          }
        }

        const events = await getInvoiceEvents(id);

        return {
          events: events.map((event) => serializeTimestamps(event)),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch invoice events");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch invoice events",
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
            return reply.status(404).send({
              error: "Not Found",
              message: "Invoice not found",
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
