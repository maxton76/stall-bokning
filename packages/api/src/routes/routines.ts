import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { db, auth, storage } from "../utils/firebase.js";
import {
  authenticate,
  requirePermission,
  type OrganizationContextRequest,
} from "../middleware/auth.js";
import { checkSubscriptionLimit } from "../middleware/checkSubscriptionLimit.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  hasStableAccess,
  hasOrganizationAccess,
} from "../utils/authorization.js";
import { hasPermission } from "../utils/permissionEngine.js";
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
  CreateHorseActivityHistoryInput,
  HorseFeedingContext,
  HorseMedicationContext,
  HorseBlanketContext,
  CreateRoutineTemplateInput,
  UpdateRoutineTemplateInput,
  CreateRoutineInstanceInput,
  UpdateStepProgressInput,
  ListRoutineTemplatesQuery,
  ListRoutineInstancesQuery,
} from "@equiduty/shared";
import {
  VALID_ENTITY_ID,
  ALLOWED_IMAGE_TYPES,
  holidayService,
} from "@equiduty/shared";
import {
  computeHolidayPoints,
  fetchHolidaySettings,
} from "../utils/holidayPoints.js";
import { sanitizeFileName } from "../utils/sanitization.js";
import {
  createActivityHistoryEntries,
  findExistingEntry,
  updateEntry,
  markRoutineEntriesCompleted,
} from "../services/horseActivityHistoryService.js";
import {
  getActiveSelectionProcessForStable,
  recordSelectionEntry,
  getCurrentTurnInfo,
} from "../services/selectionProcessService.js";

/**
 * Enrich routine instance with template data
 */
async function enrichInstanceWithTemplate(
  instanceId: string,
  instanceData: RoutineInstance,
): Promise<any> {
  const templateDoc = await db
    .collection("routineTemplates")
    .doc(instanceData.templateId)
    .get();

  const template = templateDoc.exists
    ? (templateDoc.data() as RoutineTemplate)
    : null;

  // Exclude id from instanceData to avoid duplicate property
  const { id: _existingId, ...restData } = instanceData;

  return serializeTimestamps({
    id: instanceId,
    ...restData,
    template: template
      ? {
          name: template.name,
          description: template.description,
          type: template.type,
          icon: template.icon,
          color: template.color,
          estimatedDuration: template.estimatedDuration,
          requiresNotesRead: template.requiresNotesRead,
          allowSkipSteps: template.allowSkipSteps,
          steps: template.steps,
        }
      : null,
  });
}

/**
 * Batch enrich routine instances with template data
 * Uses efficient batch fetching to avoid N+1 queries
 */
async function enrichInstancesWithTemplates(
  instances: Array<{ id: string; data: RoutineInstance }>,
): Promise<any[]> {
  if (instances.length === 0) return [];

  // Collect unique templateIds
  const uniqueTemplateIds = [
    ...new Set(instances.map((inst) => inst.data.templateId)),
  ];

  // Batch fetch templates using getAll()
  const templateMap = new Map<string, RoutineTemplate | null>();
  if (uniqueTemplateIds.length > 0) {
    const templateRefs = uniqueTemplateIds.map((id) =>
      db.collection("routineTemplates").doc(id),
    );
    const templateDocs = await db.getAll(...templateRefs);
    templateDocs.forEach((doc, index) => {
      templateMap.set(
        uniqueTemplateIds[index],
        doc.exists ? (doc.data() as RoutineTemplate) : null,
      );
    });
  }

  // Enrich each instance with its template
  return instances.map(({ id, data }) => {
    const template = templateMap.get(data.templateId);
    const { id: _existingId, ...restData } = data;
    return serializeTimestamps({
      id,
      ...restData,
      template: template
        ? {
            name: template.name,
            description: template.description,
            type: template.type,
            icon: template.icon,
            color: template.color,
            estimatedDuration: template.estimatedDuration,
            requiresNotesRead: template.requiresNotesRead,
            allowSkipSteps: template.allowSkipSteps,
            steps: template.steps,
          }
        : null,
    });
  });
}

/**
 * Resolve horses for a routine step based on its configuration
 */
async function resolveStepHorses(
  step: RoutineStep,
  stableId: string,
): Promise<{ id: string; name: string }[]> {
  // Handle "none" case
  if (step.horseContext === "none") {
    return [];
  }

  // Fetch all horses in the stable
  const horsesSnapshot = await db
    .collection("horses")
    .where("currentStableId", "==", stableId)
    .where("status", "==", "active")
    .get();

  let horses = horsesSnapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name as string,
  }));

  // Handle "all" case
  if (step.horseContext === "all") {
    // Apply exclusions if specified
    if (step.horseFilter?.excludeHorseIds?.length) {
      horses = horses.filter(
        (horse) => !step.horseFilter?.excludeHorseIds?.includes(horse.id),
      );
    }
    return horses;
  }

  // Handle "specific" case
  if (step.horseContext === "specific") {
    if (!step.horseFilter?.horseIds?.length) {
      return [];
    }
    return horses.filter((horse) =>
      step.horseFilter?.horseIds?.includes(horse.id),
    );
  }

  // Handle "groups" case
  if (step.horseContext === "groups") {
    if (!step.horseFilter?.groupIds?.length) {
      return [];
    }

    // Fetch horse groups
    const groupsSnapshot = await db
      .collection("horseGroups")
      .where("__name__", "in", step.horseFilter.groupIds)
      .get();

    // Collect horse IDs from groups
    const horseIdsInGroups = new Set<string>();
    groupsSnapshot.docs.forEach((doc) => {
      const groupData = doc.data();
      if (groupData.horseIds && Array.isArray(groupData.horseIds)) {
        groupData.horseIds.forEach((id: string) => horseIdsInGroups.add(id));
      }
    });

    horses = horses.filter((horse) => horseIdsInGroups.has(horse.id));

    // Apply exclusions if specified
    if (step.horseFilter?.excludeHorseIds?.length) {
      horses = horses.filter(
        (horse) => !step.horseFilter?.excludeHorseIds?.includes(horse.id),
      );
    }

    return horses;
  }

  return [];
}

/**
 * Fetch feeding context for a horse
 */
async function getHorseFeedingContext(
  horseId: string,
  stableId: string,
): Promise<HorseFeedingContext | undefined> {
  // Get active feedings for this horse
  const feedingsSnapshot = await db
    .collection("horseFeedings")
    .where("horseId", "==", horseId)
    .where("stableId", "==", stableId)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (feedingsSnapshot.empty) {
    return undefined;
  }

  const feeding = feedingsSnapshot.docs[0].data();

  // Get feed type name
  let feedTypeName = "Unknown feed";
  if (feeding.feedTypeId) {
    const feedTypeDoc = await db
      .collection("feedTypes")
      .doc(feeding.feedTypeId)
      .get();
    if (feedTypeDoc.exists) {
      feedTypeName = feedTypeDoc.data()!.name;
    }
  }

  return {
    feedTypeName,
    quantity: feeding.quantity || 0,
    quantityMeasure: feeding.quantityMeasure || "portion",
    specialInstructions: feeding.specialInstructions,
  };
}

/**
 * Fetch medication context for a horse (if they have active medications)
 */
async function getHorseMedicationContext(
  horseId: string,
): Promise<HorseMedicationContext | undefined> {
  // Check health records for active medications
  const medicationSnapshot = await db
    .collection("healthRecords")
    .where("horseId", "==", horseId)
    .where("recordType", "==", "medication")
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (medicationSnapshot.empty) {
    return undefined;
  }

  const medication = medicationSnapshot.docs[0].data();

  return {
    medicationName:
      medication.title || medication.medicationName || "Unknown medication",
    dosage: medication.dosage || "",
    administrationMethod: medication.administrationMethod || "oral",
    notes: medication.notes,
    isRequired: medication.isRequired !== false,
  };
}

/**
 * Fetch blanket context for a horse
 */
async function getHorseBlanketContext(
  horseId: string,
): Promise<HorseBlanketContext | undefined> {
  // Get horse data for blanket settings
  const horseDoc = await db.collection("horses").doc(horseId).get();
  if (!horseDoc.exists) {
    return undefined;
  }

  const horse = horseDoc.data()!;

  // If horse has blanket info
  if (horse.blanketInfo || horse.currentBlanket) {
    return {
      currentBlanket: horse.currentBlanket,
      recommendedAction: horse.blanketInfo?.recommendedAction || "none",
      targetBlanket: horse.blanketInfo?.targetBlanket,
      reason: horse.blanketInfo?.reason,
    };
  }

  return undefined;
}

/**
 * Create activity history entries for a completed step
 */
async function createStepActivityHistory(
  instance: RoutineInstance,
  template: RoutineTemplate,
  step: RoutineStep,
  stepProgress: StepProgress,
  executedBy: string,
  executedByName?: string,
): Promise<void> {
  // Resolve horses for this step
  const horses = await resolveStepHorses(step, instance.stableId);

  if (horses.length === 0) {
    return; // No horses in this step, nothing to record
  }

  const entries: CreateHorseActivityHistoryInput[] = [];

  for (const horse of horses) {
    // Check if there's an explicit update for this horse
    const horseProgress = stepProgress.horseProgress?.[horse.id];

    // Debug logging: Check photo URLs in horse progress
    console.log(`[PHOTO DEBUG] Creating history for horse ${horse.id}:`, {
      horseProgressPhotoUrls: horseProgress?.photoUrls,
      photoCount: horseProgress?.photoUrls?.length || 0,
    });

    // Determine execution status: explicit skip or default to completed
    const isSkipped = horseProgress?.skipped === true;
    const executionStatus = isSkipped ? "skipped" : "completed";

    // Fetch current context snapshots
    const feedingSnapshot = step.showFeeding
      ? await getHorseFeedingContext(horse.id, instance.stableId).then((ctx) =>
          ctx
            ? {
                instructions: ctx,
                confirmed: horseProgress?.feedingConfirmed ?? true,
              }
            : undefined,
        )
      : undefined;

    const medicationSnapshot = step.showMedication
      ? await getHorseMedicationContext(horse.id).then((ctx) =>
          ctx
            ? {
                instructions: ctx,
                given: horseProgress?.medicationGiven ?? !isSkipped,
                skipped: horseProgress?.medicationSkipped ?? isSkipped,
                skipReason: horseProgress?.skipReason,
              }
            : undefined,
        )
      : undefined;

    const blanketSnapshot = step.showBlanketStatus
      ? await getHorseBlanketContext(horse.id).then((ctx) =>
          ctx
            ? {
                instructions: ctx,
                action: horseProgress?.blanketAction ?? "unchanged",
              }
            : undefined,
        )
      : undefined;

    // Check for existing entry (re-opening scenario)
    const existingEntry = await findExistingEntry(
      instance.id,
      step.id,
      horse.id,
    );

    if (existingEntry) {
      // Update existing entry
      await updateEntry(existingEntry.id, {
        executionStatus,
        skipReason: horseProgress?.skipReason,
        notes: horseProgress?.notes,
        photoUrls: horseProgress?.photoUrls,
        feedingSnapshot,
        medicationSnapshot,
        blanketSnapshot,
      });
    } else {
      // Create new entry
      entries.push({
        horseId: horse.id,
        routineInstanceId: instance.id,
        routineStepId: step.id,
        organizationId: instance.organizationId,
        stableId: instance.stableId,
        horseName: horse.name,
        stableName: instance.stableName,
        routineTemplateName: template.name,
        routineType: template.type,
        stepName: step.name,
        category: step.category,
        stepOrder: step.order,
        executionStatus,
        executedBy,
        executedByName,
        scheduledDate: instance.scheduledDate,
        skipReason: horseProgress?.skipReason,
        notes: horseProgress?.notes,
        photoUrls: horseProgress?.photoUrls,
        feedingSnapshot,
        medicationSnapshot,
        blanketSnapshot,
        horseContextSnapshot: step.showSpecialInstructions
          ? {
              specialInstructions: horseProgress?.notes,
            }
          : undefined,
      });
    }
  }

  // Batch create new entries
  if (entries.length > 0) {
    await createActivityHistoryEntries(entries);
  }
}

export async function routinesRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // ROUTINE TEMPLATES CRUD
  // ============================================================================

  /**
   * GET /api/v1/routines/templates
   * Get all routine templates for an organization (query params version)
   * Requires: manage_routines permission
   */
  fastify.get(
    "/templates",
    {
      preHandler: [authenticate, requirePermission("manage_routines", "query")],
    },
    async (request, reply) => {
      try {
        const query = request.query as Record<string, string>;
        // organizationId verified and attached by requirePermission middleware
        const organizationId = (request as OrganizationContextRequest)
          .organizationId!;

        // Parse query parameters
        const activeOnly = query.activeOnly === "true";
        const stableId = query.stableId;

        // Build base query for organization
        let dbQuery = db
          .collection("routineTemplates")
          .where("organizationId", "==", organizationId);

        if (activeOnly) {
          dbQuery = dbQuery.where("isActive", "==", true) as any;
        }

        // Don't add stableId filter at query level - fetch all templates
        // We'll filter in-memory to include both specific stable and "all stables"
        const snapshot = await dbQuery.orderBy("name", "asc").get();

        // Filter in-memory to include templates for specific stable AND "all stables"
        const templates = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as RoutineTemplate)
          .filter((template) => {
            // If no stableId filter requested, return all
            if (!stableId) return true;

            // Include if template is for "all stables" (stableId is null/undefined) OR matches specific stable
            return !template.stableId || template.stableId === stableId;
          })
          .map((template) => serializeTimestamps(template));

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

        const queryData = parsedQuery.data as ListRoutineTemplatesQuery;
        let dbQuery = db
          .collection("routineTemplates")
          .where("organizationId", "==", orgId);

        if (queryData.type) {
          dbQuery = dbQuery.where("type", "==", queryData.type) as any;
        }
        if (queryData.isActive !== undefined) {
          dbQuery = dbQuery.where("isActive", "==", queryData.isActive) as any;
        }
        if (queryData.stableId) {
          dbQuery = dbQuery.where("stableId", "==", queryData.stableId) as any;
        }

        const snapshot = await dbQuery.orderBy("name", "asc").get();

        // Filter out deleted templates (those with deletedAt field set)
        // NOTE: We do this in application code because Firestore treats missing fields
        // differently from null values, and existing templates don't have deletedAt field
        const templates = snapshot.docs
          .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            const data = doc.data();
            return serializeTimestamps({
              id: doc.id,
              ...data,
            });
          })
          .filter((template: any) => !template.deletedAt); // Exclude templates with deletedAt set

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
   * Requires: manage_routines permission
   */
  fastify.post(
    "/templates",
    {
      preHandler: [
        authenticate,
        requirePermission("manage_routines", "body"),
        checkSubscriptionLimit("routineTemplates", "routineTemplates"),
      ],
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

        const input = parsed.data as CreateRoutineTemplateInput;
        // organizationId verified and permission checked by requirePermission middleware

        // Generate IDs for steps
        const stepsWithIds = input.steps.map((step, index) => ({
          ...step,
          id: uuidv4(),
          order: index + 1,
          requiresConfirmation: step.requiresConfirmation ?? false,
          allowPartialCompletion: step.allowPartialCompletion ?? false,
          allowPhotoEvidence: step.allowPhotoEvidence ?? false,
        })) as RoutineStep[];

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
   * Requires: manage_routines permission
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

        // Check manage_routines permission
        const allowed = await hasPermission(
          user.uid,
          data.organizationId,
          "manage_routines",
          { systemRole: user.role },
        );
        if (!allowed) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_routines",
          });
        }

        const input = parsed.data as UpdateRoutineTemplateInput;
        const updateData: Record<string, unknown> = {
          ...input,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        // Explicitly handle stableId: undefined → null for Firestore persistence
        // JavaScript spread operator omits undefined values, causing the field to not update
        if (input.stableId === undefined) {
          updateData.stableId = null;
        }

        // Handle other optional fields that need explicit null when cleared
        if (input.description === undefined) {
          updateData.description = null;
        }
        if (input.icon === undefined) {
          updateData.icon = null;
        }
        if (input.color === undefined) {
          updateData.color = null;
        }
        if (input.defaultStartTime === undefined) {
          updateData.defaultStartTime = null;
        }

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
   * Permanently delete a routine template (with dependency checking)
   * Requires: manage_routines permission
   * Query params:
   *   - permanent=true: Attempt permanent deletion (default behavior)
   *   - permanent=false: Soft delete (archive by setting isActive=false)
   */
  fastify.delete(
    "/templates/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const query = request.query as Record<string, string>;
        const user = (request as AuthenticatedRequest).user!;

        const doc = await db.collection("routineTemplates").doc(id).get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine template not found",
          });
        }

        const data = doc.data() as RoutineTemplate;

        // Check manage_routines permission
        const allowed = await hasPermission(
          user.uid,
          data.organizationId,
          "manage_routines",
          { systemRole: user.role },
        );
        if (!allowed) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_routines",
          });
        }

        const permanent = query.permanent === "true"; // Change default to false

        if (permanent) {
          // Check for dependencies before permanent deletion
          const schedulesSnapshot = await db
            .collection("routineSchedules")
            .where("templateId", "==", id)
            .limit(1)
            .get();

          const instancesSnapshot = await db
            .collectionGroup("routineInstances")
            .where("templateId", "==", id)
            .limit(1)
            .get();

          if (!schedulesSnapshot.empty || !instancesSnapshot.empty) {
            return reply.status(400).send({
              error: "Bad Request",
              message:
                "Cannot permanently delete template: it is being used by schedules or instances.",
              hasSchedules: !schedulesSnapshot.empty,
              hasInstances: !instancesSnapshot.empty,
            });
          }

          // No dependencies - perform permanent deletion
          await db.collection("routineTemplates").doc(id).delete();

          return { success: true, message: "Template permanently deleted" };
        } else {
          // Soft delete by setting deletedAt timestamp (don't change isActive)
          await db.collection("routineTemplates").doc(id).update({
            deletedAt: Timestamp.now(),
            deletedBy: user.uid,
            updatedAt: Timestamp.now(),
            updatedBy: user.uid,
          });

          return { success: true, message: "Template deleted" };
        }
      } catch (error) {
        request.log.error({ error }, "Failed to delete routine template");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete routine template",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/templates/:id/duplicate
   * Duplicate a routine template
   * Requires: manage_routines permission
   */
  fastify.post(
    "/templates/:id/duplicate",
    {
      preHandler: [
        authenticate,
        checkSubscriptionLimit("routineTemplates", "routineTemplates"),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const body = request.body as { name?: string };

        // 1. Fetch original template
        const templateRef = db.collection("routineTemplates").doc(id);
        const templateDoc = await templateRef.get();

        if (!templateDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine template not found",
          });
        }

        const originalTemplate = {
          id: templateDoc.id,
          ...templateDoc.data(),
        } as RoutineTemplate;

        // 2. Authorization: Check manage_routines permission
        const allowed = await hasPermission(
          user.uid,
          originalTemplate.organizationId,
          "manage_routines",
          { systemRole: user.role },
        );

        if (!allowed) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_routines",
          });
        }

        // 3. Create duplicate with new IDs for steps
        const duplicatedSteps = originalTemplate.steps.map((step, index) => ({
          ...step,
          id: uuidv4(),
          order: index + 1,
        }));

        // 4. Generate new name (use provided name or append " (kopia)" in Swedish)
        const duplicatedName = body.name || `${originalTemplate.name} (kopia)`;

        // 5. Create new template document
        const now = Timestamp.now();
        const newTemplateData: Omit<RoutineTemplate, "id"> = {
          organizationId: originalTemplate.organizationId,
          stableId: originalTemplate.stableId,
          name: duplicatedName,
          description: originalTemplate.description,
          type: originalTemplate.type,
          icon: originalTemplate.icon,
          color: originalTemplate.color,
          defaultStartTime: originalTemplate.defaultStartTime,
          estimatedDuration: originalTemplate.estimatedDuration,
          steps: duplicatedSteps,
          requiresNotesRead: originalTemplate.requiresNotesRead,
          allowSkipSteps: originalTemplate.allowSkipSteps,
          pointsValue: originalTemplate.pointsValue,
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
          isActive: true,
        };

        const newTemplateRef = await db
          .collection("routineTemplates")
          .add(newTemplateData);

        // 6. Return duplicated template wrapped in response object
        return reply.status(201).send({
          template: serializeTimestamps({
            id: newTemplateRef.id,
            ...newTemplateData,
          }),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to duplicate routine template");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to duplicate template",
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

        // Batch enrich with templates for efficient data fetching
        const rawInstances = snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data() as RoutineInstance,
        }));
        const instances = await enrichInstancesWithTemplates(rawInstances);

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

        const queryData = parsedQuery.data as ListRoutineInstancesQuery;
        let dbQuery = db
          .collection("routineInstances")
          .where("stableId", "==", stableId);

        if (queryData.status) {
          dbQuery = dbQuery.where("status", "==", queryData.status) as any;
        }
        if (queryData.assignedTo) {
          dbQuery = dbQuery.where(
            "assignedTo",
            "==",
            queryData.assignedTo,
          ) as any;
        }
        if (queryData.templateId) {
          dbQuery = dbQuery.where(
            "templateId",
            "==",
            queryData.templateId,
          ) as any;
        }
        if (queryData.startDate) {
          const startDate = new Date(queryData.startDate);
          dbQuery = dbQuery.where(
            "scheduledDate",
            ">=",
            Timestamp.fromDate(startDate),
          ) as any;
        }
        if (queryData.endDate) {
          const endDate = new Date(queryData.endDate);
          endDate.setHours(23, 59, 59, 999);
          dbQuery = dbQuery.where(
            "scheduledDate",
            "<=",
            Timestamp.fromDate(endDate),
          ) as any;
        }

        const limit = queryData.limit ?? 50;
        const offset = queryData.offset ?? 0;

        const snapshot = await dbQuery
          .orderBy("scheduledDate", "desc")
          .offset(offset)
          .limit(limit)
          .get();

        // Batch enrich with templates for efficient data fetching
        const rawInstances = snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data() as RoutineInstance,
        }));
        const instances = await enrichInstancesWithTemplates(rawInstances);

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

        // Get the template to include step definitions and metadata
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
          template: template
            ? {
                name: template.name,
                description: template.description,
                type: template.type,
                icon: template.icon,
                color: template.color,
                estimatedDuration: template.estimatedDuration,
                requiresNotesRead: template.requiresNotesRead,
                allowSkipSteps: template.allowSkipSteps,
                steps: template.steps,
              }
            : null,
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

        // Debug: Log the request body and schema shape
        request.log.info(
          { requestBody: request.body },
          "Create routine instance request",
        );
        request.log.info(
          { schemaShape: createRoutineInstanceSchema.shape },
          "Schema shape",
        );

        const parsed = createRoutineInstanceSchema.safeParse(request.body);

        if (!parsed.success) {
          request.log.error(
            { issues: parsed.error.issues },
            "Validation failed",
          );
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const input = parsed.data as CreateRoutineInstanceInput;

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

        // Apply holiday multiplier at creation for transparency
        const scheduledDateObj =
          typeof input.scheduledDate === "string"
            ? new Date(input.scheduledDate)
            : input.scheduledDate;
        const holidaySettings = await fetchHolidaySettings(
          template.organizationId,
        );
        const { pointsValue, isHolidayShift, isHalfDayShift } =
          computeHolidayPoints(
            scheduledDateObj,
            template.pointsValue,
            holidaySettings,
          );

        const now = Timestamp.now();
        const instanceData: Omit<RoutineInstance, "id"> = {
          templateId: input.templateId,
          templateName: template.name,
          organizationId: template.organizationId,
          stableId: input.stableId,
          scheduledDate,
          scheduledStartTime:
            input.scheduledStartTime || template.defaultStartTime,
          estimatedDuration: template.estimatedDuration,
          assignedTo: input.assignedTo,
          assignmentType: input.assignedTo ? "manual" : "auto",
          status: "scheduled",
          progress: initialProgress,
          pointsValue,
          isHolidayShift,
          isHalfDayShift,
          dailyNotesAcknowledged: false,
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
        };

        const instanceId = uuidv4();
        const docRef = db.collection("routineInstances").doc(instanceId);
        await docRef.set(instanceData);

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

        // Auto-assign to starting user if not already assigned
        const assignmentUpdate = !data.assignedTo
          ? {
              assignedTo: user.uid,
              assignedToName: user.displayName || user.email,
              assignmentType: "self" as const,
              assignedAt: now,
              assignedBy: user.uid,
            }
          : {};

        const updateData = {
          status: "started" as RoutineInstanceStatus,
          startedAt: now,
          startedBy: user.uid,
          startedByName: user.displayName || user.email,
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
          ...assignmentUpdate,
        };

        await db.collection("routineInstances").doc(id).update(updateData);

        const updated = await db.collection("routineInstances").doc(id).get();
        const enriched = await enrichInstanceWithTemplate(
          updated.id,
          updated.data() as RoutineInstance,
        );

        return {
          instance: enriched,
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
   * POST /api/v1/routines/instances/:instanceId/steps/:stepId/upload-url
   * Generate a signed upload URL for routine evidence photos
   */
  fastify.post(
    "/instances/:instanceId/steps/:stepId/upload-url",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { instanceId, stepId } = request.params as {
          instanceId: string;
          stepId: string;
        };
        const data = request.body as {
          horseId?: string;
          fileName: string;
          mimeType: string;
        };

        if (!data.fileName || !data.mimeType) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Missing required fields: fileName, mimeType",
          });
        }

        // Validate MIME type
        if (
          !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(data.mimeType)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Unsupported image type: ${data.mimeType}`,
          });
        }

        // Verify instance exists and user has access
        const doc = await db
          .collection("routineInstances")
          .doc(instanceId)
          .get();
        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine instance not found",
          });
        }

        const instanceData = doc.data() as RoutineInstance;
        const hasAccess = await hasStableAccess(
          instanceData.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this routine",
          });
        }

        // S1: Validate horseId belongs to the same stable as the routine
        if (data.horseId) {
          if (!VALID_ENTITY_ID.test(data.horseId)) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Invalid horseId format",
            });
          }
          const horseDoc = await db
            .collection("horses")
            .doc(data.horseId)
            .get();
          if (!horseDoc.exists) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Horse not found",
            });
          }
          const horseData = horseDoc.data() as { currentStableId?: string };
          if (horseData.currentStableId !== instanceData.stableId) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "Horse does not belong to this stable",
            });
          }
        }

        // S2: Validate stepId exists in the routine template
        const templateDoc = await db
          .collection("routineTemplates")
          .doc(instanceData.templateId)
          .get();
        if (!templateDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine template not found",
          });
        }
        const templateData = templateDoc.data() as RoutineTemplate;
        if (!templateData.steps.find((s) => s.id === stepId)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Step "${stepId}" does not exist in template`,
          });
        }

        // Build storage path
        const timestamp = Date.now();
        const safeFileName = sanitizeFileName(data.fileName);

        let storagePath: string;
        if (data.horseId) {
          storagePath = `horses/${data.horseId}/routine-evidence/${instanceId}_${stepId}_${timestamp}_${safeFileName}`;
        } else {
          storagePath = `routines/${instanceId}/steps/${stepId}/${timestamp}_${safeFileName}`;
        }

        // Generate signed URLs
        const bucket = storage.bucket();
        const file = bucket.file(storagePath);

        const [uploadUrl] = await file.getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000,
          contentType: data.mimeType,
        });

        const [readUrl] = await file.getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        return {
          uploadUrl,
          readUrl,
          storagePath,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to generate routine evidence upload URL",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to generate upload URL",
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

        const input = parsed.data as Omit<
          UpdateStepProgressInput,
          "instanceId"
        >;
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
              horseName: "",
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

            // Debug logging: Check photo URLs after storing horse progress
            const storedProgress =
              currentStep.horseProgress[horseUpdate.horseId];
            request.log.info({
              msg: `[PHOTO DEBUG] Stored horse progress for ${horseUpdate.horseId}`,
              photoUrls: storedProgress?.photoUrls,
              photoCount: storedProgress?.photoUrls?.length || 0,
            });
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

        // Notify horse owners about photo evidence (fire-and-forget)
        if (input.horseUpdates) {
          for (const update of input.horseUpdates) {
            if (update.photoUrls && update.photoUrls.length > 0) {
              notifyHorseOwnerOfPhoto({
                horseId: update.horseId,
                actorId: user.uid,
                actorName: user.displayName || user.email || "Someone",
                routineName: data.templateName || "",
                stepName:
                  (
                    data.progress?.stepProgress?.[
                      input.stepId
                    ] as unknown as Record<string, string>
                  )?.stepName || "",
                instanceId: id,
                stepId: input.stepId,
                organizationId: data.organizationId,
                stableId: data.stableId,
              }).catch((err) =>
                request.log.error(
                  { err },
                  "Failed to notify owner of photo evidence",
                ),
              );
            }
          }
        }

        // Create activity history entries when step is completed or skipped
        if (input.status === "completed" || input.status === "skipped") {
          try {
            // Fetch template to get step details
            const templateDoc = await db
              .collection("routineTemplates")
              .doc(data.templateId)
              .get();

            if (templateDoc.exists) {
              const template = templateDoc.data() as RoutineTemplate;
              const step = template.steps.find((s) => s.id === input.stepId);

              if (step) {
                // Ensure instance has id property
                const instanceWithId: RoutineInstance = {
                  ...data,
                  id: doc.id,
                };

                await createStepActivityHistory(
                  instanceWithId,
                  template,
                  step,
                  currentStep,
                  user.uid,
                  user.displayName || user.email || undefined,
                );
                request.log.info(
                  { stepId: input.stepId, instanceId: id },
                  "Created activity history for completed step",
                );
              }
            }
          } catch (historyError) {
            // Log but don't fail the request if history creation fails
            request.log.error(
              { error: historyError, stepId: input.stepId, instanceId: id },
              "Failed to create activity history (non-blocking)",
            );
          }
        }

        const updated = await db.collection("routineInstances").doc(id).get();
        const enriched = await enrichInstanceWithTemplate(
          updated.id,
          updated.data() as RoutineInstance,
        );

        return {
          instance: enriched,
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
          completedByName: user.displayName || user.email || "Unknown user",
          "progress.stepsCompleted": data.progress.stepsTotal,
          "progress.percentComplete": 100,
          pointsAwarded: data.pointsValue,
          notes: parsed.data.notes,
          updatedAt: now,
          updatedBy: user.uid,
        };

        await db.collection("routineInstances").doc(id).update(updateData);

        // Mark all history entries for this routine as completed
        await markRoutineEntriesCompleted(id);

        // TODO: Award points to user through fairness algorithm
        // TODO: Send notification about completed routine

        const updated = await db.collection("routineInstances").doc(id).get();
        const enriched = await enrichInstanceWithTemplate(
          updated.id,
          updated.data() as RoutineInstance,
        );

        return {
          instance: enriched,
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

        // Check status first to avoid unnecessary permission DB calls
        if (data.status === "completed" || data.status === "cancelled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot cancel routine with status: ${data.status}`,
          });
        }

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

        // If user is NOT the assignee, require manage_schedules permission (V2)
        if (data.assignedTo !== user.uid) {
          const canManage = await hasPermission(
            user.uid,
            data.organizationId,
            "manage_schedules",
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to cancel other users' routines",
            });
          }
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
        const enriched = await enrichInstanceWithTemplate(
          updated.id,
          updated.data() as RoutineInstance,
        );

        return {
          instance: enriched,
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

  /**
   * DELETE /api/v1/routines/instances/:id
   * Hard delete a routine instance (requires manage_schedules permission)
   */
  fastify.delete(
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

        // Require manage_schedules permission (V2)
        const canManage = await hasPermission(
          user.uid,
          data.organizationId,
          "manage_schedules",
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete routine instances",
          });
        }

        // Only allow deletion of scheduled and cancelled instances (completed/in-progress have activity history)
        if (data.status !== "scheduled" && data.status !== "cancelled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot delete routine with status: ${data.status}. Only scheduled and cancelled routines can be deleted.`,
          });
        }

        // Use transaction to prevent TOCTOU race condition
        await db.runTransaction(async (txn) => {
          const freshDoc = await txn.get(
            db.collection("routineInstances").doc(id),
          );
          if (!freshDoc.exists) {
            throw { statusCode: 404, message: "Routine instance not found" };
          }
          const freshData = freshDoc.data() as RoutineInstance;
          if (
            freshData.status !== "scheduled" &&
            freshData.status !== "cancelled"
          ) {
            throw {
              statusCode: 400,
              message: `Cannot delete routine with status: ${freshData.status}. Only scheduled and cancelled routines can be deleted.`,
            };
          }
          txn.delete(freshDoc.ref);
        });

        return { success: true };
      } catch (error: any) {
        // Handle transaction-thrown errors with statusCode
        if (error?.statusCode) {
          return reply.status(error.statusCode).send({
            error: error.statusCode === 404 ? "Not Found" : "Bad Request",
            message: error.message,
          });
        }
        request.log.error({ error }, "Failed to delete routine instance");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete routine instance",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/instances/:id/restart
   * Restart a cancelled routine
   */
  fastify.post(
    "/instances/:id/restart",
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
            message: "You do not have permission to restart this routine",
          });
        }

        if (data.status !== "cancelled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Can only restart cancelled routines. Current status: ${data.status}`,
          });
        }

        const now = Timestamp.now();
        await db.collection("routineInstances").doc(id).update({
          status: "scheduled",
          cancelledAt: null,
          cancelledBy: null,
          cancellationReason: null,
          updatedAt: now,
          updatedBy: user.uid,
        });

        const updated = await db.collection("routineInstances").doc(id).get();
        const enriched = await enrichInstanceWithTemplate(
          updated.id,
          updated.data() as RoutineInstance,
        );

        return {
          instance: enriched,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to restart routine");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to restart routine",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/instances/:id/assign
   * Assign a routine instance to a member
   *
   * If there's an active selection process for the stable, validates that
   * the requesting user is the current turn user before allowing assignment.
   */
  fastify.post(
    "/instances/:id/assign",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const { assignedTo, assignedToName } = request.body as {
          assignedTo: string;
          assignedToName: string;
        };

        if (!assignedTo || !assignedToName) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "assignedTo and assignedToName are required",
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
            message: "You do not have permission to assign this routine",
          });
        }

        // Validate assignedTo is a real Firebase Auth UID
        try {
          await auth.getUser(assignedTo);
        } catch {
          return reply.status(400).send({
            error: "Bad Request",
            message: "assignedTo must be a valid user ID",
          });
        }

        // Validate assignedTo is an active member of the organization
        const assigneeMemberDoc = await db
          .collection("organizationMembers")
          .doc(`${assignedTo}_${data.organizationId}`)
          .get();

        if (
          !assigneeMemberDoc.exists ||
          assigneeMemberDoc.data()?.status !== "active"
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Assigned user must be an active member of the organization",
          });
        }

        // Only allow assignment for scheduled or unassigned routines
        if (data.status !== "scheduled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot assign routine with status: ${data.status}`,
          });
        }

        // Check if there's an active selection process for this stable
        const activeProcess = await getActiveSelectionProcessForStable(
          data.stableId,
        );

        if (activeProcess) {
          // Validate the requesting user is the current turn user
          if (activeProcess.currentTurnUserId !== user.uid) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "Det är inte din tur att välja pass",
            });
          }
        }

        const now = Timestamp.now();
        await db.collection("routineInstances").doc(id).update({
          assignedTo,
          assignedToName,
          assignmentType: "manual",
          assignedAt: now,
          assignedBy: user.uid,
          updatedAt: now,
          updatedBy: user.uid,
        });

        // If there's an active selection process, record the selection
        if (activeProcess) {
          const turnInfo = getCurrentTurnInfo(activeProcess);
          try {
            await recordSelectionEntry(
              activeProcess.id,
              id,
              user.uid,
              assignedToName,
              turnInfo.turnOrder || 0,
              data.templateName,
              data.scheduledDate,
            );
            request.log.info(
              {
                processId: activeProcess.id,
                instanceId: id,
                userId: user.uid,
                turnOrder: turnInfo.turnOrder,
              },
              "Recorded selection entry for active selection process",
            );
          } catch (selectionError) {
            // Log but don't fail the assignment if selection recording fails
            request.log.error(
              {
                error: selectionError,
                processId: activeProcess.id,
                instanceId: id,
              },
              "Failed to record selection entry (non-blocking)",
            );
          }
        }

        const updated = await db.collection("routineInstances").doc(id).get();
        const enriched = await enrichInstanceWithTemplate(
          updated.id,
          updated.data() as RoutineInstance,
        );

        return {
          instance: enriched,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to assign routine");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to assign routine",
        });
      }
    },
  );

  /**
   * POST /api/v1/routines/instances/bulk
   * Create multiple routine instances at once
   */
  fastify.post(
    "/instances/bulk",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const {
          templateId,
          stableId,
          startDate,
          endDate,
          repeatDays,
          includeHolidays,
          scheduledStartTime,
          assignmentMode,
        } = request.body as {
          templateId: string;
          stableId: string;
          startDate: string;
          endDate: string;
          repeatDays?: number[]; // 0=Sunday, 1=Monday, etc.
          includeHolidays?: boolean;
          scheduledStartTime?: string;
          assignmentMode: "auto" | "manual" | "unassigned";
        };

        // Validate input
        if (!templateId || !stableId || !startDate || !endDate) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "templateId, stableId, startDate, and endDate are required",
          });
        }

        // Cap date range to prevent resource exhaustion
        const MAX_BULK_DAYS = 366;
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > MAX_BULK_DAYS) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Date range cannot exceed ${MAX_BULK_DAYS} days`,
          });
        }

        // Check stable access
        const hasAccess = await hasStableAccess(stableId, user.uid, user.role);
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
          .doc(templateId)
          .get();
        if (!templateDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Routine template not found",
          });
        }

        const template = templateDoc.data() as RoutineTemplate;

        // Generate dates between start and end
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates: Date[] = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay();
          // If repeatDays is specified, only include those days (plus holidays if enabled)
          const matchesDay =
            !repeatDays ||
            repeatDays.length === 0 ||
            repeatDays.includes(dayOfWeek);
          const matchesHoliday =
            includeHolidays === true && holidayService.isHoliday(d);
          if (matchesDay || matchesHoliday) {
            dates.push(new Date(d));
          }
        }

        // Create instances
        const batch = db.batch();
        const createdIds: string[] = [];
        const now = Timestamp.now();
        const holidaySettings = await fetchHolidaySettings(
          template.organizationId,
        );

        for (const date of dates) {
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

          // Apply holiday multiplier at creation for transparency
          const { pointsValue, isHolidayShift, isHalfDayShift } =
            computeHolidayPoints(date, template.pointsValue, holidaySettings);

          const instanceData: Omit<RoutineInstance, "id"> = {
            templateId,
            templateName: template.name,
            organizationId: template.organizationId,
            stableId,
            scheduledDate: Timestamp.fromDate(date),
            scheduledStartTime: scheduledStartTime || template.defaultStartTime,
            estimatedDuration: template.estimatedDuration,
            assignmentType: assignmentMode === "auto" ? "auto" : "manual",
            status: "scheduled",
            progress: initialProgress,
            pointsValue,
            isHolidayShift,
            isHalfDayShift,
            dailyNotesAcknowledged: false,
            createdAt: now,
            createdBy: user.uid,
            updatedAt: now,
          };

          const instanceId = uuidv4();
          const docRef = db.collection("routineInstances").doc(instanceId);
          batch.set(docRef, instanceData);
          createdIds.push(instanceId);
        }

        await batch.commit();

        return reply.status(201).send({
          success: true,
          createdCount: createdIds.length,
          instanceIds: createdIds,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to bulk create routine instances");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create routine instances",
        });
      }
    },
  );

  async function notifyHorseOwnerOfPhoto(params: {
    horseId: string;
    actorId: string;
    actorName: string;
    routineName: string;
    stepName: string;
    instanceId: string;
    stepId: string;
    organizationId: string;
    stableId: string;
  }) {
    const horseDoc = await db.collection("horses").doc(params.horseId).get();
    if (!horseDoc.exists) return;

    const horse = horseDoc.data() as { ownerId?: string; name?: string };
    const ownerId = horse.ownerId;

    // Don't notify yourself
    if (!ownerId || ownerId === params.actorId) return;

    const now = Timestamp.now();
    const notificationId = uuidv4();

    const notification = {
      id: notificationId,
      userId: ownerId,
      type: "routine_photo_evidence",
      priority: "normal",
      title: `Nytt foto av ${horse.name || "din häst"}`,
      body: `${params.actorName} lade till ett foto under ${params.routineName}${params.stepName ? ` - ${params.stepName}` : ""}`,
      read: false,
      readAt: null,
      actionUrl: `equiduty://horse/${params.horseId}/history`,
      entityType: "horse",
      entityId: params.horseId,
      organizationId: params.organizationId,
      stableId: params.stableId,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("notifications").doc(notificationId).set(notification);

    // Queue for push delivery
    await db
      .collection("notificationQueue")
      .doc(notificationId)
      .set({
        notificationId,
        userId: ownerId,
        channels: ["inApp", "push"],
        status: "pending",
        createdAt: now,
      });
  }
}
