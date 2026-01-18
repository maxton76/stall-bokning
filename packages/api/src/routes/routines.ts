import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  hasStableAccess,
  hasOrganizationAccess,
} from "../utils/authorization.js";
import {
  createRoutineTemplateSchema,
  updateRoutineTemplateSchema,
  createRoutineInstanceSchema,
  startRoutineSchema,
  updateStepProgressSchema,
  completeRoutineSchema,
  listRoutineTemplatesQuerySchema,
  listRoutineInstancesQuerySchema,
} from "../schemas/routines.js";
import type {
  RoutineTemplate,
  RoutineInstance,
  RoutineProgress,
  StepProgress,
  RoutineStep,
  RoutineInstanceStatus,
} from "@stall-bokning/shared";

export async function routinesRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // ROUTINE TEMPLATES CRUD
  // ============================================================================

  /**
   * GET /api/v1/routines/templates
   * Get all routine templates for an organization (query params version)
   */
  fastify.get(
    "/templates",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as Record<string, string>;

        const organizationId = query.organizationId;
        if (!organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "organizationId query parameter is required",
          });
        }

        const hasAccess = await hasOrganizationAccess(user.uid, organizationId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this organization",
          });
        }

        // Parse query parameters
        const activeOnly = query.activeOnly === "true";
        const stableId = query.stableId;

        let dbQuery = db
          .collection("routineTemplates")
          .where("organizationId", "==", organizationId);

        if (activeOnly) {
          dbQuery = dbQuery.where("isActive", "==", true) as any;
        }
        if (stableId) {
          dbQuery = dbQuery.where("stableId", "==", stableId) as any;
        }

        const snapshot = await dbQuery.orderBy("name", "asc").get();

        const templates = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { templates };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch routine templates");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine templates",
        });
      }
    },
  );

  /**
   * GET /api/v1/routines/templates/organization/:orgId
   * Get all routine templates for an organization
   */
  fastify.get(
    "/templates/organization/:orgId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { orgId } = request.params as { orgId: string };
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as Record<string, string>;

        const hasAccess = await hasOrganizationAccess(user.uid, orgId);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this organization",
          });
        }

        // Parse and validate query parameters
        const parsedQuery = listRoutineTemplatesQuerySchema.safeParse(query);
        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid query parameters",
            details: parsedQuery.error.issues,
          });
        }

        let dbQuery = db
          .collection("routineTemplates")
          .where("organizationId", "==", orgId);

        if (parsedQuery.data.type) {
          dbQuery = dbQuery.where("type", "==", parsedQuery.data.type) as any;
        }
        if (parsedQuery.data.isActive !== undefined) {
          dbQuery = dbQuery.where(
            "isActive",
            "==",
            parsedQuery.data.isActive,
          ) as any;
        }
        if (parsedQuery.data.stableId) {
          dbQuery = dbQuery.where(
            "stableId",
            "==",
            parsedQuery.data.stableId,
          ) as any;
        }

        const snapshot = await dbQuery.orderBy("name", "asc").get();

        const templates = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { routineTemplates: templates };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch routine templates");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine templates",
        });
      }
    },
  );

  /**
   * GET /api/v1/routines/templates/:id
   * Get a single routine template
   */
  fastify.get(
    "/templates/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("routineTemplates").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine template not found",
          });
        }

        const data = doc.data() as RoutineTemplate;
        const hasAccess = await hasOrganizationAccess(
          user.uid,
          data.organizationId,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this template",
          });
        }

        return serializeTimestamps({ ...data, id: doc.id });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch routine template");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine template",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/templates
   * Create a new routine template
   */
  fastify.post(
    "/templates",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const parsed = createRoutineTemplateSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const input = parsed.data;

        // Check organization access
        const hasAccess = await hasOrganizationAccess(
          user.uid,
          input.organizationId,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create templates in this organization",
          });
        }

        // Generate IDs for steps
        const stepsWithIds: RoutineStep[] = input.steps.map((step, index) => ({
          ...step,
          id: uuidv4(),
          order: index + 1,
        }));

        const now = Timestamp.now();
        const templateData: Omit<RoutineTemplate, "id"> = {
          organizationId: input.organizationId,
          stableId: input.stableId,
          name: input.name,
          description: input.description,
          type: input.type,
          icon: input.icon,
          color: input.color,
          defaultStartTime: input.defaultStartTime,
          estimatedDuration: input.estimatedDuration,
          steps: stepsWithIds,
          requiresNotesRead: input.requiresNotesRead ?? true,
          allowSkipSteps: input.allowSkipSteps ?? true,
          pointsValue: input.pointsValue ?? 1,
          isActive: true,
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
        };

        const docRef = await db
          .collection("routineTemplates")
          .add(templateData);

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...templateData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create routine template");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create routine template",
        });
      }
    },
  );

  /**
   * PUT /api/v1/routines/templates/:id
   * Update a routine template
   */
  fastify.put(
    "/templates/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const parsed = updateRoutineTemplateSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const doc = await db.collection("routineTemplates").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine template not found",
          });
        }

        const data = doc.data() as RoutineTemplate;
        const hasAccess = await hasOrganizationAccess(
          user.uid,
          data.organizationId,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this template",
          });
        }

        const input = parsed.data;
        const updateData: Record<string, unknown> = {
          ...input,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        // If steps are provided, generate IDs for new steps
        if (input.steps) {
          updateData.steps = input.steps.map((step, index) => ({
            ...step,
            id: uuidv4(),
            order: index + 1,
          }));
        }

        await db.collection("routineTemplates").doc(id).update(updateData);

        const updated = await db.collection("routineTemplates").doc(id).get();

        return serializeTimestamps({
          id: updated.id,
          ...updated.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update routine template");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update routine template",
        });
      }
    },
  );

  /**
   * DELETE /api/v1/routines/templates/:id
   * Delete (archive) a routine template
   */
  fastify.delete(
    "/templates/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("routineTemplates").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine template not found",
          });
        }

        const data = doc.data() as RoutineTemplate;
        const hasAccess = await hasOrganizationAccess(
          user.uid,
          data.organizationId,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this template",
          });
        }

        // Soft delete by marking inactive
        await db.collection("routineTemplates").doc(id).update({
          isActive: false,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        return { success: true, message: "Template archived" };
      } catch (error) {
        request.log.error({ error }, "Failed to delete routine template");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete routine template",
        });
      }
    },
  );

  // ============================================================================
  // ROUTINE INSTANCES
  // ============================================================================

  /**
   * GET /api/v1/routines/instances
   * Get routine instances for a stable (query params version)
   */
  fastify.get(
    "/instances",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as Record<string, string>;

        const stableId = query.stableId;
        if (!stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId query parameter is required",
          });
        }

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        let dbQuery = db
          .collection("routineInstances")
          .where("stableId", "==", stableId);

        // Filter by date if provided
        if (query.date) {
          const dateStart = new Date(query.date);
          dateStart.setHours(0, 0, 0, 0);
          const dateEnd = new Date(query.date);
          dateEnd.setHours(23, 59, 59, 999);

          dbQuery = dbQuery
            .where("scheduledDate", ">=", Timestamp.fromDate(dateStart))
            .where("scheduledDate", "<=", Timestamp.fromDate(dateEnd)) as any;
        }

        if (query.status) {
          dbQuery = dbQuery.where("status", "==", query.status) as any;
        }

        const snapshot = await dbQuery
          .orderBy("scheduledDate", "desc")
          .limit(50)
          .get();

        const instances = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { instances };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch routine instances");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine instances",
        });
      }
    },
  );

  /**
   * GET /api/v1/routines/instances/stable/:stableId
   * Get routine instances for a stable
   */
  fastify.get(
    "/instances/stable/:stableId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { stableId } = request.params as { stableId: string };
        const user = (request as AuthenticatedRequest).user!;
        const query = request.query as Record<string, string>;

        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this stable",
          });
        }

        const parsedQuery = listRoutineInstancesQuerySchema.safeParse(query);
        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid query parameters",
            details: parsedQuery.error.issues,
          });
        }

        let dbQuery = db
          .collection("routineInstances")
          .where("stableId", "==", stableId);

        if (parsedQuery.data.status) {
          dbQuery = dbQuery.where(
            "status",
            "==",
            parsedQuery.data.status,
          ) as any;
        }
        if (parsedQuery.data.assignedTo) {
          dbQuery = dbQuery.where(
            "assignedTo",
            "==",
            parsedQuery.data.assignedTo,
          ) as any;
        }
        if (parsedQuery.data.templateId) {
          dbQuery = dbQuery.where(
            "templateId",
            "==",
            parsedQuery.data.templateId,
          ) as any;
        }
        if (parsedQuery.data.startDate) {
          const startDate = new Date(parsedQuery.data.startDate);
          dbQuery = dbQuery.where(
            "scheduledDate",
            ">=",
            Timestamp.fromDate(startDate),
          ) as any;
        }
        if (parsedQuery.data.endDate) {
          const endDate = new Date(parsedQuery.data.endDate);
          endDate.setHours(23, 59, 59, 999);
          dbQuery = dbQuery.where(
            "scheduledDate",
            "<=",
            Timestamp.fromDate(endDate),
          ) as any;
        }

        const limit = parsedQuery.data.limit ?? 50;
        const offset = parsedQuery.data.offset ?? 0;

        const snapshot = await dbQuery
          .orderBy("scheduledDate", "desc")
          .offset(offset)
          .limit(limit)
          .get();

        const instances = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { routineInstances: instances };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch routine instances");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine instances",
        });
      }
    },
  );

  /**
   * GET /api/v1/routines/instances/:id
   * Get a single routine instance with full details
   */
  fastify.get(
    "/instances/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("routineInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine instance not found",
          });
        }

        const data = doc.data() as RoutineInstance;
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to access this routine",
          });
        }

        // Get the template to include step definitions
        const templateDoc = await db
          .collection("routineTemplates")
          .doc(data.templateId)
          .get();
        const template = templateDoc.exists
          ? (templateDoc.data() as RoutineTemplate)
          : null;

        // Exclude id from data since we're providing it explicitly from doc.id
        const { id: _existingId, ...restData } = data;
        return serializeTimestamps({
          id: doc.id,
          ...restData,
          template: template ? { steps: template.steps } : null,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch routine instance");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch routine instance",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/instances
   * Create a new routine instance
   */
  fastify.post(
    "/instances",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const parsed = createRoutineInstanceSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const input = parsed.data;

        // Check stable access
        const hasAccess = await hasStableAccess(
          input.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create routines in this stable",
          });
        }

        // Get the template
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

        // Initialize progress for all steps
        const stepProgress: Record<string, StepProgress> = {};
        template.steps.forEach((step) => {
          stepProgress[step.id] = {
            stepId: step.id,
            status: "pending",
          };
        });

        const initialProgress: RoutineProgress = {
          stepsCompleted: 0,
          stepsTotal: template.steps.length,
          percentComplete: 0,
          stepProgress,
        };

        const scheduledDate =
          typeof input.scheduledDate === "string"
            ? Timestamp.fromDate(new Date(input.scheduledDate))
            : Timestamp.fromDate(input.scheduledDate);

        const now = Timestamp.now();
        const instanceData: Omit<RoutineInstance, "id"> = {
          templateId: input.templateId,
          templateName: template.name,
          organizationId: template.organizationId,
          stableId: input.stableId,
          scheduledDate,
          scheduledStartTime: input.scheduledStartTime,
          estimatedDuration: template.estimatedDuration,
          assignedTo: input.assignedTo,
          assignmentType: input.assignedTo ? "manual" : "auto",
          status: "scheduled",
          progress: initialProgress,
          pointsValue: template.pointsValue,
          dailyNotesAcknowledged: false,
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
        };

        const docRef = await db
          .collection("routineInstances")
          .add(instanceData);

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...instanceData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create routine instance");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create routine instance",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/instances/:id/start
   * Start a routine (acknowledge daily notes)
   */
  fastify.post(
    "/instances/:id/start",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const parsed = startRoutineSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const doc = await db.collection("routineInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine instance not found",
          });
        }

        const data = doc.data() as RoutineInstance;
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to start this routine",
          });
        }

        if (data.status !== "scheduled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot start routine with status: ${data.status}`,
          });
        }

        const now = Timestamp.now();
        const updateData = {
          status: "started" as RoutineInstanceStatus,
          startedAt: now,
          dailyNotesAcknowledged: parsed.data.dailyNotesAcknowledged,
          dailyNotesAcknowledgedAt: parsed.data.dailyNotesAcknowledged
            ? now
            : null,
          currentStepId: data.progress.stepProgress
            ? Object.keys(data.progress.stepProgress)[0]
            : null,
          currentStepOrder: 1,
          updatedAt: now,
          updatedBy: user.uid,
        };

        await db.collection("routineInstances").doc(id).update(updateData);

        const updated = await db.collection("routineInstances").doc(id).get();

        return {
          instance: serializeTimestamps({ id: updated.id, ...updated.data() }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to start routine");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to start routine",
        });
      }
    },
  );

  /**
   * PUT /api/v1/routines/instances/:id/progress
   * Update step progress
   */
  fastify.put(
    "/instances/:id/progress",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const parsed = updateStepProgressSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const doc = await db.collection("routineInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine instance not found",
          });
        }

        const data = doc.data() as RoutineInstance;
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this routine",
          });
        }

        if (!["started", "in_progress"].includes(data.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot update progress for routine with status: ${data.status}`,
          });
        }

        const input = parsed.data;
        const now = Timestamp.now();

        // Update step progress
        const stepProgress = { ...data.progress.stepProgress };
        const currentStep = stepProgress[input.stepId] || {
          stepId: input.stepId,
          status: "pending",
        };

        if (input.status) {
          currentStep.status = input.status;
          if (input.status === "in_progress" && !currentStep.startedAt) {
            currentStep.startedAt = now;
          }
          if (input.status === "completed" || input.status === "skipped") {
            currentStep.completedAt = now;
          }
        }

        if (input.generalNotes) {
          currentStep.generalNotes = input.generalNotes;
        }

        if (input.photoUrls) {
          currentStep.photoUrls = input.photoUrls;
        }

        // Update horse progress if provided
        if (input.horseUpdates && input.horseUpdates.length > 0) {
          if (!currentStep.horseProgress) {
            currentStep.horseProgress = {};
          }

          for (const horseUpdate of input.horseUpdates) {
            const existing = currentStep.horseProgress[horseUpdate.horseId] || {
              horseId: horseUpdate.horseId,
              horseName: "", // Should be populated from horse data
              completed: false,
              skipped: false,
            };

            currentStep.horseProgress[horseUpdate.horseId] = {
              ...existing,
              ...horseUpdate,
              completedAt:
                horseUpdate.completed || horseUpdate.skipped
                  ? now
                  : existing.completedAt,
              completedBy:
                horseUpdate.completed || horseUpdate.skipped
                  ? user.uid
                  : existing.completedBy,
            };
          }

          // Calculate horse completion counts
          const horseEntries = Object.values(currentStep.horseProgress);
          currentStep.horsesCompleted = horseEntries.filter(
            (h) => h.completed || h.skipped,
          ).length;
          currentStep.horsesTotal = horseEntries.length;
        }

        stepProgress[input.stepId] = currentStep;

        // Calculate overall progress
        const stepEntries = Object.values(stepProgress);
        const stepsCompleted = stepEntries.filter(
          (s) => s.status === "completed" || s.status === "skipped",
        ).length;
        const percentComplete = Math.round(
          (stepsCompleted / stepEntries.length) * 100,
        );

        const updateData = {
          status: "in_progress" as RoutineInstanceStatus,
          "progress.stepProgress": stepProgress,
          "progress.stepsCompleted": stepsCompleted,
          "progress.percentComplete": percentComplete,
          currentStepId: input.stepId,
          updatedAt: now,
          updatedBy: user.uid,
        };

        await db.collection("routineInstances").doc(id).update(updateData);

        const updated = await db.collection("routineInstances").doc(id).get();

        return {
          instance: serializeTimestamps({ id: updated.id, ...updated.data() }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to update routine progress");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update routine progress",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/instances/:id/complete
   * Complete a routine
   */
  fastify.post(
    "/instances/:id/complete",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const parsed = completeRoutineSchema.safeParse(request.body);

        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const doc = await db.collection("routineInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine instance not found",
          });
        }

        const data = doc.data() as RoutineInstance;
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to complete this routine",
          });
        }

        if (!["started", "in_progress"].includes(data.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot complete routine with status: ${data.status}`,
          });
        }

        const now = Timestamp.now();
        const updateData = {
          status: "completed" as RoutineInstanceStatus,
          completedAt: now,
          completedBy: user.uid,
          "progress.stepsCompleted": data.progress.stepsTotal,
          "progress.percentComplete": 100,
          pointsAwarded: data.pointsValue,
          notes: parsed.data.notes,
          updatedAt: now,
          updatedBy: user.uid,
        };

        await db.collection("routineInstances").doc(id).update(updateData);

        // TODO: Award points to user through fairness algorithm
        // TODO: Send notification about completed routine

        const updated = await db.collection("routineInstances").doc(id).get();

        return {
          instance: serializeTimestamps({ id: updated.id, ...updated.data() }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to complete routine");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to complete routine",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/instances/:id/cancel
   * Cancel a routine
   */
  fastify.post(
    "/instances/:id/cancel",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const { reason } = request.body as { reason?: string };

        const doc = await db.collection("routineInstances").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine instance not found",
          });
        }

        const data = doc.data() as RoutineInstance;
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to cancel this routine",
          });
        }

        if (data.status === "completed" || data.status === "cancelled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot cancel routine with status: ${data.status}`,
          });
        }

        const now = Timestamp.now();
        await db.collection("routineInstances").doc(id).update({
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: user.uid,
          cancellationReason: reason,
          updatedAt: now,
          updatedBy: user.uid,
        });

        const updated = await db.collection("routineInstances").doc(id).get();

        return {
          instance: serializeTimestamps({ id: updated.id, ...updated.data() }),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to cancel routine");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to cancel routine",
        });
      }
    },
  );
}
