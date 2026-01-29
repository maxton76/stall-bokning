/**
 * Support Routes
 *
 * API endpoints for ZenDesk support ticket management.
 * Requires authentication and paid subscription for ticket creation.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  createTicket,
  searchTicketsByEmail,
  verifyWebhookSecret,
  type CreateTicketParams,
} from "../services/zendeskService.js";
import type {
  CreateSupportTicketInput,
  CreateSupportTicketResponse,
  ListSupportTicketsResponse,
  SupportAccessResponse,
  ZendeskWebhookPayload,
  SupportTicketCategory,
} from "@stall-bokning/shared";

/**
 * Paid subscription tiers that have access to support
 */
const PAID_TIERS = ["professional", "enterprise"];

/**
 * Check if user has access to support (has a paid organization)
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
  // Get user's organization memberships
  const membershipsSnapshot = await db
    .collection("organizationMembers")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .get();

  if (membershipsSnapshot.empty) {
    return { hasAccess: false, reason: "no_organization" };
  }

  // Check each organization for a paid plan
  for (const memberDoc of membershipsSnapshot.docs) {
    const member = memberDoc.data();
    const orgId = member.organizationId;

    const orgDoc = await db.collection("organizations").doc(orgId).get();
    if (!orgDoc.exists) continue;

    const org = orgDoc.data();
    if (!org) continue;

    // Check if this organization has a paid subscription
    if (PAID_TIERS.includes(org.subscriptionTier)) {
      return {
        hasAccess: true,
        organization: {
          id: orgId,
          name: org.name,
          subscriptionTier: org.subscriptionTier,
        },
        userRole: member.primaryRole || member.roles?.[0] || "member",
      };
    }
  }

  // Also check if user owns any organization with a paid plan
  const ownedOrgsSnapshot = await db
    .collection("organizations")
    .where("ownerId", "==", userId)
    .get();

  for (const orgDoc of ownedOrgsSnapshot.docs) {
    const org = orgDoc.data();
    if (PAID_TIERS.includes(org.subscriptionTier)) {
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

  return { hasAccess: false, reason: "no_paid_plan" };
}

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
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { subject, message, category } = request.body;

        // Validate input
        if (!subject || !message || !category) {
          return reply.status(400).send({
            ticketId: 0,
            status: "error",
            message: "Subject, message, and category are required",
          });
        }

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
        const ticketParams: CreateTicketParams = {
          userEmail: user.email || "",
          userName: userData?.firstName
            ? `${userData.firstName} ${userData.lastName || ""}`
            : user.email || "Unknown",
          userId: user.uid,
          organizationName: accessResult.organization!.name,
          organizationId: accessResult.organization!.id,
          userRole: accessResult.userRole || "member",
          planType: accessResult.organization!.subscriptionTier,
          subject,
          body: message,
          locale,
          category,
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
  // WEBHOOK HANDLER
  // ============================================================================

  /**
   * POST /api/v1/webhooks/zendesk
   * Handle ZenDesk webhook for agent replies
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

        const payload = request.body as ZendeskWebhookPayload;

        // Validate payload
        if (payload.event !== "agent_reply") {
          request.log.info(
            { event: payload.event },
            "Ignoring non-reply webhook event",
          );
          return { success: true, message: "Event ignored" };
        }

        // Log the webhook for debugging
        request.log.info(
          {
            ticketId: payload.ticket_id,
            subject: payload.ticket_subject,
            agentName: payload.agent_name,
          },
          "Received ZenDesk agent reply webhook",
        );

        // Find user by email to send notification
        const usersSnapshot = await db
          .collection("users")
          .where("email", "==", payload.requester_email.toLowerCase())
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userId = userDoc.id;

          // Create in-app notification
          await db.collection("notifications").add({
            userId,
            type: "support_reply",
            title: `Support reply: ${payload.ticket_subject}`,
            body: `${payload.agent_name} replied to your support ticket`,
            read: false,
            entityType: "support_ticket",
            entityId: payload.ticket_id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          request.log.info(
            { userId, ticketId: payload.ticket_id },
            "Created notification for support reply",
          );
        } else {
          request.log.warn(
            { email: payload.requester_email },
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
