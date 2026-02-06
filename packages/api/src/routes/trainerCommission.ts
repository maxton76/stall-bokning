import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { isSystemAdmin } from "../utils/authorization.js";
import {
  hasPermission,
  getUserOrgRoles,
} from "../utils/permissionEngine.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { calculateCommission } from "../utils/commissionCalculator.js";

// ============================================
// Zod Schemas
// ============================================

const commissionRuleSchema = z.object({
  lessonType: z.string().min(1),
  rate: z.number().min(0),
  rateType: z.enum(["percentage", "fixed_amount"]),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
});

const createCommissionConfigSchema = z.object({
  trainerId: z.string().min(1),
  trainerName: z.string().min(1),
  rules: z.array(commissionRuleSchema).default([]),
  defaultRate: z.number().min(0),
  defaultRateType: z.enum(["percentage", "fixed_amount"]),
  isActive: z.boolean().optional(),
});

const updateCommissionConfigSchema = z.object({
  trainerName: z.string().min(1).optional(),
  rules: z.array(commissionRuleSchema).optional(),
  defaultRate: z.number().min(0).optional(),
  defaultRateType: z.enum(["percentage", "fixed_amount"]).optional(),
  isActive: z.boolean().optional(),
});

const calculateCommissionSchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  trainerId: z.string().optional(),
});

const approveRejectBodySchema = z.object({
  notes: z.string().optional(),
});

const rejectBodySchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

const CONFIGS_COLLECTION = "trainerCommissionConfigs";
const COMMISSIONS_COLLECTION = "trainerCommissions";

export async function trainerCommissionRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing module required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  // ==========================================================================
  // Commission Config CRUD
  // ==========================================================================

  /**
   * POST /:organizationId/commission-configs
   * Create a new commission configuration for a trainer.
   */
  fastify.post(
    "/:organizationId/commission-configs",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        // Validate request body with Zod
        const parseResult = createCommissionConfigSchema.safeParse(
          request.body,
        );
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parseResult.error.flatten().fieldErrors,
          });
        }
        const data = parseResult.data;

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_invoices",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage commission configs for this organization",
            });
          }
        }

        const now = Timestamp.now();

        // Generate unique IDs for rules
        const rules = (data.rules || []).map((rule, index) => ({
          id: `rule_${Date.now()}_${index}`,
          lessonType: rule.lessonType,
          rate: rule.rate,
          rateType: rule.rateType,
          ...(rule.minAmount !== undefined && { minAmount: rule.minAmount }),
          ...(rule.maxAmount !== undefined && { maxAmount: rule.maxAmount }),
        }));

        const configData = {
          organizationId,
          trainerId: data.trainerId,
          trainerName: data.trainerName,
          rules,
          defaultRate: data.defaultRate,
          defaultRateType: data.defaultRateType,
          isActive: data.isActive !== false,
          createdAt: now,
          updatedAt: now,
          createdBy: user.uid,
          updatedBy: user.uid,
        };

        const docRef = await db.collection(CONFIGS_COLLECTION).add(configData);

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...configData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create commission config");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create commission config",
        });
      }
    },
  );

  /**
   * GET /:organizationId/commission-configs
   * List commission configurations for an organization.
   * Query params: trainerId (optional), isActive (optional)
   */
  fastify.get(
    "/:organizationId/commission-configs",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { trainerId, isActive } = request.query as {
          trainerId?: string;
          isActive?: string;
        };

        // Check organization access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const canViewAll = await hasPermission(
            user.uid,
            organizationId,
            "view_financial_reports",
          );

          if (!canViewAll) {
            // Users without view_financial_reports can only see their own configs
            const userInfo = await getUserOrgRoles(user.uid, organizationId);
            if (!userInfo || !userInfo.isActive) {
              return reply.status(403).send({
                error: "Forbidden",
                message:
                  "You do not have permission to access this organization",
              });
            }
            // Force trainerId filter to the authenticated user
            if (trainerId && trainerId !== user.uid) {
              return reply.status(403).send({
                error: "Forbidden",
                message:
                  "You can only view your own commission configurations",
              });
            }
            if (!trainerId) {
              (request.query as Record<string, string>).trainerId = user.uid;
            }
          }
        }

        let query = db
          .collection(CONFIGS_COLLECTION)
          .where("organizationId", "==", organizationId) as any;

        // Re-read trainerId after potential override above
        const effectiveTrainerId =
          (request.query as { trainerId?: string }).trainerId || trainerId;
        if (effectiveTrainerId) {
          query = query.where("trainerId", "==", effectiveTrainerId);
        }

        if (isActive !== undefined) {
          query = query.where("isActive", "==", isActive === "true");
        }

        const snapshot = await query.get();

        const configs = snapshot.docs.map(
          (doc: FirebaseFirestore.QueryDocumentSnapshot) =>
            serializeTimestamps({
              id: doc.id,
              ...doc.data(),
            }),
        );

        return { configs };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch commission configs");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch commission configs",
        });
      }
    },
  );

  /**
   * PUT /:organizationId/commission-configs/:configId
   * Update a commission configuration.
   */
  fastify.put(
    "/:organizationId/commission-configs/:configId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, configId } = request.params as {
          organizationId: string;
          configId: string;
        };
        // Validate request body with Zod
        const parseResult = updateCommissionConfigSchema.safeParse(
          request.body,
        );
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parseResult.error.flatten().fieldErrors,
          });
        }
        const data = parseResult.data;

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_invoices",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage commission configs for this organization",
            });
          }
        }

        // Verify config exists and belongs to this org
        const configRef = db.collection(CONFIGS_COLLECTION).doc(configId);
        const configDoc = await configRef.get();

        if (!configDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Commission config not found",
          });
        }

        const existingData = configDoc.data()!;
        if (existingData.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Commission config not found",
          });
        }

        // Build update object
        const updateData: Record<string, unknown> = {
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        if (data.trainerName !== undefined)
          updateData.trainerName = data.trainerName;
        if (data.defaultRate !== undefined)
          updateData.defaultRate = data.defaultRate;
        if (data.defaultRateType !== undefined)
          updateData.defaultRateType = data.defaultRateType;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        // Generate IDs for new rules
        if (data.rules !== undefined) {
          updateData.rules = data.rules.map((rule, index) => ({
            id: `rule_${Date.now()}_${index}`,
            lessonType: rule.lessonType,
            rate: rule.rate,
            rateType: rule.rateType,
            ...(rule.minAmount !== undefined && {
              minAmount: rule.minAmount,
            }),
            ...(rule.maxAmount !== undefined && {
              maxAmount: rule.maxAmount,
            }),
          }));
        }

        await configRef.update(updateData);

        const updatedDoc = await configRef.get();

        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update commission config");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update commission config",
        });
      }
    },
  );

  // ==========================================================================
  // Commission Calculation & Management
  // ==========================================================================

  /**
   * POST /:organizationId/commissions/calculate
   * Calculate commissions for a billing period.
   * Body: { periodStart: ISO string, periodEnd: ISO string, trainerId?: string }
   */
  fastify.post(
    "/:organizationId/commissions/calculate",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        // Validate request body with Zod
        const parseResult = calculateCommissionSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parseResult.error.flatten().fieldErrors,
          });
        }
        const data = parseResult.data;

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_invoices",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to calculate commissions for this organization",
            });
          }
        }

        const periodStart = new Date(data.periodStart);
        const periodEnd = new Date(data.periodEnd);

        if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid date format for periodStart or periodEnd",
          });
        }

        if (periodStart >= periodEnd) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "periodStart must be before periodEnd",
          });
        }

        // Fetch active configs
        let configQuery = db
          .collection(CONFIGS_COLLECTION)
          .where("organizationId", "==", organizationId)
          .where("isActive", "==", true) as any;

        if (data.trainerId) {
          configQuery = configQuery.where("trainerId", "==", data.trainerId);
        }

        const configsSnap = await configQuery.get();

        if (configsSnap.empty) {
          return reply.status(404).send({
            error: "Not Found",
            message: "No active commission configurations found",
          });
        }

        const results: unknown[] = [];

        for (const configDoc of configsSnap.docs) {
          const configData = configDoc.data();
          const config = {
            id: configDoc.id,
            trainerId: configData.trainerId as string,
            trainerName: configData.trainerName as string,
            rules: (configData.rules || []) as Array<{
              lessonType: string;
              rate: number;
              rateType: "percentage" | "fixed_amount";
              minAmount?: number;
              maxAmount?: number;
            }>,
            defaultRate: configData.defaultRate as number,
            defaultRateType: configData.defaultRateType as
              | "percentage"
              | "fixed_amount",
          };

          const commissionData = await calculateCommission(
            config,
            organizationId,
            periodStart,
            periodEnd,
            user.uid,
          );

          // Only save if there are line items
          if (commissionData.totalLessons > 0) {
            const docRef = await db
              .collection(COMMISSIONS_COLLECTION)
              .add(commissionData);

            results.push(
              serializeTimestamps({
                id: docRef.id,
                ...commissionData,
              }),
            );
          }
        }

        return reply.status(201).send({ commissions: results });
      } catch (error) {
        request.log.error({ error }, "Failed to calculate commissions");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to calculate commissions",
        });
      }
    },
  );

  /**
   * GET /:organizationId/commissions
   * List commissions for an organization.
   * Query params: trainerId, status, periodStart, periodEnd, limit, offset
   */
  fastify.get(
    "/:organizationId/commissions",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const {
          trainerId,
          status,
          periodStart,
          periodEnd,
          limit = "100",
          offset = "0",
        } = request.query as {
          trainerId?: string;
          status?: string;
          periodStart?: string;
          periodEnd?: string;
          limit?: string;
          offset?: string;
        };

        // Check organization access (V2 permission engine)
        let effectiveTrainerId = trainerId;
        if (!isSystemAdmin(user.role)) {
          const canViewAll = await hasPermission(
            user.uid,
            organizationId,
            "view_financial_reports",
          );

          if (!canViewAll) {
            // Users without view_financial_reports can only see their own commissions
            const userInfo = await getUserOrgRoles(user.uid, organizationId);
            if (!userInfo || !userInfo.isActive) {
              return reply.status(403).send({
                error: "Forbidden",
                message:
                  "You do not have permission to access this organization",
              });
            }
            if (trainerId && trainerId !== user.uid) {
              return reply.status(403).send({
                error: "Forbidden",
                message: "You can only view your own commission data",
              });
            }
            effectiveTrainerId = user.uid;
          }
        }

        let query = db
          .collection(COMMISSIONS_COLLECTION)
          .where("organizationId", "==", organizationId) as any;

        if (effectiveTrainerId) {
          query = query.where("trainerId", "==", effectiveTrainerId);
        }

        if (status) {
          query = query.where("status", "==", status);
        }

        if (periodStart) {
          const startDate = Timestamp.fromDate(new Date(periodStart));
          query = query.where("period.start", ">=", startDate);
        }

        if (periodEnd) {
          const endDate = Timestamp.fromDate(new Date(periodEnd));
          query = query.where("period.end", "<=", endDate);
        }

        query = query.orderBy("createdAt", "desc");

        const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500);
        const parsedOffset = parseInt(offset, 10) || 0;

        const snapshot = await query.limit(parsedOffset + parsedLimit).get();
        const allDocs = snapshot.docs.slice(parsedOffset);

        const items = allDocs.map(
          (doc: FirebaseFirestore.QueryDocumentSnapshot) =>
            serializeTimestamps({
              id: doc.id,
              ...doc.data(),
            }),
        );

        return {
          items,
          pagination: {
            limit: parsedLimit,
            offset: parsedOffset,
            count: items.length,
          },
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch commissions");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch commissions",
        });
      }
    },
  );

  /**
   * GET /:organizationId/commissions/:commissionId
   * Get a single commission with full detail.
   */
  fastify.get(
    "/:organizationId/commissions/:commissionId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, commissionId } = request.params as {
          organizationId: string;
          commissionId: string;
        };

        const docRef = db.collection(COMMISSIONS_COLLECTION).doc(commissionId);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Commission not found",
          });
        }

        const data = doc.data()!;
        if (data.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Commission not found",
          });
        }

        // Check access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const canViewAll = await hasPermission(
            user.uid,
            organizationId,
            "view_financial_reports",
          );

          if (!canViewAll && data.trainerId !== user.uid) {
            // User lacks view_financial_reports and is not the trainer
            return reply.status(404).send({
              error: "Not Found",
              message: "Commission not found",
            });
          }

          // If user cannot view all, verify they are at least an active member
          if (!canViewAll) {
            const userInfo = await getUserOrgRoles(user.uid, organizationId);
            if (!userInfo || !userInfo.isActive) {
              return reply.status(404).send({
                error: "Not Found",
                message: "Commission not found",
              });
            }
          }
        }

        return serializeTimestamps({
          id: doc.id,
          ...data,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch commission");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch commission",
        });
      }
    },
  );

  /**
   * PUT /:organizationId/commissions/:commissionId/approve
   * Approve a commission.
   */
  fastify.put(
    "/:organizationId/commissions/:commissionId/approve",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, commissionId } = request.params as {
          organizationId: string;
          commissionId: string;
        };
        const parseResult = approveRejectBodySchema.safeParse(
          request.body || {},
        );
        const body = parseResult.success ? parseResult.data : {};

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_invoices",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to approve commissions for this organization",
            });
          }
        }

        const docRef = db.collection(COMMISSIONS_COLLECTION).doc(commissionId);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Commission not found",
          });
        }

        const data = doc.data()!;
        if (data.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Commission not found",
          });
        }

        // Only draft or pending_approval can be approved
        if (!["draft", "pending_approval"].includes(data.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot approve commission with status "${data.status}"`,
          });
        }

        const updateData: Record<string, unknown> = {
          status: "approved",
          approvedBy: user.uid,
          approvedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        if (body.notes) {
          updateData.notes = body.notes;
        }

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();

        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to approve commission");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to approve commission",
        });
      }
    },
  );

  /**
   * PUT /:organizationId/commissions/:commissionId/reject
   * Reject a commission.
   * Body: { reason: string }
   */
  fastify.put(
    "/:organizationId/commissions/:commissionId/reject",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, commissionId } = request.params as {
          organizationId: string;
          commissionId: string;
        };
        // Validate request body with Zod
        const parseResult = rejectBodySchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parseResult.error.flatten().fieldErrors,
          });
        }
        const body = parseResult.data;

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_invoices",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to reject commissions for this organization",
            });
          }
        }

        const docRef = db.collection(COMMISSIONS_COLLECTION).doc(commissionId);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Commission not found",
          });
        }

        const data = doc.data()!;
        if (data.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Commission not found",
          });
        }

        // Only draft or pending_approval can be rejected
        if (!["draft", "pending_approval"].includes(data.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot reject commission with status "${data.status}"`,
          });
        }

        const updateData = {
          status: "rejected",
          rejectedBy: user.uid,
          rejectedAt: Timestamp.now(),
          rejectionReason: body.reason,
          updatedAt: Timestamp.now(),
        };

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();

        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to reject commission");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to reject commission",
        });
      }
    },
  );

  /**
   * GET /:organizationId/commissions/export
   * Export commissions as CSV.
   * Query params: periodStart, periodEnd, trainerId, status
   */
  fastify.get(
    "/:organizationId/commissions/export",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { periodStart, periodEnd, trainerId, status } = request.query as {
          periodStart?: string;
          periodEnd?: string;
          trainerId?: string;
          status?: string;
        };

        // Check organization access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "view_financial_reports",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to export commissions for this organization",
            });
          }
        }

        let query = db
          .collection(COMMISSIONS_COLLECTION)
          .where("organizationId", "==", organizationId) as any;

        if (trainerId) {
          query = query.where("trainerId", "==", trainerId);
        }

        if (status) {
          query = query.where("status", "==", status);
        }

        if (periodStart) {
          const startDate = Timestamp.fromDate(new Date(periodStart));
          query = query.where("period.start", ">=", startDate);
        }

        if (periodEnd) {
          const endDate = Timestamp.fromDate(new Date(periodEnd));
          query = query.where("period.end", "<=", endDate);
        }

        const snapshot = await query.get();

        // Build CSV
        const csvRows = [
          "Trainer,Period,Lessons,Revenue (SEK),Commission (SEK),Status",
        ];

        for (const doc of snapshot.docs) {
          const d = doc.data();
          const periodStr = `${formatTimestamp(d.period?.start)} - ${formatTimestamp(d.period?.end)}`;
          const revenueSek = (d.totalRevenue / 100).toFixed(2);
          const commissionSek = (d.commissionAmount / 100).toFixed(2);

          // Escape trainer name for CSV
          const trainerName = (d.trainerName || "").replace(/"/g, '""');

          csvRows.push(
            `"${trainerName}","${periodStr}",${d.totalLessons},${revenueSek},${commissionSek},${d.status}`,
          );
        }

        const csv = csvRows.join("\n");

        return reply
          .header("Content-Type", "text/csv")
          .header(
            "Content-Disposition",
            'attachment; filename="commissions-export.csv"',
          )
          .send(csv);
      } catch (error) {
        request.log.error({ error }, "Failed to export commissions");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to export commissions",
        });
      }
    },
  );
}

/**
 * Format a Firestore Timestamp to YYYY-MM-DD string.
 */
function formatTimestamp(ts: any): string {
  if (!ts) return "";
  try {
    const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}
