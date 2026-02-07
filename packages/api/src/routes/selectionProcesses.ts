/**
 * Selection Process API Routes
 *
 * CRUD endpoints for turn-based routine selection processes:
 * - List and get processes with user context
 * - Create, update, delete draft processes (admin only)
 * - Start, complete turn, and cancel processes
 */

import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { isModuleEnabled } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { hasStableAccess } from "../utils/authorization.js";
import {
  hasPermission as engineHasPermission,
  resolveOrgIdFromStable,
} from "../utils/permissionEngine.js";
import { z } from "zod";
import {
  createSelectionProcessSchema,
  updateSelectionProcessSchema,
  listSelectionProcessesQuerySchema,
  selectionProcessParamsSchema,
  cancelSelectionProcessSchema,
  computeTurnOrderSchema,
} from "@equiduty/shared";
import type {
  SelectionProcess,
  SelectionProcessWithContext,
  SelectionProcessSummary,
  CreateSelectionProcessInput,
  UpdateSelectionProcessInput,
  ListSelectionProcessesQuery,
  CompleteTurnResult,
  ComputeTurnOrderInput,
} from "@equiduty/shared";
import {
  getActiveSelectionProcessForStable,
  validateStableMembers,
  createTurnsFromMemberOrder,
  getUserTurnInfo,
  isUsersTurn,
  notifyMemberTurnStarted,
  notifyProcessCompleted,
  getSelectionsForProcess,
} from "../services/selectionProcessService.js";
import {
  computeTurnOrder,
  saveSelectionProcessHistory,
} from "../services/selectionAlgorithmService.js";

/**
 * Resolve organization ID from a stableId.
 * Returns the organizationId or null if stable not found / has no org.
 */
async function getOrgIdFromStable(stableId: string): Promise<string | null> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return null;
  return stableDoc.data()?.organizationId || null;
}

export async function selectionProcessesRoutes(fastify: FastifyInstance) {
  // Module gate: selectionProcess module required.
  // Selection process routes don't have organizationId in the URL,
  // so we resolve it from stableId (query param or process document).
  fastify.addHook("preHandler", async (request, reply) => {
    const query = request.query as Record<string, string>;
    const params = request.params as Record<string, string>;

    let organizationId: string | null = null;

    // Try stableId from query params (used by list endpoint)
    if (query.stableId) {
      organizationId = await getOrgIdFromStable(query.stableId);
    }
    // Try processId from URL params (used by single-item endpoints)
    else if (params.processId) {
      const processDoc = await db
        .collection("selectionProcesses")
        .doc(params.processId)
        .get();
      if (processDoc.exists) {
        const data = processDoc.data()!;
        organizationId = data.organizationId || null;
        if (!organizationId && data.stableId) {
          organizationId = await getOrgIdFromStable(data.stableId);
        }
      }
    }

    if (!organizationId) {
      // No org context — skip module check (will fail on auth/access later)
      return;
    }

    const enabled = await isModuleEnabled(organizationId, "selectionProcess");
    if (!enabled) {
      return reply.status(403).send({
        error: "Module not available",
        message:
          'The "selectionProcess" feature is not included in your subscription. Please upgrade to access this feature.',
        moduleKey: "selectionProcess",
      });
    }
  });

  // ============================================================================
  // LIST SELECTION PROCESSES
  // ============================================================================

  /**
   * GET /api/v1/selection-processes
   * List selection processes for a stable
   * Query params: stableId (required), status (optional), limit, offset
   */
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const rawQuery = request.query as Record<string, string>;

        // Parse and validate query parameters
        const parsedQuery =
          listSelectionProcessesQuerySchema.safeParse(rawQuery);
        if (!parsedQuery.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid query parameters",
            details: parsedQuery.error.issues,
          });
        }

        const query = parsedQuery.data as ListSelectionProcessesQuery;

        // stableId is required for listing
        if (!query.stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId query parameter is required",
          });
        }

        // Check stable access
        const hasAccess = await hasStableAccess(
          query.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          // Return 404 to prevent enumeration
          return reply.status(404).send({
            error: "Not Found",
            message: "Stable not found",
          });
        }

        // Build query
        let dbQuery = db
          .collection("selectionProcesses")
          .where("stableId", "==", query.stableId);

        if (query.status) {
          dbQuery = dbQuery.where("status", "==", query.status) as any;
        }

        const limit = query.limit ?? 50;
        const offset = query.offset ?? 0;

        const snapshot = await dbQuery
          .orderBy("createdAt", "desc")
          .offset(offset)
          .limit(limit)
          .get();

        // Map to summary format with user context
        const processes = snapshot.docs.map((doc) => {
          const data = doc.data() as SelectionProcess;

          return {
            id: doc.id,
            name: data.name,
            status: data.status,
            selectionStartDate: serializeTimestamps(
              data.selectionStartDate,
            ) as unknown as string,
            selectionEndDate: serializeTimestamps(
              data.selectionEndDate,
            ) as unknown as string,
            totalMembers: data.turns.length,
            completedTurns: data.turns.filter((t) => t.status === "completed")
              .length,
            currentTurnUserName: data.currentTurnUserId
              ? data.turns.find((t) => t.userId === data.currentTurnUserId)
                  ?.userName || null
              : null,
            isCurrentTurn: isUsersTurn({ ...data, id: doc.id }, user.uid),
            createdAt: serializeTimestamps(data.createdAt) as unknown as string,
          } satisfies SelectionProcessSummary;
        });

        return { selectionProcesses: processes };
      } catch (error) {
        request.log.error({ error }, "Failed to list selection processes");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to list selection processes",
        });
      }
    },
  );

  // ============================================================================
  // GET SINGLE SELECTION PROCESS
  // ============================================================================

  /**
   * GET /api/v1/selection-processes/:processId
   * Get a selection process with user context
   */
  fastify.get(
    "/:processId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { processId } = request.params as { processId: string };

        // Validate params
        const parsedParams = selectionProcessParamsSchema.safeParse({
          processId,
        });
        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid process ID",
          });
        }

        // Get the process
        const doc = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const data = doc.data() as SelectionProcess;

        // Check stable access
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          // Return 404 to prevent enumeration
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        // Build response with user context
        const processWithId = { ...data, id: doc.id };
        const userTurnInfo = getUserTurnInfo(processWithId, user.uid);

        // Check if user can manage this selection process (V2 permission engine)
        const orgId = await resolveOrgIdFromStable(data.stableId);
        const canManage = orgId
          ? await engineHasPermission(
              user.uid,
              orgId,
              "manage_selection_processes",
              { systemRole: user.role },
            )
          : false;

        const response: SelectionProcessWithContext = {
          ...processWithId,
          isCurrentTurn: isUsersTurn(processWithId, user.uid),
          userTurnOrder: userTurnInfo?.order || null,
          userTurnStatus: (userTurnInfo?.status as any) || null,
          turnsAhead: userTurnInfo?.turnsAhead || 0,
          canManage,
        };

        return serializeTimestamps(response);
      } catch (error) {
        request.log.error({ error }, "Failed to get selection process");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get selection process",
        });
      }
    },
  );

  // ============================================================================
  // COMPUTE TURN ORDER (preview before creating)
  // ============================================================================

  /**
   * POST /api/v1/selection-processes/compute-order
   * Compute the turn order based on an algorithm (admin only)
   * Used to preview order before creating a process
   */
  fastify.post(
    "/compute-order",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const body = request.body as Record<string, unknown>;

        // stableId comes from body
        const stableId = body.stableId as string;
        if (!stableId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "stableId is required",
          });
        }

        // Validate input
        const parsed = computeTurnOrderSchema.safeParse(body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const input = parsed.data as ComputeTurnOrderInput;

        // Check admin access (V2 permission engine)
        const orgId = await resolveOrgIdFromStable(stableId);
        if (
          !orgId ||
          !(await engineHasPermission(
            user.uid,
            orgId,
            "manage_selection_processes",
            { systemRole: user.role },
          ))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_selection_processes",
          });
        }

        const result = await computeTurnOrder({
          stableId,
          organizationId: orgId,
          algorithm: input.algorithm,
          memberIds: input.memberIds,
          selectionStartDate: input.selectionStartDate,
          selectionEndDate: input.selectionEndDate,
        });

        return result;
      } catch (error) {
        request.log.error({ error }, "Failed to compute turn order");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to compute turn order",
        });
      }
    },
  );

  // ============================================================================
  // CREATE SELECTION PROCESS
  // ============================================================================

  /**
   * POST /api/v1/selection-processes
   * Create a new selection process (admin only)
   */
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        // Validate input
        const parsed = createSelectionProcessSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const input = parsed.data as CreateSelectionProcessInput;
        const algorithm = input.algorithm ?? "manual";

        // Check admin access to stable (V2 permission engine)
        const orgId = await resolveOrgIdFromStable(input.stableId);
        if (
          !orgId ||
          !(await engineHasPermission(
            user.uid,
            orgId,
            "manage_selection_processes",
            { systemRole: user.role },
          ))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_selection_processes",
          });
        }

        // Determine member order: algorithmic or manual
        let memberOrder = input.memberOrder;
        let quotaPerMember: number | undefined;
        let totalAvailablePoints: number | undefined;

        if (algorithm !== "manual" && !memberOrder) {
          // memberOrder not provided — need memberIds from some source
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "memberOrder is required. Use compute-order endpoint to preview the order first.",
          });
        }

        if (!memberOrder || memberOrder.length === 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "memberOrder is required",
          });
        }

        // Validate all members are actual stable members
        const memberUserIds = memberOrder.map((m) => m.userId);
        const memberValidation = await validateStableMembers(
          input.stableId,
          memberUserIds,
        );

        if (!memberValidation.valid) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Some members are not valid stable members",
            invalidUserIds: memberValidation.invalidUserIds,
          });
        }

        // Check for existing active process
        const existingActive = await getActiveSelectionProcessForStable(
          input.stableId,
        );
        if (existingActive) {
          return reply.status(409).send({
            error: "Conflict",
            message:
              "An active selection process already exists for this stable",
            existingProcessId: existingActive.id,
          });
        }

        // If algorithm is quota_based, compute quota metadata
        if (algorithm === "quota_based") {
          const startTs = Timestamp.fromDate(
            new Date(input.selectionStartDate),
          );
          const endTs = Timestamp.fromDate(new Date(input.selectionEndDate));

          const instancesSnapshot = await db
            .collection("stables")
            .doc(input.stableId)
            .collection("routineInstances")
            .where("scheduledDate", ">=", startTs)
            .where("scheduledDate", "<=", endTs)
            .where("status", "in", ["scheduled", "started"])
            .get();

          totalAvailablePoints = 0;
          for (const doc of instancesSnapshot.docs) {
            totalAvailablePoints += doc.data().pointsValue ?? 0;
          }
          quotaPerMember =
            memberOrder.length > 0
              ? Math.round((totalAvailablePoints / memberOrder.length) * 10) /
                10
              : 0;
        }

        // Create turns from member order
        const turns = createTurnsFromMemberOrder(memberOrder);

        const now = Timestamp.now();
        const processData: Omit<SelectionProcess, "id"> = {
          organizationId: input.organizationId,
          stableId: input.stableId,
          name: input.name,
          description: input.description,
          selectionStartDate: Timestamp.fromDate(
            new Date(input.selectionStartDate),
          ),
          selectionEndDate: Timestamp.fromDate(
            new Date(input.selectionEndDate),
          ),
          algorithm,
          quotaPerMember,
          totalAvailablePoints,
          turns,
          currentTurnIndex: -1, // Not started
          currentTurnUserId: null,
          status: "draft",
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
        };

        const docRef = await db
          .collection("selectionProcesses")
          .add(processData);

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...processData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create selection process");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create selection process",
        });
      }
    },
  );

  // ============================================================================
  // UPDATE SELECTION PROCESS
  // ============================================================================

  /**
   * PUT /api/v1/selection-processes/:processId
   * Update a draft selection process (admin only)
   */
  fastify.put(
    "/:processId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { processId } = request.params as { processId: string };

        // Validate params
        const parsedParams = selectionProcessParamsSchema.safeParse({
          processId,
        });
        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid process ID",
          });
        }

        // Validate input
        const parsed = updateSelectionProcessSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const input = parsed.data as UpdateSelectionProcessInput;

        // Get the process
        const doc = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const data = doc.data() as SelectionProcess;

        // Check admin access (V2 permission engine)
        const orgId = await resolveOrgIdFromStable(data.stableId);
        if (
          !orgId ||
          !(await engineHasPermission(
            user.uid,
            orgId,
            "manage_selection_processes",
            { systemRole: user.role },
          ))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_selection_processes",
          });
        }

        // Only draft processes can be updated
        if (data.status !== "draft") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot update a ${data.status} selection process. Only draft processes can be updated.`,
          });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        if (input.name !== undefined) {
          updateData.name = input.name;
        }
        if (input.description !== undefined) {
          updateData.description = input.description;
        }
        if (input.selectionStartDate !== undefined) {
          updateData.selectionStartDate = Timestamp.fromDate(
            new Date(input.selectionStartDate),
          );
        }
        if (input.selectionEndDate !== undefined) {
          updateData.selectionEndDate = Timestamp.fromDate(
            new Date(input.selectionEndDate),
          );
        }

        // If member order is updated, validate and recreate turns
        if (input.memberOrder !== undefined) {
          const memberUserIds = input.memberOrder.map((m) => m.userId);
          const memberValidation = await validateStableMembers(
            data.stableId,
            memberUserIds,
          );

          if (!memberValidation.valid) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Some members are not valid stable members",
              invalidUserIds: memberValidation.invalidUserIds,
            });
          }

          updateData.turns = createTurnsFromMemberOrder(input.memberOrder);
        }

        await db
          .collection("selectionProcesses")
          .doc(processId)
          .update(updateData);

        // Get updated document
        const updated = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        return serializeTimestamps({
          id: updated.id,
          ...updated.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update selection process");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update selection process",
        });
      }
    },
  );

  // ============================================================================
  // DELETE SELECTION PROCESS
  // ============================================================================

  /**
   * DELETE /api/v1/selection-processes/:processId
   * Delete a draft selection process (admin only)
   */
  fastify.delete(
    "/:processId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { processId } = request.params as { processId: string };

        // Validate params
        const parsedParams = selectionProcessParamsSchema.safeParse({
          processId,
        });
        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid process ID",
          });
        }

        // Get the process
        const doc = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const data = doc.data() as SelectionProcess;

        // Check admin access (V2 permission engine)
        const orgId = await resolveOrgIdFromStable(data.stableId);
        if (
          !orgId ||
          !(await engineHasPermission(
            user.uid,
            orgId,
            "manage_selection_processes",
            { systemRole: user.role },
          ))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_selection_processes",
          });
        }

        // Only draft and cancelled processes can be deleted
        if (data.status !== "draft" && data.status !== "cancelled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot delete a ${data.status} selection process. Only draft or cancelled processes can be deleted.`,
          });
        }

        // Delete the process and its selections subcollection
        const selectionsSnapshot = await db
          .collection("selectionProcesses")
          .doc(processId)
          .collection("selections")
          .get();

        const batch = db.batch();

        // Delete all selections
        selectionsSnapshot.docs.forEach((selDoc) => {
          batch.delete(selDoc.ref);
        });

        // Delete the process
        batch.delete(doc.ref);

        await batch.commit();

        return { success: true, message: "Selection process deleted" };
      } catch (error) {
        request.log.error({ error }, "Failed to delete selection process");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete selection process",
        });
      }
    },
  );

  // ============================================================================
  // START SELECTION PROCESS
  // ============================================================================

  /**
   * POST /api/v1/selection-processes/:processId/start
   * Start the selection process (admin only)
   * Sets status to 'active', currentTurnIndex to 0, notifies first member
   */
  fastify.post(
    "/:processId/start",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { processId } = request.params as { processId: string };

        // Validate params
        const parsedParams = selectionProcessParamsSchema.safeParse({
          processId,
        });
        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid process ID",
          });
        }

        // Get the process
        const doc = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const data = doc.data() as SelectionProcess;

        // Check admin access (V2 permission engine)
        const orgId = await resolveOrgIdFromStable(data.stableId);
        if (
          !orgId ||
          !(await engineHasPermission(
            user.uid,
            orgId,
            "manage_selection_processes",
            { systemRole: user.role },
          ))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_selection_processes",
          });
        }

        // Only draft processes can be started
        if (data.status !== "draft") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot start a ${data.status} selection process. Only draft processes can be started.`,
          });
        }

        // Ensure there are members
        if (data.turns.length === 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Cannot start a selection process with no members",
          });
        }

        const now = Timestamp.now();
        const firstTurn = data.turns[0];

        // Update turns to set first one as active
        const updatedTurns = data.turns.map((turn, index) => ({
          ...turn,
          status: index === 0 ? ("active" as const) : ("pending" as const),
        }));

        // Update the process
        await db.collection("selectionProcesses").doc(processId).update({
          status: "active",
          currentTurnIndex: 0,
          currentTurnUserId: firstTurn.userId,
          turns: updatedTurns,
          startedAt: now,
          updatedAt: now,
          updatedBy: user.uid,
        });

        // Notify the first member
        try {
          await notifyMemberTurnStarted(
            firstTurn.userId,
            firstTurn.userName,
            firstTurn.userEmail,
            processId,
            data.name,
            data.stableId,
            data.organizationId,
          );
        } catch (notifyError) {
          // Log but don't fail the request
          request.log.error(
            { error: notifyError },
            "Failed to send turn notification (non-blocking)",
          );
        }

        // Get updated document
        const updated = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        return serializeTimestamps({
          id: updated.id,
          ...updated.data(),
          message: "Selection process started. First member has been notified.",
        });
      } catch (error) {
        request.log.error({ error }, "Failed to start selection process");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to start selection process",
        });
      }
    },
  );

  // ============================================================================
  // COMPLETE TURN
  // ============================================================================

  /**
   * POST /api/v1/selection-processes/:processId/complete-turn
   * Mark current turn as complete (only current turn user)
   * Advances to next turn or completes process
   */
  fastify.post(
    "/:processId/complete-turn",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { processId } = request.params as { processId: string };

        // Validate params
        const parsedParams = selectionProcessParamsSchema.safeParse({
          processId,
        });
        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid process ID",
          });
        }

        // Get the process
        const doc = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const data = doc.data() as SelectionProcess;

        // Check stable access first (to avoid revealing process existence)
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        // Process must be active
        if (data.status !== "active") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot complete turn in a ${data.status} selection process`,
          });
        }

        // Must be user's turn
        if (!isUsersTurn({ ...data, id: doc.id }, user.uid)) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "It is not your turn to complete",
          });
        }

        const now = Timestamp.now();
        const currentIndex = data.currentTurnIndex;
        const isLastTurn = currentIndex >= data.turns.length - 1;

        // Update current turn to completed
        const updatedTurns = data.turns.map((turn, index) => {
          if (index === currentIndex) {
            return {
              ...turn,
              status: "completed" as const,
              completedAt: now,
            };
          }
          // Set next turn as active if not last
          if (!isLastTurn && index === currentIndex + 1) {
            return {
              ...turn,
              status: "active" as const,
            };
          }
          return turn;
        });

        // Prepare result
        const result: CompleteTurnResult = {
          success: true,
          nextTurnUserId: null,
          nextTurnUserName: null,
          processCompleted: isLastTurn,
        };

        if (isLastTurn) {
          // Complete the process
          await db.collection("selectionProcesses").doc(processId).update({
            status: "completed",
            currentTurnIndex: -1,
            currentTurnUserId: null,
            turns: updatedTurns,
            completedAt: now,
            updatedAt: now,
            updatedBy: user.uid,
          });

          // Save history for rotation algorithms (non-blocking)
          try {
            const completedProcess = {
              ...data,
              id: doc.id,
              turns: updatedTurns,
              status: "completed" as const,
              completedAt: now,
            };
            await saveSelectionProcessHistory(completedProcess);
          } catch (historyError) {
            request.log.error(
              { error: historyError },
              "Failed to save selection process history (non-blocking)",
            );
          }

          // Notify all members that process is complete
          try {
            await notifyProcessCompleted(
              data.turns,
              processId,
              data.name,
              data.stableId,
              data.organizationId,
            );
          } catch (notifyError) {
            request.log.error(
              { error: notifyError },
              "Failed to send completion notifications (non-blocking)",
            );
          }
        } else {
          // Move to next turn
          const nextTurn = data.turns[currentIndex + 1];
          result.nextTurnUserId = nextTurn.userId;
          result.nextTurnUserName = nextTurn.userName;

          await db
            .collection("selectionProcesses")
            .doc(processId)
            .update({
              currentTurnIndex: currentIndex + 1,
              currentTurnUserId: nextTurn.userId,
              turns: updatedTurns,
              updatedAt: now,
              updatedBy: user.uid,
            });

          // Notify next member
          try {
            await notifyMemberTurnStarted(
              nextTurn.userId,
              nextTurn.userName,
              nextTurn.userEmail,
              processId,
              data.name,
              data.stableId,
              data.organizationId,
            );
          } catch (notifyError) {
            request.log.error(
              { error: notifyError },
              "Failed to send turn notification (non-blocking)",
            );
          }
        }

        return result;
      } catch (error) {
        request.log.error({ error }, "Failed to complete turn");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to complete turn",
        });
      }
    },
  );

  // ============================================================================
  // CANCEL SELECTION PROCESS
  // ============================================================================

  /**
   * POST /api/v1/selection-processes/:processId/cancel
   * Cancel the selection process (admin only)
   */
  fastify.post(
    "/:processId/cancel",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { processId } = request.params as { processId: string };

        // Validate params
        const parsedParams = selectionProcessParamsSchema.safeParse({
          processId,
        });
        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid process ID",
          });
        }

        // Validate body
        const parsed = cancelSelectionProcessSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: parsed.error.issues,
          });
        }

        const { reason } = parsed.data;

        // Get the process
        const doc = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const data = doc.data() as SelectionProcess;

        // Check admin access (V2 permission engine)
        const orgId = await resolveOrgIdFromStable(data.stableId);
        if (
          !orgId ||
          !(await engineHasPermission(
            user.uid,
            orgId,
            "manage_selection_processes",
            { systemRole: user.role },
          ))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_selection_processes",
          });
        }

        // Cannot cancel completed or already cancelled processes
        if (data.status === "completed" || data.status === "cancelled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot cancel a ${data.status} selection process`,
          });
        }

        const now = Timestamp.now();

        // Update the process
        await db.collection("selectionProcesses").doc(processId).update({
          status: "cancelled",
          currentTurnIndex: -1,
          currentTurnUserId: null,
          cancellationReason: reason,
          cancelledAt: now,
          cancelledBy: user.uid,
          updatedAt: now,
          updatedBy: user.uid,
        });

        // Get updated document
        const updated = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        return serializeTimestamps({
          id: updated.id,
          ...updated.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to cancel selection process");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to cancel selection process",
        });
      }
    },
  );

  // ============================================================================
  // UPDATE SELECTION PROCESS DATES
  // ============================================================================

  // Zod schema for date updates with validation
  const dateUpdateSchema = z
    .object({
      selectionStartDate: z.string().datetime().optional(),
      selectionEndDate: z.string().datetime().optional(),
    })
    .refine((data) => data.selectionStartDate || data.selectionEndDate, {
      message:
        "At least one date (selectionStartDate or selectionEndDate) must be provided",
    });

  /**
   * PATCH /api/v1/selection-processes/:processId/dates
   * Update selection period dates on an active process (admin only)
   */
  fastify.patch(
    "/:processId/dates",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { processId } = request.params as { processId: string };

        // Validate params
        const parsedParams = selectionProcessParamsSchema.safeParse({
          processId,
        });
        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid process ID",
          });
        }

        // Validate input with Zod schema
        const parseResult = dateUpdateSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: parseResult.error.errors[0].message,
            details: parseResult.error.issues,
          });
        }
        const input = parseResult.data;

        // Get the process
        const doc = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const data = doc.data() as SelectionProcess;

        // Check admin access (V2 permission engine)
        const orgId = await resolveOrgIdFromStable(data.stableId);
        if (
          !orgId ||
          !(await engineHasPermission(
            user.uid,
            orgId,
            "manage_selection_processes",
            { systemRole: user.role },
          ))
        ) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Missing permission: manage_selection_processes",
          });
        }

        // Only active processes can have their dates updated
        if (data.status !== "active") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Can only update dates on active processes. Current status: ${data.status}`,
          });
        }

        // Get current dates for validation
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentStartDate = data.selectionStartDate.toDate();
        const currentEndDate = data.selectionEndDate.toDate();

        const newStartDate = input.selectionStartDate
          ? new Date(input.selectionStartDate)
          : currentStartDate;
        const newEndDate = input.selectionEndDate
          ? new Date(input.selectionEndDate)
          : currentEndDate;

        // Validate start date not in past
        if (input.selectionStartDate && newStartDate < today) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Start date cannot be in the past",
          });
        }

        // Validate end date not in past
        if (input.selectionEndDate && newEndDate < today) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "End date cannot be in the past",
          });
        }

        // Validate start < end
        if (newStartDate >= newEndDate) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Start date must be before end date",
          });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        if (input.selectionStartDate) {
          updateData.selectionStartDate = Timestamp.fromDate(newStartDate);
        }

        if (input.selectionEndDate) {
          updateData.selectionEndDate = Timestamp.fromDate(newEndDate);
        }

        await db
          .collection("selectionProcesses")
          .doc(processId)
          .update(updateData);

        // Get updated document
        const updated = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        return serializeTimestamps({
          id: updated.id,
          ...updated.data(),
        });
      } catch (error) {
        request.log.error(
          { error },
          "Failed to update selection process dates",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update selection process dates",
        });
      }
    },
  );

  // ============================================================================
  // GET SELECTIONS FOR A PROCESS
  // ============================================================================

  /**
   * GET /api/v1/selection-processes/:processId/selections
   * Get all selection entries for a process
   */
  fastify.get(
    "/:processId/selections",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { processId } = request.params as { processId: string };

        // Validate params
        const parsedParams = selectionProcessParamsSchema.safeParse({
          processId,
        });
        if (!parsedParams.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid process ID",
          });
        }

        // Get the process
        const doc = await db
          .collection("selectionProcesses")
          .doc(processId)
          .get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const data = doc.data() as SelectionProcess;

        // Check stable access
        const hasAccess = await hasStableAccess(
          data.stableId,
          user.uid,
          user.role,
        );
        if (!hasAccess) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
          });
        }

        const selections = await getSelectionsForProcess(processId);

        return { selections: serializeTimestamps(selections) };
      } catch (error) {
        request.log.error({ error }, "Failed to get selections");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get selections",
        });
      }
    },
  );
}
