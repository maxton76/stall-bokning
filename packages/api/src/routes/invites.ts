import type { FastifyInstance } from "fastify";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  getInviteByToken,
  acceptInvite,
  declineInvite,
} from "../services/inviteService.js";

export default async function inviteRoutes(fastify: FastifyInstance) {
  // GET /api/v1/invites/:token - Get invite details (public endpoint)
  // Rate limited more strictly to prevent token enumeration attacks
  fastify.get(
    "/:token",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
          keyGenerator: (request: any) => {
            // Rate limit by IP for public endpoints
            return request.ip;
          },
          onExceeded: (request: any) => {
            request.log.warn(
              { ip: request.ip, path: request.url },
              "Rate limit exceeded on invite token lookup - potential enumeration attempt",
            );
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string };

        // Basic token format validation to fail fast on invalid tokens
        // Tokens should be 64 hex characters (256 bits from crypto.randomBytes(32))
        if (!/^[a-f0-9]{64}$/i.test(token)) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invite not found or expired",
          });
        }

        const invite = await getInviteByToken(token);

        if (!invite) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invite not found or expired",
          });
        }

        // Return public invite information (including email for pre-filling signup form)
        return reply.send({
          organizationName: invite.organizationName,
          inviterName: invite.inviterName,
          roles: invite.roles,
          expiresAt: invite.expiresAt,
          email: invite.email,
          firstName: invite.firstName,
          lastName: invite.lastName,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to get invite details");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get invite details",
        });
      }
    },
  );

  // POST /api/v1/invites/:token/accept - Accept invite (requires authentication)
  fastify.post(
    "/:token/accept",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        const user = (request as AuthenticatedRequest).user!;

        const invite = await getInviteByToken(token);

        if (!invite) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invite not found or expired",
          });
        }

        // Verify email matches (security check)
        if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "This invite was sent to a different email address",
          });
        }

        // Accept the invite
        await acceptInvite(invite.id, user.uid);

        return reply.send({
          message: "Invite accepted successfully",
          organizationId: invite.organizationId,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to accept invite");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to accept invite",
        });
      }
    },
  );

  // POST /api/v1/invites/:token/decline - Decline invite (requires authentication)
  fastify.post(
    "/:token/decline",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        const user = (request as AuthenticatedRequest).user!;

        const invite = await getInviteByToken(token);

        if (!invite) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invite not found or expired",
          });
        }

        // Verify email matches (security check)
        if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "This invite was sent to a different email address",
          });
        }

        // Decline the invite
        await declineInvite(invite.id);

        return reply.send({
          message: "Invite declined successfully",
        });
      } catch (error) {
        request.log.error({ error }, "Failed to decline invite");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to decline invite",
        });
      }
    },
  );

  // GET /api/v1/invites/pending - Get user's pending invites (requires authentication)
  fastify.get(
    "/pending",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { email } = request.query as { email?: string };

        // Use query email if provided and user is system_admin, otherwise use authenticated user's email
        const queryEmail =
          email && user.role === "system_admin"
            ? email.toLowerCase()
            : user.email?.toLowerCase();

        if (!queryEmail) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Email is required",
          });
        }

        // Get pending invites for this user's email
        const inviteSnapshot = await db
          .collection("invites")
          .where("email", "==", queryEmail)
          .where("status", "==", "pending")
          .get();

        // Get pending organizationMembers (existing user invites)
        const memberSnapshot = await db
          .collection("organizationMembers")
          .where("userId", "==", user.uid)
          .where("status", "==", "pending")
          .get();

        const invites = inviteSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const pendingMemberships = memberSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return reply.send({
          invites,
          pendingMemberships,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to get pending invites");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get pending invites",
        });
      }
    },
  );

  // POST /api/v1/invites - Create a new invite (requires authentication)
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const {
          stableId,
          stableName,
          email,
          firstName,
          lastName,
          role,
          invitedBy,
          invitedByName,
        } = request.body as {
          stableId: string;
          stableName: string;
          email: string;
          firstName?: string;
          lastName?: string;
          role: "manager" | "member";
          invitedBy: string;
          invitedByName?: string;
        };

        // Validate required fields
        if (!stableId || !stableName || !email || !role || !invitedBy) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Missing required fields: stableId, stableName, email, role, invitedBy",
          });
        }

        // Create invite document
        const inviteData = {
          stableId,
          stableName,
          email: email.toLowerCase(),
          firstName,
          lastName,
          role,
          status: "pending",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          invitedBy,
          invitedByName,
          createdBy: user.uid,
          updatedAt: new Date(),
          updatedBy: user.uid,
        };

        const docRef = await db.collection("invites").add(inviteData);

        return reply.status(201).send({
          id: docRef.id,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create invite");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create invite",
        });
      }
    },
  );

  // POST /api/v1/invites/stable/:id/accept - Accept stable invitation by ID (requires authentication)
  // NOTE: This endpoint now creates organizationMembers instead of stableMembers
  fastify.post(
    "/stable/:id/accept",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;
        const { firstName, lastName, stableId, role } = request.body as {
          firstName: string;
          lastName: string;
          stableId: string;
          stableName?: string; // kept for backward compatibility but not used
          role: "manager" | "member";
        };

        // Get invitation
        const inviteRef = db.collection("invites").doc(id);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invitation not found",
          });
        }

        const inviteData = inviteDoc.data();

        // Validate invitation status
        if (inviteData?.status !== "pending") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invitation already processed",
          });
        }

        // Check expiry
        const expiryDate = inviteData.expiresAt?.toDate();
        if (expiryDate && expiryDate < new Date()) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invitation expired",
          });
        }

        // Verify email matches
        if (inviteData.email?.toLowerCase() !== user.email?.toLowerCase()) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "This invitation was sent to a different email address",
          });
        }

        // Get stable to find organization
        const stableDoc = await db.collection("stables").doc(stableId).get();
        if (!stableDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Stable not found",
          });
        }

        const stableData = stableDoc.data()!;
        const organizationId = stableData.organizationId;

        if (!organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Stable is not associated with an organization",
          });
        }

        // Get organization name
        const orgDoc = await db
          .collection("organizations")
          .doc(organizationId)
          .get();
        const organizationName = orgDoc.exists
          ? orgDoc.data()?.name
          : "Unknown Organization";

        // Create batch transaction
        const batch = db.batch();

        // Create organization member document (instead of stableMembers)
        const memberRef = db
          .collection("organizationMembers")
          .doc(`${user.uid}_${organizationId}`);

        // Map legacy role to organization roles
        const orgRoles = role === "manager" ? ["manager"] : ["member"];

        batch.set(
          memberRef,
          {
            userId: user.uid,
            organizationId,
            organizationName,
            userEmail: user.email,
            firstName,
            lastName,
            roles: orgRoles,
            stableAccess: "specific",
            assignedStableIds: [stableId],
            status: "active",
            joinedAt: new Date(),
            inviteAcceptedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true },
        ); // merge: true to update if exists

        // Update invitation status
        batch.update(inviteRef, {
          status: "accepted",
          acceptedAt: new Date(),
          acceptedBy: user.uid,
          updatedAt: new Date(),
          updatedBy: user.uid,
        });

        await batch.commit();

        return reply.send({
          message: "Invitation accepted successfully",
          stableId,
          organizationId,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to accept invitation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to accept invitation",
        });
      }
    },
  );

  // POST /api/v1/invites/stable/:id/decline - Decline stable invitation by ID (requires authentication)
  fastify.post(
    "/stable/:id/decline",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        // Get invitation
        const inviteRef = db.collection("invites").doc(id);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invitation not found",
          });
        }

        const inviteData = inviteDoc.data();

        // Verify email matches
        if (inviteData?.email?.toLowerCase() !== user.email?.toLowerCase()) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "This invitation was sent to a different email address",
          });
        }

        // Update invitation status
        await inviteRef.update({
          status: "declined",
          declinedAt: new Date(),
          declinedBy: user.uid,
          updatedAt: new Date(),
          updatedBy: user.uid,
        });

        return reply.send({
          message: "Invitation declined successfully",
        });
      } catch (error) {
        request.log.error({ error }, "Failed to decline invitation");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to decline invitation",
        });
      }
    },
  );
}
