/**
 * Support Routes
 *
 * API endpoints for ZenDesk support ticket management.
 * Requires authentication and paid subscription for ticket creation.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  refineSupportTicketText,
  refineSupportReplyText,
} from "../utils/gemini.js";
import {
  createTicket,
  searchTicketsByEmail,
  verifyWebhookSecret,
  getZendeskUser,
  getTicket,
  getTicketComments,
  addTicketReply,
  findOrCreateZendeskUser,
  updateTicketStatus,
  type CreateTicketParams,
} from "../services/zendeskService.js";
import { getTierDefaults } from "../utils/tierDefaults.js";
import type {
  CreateSupportTicketInput,
  CreateSupportTicketResponse,
  ListSupportTicketsResponse,
  SupportAccessResponse,
  ZendeskNativeWebhookPayload,
  SupportTicketCategory,
  TicketConversationResponse,
  ReplyToTicketResponse,
  UpdateTicketStatusResponse,
  SupportTicketComment,
} from "@equiduty/shared";

/**
 * Check if a tier has the supportAccess module enabled.
 * Resolves dynamically via Firestore tier definitions with built-in fallback.
 */
async function tierHasSupportAccess(
  subscriptionTier: string,
): Promise<boolean> {
  const tierDef = await getTierDefaults(subscriptionTier);
  return tierDef?.modules?.supportAccess === true;
}

/**
 * Check if user has access to support.
 *
 * Access is granted if the user:
 *   1. Owns an org whose tier has supportAccess enabled, OR
 *   2. Has administrator role in an org whose tier has supportAccess, OR
 *   3. Has support_contact role in an org whose tier has supportAccess
 */
async function checkSupportAccess(userId: string): Promise<{
  hasAccess: boolean;
  organization?: {
    id: string;
    name: string;
    subscriptionTier: string;
  };
  userRole?: string;
  reason?: "no_paid_plan" | "no_organization";
}> {
  // Check owned organizations first (owner always has access if tier qualifies)
  const ownedOrgsSnapshot = await db
    .collection("organizations")
    .where("ownerId", "==", userId)
    .get();

  for (const orgDoc of ownedOrgsSnapshot.docs) {
    const org = orgDoc.data();
    if (await tierHasSupportAccess(org.subscriptionTier)) {
      return {
        hasAccess: true,
        organization: {
          id: orgDoc.id,
          name: org.name,
          subscriptionTier: org.subscriptionTier,
        },
        userRole: "owner",
      };
    }
  }

  // Check memberships: administrator or support_contact role required
  const membershipsSnapshot = await db
    .collection("organizationMembers")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .get();

  if (membershipsSnapshot.empty && ownedOrgsSnapshot.empty) {
    return { hasAccess: false, reason: "no_organization" };
  }

  for (const memberDoc of membershipsSnapshot.docs) {
    const member = memberDoc.data();
    const roles: string[] = member.roles ?? [];

    // Only administrators and support_contact delegates get access
    const hasQualifyingRole =
      roles.includes("administrator") || roles.includes("support_contact");
    if (!hasQualifyingRole) continue;

    const orgDoc = await db
      .collection("organizations")
      .doc(member.organizationId)
      .get();
    if (!orgDoc.exists) continue;

    const org = orgDoc.data();
    if (!org) continue;

    if (await tierHasSupportAccess(org.subscriptionTier)) {
      return {
        hasAccess: true,
        organization: {
          id: member.organizationId,
          name: org.name,
          subscriptionTier: org.subscriptionTier,
        },
        userRole: member.primaryRole || roles[0] || "member",
      };
    }
  }

  return { hasAccess: false, reason: "no_paid_plan" };
}

/**
 * Verify that the authenticated user owns a Zendesk ticket.
 * Returns the ticket data if owned, throws/returns null otherwise.
 * Uses identical 404 response for not-found AND unauthorized to prevent enumeration.
 */
async function verifyTicketOwnership(
  ticketId: number,
  userEmail: string,
  logger: { warn: (obj: Record<string, unknown>, msg: string) => void },
): Promise<{
  ticket: { id: number; subject: string; status: string };
  requesterId: number;
} | null> {
  const ticketResult = await getTicket(ticketId);
  if (!ticketResult) {
    return null;
  }

  // Resolve the requester to check email ownership
  const requesterId = ticketResult.ticket.requester_id;
  if (!requesterId) {
    return null;
  }

  const requester = await getZendeskUser(String(requesterId));
  if (!requester || requester.email.toLowerCase() !== userEmail.toLowerCase()) {
    logger.warn(
      { ticketId, userEmail },
      "Ticket ownership verification failed",
    );
    return null;
  }

  return { ticket: ticketResult.ticket, requesterId };
}

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(20).max(10000),
  category: z.enum(["booking", "billing", "technical", "other"]),
});

const replySchema = z.object({
  message: z.string().min(10).max(10000),
});

const refineTicketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(10000),
  language: z.enum(["sv", "en"]).optional().default("sv"),
});

const refineReplySchema = z.object({
  message: z.string().trim().min(1).max(10000),
  language: z.enum(["sv", "en"]).optional().default("sv"),
});

const updateStatusSchema = z.object({
  status: z.enum(["solved", "open"]),
});

export async function supportRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // SUPPORT ACCESS CHECK
  // ============================================================================

  /**
   * GET /api/v1/support/access
   * Check if current user has access to support (paid subscription)
   */
  fastify.get<{
    Reply: SupportAccessResponse;
  }>(
    "/access",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const accessResult = await checkSupportAccess(user.uid);

        return {
          hasAccess: accessResult.hasAccess,
          reason: accessResult.reason,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to check support access");
        return reply.status(500).send({
          hasAccess: false,
          reason: "no_organization",
        } as SupportAccessResponse);
      }
    },
  );

  // ============================================================================
  // AI TEXT REFINEMENT
  // ============================================================================

  /**
   * POST /api/v1/support/refine-ticket
   * Refine support ticket subject and message using AI
   */
  fastify.post(
    "/refine-ticket",
    {
      preHandler: [authenticate, validateBody(refineTicketSchema)],
    },
    async (request, reply) => {
      const input = (request as any).validatedBody as z.infer<
        typeof refineTicketSchema
      >;

      try {
        const refined = await refineSupportTicketText(
          input.subject,
          input.message,
          input.language,
        );
        return reply.send(refined);
      } catch (error) {
        request.log.error(error, "Failed to refine support ticket text");
        return reply.status(502).send({
          error: "AI Service Error",
          message: "Could not refine text. Please try again.",
        });
      }
    },
  );

  /**
   * POST /api/v1/support/refine-reply
   * Refine support ticket reply using AI
   */
  fastify.post(
    "/refine-reply",
    {
      preHandler: [authenticate, validateBody(refineReplySchema)],
    },
    async (request, reply) => {
      const input = (request as any).validatedBody as z.infer<
        typeof refineReplySchema
      >;

      try {
        const refined = await refineSupportReplyText(
          input.message,
          input.language,
        );
        return reply.send(refined);
      } catch (error) {
        request.log.error(error, "Failed to refine support reply text");
        return reply.status(502).send({
          error: "AI Service Error",
          message: "Could not refine text. Please try again.",
        });
      }
    },
  );

  // ============================================================================
  // TICKET MANAGEMENT
  // ============================================================================

  /**
   * POST /api/v1/support/tickets
   * Create a new support ticket
   * Requires paid subscription
   */
  fastify.post<{
    Body: CreateSupportTicketInput;
    Reply: CreateSupportTicketResponse;
  }>(
    "/tickets",
    {
      preHandler: [authenticate, validateBody(createTicketSchema)],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { subject, message, category } = (request as any).validatedBody;

        // Check support access
        const accessResult = await checkSupportAccess(user.uid);
        if (!accessResult.hasAccess) {
          return reply.status(403).send({
            ticketId: 0,
            status: "error",
            message:
              accessResult.reason === "no_paid_plan"
                ? "Support is only available for paid subscription customers"
                : "You must be a member of an organization to access support",
          });
        }

        // Get user's preferred language from their settings or default to Swedish
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();
        const locale = (userData?.language || "sv") as "sv" | "en";

        // Create ticket in ZenDesk
        const userName = userData?.firstName
          ? `${userData.firstName} ${userData.lastName || ""}`.trim()
          : user.email || "Unknown";

        // Find or create the Zendesk end-user so comments are attributed correctly
        const zendeskUserId = await findOrCreateZendeskUser(
          user.email || "",
          userName,
        );

        const ticketParams: CreateTicketParams = {
          userEmail: user.email || "",
          userName,
          userId: user.uid,
          organizationName: accessResult.organization!.name,
          organizationId: accessResult.organization!.id,
          userRole: accessResult.userRole || "member",
          planType: accessResult.organization!.subscriptionTier,
          subject,
          body: message,
          locale,
          category,
          zendeskUserId,
        };

        const result = await createTicket(ticketParams);

        return {
          ticketId: result.ticket.id,
          status: result.ticket.status,
          message: "Ticket created successfully",
        };
      } catch (error) {
        request.log.error({ error }, "Failed to create support ticket");
        return reply.status(500).send({
          ticketId: 0,
          status: "error",
          message: "Failed to create support ticket. Please try again.",
        });
      }
    },
  );

  /**
   * GET /api/v1/support/tickets
   * List support tickets for the current user
   * Requires paid subscription
   */
  fastify.get<{
    Reply: ListSupportTicketsResponse;
  }>(
    "/tickets",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        // Check support access
        const accessResult = await checkSupportAccess(user.uid);
        if (!accessResult.hasAccess) {
          return reply.status(403).send({
            tickets: [],
            count: 0,
          });
        }

        // Search for tickets by user's email
        const result = await searchTicketsByEmail(user.email || "");

        const tickets = result.tickets.map((ticket) => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status as any,
          category: "other" as SupportTicketCategory, // ZenDesk doesn't return our custom category easily
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
        }));

        return {
          tickets,
          count: tickets.length,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to list support tickets");
        return reply.status(500).send({
          tickets: [],
          count: 0,
        });
      }
    },
  );

  // ============================================================================
  // TICKET CONVERSATION
  // ============================================================================

  /**
   * GET /api/v1/support/tickets/:ticketId/comments
   * Get conversation (comments) for a specific ticket
   * Requires paid subscription and ticket ownership
   */
  fastify.get<{
    Params: { ticketId: string };
    Reply: TicketConversationResponse;
  }>(
    "/tickets/:ticketId/comments",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const ticketId = parseInt(request.params.ticketId, 10);

        if (isNaN(ticketId)) {
          return reply.status(400).send({
            ticketId: 0,
            subject: "",
            status: "new",
            comments: [],
          } as any);
        }

        // Check support access
        const accessResult = await checkSupportAccess(user.uid);
        if (!accessResult.hasAccess) {
          return reply.status(403).send({
            ticketId: 0,
            subject: "",
            status: "new",
            comments: [],
          } as any);
        }

        // Verify ticket ownership (returns null for not-found OR unauthorized)
        const ticketResult = await verifyTicketOwnership(
          ticketId,
          user.email || "",
          request.log,
        );
        if (!ticketResult) {
          return reply.status(404).send({
            ticketId: 0,
            subject: "",
            status: "new",
            comments: [],
          } as any);
        }

        // Fetch comments with resolved author names
        const { comments: rawComments, authors } =
          await getTicketComments(ticketId);

        // Use via.channel to distinguish user messages from staff messages.
        // Channel "api" means the comment was created through our app;
        // any other channel (web, email, etc.) indicates a staff/external reply.
        // This is reliable even when the user and agent are the same person.

        // Filter to public comments only and map to response type
        const comments: SupportTicketComment[] = rawComments
          .filter((c) => c.public)
          .map((c) => {
            const author = authors.get(c.author_id);
            const isStaff = c.via?.channel !== "api";
            return {
              id: c.id,
              body: c.body,
              authorName: author?.name || "Unknown",
              isStaff,
              isPublic: c.public,
              createdAt: c.created_at,
            };
          });

        return {
          ticketId,
          subject: ticketResult.ticket.subject,
          status: ticketResult.ticket.status as any,
          comments,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch ticket comments");
        return reply.status(500).send({
          ticketId: 0,
          subject: "",
          status: "new",
          comments: [],
        } as any);
      }
    },
  );

  /**
   * POST /api/v1/support/tickets/:ticketId/reply
   * Reply to a support ticket
   * Requires paid subscription and ticket ownership
   */
  fastify.post<{
    Params: { ticketId: string };
    Body: { message: string };
    Reply: ReplyToTicketResponse;
  }>(
    "/tickets/:ticketId/reply",
    {
      preHandler: [authenticate, validateBody(replySchema)],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const ticketId = parseInt(request.params.ticketId, 10);

        if (isNaN(ticketId)) {
          return reply.status(400).send({ success: false });
        }

        const { message } = (request as any).validatedBody;

        // Check support access
        const accessResult = await checkSupportAccess(user.uid);
        if (!accessResult.hasAccess) {
          return reply.status(403).send({ success: false });
        }

        // Verify ticket ownership
        const ticketResult = await verifyTicketOwnership(
          ticketId,
          user.email || "",
          request.log,
        );
        if (!ticketResult) {
          return reply.status(404).send({ success: false });
        }

        // Check ticket is not closed
        if (ticketResult.ticket.status === "closed") {
          return reply.status(400).send({ success: false });
        }

        // Add reply using the Zendesk requester ID so the comment is
        // attributed to the end-user (not the API admin user)
        await addTicketReply(
          ticketId,
          message.trim(),
          ticketResult.requesterId,
        );

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to reply to ticket");
        return reply.status(500).send({ success: false });
      }
    },
  );

  // ============================================================================
  // TICKET STATUS UPDATE
  // ============================================================================

  /**
   * PUT /api/v1/support/tickets/:ticketId/status
   * Update ticket status (close/reopen)
   * Requires paid subscription and ticket ownership
   *
   * Allowed transitions:
   *   new / open / pending → solved (user closes their ticket)
   *   solved → open (user reopens)
   *   closed → nothing (closed is final in Zendesk)
   */
  fastify.put<{
    Params: { ticketId: string };
    Body: { status: "solved" | "open" };
    Reply: UpdateTicketStatusResponse;
  }>(
    "/tickets/:ticketId/status",
    {
      preHandler: [authenticate, validateBody(updateStatusSchema)],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const ticketId = parseInt(request.params.ticketId, 10);

        if (isNaN(ticketId)) {
          return reply.status(400).send({ success: false });
        }

        const { status } = (request as any).validatedBody;

        // Check support access
        const accessResult = await checkSupportAccess(user.uid);
        if (!accessResult.hasAccess) {
          return reply.status(403).send({ success: false });
        }

        // Verify ticket ownership
        const ticketResult = await verifyTicketOwnership(
          ticketId,
          user.email || "",
          request.log,
        );
        if (!ticketResult) {
          return reply.status(404).send({ success: false });
        }

        // Enforce allowed transitions
        const currentStatus = ticketResult.ticket.status;

        if (currentStatus === "closed") {
          return reply.status(400).send({ success: false });
        }

        if (
          status === "solved" &&
          !["new", "open", "pending"].includes(currentStatus)
        ) {
          return reply.status(400).send({ success: false });
        }

        if (status === "open" && currentStatus !== "solved") {
          return reply.status(400).send({ success: false });
        }

        await updateTicketStatus(ticketId, status);

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to update ticket status");
        return reply.status(500).send({ success: false });
      }
    },
  );

  // ============================================================================
  // WEBHOOK HANDLER
  // ============================================================================

  /**
   * POST /api/v1/webhooks/zendesk
   * Handle ZenDesk webhook for agent replies
   * Supports native Zendesk webhook format (zen:event-type:ticket.comment_added)
   * Uses webhook signature verification for security
   */
  fastify.post(
    "/webhooks/zendesk",
    // Skip authentication - uses webhook signature instead
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const webhookSecret = request.headers["x-equicare-webhook-secret"] as
          | string
          | undefined;

        // Verify webhook secret matches
        const isValid = await verifyWebhookSecret(webhookSecret);
        if (!isValid) {
          request.log.warn("Invalid ZenDesk webhook secret");
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Invalid webhook secret",
          });
        }

        const payload = request.body as ZendeskNativeWebhookPayload;

        // Check if this is a comment_added event (native Zendesk format)
        if (payload.type !== "zen:event-type:ticket.comment_added") {
          request.log.info(
            { type: payload.type },
            "Ignoring non-comment webhook event",
          );
          return { success: true, message: "Event ignored" };
        }

        // Check if comment is from staff (agent reply)
        const isAgentReply = payload.event?.comment?.author?.is_staff === true;
        if (!isAgentReply) {
          request.log.info("Ignoring non-agent comment");
          return {
            success: true,
            message: "Event ignored - not an agent reply",
          };
        }

        // Extract data from native format
        const ticketId = payload.detail.id;
        const ticketSubject = payload.detail.subject;
        const agentName = payload.event.comment.author.name;
        const requesterId = payload.detail.requester_id;

        // Log the webhook for debugging
        request.log.info(
          { ticketId, ticketSubject, agentName, requesterId },
          "Received ZenDesk agent reply webhook",
        );

        // Fetch requester email from Zendesk API (native format only provides IDs)
        const requester = await getZendeskUser(requesterId);
        if (!requester?.email) {
          request.log.warn(
            { requesterId },
            "Could not fetch requester email from Zendesk",
          );
          return {
            success: true,
            message: "Processed but could not notify user",
          };
        }

        // Find user by email to send notification
        const usersSnapshot = await db
          .collection("users")
          .where("email", "==", requester.email.toLowerCase())
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userId = userDoc.id;

          // Create in-app notification
          await db.collection("notifications").add({
            userId,
            type: "support_reply",
            title: `Support reply: ${ticketSubject}`,
            body: `${agentName} replied to your support ticket`,
            read: false,
            entityType: "support_ticket",
            entityId: ticketId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          request.log.info(
            { userId, ticketId },
            "Created notification for support reply",
          );
        } else {
          request.log.warn(
            { email: requester.email },
            "Could not find user for support reply notification",
          );
        }

        return { success: true };
      } catch (error) {
        request.log.error({ error }, "Failed to process ZenDesk webhook");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to process webhook",
        });
      }
    },
  );
}
