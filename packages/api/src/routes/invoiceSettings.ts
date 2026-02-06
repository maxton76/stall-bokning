import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { isSystemAdmin } from "../utils/authorization.js";
import { hasPermission } from "../utils/permissionEngine.js";
import { serializeTimestamps } from "../utils/serialization.js";

/**
 * Default invoice settings returned when no settings document exists for an organization.
 * All monetary amounts are in ore (1 SEK = 100 ore).
 */
function getDefaultInvoiceSettings(organizationId: string) {
  return {
    organizationId,
    defaultDueDays: 30,
    defaultVatRate: 25,
    defaultCurrency: "SEK",
    defaultLanguage: "sv",

    // Reminder configuration
    sendReminders: false,
    reminderDaysBefore: [] as number[],
    reminderDaysAfter: [14, 30],
    reminder1DaysAfterDue: 14,
    reminder2DaysAfterDue: 30,
    reminderFee: 6000, // 60 SEK in ore
    lateInterestRate: 8,
    maxReminders: 2,

    // Stripe integration
    stripeEnabled: false,

    // Invoice numbering
    numbering: {
      prefix: "F",
      separator: "-",
      includeYear: true,
      yearFormat: "short" as const,
      paddingDigits: 4,
      nextNumber: 1,
      resetYearly: true,
    },
  };
}

/**
 * Validate Swedish organization number format (NNNNNN-NNNN).
 */
function isValidOrgNumber(orgNumber: string): boolean {
  return /^\d{6}-\d{4}$/.test(orgNumber);
}

/**
 * Validate Swedish bankgiro number format (NNN-NNNN or NNNN-NNNN).
 */
function isValidBankgiro(bankgiro: string): boolean {
  return /^\d{3,4}-\d{4}$/.test(bankgiro);
}

/**
 * Validate Swedish plusgiro number format (N-NNNNNN or similar).
 */
function isValidPlusgiro(plusgiro: string): boolean {
  return /^\d{1,7}-\d{1}$/.test(plusgiro);
}

export async function invoiceSettingsRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing addon required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  /**
   * GET /:organizationId/invoice-settings
   * Get invoice settings for an organization.
   * Returns default settings if no document exists (does not persist defaults).
   */
  fastify.get(
    "/:organizationId/invoice-settings",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };

        // Check organization access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(user.uid, organizationId, "view_invoices");
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        const doc = await db
          .collection("invoiceSettings")
          .doc(organizationId)
          .get();

        if (!doc.exists) {
          return getDefaultInvoiceSettings(organizationId);
        }

        return serializeTimestamps({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch invoice settings");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch invoice settings",
        });
      }
    },
  );

  /**
   * PUT /:organizationId/invoice-settings
   * Create or update invoice settings for an organization.
   * Upserts the settings document using organizationId as the document ID.
   */
  fastify.put(
    "/:organizationId/invoice-settings",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const data = request.body as any;

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(user.uid, organizationId, "manage_billing_settings");
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage this organization's settings",
            });
          }
        }

        // Prevent overriding the organizationId from URL
        delete data.organizationId;
        delete data.createdAt;
        delete data.createdBy;

        // Validate Swedish compliance fields if provided
        if (data.orgNumber && !isValidOrgNumber(data.orgNumber)) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Invalid organization number format. Expected NNNNNN-NNNN.",
          });
        }

        if (data.bankgiro && !isValidBankgiro(data.bankgiro)) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Invalid bankgiro number format. Expected NNN-NNNN or NNNN-NNNN.",
          });
        }

        if (data.plusgiro && !isValidPlusgiro(data.plusgiro)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid plusgiro number format.",
          });
        }

        // Validate numeric fields if provided
        if (
          data.defaultDueDays !== undefined &&
          (typeof data.defaultDueDays !== "number" || data.defaultDueDays < 1)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "defaultDueDays must be a positive number",
          });
        }

        if (
          data.defaultVatRate !== undefined &&
          (typeof data.defaultVatRate !== "number" ||
            data.defaultVatRate < 0 ||
            data.defaultVatRate > 100)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "defaultVatRate must be between 0 and 100",
          });
        }

        if (
          data.lateInterestRate !== undefined &&
          (typeof data.lateInterestRate !== "number" ||
            data.lateInterestRate < 0)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "lateInterestRate must be a non-negative number",
          });
        }

        if (
          data.reminderFee !== undefined &&
          (typeof data.reminderFee !== "number" || data.reminderFee < 0)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "reminderFee must be a non-negative number (in ore)",
          });
        }

        if (
          data.maxReminders !== undefined &&
          (typeof data.maxReminders !== "number" ||
            data.maxReminders < 0 ||
            !Number.isInteger(data.maxReminders))
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "maxReminders must be a non-negative integer",
          });
        }

        // Validate numbering fields if provided
        if (data.numbering) {
          if (
            data.numbering.paddingDigits !== undefined &&
            (typeof data.numbering.paddingDigits !== "number" ||
              data.numbering.paddingDigits < 1 ||
              data.numbering.paddingDigits > 10)
          ) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "numbering.paddingDigits must be between 1 and 10",
            });
          }

          if (
            data.numbering.nextNumber !== undefined &&
            (typeof data.numbering.nextNumber !== "number" ||
              data.numbering.nextNumber < 1)
          ) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "numbering.nextNumber must be a positive number",
            });
          }

          if (
            data.numbering.yearFormat !== undefined &&
            !["short", "full"].includes(data.numbering.yearFormat)
          ) {
            return reply.status(400).send({
              error: "Bad Request",
              message:
                'numbering.yearFormat must be "short" (2-digit) or "full" (4-digit)',
            });
          }
        }

        const docRef = db.collection("invoiceSettings").doc(organizationId);
        const existingDoc = await docRef.get();

        const now = Timestamp.now();

        if (existingDoc.exists) {
          // Update existing settings
          const updateData = {
            ...data,
            updatedAt: now,
            updatedBy: user.uid,
          };

          await docRef.update(updateData);

          return serializeTimestamps({
            id: organizationId,
            ...existingDoc.data(),
            ...updateData,
          });
        } else {
          // Create new settings document with defaults merged
          const defaults = getDefaultInvoiceSettings(organizationId);
          const createData = {
            ...defaults,
            ...data,
            organizationId,
            createdAt: now,
            createdBy: user.uid,
            updatedAt: now,
            updatedBy: user.uid,
          };

          // Deep merge numbering if partially provided
          if (data.numbering) {
            createData.numbering = {
              ...defaults.numbering,
              ...data.numbering,
            };
          }

          await docRef.set(createData);

          return reply.status(201).send(
            serializeTimestamps({
              id: organizationId,
              ...createData,
            }),
          );
        }
      } catch (error) {
        request.log.error({ error }, "Failed to update invoice settings");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update invoice settings",
        });
      }
    },
  );
}
