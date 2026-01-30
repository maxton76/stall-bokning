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
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import {
  hasStableAccess,
  canManageSelectionProcesses,
} from "../utils/authorization.js";
import { z } from "zod";
import {
  createSelectionProcessSchema,
  updateSelectionProcessSchema,
  listSelectionProcessesQuerySchema,
  selectionProcessParamsSchema,
  cancelSelectionProcessSchema,
} from "@stall-bokning/shared";
import type {
  SelectionProcess,
  SelectionProcessWithContext,
  SelectionProcessSummary,
  CreateSelectionProcessInput,
  UpdateSelectionProcessInput,
  ListSelectionProcessesQuery,
  CompleteTurnResult,
} from "@stall-bokning/shared";
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

export async function selectionProcessesRoutes(fastify: FastifyInstance) {
  // Module gate: selectionProcess module required
  fastify.addHook("preHandler", checkModuleAccess("selectionProcess"));

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

        // Check if user can manage this selection process
        const canManage = await canManageSelectionProcesses(
          user.uid,
          data.stableId,
        );

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

        // Check admin access to stable (owner, administrator, or schedule_planner)
        const canManage = await canManageSelectionProcesses(
          user.uid,
          input.stableId,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to create selection processes for this stable",
          });
        }

        // Validate all members are actual stable members
        const memberUserIds = input.memberOrder.map((m) => m.userId);
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

        // Create turns from member order
        const turns = createTurnsFromMemberOrder(input.memberOrder);

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

        // Check admin access (owner, administrator, or schedule_planner)
        const canManage = await canManageSelectionProcesses(
          user.uid,
          data.stableId,
        );
        if (!canManage) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
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

        // Check admin access (owner, administrator, or schedule_planner)
        const canManage = await canManageSelectionProcesses(
          user.uid,
          data.stableId,
        );
        if (!canManage) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
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

        // Check admin access (owner, administrator, or schedule_planner)
        const canManage = await canManageSelectionProcesses(
          user.uid,
          data.stableId,
        );
        if (!canManage) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
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

        // Check admin access (owner, administrator, or schedule_planner)
        const canManage = await canManageSelectionProcesses(
          user.uid,
          data.stableId,
        );
        if (!canManage) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Selection process not found",
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

        // Check admin access (owner, administrator, or schedule_planner)
        const canManage = await canManageSelectionProcesses(
          user.uid,
          data.stableId,
        );
        if (!canManage) {
          return reply.status(403).send({
            error: "Forbidden",
            message:
              "You do not have permission to update this selection process",
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
