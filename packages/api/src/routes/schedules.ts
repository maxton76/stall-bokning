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

const createScheduleSchema = z.object({
  stableId: z.string().min(1),
  stallNumber: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  pricePerMonth: z.number().positive(),
});

const updateScheduleSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const publishScheduleSchema = z.object({
  userId: z.string().min(1),
});

const autoAssignSchema = z.object({
  members: z.array(
    z.object({
      id: z.string().min(1),
      displayName: z.string().min(1),
      email: z.string().email(),
      availability: z.any().optional(),
      limits: z.any().optional(),
    }),
  ),
  historicalPoints: z.record(z.number()).optional(),
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

        const snapshot = await db
          .collection("schedules")
          .where("stableId", "==", stableId)
          .where("status", "==", "confirmed")
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
          ...validation.data,
          startDate: new Date(validation.data.startDate),
          endDate: new Date(validation.data.endDate),
          userId: user.uid,
          status: "pending",
          createdAt: new Date(),
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
          schedule.userId !== user.uid &&
          !canManage &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this schedule",
          });
        }

        const updateData: Partial<Schedule> & { updatedAt: Date } = {
          status: validation.data.status,
          updatedAt: new Date(),
        };

        if (validation.data.startDate) {
          updateData.startDate = new Date(validation.data.startDate);
        }
        if (validation.data.endDate) {
          updateData.endDate = new Date(validation.data.endDate);
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
          schedule.userId !== user.uid &&
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

        const { members } = validation.data;

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

        // Auto-assignment logic (simplified - full logic would be in a service layer)
        const batch = db.batch();
        let assignmentCount = 0;

        const unassignedShifts = allShifts.filter(
          (s) => s.status === "unassigned",
        );
        const memberPoints = new Map(members.map((m) => [m.id, 0]));

        for (const shift of unassignedShifts) {
          let bestMemberId: string | null = null;
          let lowestPoints = Infinity;

          memberPoints.forEach((points, memberId) => {
            if (points < lowestPoints) {
              lowestPoints = points;
              bestMemberId = memberId;
            }
          });

          if (bestMemberId) {
            const member = members.find((m) => m.id === bestMemberId)!;
            const shiftRef = db.collection("shifts").doc(shift.id);

            batch.update(shiftRef, {
              status: "assigned",
              assignedTo: member.id,
              assignedToName: member.displayName,
              assignedToEmail: member.email,
            });

            memberPoints.set(
              bestMemberId,
              (memberPoints.get(bestMemberId) || 0) + (shift.points || 1),
            );
            assignmentCount++;
          }
        }

        await batch.commit();

        return {
          assignedCount: assignmentCount,
          totalShifts: unassignedShifts.length,
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
