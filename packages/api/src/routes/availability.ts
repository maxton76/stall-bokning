import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  hasOrganizationAccess,
  isOrganizationAdmin,
} from "../utils/authorization.js";
import {
  calculateTimeBalance,
  calculateCurrentBalance,
  createDefaultBalance,
} from "../utils/balanceCalculation.js";
import { serializeTimestamps } from "../utils/serialization.js";

// Validation schemas
const createLeaveRequestSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  type: z.enum(["vacation", "sick", "parental", "other"]),
  firstDay: z.string().datetime(),
  lastDay: z.string().datetime(),
  note: z.string().optional(),
});

const updateLeaveRequestSchema = z.object({
  note: z.string().optional(),
  status: z.enum(["cancelled"]).optional(), // Users can only cancel
});

const reportSickLeaveSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  firstDay: z.string().datetime(),
  note: z.string().optional(),
});

// Admin schemas
const reviewLeaveRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().optional(),
});

const setWorkScheduleSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  weeklySchedule: z.array(
    z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string(),
      hours: z.number().min(0).max(24),
      isWorkDay: z.boolean(),
    }),
  ),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
});

const adjustBalanceSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  year: z.number().int().min(2000).max(2100),
  corrections: z.number(),
  reason: z.string().min(1, "Reason is required"),
});

// Helper: Calculate impact hours from work schedule
async function calculateImpactHours(
  userId: string,
  organizationId: string,
  firstDay: Date,
  lastDay: Date,
): Promise<number> {
  // Get user's active work schedule
  const schedulesSnapshot = await db
    .collection("workSchedules")
    .where("userId", "==", userId)
    .where("organizationId", "==", organizationId)
    .where("effectiveFrom", "<=", Timestamp.fromDate(firstDay))
    .orderBy("effectiveFrom", "desc")
    .limit(1)
    .get();

  if (schedulesSnapshot.empty) {
    // No schedule found, use default 8 hours per weekday
    let hours = 0;
    const currentDate = new Date(firstDay);
    while (currentDate <= lastDay) {
      const dayOfWeek = currentDate.getDay();
      // Weekdays (Mon-Fri = 1-5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        hours += 8;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return hours;
  }

  const schedule = schedulesSnapshot.docs[0].data();
  const weeklySchedule = schedule.weeklySchedule || [];

  let totalHours = 0;
  const currentDate = new Date(firstDay);

  while (currentDate <= lastDay) {
    const dayOfWeek = currentDate.getDay();
    const daySchedule = weeklySchedule.find(
      (d: any) => d.dayOfWeek === dayOfWeek,
    );

    if (daySchedule && daySchedule.isWorkDay) {
      totalHours += daySchedule.hours || 0;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return totalHours;
}

export async function availabilityRoutes(fastify: FastifyInstance) {
  // ============================================
  // LEAVE REQUESTS
  // ============================================

  // Get user's leave requests for an organization
  fastify.get(
    "/leave-requests",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, status, year } = request.query as {
          organizationId?: string;
          status?: string;
          year?: string;
        };

        if (!organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "organizationId query parameter is required",
          });
        }

        // Verify user has access to this organization
        const hasAccess = await hasOrganizationAccess(user.uid, organizationId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this organization",
          });
        }

        let query: FirebaseFirestore.Query = db
          .collection("leaveRequests")
          .where("userId", "==", user.uid)
          .where("organizationId", "==", organizationId);

        // Filter by status if provided
        if (status) {
          query = query.where("status", "==", status);
        }

        // Filter by year if provided
        if (year) {
          const yearNum = parseInt(year);
          const startOfYear = new Date(yearNum, 0, 1);
          const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59);
          query = query
            .where("firstDay", ">=", Timestamp.fromDate(startOfYear))
            .where("firstDay", "<=", Timestamp.fromDate(endOfYear));
        }

        const snapshot = await query.orderBy("firstDay", "desc").get();

        const leaveRequests = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { leaveRequests };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch leave requests");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch leave requests",
        });
      }
    },
  );

  // Create a leave request
  fastify.post(
    "/leave-requests",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = createLeaveRequestSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, type, firstDay, lastDay, note } =
          validation.data;

        // Verify user has access to this organization
        const hasAccess = await hasOrganizationAccess(user.uid, organizationId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this organization",
          });
        }

        const firstDayDate = new Date(firstDay);
        const lastDayDate = new Date(lastDay);
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );

        // Validate: last day must be on or after first day
        if (lastDayDate < firstDayDate) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Last day must be on or after first day",
          });
        }

        // Validate: first day cannot be in the past (allow today)
        if (firstDayDate < today) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Cannot create leave requests for past dates",
          });
        }

        // Validate: cannot be more than 2 years in the future
        const maxFutureDate = new Date(today);
        maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);
        if (lastDayDate > maxFutureDate) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Leave requests cannot be more than 2 years in advance",
          });
        }

        // Validate: duration cannot exceed 365 days
        const durationDays =
          Math.ceil(
            (lastDayDate.getTime() - firstDayDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;
        if (durationDays > 365) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Leave request duration cannot exceed 365 days",
          });
        }

        // Calculate impact hours
        const impactHours = await calculateImpactHours(
          user.uid,
          organizationId,
          firstDayDate,
          lastDayDate,
        );

        const timestamp = Timestamp.now();

        const leaveRequestData = {
          userId: user.uid,
          userName: user.displayName || user.email,
          userEmail: user.email,
          organizationId,
          type,
          firstDay: Timestamp.fromDate(firstDayDate),
          lastDay: Timestamp.fromDate(lastDayDate),
          note: note || null,
          impactHours,
          status: "pending",
          requestedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        const docRef = await db
          .collection("leaveRequests")
          .add(leaveRequestData);
        const doc = await docRef.get();

        return reply.status(201).send(
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create leave request");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create leave request",
        });
      }
    },
  );

  // Get a single leave request
  fastify.get(
    "/leave-requests/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const docRef = db.collection("leaveRequests").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Leave request not found",
          });
        }

        const data = doc.data()!;

        // Authorization check: owner, system admin, or organization admin
        const isOwner = data.userId === user.uid;
        const isSystemAdmin = user.role === "system_admin";

        if (!isOwner && !isSystemAdmin) {
          // Check if user is an admin of the leave request's organization
          const isOrgAdmin = await isOrganizationAdmin(
            user.uid,
            data.organizationId,
          );
          if (!isOrgAdmin) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to view this leave request",
            });
          }
        }

        return serializeTimestamps({
          id: doc.id,
          ...data,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch leave request");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch leave request",
        });
      }
    },
  );

  // Update a leave request (cancel only for users)
  fastify.patch(
    "/leave-requests/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = updateLeaveRequestSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const docRef = db.collection("leaveRequests").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Leave request not found",
          });
        }

        const data = doc.data()!;

        // Only owner can update their request
        if (data.userId !== user.uid) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only update your own leave requests",
          });
        }

        // Can only update pending requests
        if (data.status !== "pending") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Can only update pending leave requests",
          });
        }

        const updateData: any = {
          updatedAt: Timestamp.now(),
        };

        if (validation.data.note !== undefined) {
          updateData.note = validation.data.note;
        }

        if (validation.data.status === "cancelled") {
          updateData.status = "cancelled";
          updateData.cancelledAt = Timestamp.now();
        }

        await docRef.update(updateData);
        const updatedDoc = await docRef.get();

        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update leave request");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update leave request",
        });
      }
    },
  );

  // Delete a leave request (pending only)
  fastify.delete(
    "/leave-requests/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };

        const docRef = db.collection("leaveRequests").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Leave request not found",
          });
        }

        const data = doc.data()!;

        // Only owner can delete their request
        if (data.userId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only delete your own leave requests",
          });
        }

        // Can only delete pending requests
        if (data.status !== "pending") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Can only delete pending leave requests",
          });
        }

        await docRef.delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete leave request");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete leave request",
        });
      }
    },
  );

  // ============================================
  // SICK LEAVE (Simplified flow)
  // ============================================

  // Report sick leave (auto-approved)
  fastify.post(
    "/sick-leave",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = reportSickLeaveSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, firstDay, note } = validation.data;

        // Verify user has access to this organization
        const hasAccess = await hasOrganizationAccess(user.uid, organizationId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this organization",
          });
        }

        const firstDayDate = new Date(firstDay);
        const now = Timestamp.now();

        // Calculate impact hours (single day for sick leave start)
        const impactHours = await calculateImpactHours(
          user.uid,
          organizationId,
          firstDayDate,
          firstDayDate,
        );

        const sickLeaveData = {
          userId: user.uid,
          userName: user.displayName || user.email,
          userEmail: user.email,
          organizationId,
          type: "sick",
          firstDay: Timestamp.fromDate(firstDayDate),
          lastDay: Timestamp.fromDate(firstDayDate), // Same day initially
          note: note || null,
          impactHours,
          status: "approved", // Sick leave is auto-approved
          requestedAt: now,
          reviewedAt: now,
          reviewedBy: "system",
          reviewNote: "Auto-approved sick leave",
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await db.collection("leaveRequests").add(sickLeaveData);
        const doc = await docRef.get();

        return reply.status(201).send(
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to report sick leave");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to report sick leave",
        });
      }
    },
  );

  // ============================================
  // WORK SCHEDULE
  // ============================================

  // Get user's work schedule
  fastify.get(
    "/schedule",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.query as {
          organizationId?: string;
        };

        if (!organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "organizationId query parameter is required",
          });
        }

        // Verify user has access to this organization
        const hasAccess = await hasOrganizationAccess(user.uid, organizationId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this organization",
          });
        }

        // Get active schedule (most recent effectiveFrom that's in the past)
        const now = new Date();
        const schedulesSnapshot = await db
          .collection("workSchedules")
          .where("userId", "==", user.uid)
          .where("organizationId", "==", organizationId)
          .where("effectiveFrom", "<=", Timestamp.fromDate(now))
          .orderBy("effectiveFrom", "desc")
          .limit(1)
          .get();

        if (schedulesSnapshot.empty) {
          return { schedule: null };
        }

        const doc = schedulesSnapshot.docs[0];

        return {
          schedule: serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch work schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch work schedule",
        });
      }
    },
  );

  // ============================================
  // TIME BALANCE
  // ============================================

  // Get user's time balance
  fastify.get(
    "/balance",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, year } = request.query as {
          organizationId?: string;
          year?: string;
        };

        if (!organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "organizationId query parameter is required",
          });
        }

        // Verify user has access to this organization
        const hasAccess = await hasOrganizationAccess(user.uid, organizationId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this organization",
          });
        }

        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const balanceId = `${user.uid}_${organizationId}_${targetYear}`;

        const balanceDoc = await db
          .collection("timeBalances")
          .doc(balanceId)
          .get();

        if (!balanceDoc.exists) {
          // Return default balance if none exists
          return {
            balance: createDefaultBalance(user.uid, organizationId, targetYear),
          };
        }

        const data = balanceDoc.data()!;
        const { currentBalance, endOfYearProjection } =
          calculateTimeBalance(data);

        return {
          balance: serializeTimestamps({
            id: balanceDoc.id,
            ...data,
            currentBalance,
            endOfYearProjection,
          }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch time balance");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch time balance",
        });
      }
    },
  );

  // ============================================
  // ADMIN ROUTES
  // ============================================

  // Get all organization members with their work schedules
  fastify.get(
    "/admin/members-with-schedules",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.query as {
          organizationId?: string;
        };

        if (!organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "organizationId query parameter is required",
          });
        }

        // Verify user is admin
        const isAdmin = await isOrganizationAdmin(user.uid, organizationId);
        if (!isAdmin) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You must be an organization admin to access this resource",
          });
        }

        // Get all active members of the organization
        const membersSnapshot = await db
          .collection("organizationMembers")
          .where("organizationId", "==", organizationId)
          .where("status", "==", "active")
          .get();

        const now = new Date();
        const currentYear = now.getFullYear();

        const members = await Promise.all(
          membersSnapshot.docs.map(async (memberDoc) => {
            const memberData = memberDoc.data();
            const userId = memberData.userId;

            // Get user's work schedule
            const schedulesSnapshot = await db
              .collection("workSchedules")
              .where("userId", "==", userId)
              .where("organizationId", "==", organizationId)
              .where("effectiveFrom", "<=", Timestamp.fromDate(now))
              .orderBy("effectiveFrom", "desc")
              .limit(1)
              .get();

            const workSchedule = schedulesSnapshot.empty
              ? null
              : serializeTimestamps({
                  id: schedulesSnapshot.docs[0].id,
                  ...schedulesSnapshot.docs[0].data(),
                });

            // Get user's time balance for current year
            const balanceId = `${userId}_${organizationId}_${currentYear}`;
            const balanceDoc = await db
              .collection("timeBalances")
              .doc(balanceId)
              .get();

            let timeBalance = null;
            if (balanceDoc.exists) {
              const data = balanceDoc.data()!;
              const { currentBalance, endOfYearProjection } =
                calculateTimeBalance(data, now);

              timeBalance = serializeTimestamps({
                id: balanceDoc.id,
                ...data,
                currentBalance,
                endOfYearProjection,
              });
            } else {
              // Return default balance structure
              timeBalance = createDefaultBalance(
                userId,
                organizationId,
                currentYear,
              );
            }

            return {
              id: memberDoc.id,
              ...memberData,
              workSchedule,
              timeBalance,
            };
          }),
        );

        return { members };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch members with schedules");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch members with schedules",
        });
      }
    },
  );

  // Set a user's work schedule (admin only)
  fastify.put(
    "/admin/schedules/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = setWorkScheduleSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const adminUser = (request as AuthenticatedRequest).user!;
        const { userId } = request.params as { userId: string };
        const {
          organizationId,
          weeklySchedule,
          effectiveFrom,
          effectiveUntil,
        } = validation.data;

        // Verify user is admin
        const isAdmin = await isOrganizationAdmin(
          adminUser.uid,
          organizationId,
        );
        if (!isAdmin) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You must be an organization admin to set work schedules",
          });
        }

        // Verify target user is member of organization
        const targetUserAccess = await hasOrganizationAccess(
          userId,
          organizationId,
        );
        if (!targetUserAccess) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User is not a member of this organization",
          });
        }

        const effectiveFromDate = new Date(effectiveFrom);
        const now = Timestamp.now();

        const scheduleData = {
          userId,
          organizationId,
          weeklySchedule,
          effectiveFrom: Timestamp.fromDate(effectiveFromDate),
          effectiveUntil: effectiveUntil
            ? Timestamp.fromDate(new Date(effectiveUntil))
            : null,
          createdBy: adminUser.uid,
          createdAt: now,
          updatedAt: now,
        };

        // Create new schedule document
        const docRef = await db.collection("workSchedules").add(scheduleData);
        const doc = await docRef.get();

        return reply.status(201).send(
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to set work schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to set work schedule",
        });
      }
    },
  );

  // Get all leave requests for an organization (admin only)
  fastify.get(
    "/admin/leave-requests",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, status, userId } = request.query as {
          organizationId?: string;
          status?: string;
          userId?: string;
        };

        if (!organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "organizationId query parameter is required",
          });
        }

        // Verify user is admin
        const isAdmin = await isOrganizationAdmin(user.uid, organizationId);
        if (!isAdmin) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You must be an organization admin to access this resource",
          });
        }

        let query: FirebaseFirestore.Query = db
          .collection("leaveRequests")
          .where("organizationId", "==", organizationId);

        // Filter by status if provided
        if (status) {
          query = query.where("status", "==", status);
        }

        // Filter by user if provided
        if (userId) {
          query = query.where("userId", "==", userId);
        }

        const snapshot = await query.orderBy("requestedAt", "desc").get();

        const leaveRequests = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { leaveRequests };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch leave requests");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch leave requests",
        });
      }
    },
  );

  // Review a leave request (approve/reject - admin only)
  fastify.patch(
    "/admin/leave-requests/:id/review",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = reviewLeaveRequestSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const adminUser = (request as AuthenticatedRequest).user!;
        const { id } = request.params as { id: string };
        const { status, reviewNote } = validation.data;

        const docRef = db.collection("leaveRequests").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Leave request not found",
          });
        }

        const data = doc.data()!;

        // Verify user is admin of the organization
        const isAdmin = await isOrganizationAdmin(
          adminUser.uid,
          data.organizationId,
        );
        if (!isAdmin) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You must be an organization admin to review leave requests",
          });
        }

        // Can only review pending requests
        if (data.status !== "pending") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Can only review pending leave requests",
          });
        }

        const now = Timestamp.now();

        const updateData: any = {
          status,
          reviewedAt: now,
          reviewedBy: adminUser.uid,
          reviewerName: adminUser.displayName || adminUser.email,
          updatedAt: now,
        };

        if (reviewNote) {
          updateData.reviewNote = reviewNote;
        }

        // If approved, update the user's time balance
        if (status === "approved") {
          const year = data.firstDay.toDate().getFullYear();
          const balanceId = `${data.userId}_${data.organizationId}_${year}`;

          await db.runTransaction(async (transaction) => {
            // Update leave request
            transaction.update(docRef, updateData);

            // Update time balance
            const balanceRef = db.collection("timeBalances").doc(balanceId);
            const balanceDoc = await transaction.get(balanceRef);

            if (balanceDoc.exists) {
              transaction.update(balanceRef, {
                approvedLeave: FieldValue.increment(data.impactHours),
                tentativeLeave: FieldValue.increment(-data.impactHours),
                updatedAt: now,
              });
            } else {
              transaction.set(balanceRef, {
                userId: data.userId,
                organizationId: data.organizationId,
                year,
                carryoverFromPreviousYear: 0,
                buildUpHours: 0,
                corrections: 0,
                approvedLeave: data.impactHours,
                tentativeLeave: 0,
                approvedOvertime: 0,
                createdAt: now,
                updatedAt: now,
              });
            }
          });
        } else {
          // Just update the leave request (rejected)
          await docRef.update(updateData);
        }

        const updatedDoc = await docRef.get();

        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to review leave request");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to review leave request",
        });
      }
    },
  );

  // Adjust a user's time balance (admin only)
  fastify.patch(
    "/admin/balance/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = adjustBalanceSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const adminUser = (request as AuthenticatedRequest).user!;
        const { userId } = request.params as { userId: string };
        const { organizationId, year, corrections, reason } = validation.data;

        // Verify user is admin
        const isAdmin = await isOrganizationAdmin(
          adminUser.uid,
          organizationId,
        );
        if (!isAdmin) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You must be an organization admin to adjust balances",
          });
        }

        // Verify target user is member of organization
        const targetUserAccess = await hasOrganizationAccess(
          userId,
          organizationId,
        );
        if (!targetUserAccess) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User is not a member of this organization",
          });
        }

        const balanceId = `${userId}_${organizationId}_${year}`;
        const balanceRef = db.collection("timeBalances").doc(balanceId);
        const now = Timestamp.now();

        // Use transaction to safely update balance
        await db.runTransaction(async (transaction) => {
          const balanceDoc = await transaction.get(balanceRef);

          if (balanceDoc.exists) {
            const currentCorrections = balanceDoc.data()?.corrections || 0;
            transaction.update(balanceRef, {
              corrections: currentCorrections + corrections,
              updatedAt: now,
            });
          } else {
            transaction.set(balanceRef, {
              userId,
              organizationId,
              year,
              carryoverFromPreviousYear: 0,
              buildUpHours: 0,
              corrections,
              approvedLeave: 0,
              tentativeLeave: 0,
              approvedOvertime: 0,
              createdAt: now,
              updatedAt: now,
            });
          }

          // Create audit log entry
          const auditRef = db.collection("balanceAdjustments").doc();
          transaction.set(auditRef, {
            balanceId,
            userId,
            organizationId,
            year,
            adjustmentAmount: corrections,
            reason,
            adjustedBy: adminUser.uid,
            adjustedByName: adminUser.displayName || adminUser.email,
            createdAt: now,
          });
        });

        // Fetch updated balance
        const updatedBalanceDoc = await balanceRef.get();
        const data = updatedBalanceDoc.data()!;
        const currentBalance = calculateCurrentBalance(data);

        return serializeTimestamps({
          id: updatedBalanceDoc.id,
          ...data,
          currentBalance,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to adjust time balance");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to adjust time balance",
        });
      }
    },
  );
}
