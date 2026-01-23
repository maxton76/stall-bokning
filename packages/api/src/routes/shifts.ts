import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import { authenticate, requireStableManagement } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  canManageSchedules,
  canAccessStable,
  getUserAccessibleStableIds,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";

const batchCreateShiftsSchema = z.object({
  scheduleId: z.string().min(1),
  shifts: z.array(
    z.object({
      scheduleId: z.string().min(1),
      stableId: z.string().min(1),
      stableName: z.string().min(1),
      date: z.string().datetime(),
      time: z.string().min(1),
      points: z.number().positive(),
      status: z.enum(["unassigned", "assigned"]).default("unassigned"),
      assignedTo: z.string().nullable().optional(),
      assignedToName: z.string().nullable().optional(),
      assignedToEmail: z.string().nullable().optional(),
      // New routine-based fields (primary)
      routineTemplateId: z.string().min(1).optional(),
      routineTemplateName: z.string().min(1).optional(),
      // Legacy shift type fields (for backwards compatibility)
      shiftTypeId: z.string().min(1).optional(),
      shiftTypeName: z.string().min(1).optional(),
    }),
  ),
});

const assignShiftSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  userEmail: z.string().email(),
  assignerId: z.string().min(1).optional(),
});

const unassignShiftSchema = z.object({
  unassignerId: z.string().min(1).optional(),
});

const completeShiftSchema = z.object({
  notes: z.string().optional(),
});

const cancelShiftSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
});

const markMissedSchema = z.object({
  reason: z.string().optional(),
});

export async function shiftsRoutes(fastify: FastifyInstance) {
  // Get shifts with query parameters
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { scheduleId, stableId, stableIds, startDate, endDate, status } =
          request.query as {
            scheduleId?: string;
            stableId?: string;
            stableIds?: string;
            startDate?: string;
            endDate?: string;
            status?: string;
          };

        const user = (request as AuthenticatedRequest).user!;

        // Get user's accessible stables for authorization
        // System admins bypass this check
        let userAccessibleStableIds: string[] = [];
        if (user.role !== "system_admin") {
          userAccessibleStableIds = await getUserAccessibleStableIds(user.uid);
        }

        // Handle stableIds with status=published (query shifts from published schedules)
        if (stableIds && status === "published") {
          const ids = stableIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

          if (ids.length === 0) {
            return { shifts: [] };
          }

          if (ids.length > 10) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Cannot query more than 10 stables at once",
            });
          }

          // Authorization: Verify user has access to ALL requested stables
          // Return 404 for unauthorized access (prevents enumeration)
          if (user.role !== "system_admin") {
            for (const id of ids) {
              if (!userAccessibleStableIds.includes(id)) {
                return reply.status(404).send({ error: "Resource not found" });
              }
            }
          }

          // Step 1: Get published schedules for these stables
          const schedulesSnapshot = await db
            .collection("schedules")
            .where("stableId", "in", ids)
            .where("status", "==", "published")
            .get();

          const publishedScheduleIds = schedulesSnapshot.docs.map(
            (doc) => doc.id,
          );

          if (publishedScheduleIds.length === 0) {
            return { shifts: [] };
          }

          // Step 2: Get shifts for these schedules (handle >10 schedules)
          if (publishedScheduleIds.length > 10) {
            // Make multiple queries for >10 schedules (Firestore 'in' limit)
            const chunks: string[][] = [];
            for (let i = 0; i < publishedScheduleIds.length; i += 10) {
              chunks.push(publishedScheduleIds.slice(i, i + 10));
            }

            const queryPromises = chunks.map((chunk) =>
              db
                .collection("shifts")
                .where("scheduleId", "in", chunk)
                .orderBy("date", "asc")
                .get(),
            );

            const snapshots = await Promise.all(queryPromises);
            const shifts = snapshots.flatMap((snapshot) =>
              snapshot.docs.map((doc: any) =>
                serializeTimestamps({
                  id: doc.id,
                  ...doc.data(),
                }),
              ),
            );

            // Sort combined results by date (dates are now ISO strings)
            shifts.sort((a, b) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              return dateA.getTime() - dateB.getTime();
            });

            return { shifts };
          } else {
            const shiftsSnapshot = await db
              .collection("shifts")
              .where("scheduleId", "in", publishedScheduleIds)
              .orderBy("date", "asc")
              .get();

            const shifts = shiftsSnapshot.docs.map((doc: any) =>
              serializeTimestamps({
                id: doc.id,
                ...doc.data(),
              }),
            );

            return { shifts };
          }
        }

        // Standard query logic for other cases
        let query = db.collection("shifts");

        // Apply filters
        if (scheduleId) {
          query = query.where("scheduleId", "==", scheduleId) as any;
        }

        // Handle stableIds (multiple stables) or stableId (single stable)
        if (stableIds) {
          const ids = stableIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

          if (ids.length === 0) {
            return { shifts: [] };
          }

          if (ids.length > 10) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Cannot query more than 10 stables at once",
            });
          }

          // Authorization: Verify user has access to ALL requested stables
          // Return 404 for unauthorized access (prevents enumeration)
          if (user.role !== "system_admin") {
            for (const id of ids) {
              if (!userAccessibleStableIds.includes(id)) {
                return reply.status(404).send({ error: "Resource not found" });
              }
            }
          }

          query = query.where("stableId", "in", ids) as any;
        } else if (stableId) {
          // Authorization: Verify user has access to the requested stable
          // Return 404 for unauthorized access (prevents enumeration)
          if (
            user.role !== "system_admin" &&
            !userAccessibleStableIds.includes(stableId)
          ) {
            return reply.status(404).send({ error: "Resource not found" });
          }

          query = query.where("stableId", "==", stableId) as any;
        } else if (user.role !== "system_admin") {
          // No stable filter provided - restrict to user's accessible stables
          if (userAccessibleStableIds.length === 0) {
            return { shifts: [] };
          }
          // Firestore 'in' operator limit is 30, chunk if needed
          if (userAccessibleStableIds.length <= 30) {
            query = query.where(
              "stableId",
              "in",
              userAccessibleStableIds,
            ) as any;
          } else {
            // For users with access to many stables, require explicit stable filter
            return reply.status(400).send({
              error: "Bad Request",
              message:
                "Please specify stableId or stableIds parameter to filter results",
            });
          }
        }

        if (status && status !== "published") {
          query = query.where("status", "==", status) as any;
        }

        if (startDate && endDate) {
          query = query
            .where("date", ">=", new Date(startDate))
            .where("date", "<=", new Date(endDate)) as any;
        } else if (startDate) {
          query = query.where("date", ">=", new Date(startDate)) as any;
        } else if (endDate) {
          query = query.where("date", "<=", new Date(endDate)) as any;
        }

        // Always order by date
        query = query.orderBy("date", "asc") as any;

        const snapshot = await query.get();
        const shifts = snapshot.docs.map((doc: any) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { shifts };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch shifts");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch shifts",
        });
      }
    },
  );

  // Get unassigned shifts
  fastify.get(
    "/unassigned",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.query as { stableId?: string };
        const user = (request as AuthenticatedRequest).user!;

        // Get user's accessible stables for authorization
        // System admins bypass this check
        let userAccessibleStableIds: string[] = [];
        if (user.role !== "system_admin") {
          userAccessibleStableIds = await getUserAccessibleStableIds(user.uid);

          // If user has no accessible stables, return empty array
          if (userAccessibleStableIds.length === 0) {
            return { shifts: [] };
          }
        }

        let query = db.collection("shifts").where("status", "==", "unassigned");

        if (stableId) {
          // Authorization: Verify user has access to the requested stable
          // Return 404 for unauthorized access (prevents enumeration)
          if (
            user.role !== "system_admin" &&
            !userAccessibleStableIds.includes(stableId)
          ) {
            return reply.status(404).send({ error: "Resource not found" });
          }

          query = query.where("stableId", "==", stableId) as any;
        } else if (user.role !== "system_admin") {
          // No stable filter provided - restrict to user's accessible stables
          // Firestore 'in' operator limit is 30, chunk if needed
          if (userAccessibleStableIds.length <= 30) {
            query = query.where(
              "stableId",
              "in",
              userAccessibleStableIds,
            ) as any;
          } else {
            // For users with access to many stables, require explicit stable filter
            return reply.status(400).send({
              error: "Bad Request",
              message: "Please specify stableId parameter to filter results",
            });
          }
        }

        query = query.orderBy("date", "asc") as any;

        const snapshot = await query.get();
        const shifts = snapshot.docs.map((doc: any) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { shifts };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch unassigned shifts");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch unassigned shifts",
        });
      }
    },
  );

  // Batch create shifts
  // Note: We don't use requireStableManagement() here because stableId is in
  // the request body, not URL params. Authorization is done in the handler
  // by checking canManageSchedules() on the schedule's stableId.
  fastify.post(
    "/batch",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = batchCreateShiftsSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const { scheduleId, shifts } = validation.data;

        // Verify schedule exists and user has permission
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

        const schedule = scheduleDoc.data();
        const canManage = await canManageSchedules(
          user.uid,
          schedule?.stableId,
        );

        if (!canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create shifts for this schedule",
          });
        }

        // Batch create shifts (max 500 per batch due to Firestore limitation)
        const batchSize = 500;
        const batches = [];

        for (let i = 0; i < shifts.length; i += batchSize) {
          const batch = db.batch();
          const batchShifts = shifts.slice(i, i + batchSize);

          batchShifts.forEach((shift) => {
            const shiftRef = db.collection("shifts").doc();
            batch.set(shiftRef, {
              ...shift,
              date: new Date(shift.date),
            });
          });

          batches.push(batch.commit());
        }

        await Promise.all(batches);

        return reply.status(201).send({
          created: shifts.length,
          message: `Successfully created ${shifts.length} shifts`,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create shifts");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create shifts",
        });
      }
    },
  );

  // Assign shift
  // Note: We don't use requireStableAccess() because :id is the shift ID, not stable ID.
  // Authorization is done in the handler by checking stable membership and permissions.
  fastify.patch(
    "/:id/assign",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = assignShiftSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const shiftRef = db.collection("shifts").doc(id);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift not found",
          });
        }

        const shift = shiftDoc.data();
        const { userId, userName, userEmail } = validation.data;

        // Check stable membership (system admins bypass)
        if (user.role !== "system_admin") {
          const hasAccess = await canAccessStable(user.uid, shift?.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You are not a member of this stable",
            });
          }
        }

        // Members can self-assign, managers can assign anyone
        const canManage = await canManageSchedules(user.uid, shift?.stableId);
        const isSelfAssigning = userId === user.uid;

        if (!isSelfAssigning && !canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You can only assign shifts to yourself unless you are a manager",
          });
        }

        await shiftRef.update({
          status: "assigned",
          assignedTo: userId,
          assignedToName: userName,
          assignedToEmail: userEmail,
        });

        // TODO: Log shift assignment to audit log if assignerId provided

        const updatedDoc = await shiftRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to assign shift");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to assign shift",
        });
      }
    },
  );

  // Unassign shift
  // Note: We don't use requireStableAccess() because :id is the shift ID, not stable ID.
  // Authorization is done in the handler by checking stable membership and permissions.
  fastify.patch(
    "/:id/unassign",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = unassignShiftSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const shiftRef = db.collection("shifts").doc(id);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift not found",
          });
        }

        const shift = shiftDoc.data();

        // Check stable membership (system admins bypass)
        if (user.role !== "system_admin") {
          const hasAccess = await canAccessStable(user.uid, shift?.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You are not a member of this stable",
            });
          }
        }

        // Check permissions: members can unassign themselves, managers can unassign anyone
        const canManage = await canManageSchedules(user.uid, shift?.stableId);
        const isSelfUnassigning = shift?.assignedTo === user.uid;

        if (!isSelfUnassigning && !canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You can only unassign your own shifts unless you are a manager",
          });
        }

        await shiftRef.update({
          status: "unassigned",
          assignedTo: null,
          assignedToName: null,
          assignedToEmail: null,
        });

        // TODO: Log shift unassignment to audit log if unassignerId provided

        const updatedDoc = await shiftRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to unassign shift");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to unassign shift",
        });
      }
    },
  );

  // Complete shift - marks a shift as completed
  // Note: We don't use requireStableAccess() because :id is the shift ID, not stable ID.
  // Authorization is done in the handler by checking stable membership and permissions.
  fastify.patch(
    "/:id/complete",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = completeShiftSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const shiftRef = db.collection("shifts").doc(id);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift not found",
          });
        }

        const shift = shiftDoc.data();

        // Check stable membership (system admins bypass)
        if (user.role !== "system_admin") {
          const hasAccess = await canAccessStable(user.uid, shift?.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You are not a member of this stable",
            });
          }
        }

        // Only assigned shifts can be completed
        if (shift?.status !== "assigned") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Only assigned shifts can be marked as completed",
          });
        }

        // Check permissions: assigned user can complete their own shift, managers can complete any
        const canManage = await canManageSchedules(user.uid, shift?.stableId);
        const isAssignedUser = shift?.assignedTo === user.uid;

        if (!isAssignedUser && !canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You can only complete your own shifts unless you are a manager",
          });
        }

        await shiftRef.update({
          status: "completed",
          completedAt: new Date(),
          completedBy: user.uid,
          completionNotes: validation.data.notes || null,
        });

        const updatedDoc = await shiftRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to complete shift");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to complete shift",
        });
      }
    },
  );

  // Cancel shift - cancels a shift with a reason
  // Note: We don't use requireStableAccess() because :id is the shift ID, not stable ID.
  // Authorization is done in the handler by checking stable membership and permissions.
  fastify.patch(
    "/:id/cancel",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = cancelShiftSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const shiftRef = db.collection("shifts").doc(id);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift not found",
          });
        }

        const shift = shiftDoc.data();

        // Check stable membership (system admins bypass)
        if (user.role !== "system_admin") {
          const hasAccess = await canAccessStable(user.uid, shift?.stableId);
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You are not a member of this stable",
            });
          }
        }

        // Cannot cancel completed or already cancelled shifts
        if (shift?.status === "completed" || shift?.status === "cancelled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot cancel a shift that is already ${shift?.status}`,
          });
        }

        // Check permissions: assigned user can cancel their own shift, managers can cancel any
        const canManage = await canManageSchedules(user.uid, shift?.stableId);
        const isAssignedUser = shift?.assignedTo === user.uid;
        const isUnassigned = shift?.status === "unassigned";

        // Managers can cancel any shift, assigned users can cancel their own
        if (
          !isUnassigned &&
          !isAssignedUser &&
          !canManage &&
          user.role !== "system_admin"
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You can only cancel your own shifts unless you are a manager",
          });
        }

        await shiftRef.update({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: user.uid,
          cancellationReason: validation.data.reason,
        });

        const updatedDoc = await shiftRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to cancel shift");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to cancel shift",
        });
      }
    },
  );

  // Mark shift as missed - managers only
  fastify.patch(
    "/:id/missed",
    {
      preHandler: [authenticate, requireStableManagement()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = markMissedSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const shiftRef = db.collection("shifts").doc(id);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift not found",
          });
        }

        const shift = shiftDoc.data();

        // Only assigned shifts can be marked as missed
        if (shift?.status !== "assigned") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Only assigned shifts can be marked as missed",
          });
        }

        // Only managers can mark shifts as missed (already enforced by requireStableManagement)
        const canManage = await canManageSchedules(user.uid, shift?.stableId);
        if (!canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Only managers can mark shifts as missed",
          });
        }

        await shiftRef.update({
          status: "missed",
          markedMissedAt: new Date(),
          markedMissedBy: user.uid,
          missedReason: validation.data.reason || null,
        });

        const updatedDoc = await shiftRef.get();
        return serializeTimestamps({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to mark shift as missed");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to mark shift as missed",
        });
      }
    },
  );

  // Delete shift
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate, requireStableManagement()],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const shiftRef = db.collection("shifts").doc(id);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Shift not found",
          });
        }

        const shift = shiftDoc.data();
        const canManage = await canManageSchedules(user.uid, shift?.stableId);

        if (!canManage && user.role !== "system_admin") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this shift",
          });
        }

        await shiftRef.delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete shift");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete shift",
        });
      }
    },
  );
}
