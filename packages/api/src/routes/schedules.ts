import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import {
  authenticate,
  requireStableAccess,
  requireStableManagement,
} from "../middleware/auth.js";
import type { AuthenticatedRequest, Schedule } from "../types/index.js";
import { canManageSchedules } from "../utils/authorization.js";
import {
  autoAssignShifts,
  calculateAssignmentSummary,
  type MemberForAssignment,
  type ShiftForAssignment,
  type AssignmentConfig,
} from "../services/autoAssignmentService.js";

const createScheduleSchema = z.object({
  name: z.string().min(1),
  stableId: z.string().min(1),
  stableName: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  useAutoAssignment: z.boolean().optional().default(false),
  notifyMembers: z.boolean().optional().default(false),
});

const updateScheduleSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  useAutoAssignment: z.boolean().optional(),
  notifyMembers: z.boolean().optional(),
});

const publishScheduleSchema = z.object({
  userId: z.string().min(1),
});

// Availability schema for member constraints
const availabilitySchema = z
  .object({
    neverAvailable: z
      .array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          timeSlots: z.array(
            z.object({
              start: z.string(),
              end: z.string(),
            }),
          ),
        }),
      )
      .optional(),
    preferredTimes: z
      .array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          timeSlots: z.array(
            z.object({
              start: z.string(),
              end: z.string(),
            }),
          ),
        }),
      )
      .optional(),
  })
  .optional();

// Limits schema for member constraints
const limitsSchema = z
  .object({
    maxShiftsPerWeek: z.number().min(0).optional(),
    minShiftsPerWeek: z.number().min(0).optional(),
    maxShiftsPerMonth: z.number().min(0).optional(),
    minShiftsPerMonth: z.number().min(0).optional(),
  })
  .optional();

const autoAssignSchema = z.object({
  members: z.array(
    z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
      email: z.string().email(),
      availability: availabilitySchema,
      limits: limitsSchema,
    }),
  ),
  historicalPoints: z.record(z.number()).optional(),
  config: z
    .object({
      holidayMultiplier: z.number().min(1).max(5).optional(),
      preferenceBonus: z.number().optional(),
      memoryHorizonDays: z.number().min(1).max(365).optional(),
    })
    .optional(),
});

export async function schedulesRoutes(fastify: FastifyInstance) {
  // Get all schedules for authenticated user
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const snapshot = await db
          .collection("schedules")
          .where("userId", "==", user.uid)
          .get();

        const schedules = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return { schedules };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch schedules");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch schedules",
        });
      }
    },
  );

  // Get schedules for a specific stable
  // FIXED: Added authentication and membership verification
  fastify.get(
    "/stable/:stableId",
    {
      preHandler: [authenticate, requireStableAccess()],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };

        // Support both legacy "confirmed" status and new "published" status
        const snapshot = await db
          .collection("schedules")
          .where("stableId", "==", stableId)
          .where("status", "in", ["published", "confirmed"])
          .get();

        const schedules = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return { schedules };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch stable schedules");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stable schedules",
        });
      }
    },
  );

  // Create new schedule
  fastify.post(
    "/",
    {
      preHandler: [authenticate, requireStableManagement()],
    },
    async (request, reply) => {
      try {
        const validation = createScheduleSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;

        // Middleware already verified stable management permissions
        const scheduleData: Schedule = {
          name: validation.data.name,
          stableId: validation.data.stableId,
          stableName: validation.data.stableName,
          startDate: new Date(validation.data.startDate),
          endDate: new Date(validation.data.endDate),
          useAutoAssignment: validation.data.useAutoAssignment,
          notifyMembers: validation.data.notifyMembers,
          status: "draft",
          createdAt: new Date(),
          createdBy: user.uid,
          updatedAt: new Date(),
        };

        const docRef = await db.collection("schedules").add(scheduleData);
        const doc = await docRef.get();

        return reply.status(201).send({
          id: doc.id,
          ...doc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create schedule",
        });
      }
    },
  );

  // Update schedule
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = updateScheduleSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const docRef = db.collection("schedules").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Schedule not found",
          });
        }

        const schedule = doc.data() as Schedule;

        // FIXED: Check ownership or stable management permissions
        const canManage = await canManageSchedules(user.uid, schedule.stableId);

        if (
          schedule.createdBy !== user.uid &&
          !canManage &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this schedule",
          });
        }

        const updateData: Partial<Schedule> & {
          updatedAt: Date;
          updatedBy: string;
        } = {
          updatedAt: new Date(),
          updatedBy: user.uid,
        };

        if (validation.data.name !== undefined) {
          updateData.name = validation.data.name;
        }
        if (validation.data.status !== undefined) {
          updateData.status = validation.data.status;
        }
        if (validation.data.startDate) {
          updateData.startDate = new Date(validation.data.startDate);
        }
        if (validation.data.endDate) {
          updateData.endDate = new Date(validation.data.endDate);
        }
        if (validation.data.useAutoAssignment !== undefined) {
          updateData.useAutoAssignment = validation.data.useAutoAssignment;
        }
        if (validation.data.notifyMembers !== undefined) {
          updateData.notifyMembers = validation.data.notifyMembers;
        }

        await docRef.update(updateData);
        const updatedDoc = await docRef.get();

        return {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to update schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update schedule",
        });
      }
    },
  );

  // Get single schedule by ID
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const docRef = db.collection("schedules").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Schedule not found",
          });
        }

        const schedule = doc.data() as Schedule;

        // Check access permissions
        const canManage = await canManageSchedules(user.uid, schedule.stableId);
        if (
          schedule.createdBy !== user.uid &&
          !canManage &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to view this schedule",
          });
        }

        return {
          id: doc.id,
          ...doc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch schedule",
        });
      }
    },
  );

  // Get all schedules for a specific user (by userId)
  fastify.get(
    "/user/:userId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const user = (request as AuthenticatedRequest).user!;

        // Security: Only allow querying own schedules unless system_admin
        if (userId !== user.uid && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only query your own schedules",
          });
        }

        // Get all stables the user is a member of
        const stablesSnapshot = await db
          .collection("stables")
          .where("members", "array-contains", userId)
          .get();

        const stableIds = stablesSnapshot.docs.map((doc) => doc.id);

        if (stableIds.length === 0) {
          return { schedules: [] };
        }

        // Get all schedules for those stables
        const schedulesSnapshot = await db
          .collection("schedules")
          .where("stableId", "in", stableIds)
          .orderBy("startDate", "desc")
          .get();

        const schedules = schedulesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return { schedules };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch user schedules");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch user schedules",
        });
      }
    },
  );

  // Publish schedule
  fastify.put(
    "/:id/publish",
    {
      preHandler: [authenticate, requireStableManagement()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = publishScheduleSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const docRef = db.collection("schedules").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Schedule not found",
          });
        }

        const schedule = doc.data() as Schedule;
        const canManage = await canManageSchedules(user.uid, schedule.stableId);

        if (!canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to publish this schedule",
          });
        }

        await docRef.update({
          status: "published",
          publishedAt: new Date(),
          publishedBy: validation.data.userId,
          updatedAt: new Date(),
          updatedBy: validation.data.userId,
        });

        const updatedDoc = await docRef.get();
        return {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to publish schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to publish schedule",
        });
      }
    },
  );

  // Auto-assign shifts for a schedule
  fastify.post(
    "/:id/auto-assign",
    {
      preHandler: [authenticate, requireStableManagement()],
    },
    async (request, reply) => {
      try {
        const { id: scheduleId } = request.params as { id: string };
        const validation = autoAssignSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const scheduleDoc = await db
          .collection("schedules")
          .doc(scheduleId)
          .get();

        if (!scheduleDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Schedule not found",
          });
        }

        const schedule = scheduleDoc.data() as Schedule;
        const canManage = await canManageSchedules(user.uid, schedule.stableId);

        if (!canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to auto-assign shifts for this schedule",
          });
        }

        const { members, historicalPoints, config } = validation.data;

        // Load all shifts for this schedule
        const shiftsSnapshot = await db
          .collection("shifts")
          .where("scheduleId", "==", scheduleId)
          .orderBy("date", "asc")
          .get();

        const allShifts = shiftsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];

        // Prepare shifts for assignment service
        const shiftsForAssignment: ShiftForAssignment[] = allShifts.map(
          (shift) => ({
            id: shift.id,
            date: shift.date?.toDate?.() || shift.date,
            time: shift.time,
            points: shift.points || 1,
            status: shift.status,
            assignedTo: shift.assignedTo,
          }),
        );

        // Prepare members for assignment service with historical points
        const membersForAssignment: MemberForAssignment[] = members.map(
          (member) => ({
            userId: member.id,
            displayName: member.displayName,
            email: member.email,
            historicalPoints: historicalPoints?.[member.id] || 0,
            availability: member.availability,
            limits: member.limits,
          }),
        );

        // Prepare config for assignment service
        const assignmentConfig: AssignmentConfig = {
          holidayMultiplier: config?.holidayMultiplier,
          preferenceBonus: config?.preferenceBonus,
          memoryHorizonDays: config?.memoryHorizonDays,
        };

        // Run the fairness-based auto-assignment algorithm
        const assignmentResults = autoAssignShifts(
          shiftsForAssignment,
          membersForAssignment,
          assignmentConfig,
        );

        // Apply assignments to database
        const batch = db.batch();

        for (const result of assignmentResults) {
          const shiftRef = db.collection("shifts").doc(result.shiftId);
          batch.update(shiftRef, {
            status: "assigned",
            assignedTo: result.assignedTo,
            assignedToName: result.assignedToName,
            assignedToEmail: result.assignedToEmail,
            pointsAwarded: result.pointsAwarded,
            isHolidayShift: result.isHoliday,
            assignedAt: new Date(),
            assignedBy: user.uid,
          });
        }

        await batch.commit();

        // Calculate summary statistics
        const summary = calculateAssignmentSummary(assignmentResults);
        const memberStats = Object.fromEntries(
          Array.from(summary.memberDistribution.entries()).map(
            ([userId, stats]) => [
              userId,
              {
                shiftsAssigned: stats.shifts,
                totalPoints: stats.points,
              },
            ],
          ),
        );

        return {
          assignedCount: summary.totalAssigned,
          totalShifts: shiftsForAssignment.filter(
            (s) => s.status === "unassigned",
          ).length,
          totalPointsAwarded: summary.totalPoints,
          holidayShifts: summary.holidayShifts,
          memberStats,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to auto-assign shifts");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to auto-assign shifts",
        });
      }
    },
  );

  // Delete schedule with cascade (hard delete)
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate, requireStableManagement()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const docRef = db.collection("schedules").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Schedule not found",
          });
        }

        const schedule = doc.data() as Schedule;
        const canManage = await canManageSchedules(user.uid, schedule.stableId);

        if (!canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this schedule",
          });
        }

        // Delete all shifts for this schedule
        const shiftsSnapshot = await db
          .collection("shifts")
          .where("scheduleId", "==", id)
          .get();

        const batch = db.batch();
        shiftsSnapshot.docs.forEach((shiftDoc) => {
          batch.delete(shiftDoc.ref);
        });

        // Delete the schedule
        batch.delete(docRef);

        await batch.commit();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete schedule",
        });
      }
    },
  );
}
