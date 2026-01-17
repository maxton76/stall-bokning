import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { hasStableAccess, canManageRecurring } from "../utils/authorization.js";
import {
  getUserNames,
  getHorseName,
  getHorseGroupName,
} from "../utils/denormalization.js";
import type {
  RecurringActivityStatus,
  ActivityInstanceStatus,
  CreateRecurringActivityInput,
  UpdateRecurringActivityInput,
  UpdateProgressInput,
} from "@stall-bokning/shared";

export async function recurringActivitiesRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // RECURRING ACTIVITY CRUD
  // ============================================================================

  /**
   * GET /api/v1/recurring-activities/stable/:stableId
   * Get all recurring activities for a stable
   */
  fastify.get(
    "/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const { status, category } = request.query as {
          status?: RecurringActivityStatus;
          category?: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        let query = db
          .collection("recurringActivities")
          .where("stableId", "==", stableId);

        if (status) {
          query = query.where("status", "==", status) as any;
        }
        if (category) {
          query = query.where("category", "==", category) as any;
        }

        const snapshot = await query.orderBy("title", "asc").get();

        const activities = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { recurringActivities: activities };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch recurring activities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch recurring activities",
        });
      }
    },
  );

  /**
   * GET /api/v1/recurring-activities/:id
   * Get a single recurring activity
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("recurringActivities").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Recurring activity not found",
          });
        }

        const data = doc.data()!;
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this activity",
          });
        }

        return serializeTimestamps({ id: doc.id, ...data });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch recurring activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch recurring activity",
        });
      }
    },
  );

  /**
   * POST /api/v1/recurring-activities
   * Create a new recurring activity
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const input = request.body as CreateRecurringActivityInput;

        // Validate required fields
        if (!input.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId is required",
          });
        }

        if (!input.title || !input.recurrenceRule || !input.timeOfDay) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "title, recurrenceRule, and timeOfDay are required",
          });
        }

        // Check permission
        const canManage = await canManageRecurring(
          input.stableId,
          user.uid,
          user.role,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create recurring activities",
          });
        }

        // Get stable info for denormalization
        const stableDoc = await db
          .collection("stables")
          .doc(input.stableId)
          .get();
        const stableName = stableDoc.exists
          ? stableDoc.data()?.name
          : undefined;
        const organizationId = stableDoc.exists
          ? stableDoc.data()?.organizationId
          : undefined;

        // Denormalize names
        const assignedToNames = input.assignedTo
          ? await getUserNames(input.assignedTo)
          : undefined;
        const rotationGroupNames = input.rotationGroup
          ? await getUserNames(input.rotationGroup)
          : undefined;
        const horseName = input.horseId
          ? await getHorseName(input.horseId)
          : undefined;
        const horseGroupName = input.horseGroupId
          ? await getHorseGroupName(input.horseGroupId)
          : undefined;

        const now = Timestamp.now();
        // Build doc data without explicit type to avoid Timestamp incompatibility
        const docData = {
          stableId: input.stableId,
          stableName,
          organizationId,
          title: input.title,
          description: input.description,
          category: input.category,
          color: input.color,
          icon: input.icon,
          activityTypeId: input.activityTypeId,
          recurrenceRule: input.recurrenceRule,
          timeOfDay: input.timeOfDay,
          duration: input.duration || 30,
          startDate: Timestamp.fromDate(new Date(input.startDate)),
          endDate: input.endDate
            ? Timestamp.fromDate(new Date(input.endDate))
            : undefined,
          assignmentMode: input.assignmentMode,
          assignedTo: input.assignedTo,
          assignedToNames,
          rotationGroup: input.rotationGroup,
          rotationGroupNames,
          currentRotationIndex: 0,
          horseId: input.horseId,
          horseName,
          appliesToAllHorses: input.appliesToAllHorses ?? false,
          horseGroupId: input.horseGroupId,
          horseGroupName,
          weight: input.weight ?? 1,
          isHolidayMultiplied: input.isHolidayMultiplied ?? false,
          generateDaysAhead: input.generateDaysAhead ?? 60,
          status: "active" as const,
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
          updatedBy: user.uid,
        };

        const docRef = await db.collection("recurringActivities").add(docData);

        return { id: docRef.id, ...serializeTimestamps(docData) };
      } catch (error) {
        request.log.error({ error }, "Failed to create recurring activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create recurring activity",
        });
      }
    },
  );

  /**
   * PUT /api/v1/recurring-activities/:id
   * Update a recurring activity
   */
  fastify.put(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const input = request.body as UpdateRecurringActivityInput;

        const doc = await db.collection("recurringActivities").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Recurring activity not found",
          });
        }

        const existing = doc.data()!;
        const canManage = await canManageRecurring(
          existing.stableId,
          user.uid,
          user.role,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this activity",
          });
        }

        // Build update data
        const updateData: any = {
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined)
          updateData.description = input.description;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.color !== undefined) updateData.color = input.color;
        if (input.icon !== undefined) updateData.icon = input.icon;
        if (input.recurrenceRule !== undefined)
          updateData.recurrenceRule = input.recurrenceRule;
        if (input.timeOfDay !== undefined)
          updateData.timeOfDay = input.timeOfDay;
        if (input.duration !== undefined) updateData.duration = input.duration;
        if (input.endDate !== undefined) {
          updateData.endDate = input.endDate
            ? Timestamp.fromDate(new Date(input.endDate))
            : null;
        }
        if (input.assignmentMode !== undefined)
          updateData.assignmentMode = input.assignmentMode;
        if (input.assignedTo !== undefined) {
          updateData.assignedTo = input.assignedTo;
          updateData.assignedToNames = await getUserNames(input.assignedTo);
        }
        if (input.rotationGroup !== undefined) {
          updateData.rotationGroup = input.rotationGroup;
          updateData.rotationGroupNames = await getUserNames(
            input.rotationGroup,
          );
        }
        if (input.horseId !== undefined) {
          updateData.horseId = input.horseId || null;
          updateData.horseName = input.horseId
            ? await getHorseName(input.horseId)
            : null;
        }
        if (input.appliesToAllHorses !== undefined)
          updateData.appliesToAllHorses = input.appliesToAllHorses;
        if (input.horseGroupId !== undefined) {
          updateData.horseGroupId = input.horseGroupId || null;
          updateData.horseGroupName = input.horseGroupId
            ? await getHorseGroupName(input.horseGroupId)
            : null;
        }
        if (input.weight !== undefined) updateData.weight = input.weight;
        if (input.isHolidayMultiplied !== undefined)
          updateData.isHolidayMultiplied = input.isHolidayMultiplied;
        if (input.generateDaysAhead !== undefined)
          updateData.generateDaysAhead = input.generateDaysAhead;
        if (input.status !== undefined) updateData.status = input.status;

        await db.collection("recurringActivities").doc(id).update(updateData);

        const updatedDoc = await db
          .collection("recurringActivities")
          .doc(id)
          .get();
        return serializeTimestamps({ id: updatedDoc.id, ...updatedDoc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to update recurring activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update recurring activity",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/recurring-activities/:id
   * Delete a recurring activity (and optionally its instances)
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { deleteInstances } = request.query as {
          deleteInstances?: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("recurringActivities").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Recurring activity not found",
          });
        }

        const existing = doc.data()!;
        const canManage = await canManageRecurring(
          existing.stableId,
          user.uid,
          user.role,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this activity",
          });
        }

        // Delete future instances if requested
        if (deleteInstances === "true") {
          const now = Timestamp.now();
          const instancesSnapshot = await db
            .collection("activityInstances")
            .where("recurringActivityId", "==", id)
            .where("scheduledDate", ">=", now)
            .get();

          const batch = db.batch();
          instancesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }

        await db.collection("recurringActivities").doc(id).delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete recurring activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete recurring activity",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/recurring-activities/:id/pause
   * Pause a recurring activity
   */
  fastify.patch(
    "/:id/pause",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("recurringActivities").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Recurring activity not found",
          });
        }

        const existing = doc.data()!;
        const canManage = await canManageRecurring(
          existing.stableId,
          user.uid,
          user.role,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to pause this activity",
          });
        }

        await db.collection("recurringActivities").doc(id).update({
          status: "paused",
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        const updatedDoc = await db
          .collection("recurringActivities")
          .doc(id)
          .get();
        return serializeTimestamps({ id: updatedDoc.id, ...updatedDoc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to pause recurring activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to pause recurring activity",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/recurring-activities/:id/resume
   * Resume a paused recurring activity
   */
  fastify.patch(
    "/:id/resume",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("recurringActivities").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Recurring activity not found",
          });
        }

        const existing = doc.data()!;
        const canManage = await canManageRecurring(
          existing.stableId,
          user.uid,
          user.role,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to resume this activity",
          });
        }

        await db.collection("recurringActivities").doc(id).update({
          status: "active",
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        const updatedDoc = await db
          .collection("recurringActivities")
          .doc(id)
          .get();
        return serializeTimestamps({ id: updatedDoc.id, ...updatedDoc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to resume recurring activity");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to resume recurring activity",
        });
      }
    },
  );

  // ============================================================================
  // ACTIVITY INSTANCES
  // ============================================================================

  /**
   * GET /api/v1/recurring-activities/instances/stable/:stableId
   * Get activity instances for a stable within a date range
   */
  fastify.get(
    "/instances/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const { startDate, endDate, status, assignedTo } = request.query as {
          startDate?: string;
          endDate?: string;
          status?: ActivityInstanceStatus;
          assignedTo?: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        let query = db
          .collection("activityInstances")
          .where("stableId", "==", stableId);

        if (startDate) {
          query = query.where(
            "scheduledDate",
            ">=",
            Timestamp.fromDate(new Date(startDate)),
          ) as any;
        }
        if (endDate) {
          query = query.where(
            "scheduledDate",
            "<=",
            Timestamp.fromDate(new Date(endDate)),
          ) as any;
        }
        if (status) {
          query = query.where("status", "==", status) as any;
        }
        if (assignedTo) {
          query = query.where("assignedTo", "==", assignedTo) as any;
        }

        query = query.orderBy("scheduledDate", "asc") as any;

        const snapshot = await query.get();

        const instances = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { instances };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch activity instances");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch activity instances",
        });
      }
    },
  );

  /**
   * GET /api/v1/recurring-activities/instances/my
   * Get activity instances assigned to the current user
   */
  fastify.get(
    "/instances/my",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { startDate, endDate, stableId } = request.query as {
          startDate?: string;
          endDate?: string;
          stableId?: string;
        };
        const user = (request as AuthenticatedRequest).user!;

        let query = db
          .collection("activityInstances")
          .where("assignedTo", "==", user.uid);

        if (stableId) {
          query = query.where("stableId", "==", stableId) as any;
        }
        if (startDate) {
          query = query.where(
            "scheduledDate",
            ">=",
            Timestamp.fromDate(new Date(startDate)),
          ) as any;
        }
        if (endDate) {
          query = query.where(
            "scheduledDate",
            "<=",
            Timestamp.fromDate(new Date(endDate)),
          ) as any;
        }

        query = query.orderBy("scheduledDate", "asc") as any;

        const snapshot = await query.get();

        const instances = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { instances };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch my activity instances");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch activity instances",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/recurring-activities/instances/:id/complete
   * Mark an activity instance as completed
   */
  fastify.patch(
    "/instances/:id/complete",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("activityInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity instance not found",
          });
        }

        const instance = doc.data()!;
        const hasAccess = await hasStableAccess(
          instance.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to complete this activity",
          });
        }

        await db.collection("activityInstances").doc(id).update({
          status: "completed",
          completedAt: Timestamp.now(),
          completedBy: user.uid,
          "progress.value": 100,
          "progress.source": "manual",
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        const updatedDoc = await db
          .collection("activityInstances")
          .doc(id)
          .get();
        return serializeTimestamps({ id: updatedDoc.id, ...updatedDoc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to complete activity instance");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to complete activity instance",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/recurring-activities/instances/:id/progress
   * Update progress on an activity instance
   */
  fastify.patch(
    "/instances/:id/progress",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { progress, checklistUpdates } =
          request.body as UpdateProgressInput;
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("activityInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity instance not found",
          });
        }

        const instance = doc.data()!;
        const hasAccess = await hasStableAccess(
          instance.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this activity",
          });
        }

        const updateData: any = {
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        // Update checklist items
        if (checklistUpdates && checklistUpdates.length > 0) {
          const currentChecklist = instance.checklist || [];
          const updatedChecklist = currentChecklist.map((item: any) => {
            const update = checklistUpdates.find((u) => u.itemId === item.id);
            if (update) {
              return {
                ...item,
                completed: update.completed,
                completedAt: update.completed ? Timestamp.now() : null,
                completedBy: update.completed ? user.uid : null,
              };
            }
            return item;
          });

          updateData.checklist = updatedChecklist;

          // Calculate progress from checklist
          const completedCount = updatedChecklist.filter(
            (item: any) => item.completed,
          ).length;
          const totalCount = updatedChecklist.length;
          const calculatedProgress =
            totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0;

          updateData.progress = {
            value: calculatedProgress,
            source: "calculated",
            displayText: `${completedCount} of ${totalCount}`,
            lastUpdatedAt: Timestamp.now(),
            lastUpdatedBy: user.uid,
          };

          // Auto-complete if all items done
          if (calculatedProgress === 100) {
            updateData.status = "completed";
            updateData.completedAt = Timestamp.now();
            updateData.completedBy = user.uid;
          }
        } else if (progress !== undefined) {
          // Manual progress update
          updateData.progress = {
            value: progress,
            source: "manual",
            lastUpdatedAt: Timestamp.now(),
            lastUpdatedBy: user.uid,
          };

          if (progress === 100) {
            updateData.status = "completed";
            updateData.completedAt = Timestamp.now();
            updateData.completedBy = user.uid;
          }
        }

        await db.collection("activityInstances").doc(id).update(updateData);

        const updatedDoc = await db
          .collection("activityInstances")
          .doc(id)
          .get();
        return serializeTimestamps({ id: updatedDoc.id, ...updatedDoc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to update activity progress");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update activity progress",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/recurring-activities/instances/:id/skip
   * Skip a specific instance (create exception)
   */
  fastify.patch(
    "/instances/:id/skip",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { reason } = request.body as { reason?: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("activityInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity instance not found",
          });
        }

        const instance = doc.data()!;
        const canManage = await canManageRecurring(
          instance.stableId,
          user.uid,
          user.role,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to skip this activity",
          });
        }

        await db.collection("activityInstances").doc(id).update({
          status: "skipped",
          isException: true,
          exceptionNote: reason,
          cancelledAt: Timestamp.now(),
          cancelledBy: user.uid,
          cancellationReason: reason,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        // Create exception record
        await db.collection("recurringActivityExceptions").add({
          recurringActivityId: instance.recurringActivityId,
          stableId: instance.stableId,
          exceptionDate: instance.scheduledDate,
          exceptionType: "skip",
          reason,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
        });

        const updatedDoc = await db
          .collection("activityInstances")
          .doc(id)
          .get();
        return serializeTimestamps({ id: updatedDoc.id, ...updatedDoc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to skip activity instance");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to skip activity instance",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/recurring-activities/instances/:id/assign
   * Assign or reassign an activity instance
   */
  fastify.patch(
    "/instances/:id/assign",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { assignedTo } = request.body as { assignedTo: string | null };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("activityInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Activity instance not found",
          });
        }

        const instance = doc.data()!;
        const canManage = await canManageRecurring(
          instance.stableId,
          user.uid,
          user.role,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to assign this activity",
          });
        }

        let assignedToName: string | null = null;
        if (assignedTo) {
          const names = await getUserNames([assignedTo]);
          assignedToName = names[0] || null;
        }

        await db
          .collection("activityInstances")
          .doc(id)
          .update({
            assignedTo: assignedTo || null,
            assignedToName,
            assignedAt: assignedTo ? Timestamp.now() : null,
            assignedBy: user.uid,
            updatedAt: Timestamp.now(),
            updatedBy: user.uid,
          });

        const updatedDoc = await db
          .collection("activityInstances")
          .doc(id)
          .get();
        return serializeTimestamps({ id: updatedDoc.id, ...updatedDoc.data() });
      } catch (error) {
        request.log.error({ error }, "Failed to assign activity instance");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to assign activity instance",
        });
      }
    },
  );
}
