import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Firestore Timestamp (or Date) to YYYY-MM-DD string.
 * Returns empty string for null/undefined values.
 */
function formatDate(value: unknown): string {
  if (!value) return "";
  if (typeof (value as any).toDate === "function") {
    return (value as any).toDate().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

/**
 * Convert ore (integer, 1 SEK = 100 ore) to SEK with 2 decimal places.
 */
function oreToSek(ore: number | null | undefined): string {
  if (ore === null || ore === undefined) return "0.00";
  return (ore / 100).toFixed(2);
}

/**
 * Encode a row of values as a semicolon-delimited CSV line.
 * Values containing the delimiter, double-quotes, or newlines are
 * wrapped in double-quotes with internal quotes escaped.
 */
function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return "";
      const str = String(v);
      if (str.includes(";") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(";");
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function exportsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  // =========================================================================
  // GET /organizations/:organizationId/exports/invoices
  // =========================================================================
  fastify.get(
    "/organizations/:organizationId/exports/invoices",
    {
      preHandler: [
        requirePermission("export_data", "params"),
        checkModuleAccess("invoicing"),
      ],
    },
    async (request, reply) => {
      try {
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { from, to, status } = request.query as {
          from?: string;
          to?: string;
          status?: string;
        };

        if (!from || !to) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Query parameters 'from' and 'to' are required",
          });
        }

        let query = db
          .collection("invoices")
          .where("organizationId", "==", organizationId)
          .where("issueDate", ">=", Timestamp.fromDate(new Date(from)))
          .where(
            "issueDate",
            "<=",
            Timestamp.fromDate(new Date(to)),
          ) as FirebaseFirestore.Query;

        if (status) {
          query = query.where("status", "==", status);
        }

        const snapshot = await query.get();

        const header = toCsvRow([
          "invoiceNumber",
          "type",
          "customerName",
          "customerEmail",
          "issueDate",
          "dueDate",
          "subtotal",
          "vatAmount",
          "roundingAmount",
          "total",
          "amountPaid",
          "amountDue",
          "status",
          "ocrNumber",
        ]);

        const rows = snapshot.docs.map((doc) => {
          const d = doc.data();
          return toCsvRow([
            d.invoiceNumber ?? "",
            d.type ?? "invoice",
            d.contactName ?? "",
            d.contactEmail ?? "",
            formatDate(d.issueDate),
            formatDate(d.dueDate),
            oreToSek(d.subtotal),
            oreToSek(d.totalVat),
            oreToSek(d.roundingAmount),
            oreToSek(d.total),
            oreToSek(d.amountPaid),
            oreToSek(d.amountDue),
            d.status ?? "",
            d.ocrNumber ?? "",
          ]);
        });

        const csv = "\uFEFF" + [header, ...rows].join("\n");

        reply
          .header("Content-Type", "text/csv; charset=utf-8")
          .header(
            "Content-Disposition",
            `attachment; filename="invoices-${from}-${to}.csv"`,
          );

        return csv;
      } catch (error) {
        request.log.error({ error }, "Failed to export invoices CSV");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to export invoices",
        });
      }
    },
  );

  // =========================================================================
  // GET /organizations/:organizationId/exports/line-items
  // =========================================================================
  fastify.get(
    "/organizations/:organizationId/exports/line-items",
    {
      preHandler: [
        requirePermission("export_data", "params"),
        checkModuleAccess("invoicing"),
      ],
    },
    async (request, reply) => {
      try {
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { from, to, status, memberId } = request.query as {
          from?: string;
          to?: string;
          status?: string;
          memberId?: string;
        };

        if (!from || !to) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Query parameters 'from' and 'to' are required",
          });
        }

        let query = db
          .collection("lineItems")
          .where("organizationId", "==", organizationId)
          .where("date", ">=", Timestamp.fromDate(new Date(from)))
          .where(
            "date",
            "<=",
            Timestamp.fromDate(new Date(to)),
          ) as FirebaseFirestore.Query;

        if (status) {
          query = query.where("status", "==", status);
        }

        if (memberId) {
          query = query.where("memberId", "==", memberId);
        }

        const snapshot = await query.get();

        const header = toCsvRow([
          "id",
          "memberId",
          "billingContactId",
          "date",
          "description",
          "quantity",
          "unitPrice",
          "vatRate",
          "totalExclVat",
          "totalVat",
          "totalInclVat",
          "sourceType",
          "sourceId",
          "status",
          "invoiceId",
        ]);

        const rows = snapshot.docs.map((doc) => {
          const d = doc.data();
          return toCsvRow([
            doc.id,
            d.memberId ?? "",
            d.billingContactId ?? "",
            formatDate(d.date),
            d.description ?? "",
            d.quantity ?? 0,
            oreToSek(d.unitPrice),
            d.vatRate ?? 0,
            oreToSek(d.totalExclVat),
            oreToSek(d.totalVat),
            oreToSek(d.totalInclVat),
            d.sourceType ?? "",
            d.sourceId ?? "",
            d.status ?? "",
            d.invoiceId ?? "",
          ]);
        });

        const csv = "\uFEFF" + [header, ...rows].join("\n");

        reply
          .header("Content-Type", "text/csv; charset=utf-8")
          .header(
            "Content-Disposition",
            `attachment; filename="line-items-${from}-${to}.csv"`,
          );

        return csv;
      } catch (error) {
        request.log.error({ error }, "Failed to export line items CSV");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to export line items",
        });
      }
    },
  );

  // =========================================================================
  // GET /organizations/:organizationId/exports/payments
  // =========================================================================
  fastify.get(
    "/organizations/:organizationId/exports/payments",
    {
      preHandler: [
        requirePermission("export_data", "params"),
        checkModuleAccess("invoicing"),
      ],
    },
    async (request, reply) => {
      try {
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { from, to } = request.query as {
          from?: string;
          to?: string;
        };

        if (!from || !to) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Query parameters 'from' and 'to' are required",
          });
        }

        // Fetch invoices in date range that have received payments
        const snapshot = await db
          .collection("invoices")
          .where("organizationId", "==", organizationId)
          .where("issueDate", ">=", Timestamp.fromDate(new Date(from)))
          .where("issueDate", "<=", Timestamp.fromDate(new Date(to)))
          .get();

        const header = toCsvRow([
          "invoiceNumber",
          "customerName",
          "paymentDate",
          "amountPaid",
          "paymentMethod",
          "status",
        ]);

        const rows: string[] = [];

        for (const doc of snapshot.docs) {
          const d = doc.data();
          if (!d.amountPaid || d.amountPaid <= 0) continue;

          const payments: any[] = d.payments || [];

          if (payments.length > 0) {
            // One row per individual payment record
            for (const payment of payments) {
              rows.push(
                toCsvRow([
                  d.invoiceNumber ?? "",
                  d.contactName ?? "",
                  formatDate(payment.paidAt),
                  oreToSek(payment.amount),
                  payment.method ?? "",
                  d.status ?? "",
                ]),
              );
            }
          } else {
            // Fallback: single summary row when no detailed payment records exist
            rows.push(
              toCsvRow([
                d.invoiceNumber ?? "",
                d.contactName ?? "",
                formatDate(d.paidAt),
                oreToSek(d.amountPaid),
                "",
                d.status ?? "",
              ]),
            );
          }
        }

        const csv = "\uFEFF" + [header, ...rows].join("\n");

        reply
          .header("Content-Type", "text/csv; charset=utf-8")
          .header(
            "Content-Disposition",
            `attachment; filename="payments-${from}-${to}.csv"`,
          );

        return csv;
      } catch (error) {
        request.log.error({ error }, "Failed to export payments CSV");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to export payments",
        });
      }
    },
  );
}
