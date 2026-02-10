import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkSubscriptionLimit } from "../middleware/checkSubscriptionLimit.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  hasStableAccess,
  hasOrganizationAccess,
} from "../utils/authorization.js";
import { generateRoutineInstances } from "../utils/routineInstanceGenerator.js";
import {
  createRoutineScheduleSchema,
  updateRoutineScheduleSchema,
  listRoutineSchedulesQuerySchema,
  toggleRoutineScheduleSchema,
} from "../schemas/routine-schedules.js";
import type {
  RoutineSchedule,
  RoutineTemplate,
  CreateRoutineScheduleInput,
  UpdateRoutineScheduleInput,
  ListRoutineSchedulesQuery,
} from "@equiduty/shared";

/**
 * Get stable name by ID
 */
async function getStableName(stableId: string): Promise<string | undefined> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (stableDoc.exists) {
    return stableDoc.data()?.name;
  }
  return undefined;
}

/**
 * Get user display name by ID
 */
async function getUserDisplayName(userId: string): Promise<string | undefined> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    return data?.displayName || data?.email || undefined;
  }
  return undefined;
}

export async function routineSchedulesRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // ROUTINE SCHEDULES CRUD
  // ============================================================================

  /**
   * GET /api/v1/routine-schedules
   * Get all routine schedules (with optional filters)
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as Record<string, string>;

        // Parse and validate query parameters
        const parsedQuery = listRoutineSchedulesQuerySchema.safeParse(query);
        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid query parameters",
            details: parsedQuery.error.issues,
          });
        }

        const queryData = parsedQuery.data as ListRoutineSchedulesQuery;

        // At least stableId is required
        if (!queryData.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId query parameter is required",
          });
        }

        // Check stable access
        const hasAccess = await hasStableAccess(
          queryData.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        let dbQuery = db
          .collection("routineSchedules")
          .where("stableId", "==", queryData.stableId);

        if (queryData.templateId) {
          dbQuery = dbQuery.where(
            "templateId",
            "==",
            queryData.templateId,
          ) as any;
        }
        if (queryData.isEnabled !== undefined) {
          dbQuery = dbQuery.where(
            "isEnabled",
            "==",
            queryData.isEnabled,
          ) as any;
        }

        const limit = queryData.limit ?? 50;
        const offset = queryData.offset ?? 0;

        const snapshot = await dbQuery
          .orderBy("createdAt", "desc")
          .offset(offset)
          .limit(limit)
          .get();

        const schedules = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { schedules };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch routine schedules");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine schedules",
        });
      }
    },
  );

  /**
   * GET /api/v1/routine-schedules/:id
   * Get a single routine schedule
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

        const doc = await db.collection("routineSchedules").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine schedule not found",
          });
        }

        const data = doc.data() as RoutineSchedule;

        // Check stable access
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this schedule",
          });
        }

        return serializeTimestamps({ ...data, id: doc.id });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch routine schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine schedule",
        });
      }
    },
  );

  /**
   * POST /api/v1/routine-schedules
   * Create a new routine schedule
   */
  fastify.post(
    "/",
    {
      preHandler: [
        authenticate,
        checkSubscriptionLimit("routineSchedules", "routineSchedules"),
      ],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const parsed = createRoutineScheduleSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const input = parsed.data as CreateRoutineScheduleInput;

        // Check organization access
        const hasOrgAccess = await hasOrganizationAccess(
          user.uid,
          input.organizationId,
        );
        if (!hasOrgAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create schedules in this organization",
          });
        }

        // Check stable access
        const hasStableAcc = await hasStableAccess(
          input.stableId,
          user.uid,
          user.role,
        );
        if (!hasStableAcc) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create schedules in this stable",
          });
        }

        // Validate customAssignments - ensure all user IDs are members with stable access
        if (input.customAssignments) {
          const userIds = Object.values(input.customAssignments).filter(
            (id): id is string => id !== null,
          );

          for (const userId of userIds) {
            // Check if user is an active member of the organization
            const memberDoc = await db
              .collection("organizationMembers")
              .doc(`${userId}_${input.organizationId}`)
              .get();

            if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
              return reply.status(400).send({
                error: "Bad Request",
                message: `User ${userId} is not an active member of this organization`,
              });
            }

            // Verify the member has access to this specific stable
            const memberData = memberDoc.data();
            const hasStableAccess =
              memberData?.stableAccess === "all" ||
              (memberData?.stableAccess === "specific" &&
                memberData?.assignedStableIds?.includes(input.stableId));

            if (!hasStableAccess) {
              return reply.status(400).send({
                error: "Bad Request",
                message: `User ${userId} does not have access to this stable`,
              });
            }
          }
        }

        // Get the template to denormalize data
        const templateDoc = await db
          .collection("routineTemplates")
          .doc(input.templateId)
          .get();
        if (!templateDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine template not found",
          });
        }

        const template = templateDoc.data() as RoutineTemplate;

        // Get stable name
        const stableName = await getStableName(input.stableId);

        // Get default assignee name if provided
        let defaultAssignedToName: string | undefined;
        if (input.defaultAssignedTo) {
          defaultAssignedToName = await getUserDisplayName(
            input.defaultAssignedTo,
          );
        }

        // Get creator name
        const createdByName = await getUserDisplayName(user.uid);

        const now = Timestamp.now();
        const scheduleData: Omit<RoutineSchedule, "id"> = {
          organizationId: input.organizationId,
          stableId: input.stableId,
          templateId: input.templateId,

          // Denormalized
          templateName: template.name,
          templateType: template.type,
          templateColor: template.color,
          stableName,

          // Schedule identity
          name: input.name,

          // Schedule configuration
          startDate: Timestamp.fromDate(new Date(input.startDate)),
          endDate: input.endDate
            ? Timestamp.fromDate(new Date(input.endDate))
            : undefined,
          repeatPattern: input.repeatPattern,
          repeatDays: input.repeatDays,
          includeHolidays: input.includeHolidays,
          scheduledStartTime: input.scheduledStartTime,

          // Assignment configuration
          assignmentMode: input.assignmentMode,
          defaultAssignedTo: input.defaultAssignedTo,
          defaultAssignedToName,
          customAssignments: input.customAssignments,

          // Status
          isEnabled: true,

          // Audit
          createdAt: now,
          createdBy: user.uid,
          createdByName,
          updatedAt: now,
        };

        const docRef = await db
          .collection("routineSchedules")
          .add(scheduleData);

        // Generate routine instances directly (not relying on Cloud Function trigger)
        let instancesGenerated = 0;
        if (input.endDate) {
          try {
            instancesGenerated = await generateRoutineInstances(
              docRef.id,
              {
                organizationId: input.organizationId,
                stableId: input.stableId,
                templateId: input.templateId,
                stableName,
                startDate: input.startDate,
                endDate: input.endDate,
                repeatPattern: input.repeatPattern,
                repeatDays: input.repeatDays,
                includeHolidays: input.includeHolidays,
                scheduledStartTime: input.scheduledStartTime,
                assignmentMode: input.assignmentMode,
                defaultAssignedTo: input.defaultAssignedTo,
                defaultAssignedToName,
                customAssignments: input.customAssignments,
              },
              {
                id: templateDoc.id,
                name: template.name,
                estimatedDuration: template.estimatedDuration,
                pointsValue: template.pointsValue,
                steps: template.steps,
              },
            );
          } catch (genError) {
            request.log.error(
              { error: genError, scheduleId: docRef.id },
              "Failed to generate routine instances",
            );
            // Schedule was created successfully - don't fail the request
            // Instances can be regenerated later
          }
        }

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...scheduleData,
            instancesGenerated,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create routine schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create routine schedule",
        });
      }
    },
  );

  /**
   * PUT /api/v1/routine-schedules/:id
   * Update a routine schedule
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
        const parsed = updateRoutineScheduleSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const doc = await db.collection("routineSchedules").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine schedule not found",
          });
        }

        const data = doc.data() as RoutineSchedule;

        // Check stable access
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this schedule",
          });
        }

        const input = parsed.data as UpdateRoutineScheduleInput;
        const updatedByName = await getUserDisplayName(user.uid);

        const updateData: Record<string, unknown> = {
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
          updatedByName,
        };

        // Handle optional fields
        if (input.name !== undefined) {
          updateData.name = input.name;
        }
        if (input.startDate !== undefined) {
          updateData.startDate = Timestamp.fromDate(new Date(input.startDate));
        }
        if (input.endDate !== undefined) {
          updateData.endDate =
            input.endDate === null
              ? null
              : Timestamp.fromDate(new Date(input.endDate));
        }
        if (input.repeatPattern !== undefined) {
          updateData.repeatPattern = input.repeatPattern;
        }
        if (input.repeatDays !== undefined) {
          updateData.repeatDays = input.repeatDays;
        }
        if (input.includeHolidays !== undefined) {
          updateData.includeHolidays = input.includeHolidays;
        }
        if (input.scheduledStartTime !== undefined) {
          updateData.scheduledStartTime = input.scheduledStartTime;
        }
        if (input.assignmentMode !== undefined) {
          updateData.assignmentMode = input.assignmentMode;
        }
        if (input.defaultAssignedTo !== undefined) {
          updateData.defaultAssignedTo =
            input.defaultAssignedTo === null ? null : input.defaultAssignedTo;
          if (input.defaultAssignedTo) {
            updateData.defaultAssignedToName = await getUserDisplayName(
              input.defaultAssignedTo,
            );
          } else {
            updateData.defaultAssignedToName = null;
          }
        }
        if (input.isEnabled !== undefined) {
          updateData.isEnabled = input.isEnabled;
        }

        // Validate that custom pattern has at least days or holidays
        const mergedPattern = (updateData.repeatPattern ?? data.repeatPattern) as string;
        if (mergedPattern === "custom") {
          const mergedDays = (updateData.repeatDays ?? data.repeatDays) as number[] | undefined;
          const mergedHolidays = (updateData.includeHolidays ?? data.includeHolidays) as boolean | undefined;
          const hasDays = mergedDays && mergedDays.length > 0;
          const hasHolidays = mergedHolidays === true;
          if (!hasDays && !hasHolidays) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Custom pattern requires at least one day or holidays to be selected",
            });
          }
        }

        await db.collection("routineSchedules").doc(id).update(updateData);

        const updated = await db.collection("routineSchedules").doc(id).get();

        return serializeTimestamps({
          id: updated.id,
          ...updated.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update routine schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update routine schedule",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/routine-schedules/:id
   * Delete a routine schedule
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("routineSchedules").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine schedule not found",
          });
        }

        const data = doc.data() as RoutineSchedule;

        // Check stable access
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this schedule",
          });
        }

        // Hard delete
        await db.collection("routineSchedules").doc(id).delete();

        return { success: true, message: "Schedule deleted" };
      } catch (error) {
        request.log.error({ error }, "Failed to delete routine schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete routine schedule",
        });
      }
    },
  );

  /**
   * POST /api/v1/routine-schedules/:id/toggle
   * Quick toggle enable/disable for a routine schedule
   */
  fastify.post(
    "/:id/toggle",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const parsed = toggleRoutineScheduleSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const doc = await db.collection("routineSchedules").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine schedule not found",
          });
        }

        const data = doc.data() as RoutineSchedule;

        // Check stable access
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to toggle this schedule",
          });
        }

        const updatedByName = await getUserDisplayName(user.uid);

        await db.collection("routineSchedules").doc(id).update({
          isEnabled: parsed.data.isEnabled,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
          updatedByName,
        });

        const updated = await db.collection("routineSchedules").doc(id).get();

        return serializeTimestamps({
          id: updated.id,
          ...updated.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to toggle routine schedule");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to toggle routine schedule",
        });
      }
    },
  );
}
