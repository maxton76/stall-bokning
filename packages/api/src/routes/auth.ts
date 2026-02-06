import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { migrateInvitesOnSignup } from "../services/inviteService.js";

// Zod schema for user signup
const signupSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  organizationType: z.enum(["personal", "business"]).optional(),
});

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/signup - Complete user registration
  // Note: Firebase Auth user should already be created on frontend
  // This endpoint creates the Firestore user document and migrates invites
  fastify.post(
    "/signup",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const validation = signupSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const { email, firstName, lastName, phoneNumber, organizationType } =
          validation.data;

        // Check if user document already exists
        const existingUserDoc = await db
          .collection("users")
          .doc(user.uid)
          .get();

        if (existingUserDoc.exists) {
          return reply.status(409).send({
            error: "Conflict",
            message: "User already registered",
          });
        }

        // Create user document in Firestore
        const userData = {
          email: email.toLowerCase(),
          firstName,
          lastName,
          phoneNumber,
          systemRole: "stable_user",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await db.collection("users").doc(user.uid).set(userData);

        // NEW: Auto-create personal organization for user
        let organizationId: string | undefined;
        let implicitStableId: string | undefined;
        try {
          // Create the organization first
          const orgRef = db.collection("organizations").doc();
          organizationId = orgRef.id;

          // Create implicit stable for personal organization ("My Horses")
          const implicitStableRef = db.collection("stables").doc();
          implicitStableId = implicitStableRef.id;

          const implicitStableData = {
            id: implicitStableId,
            name: "My Horses",
            description: "Auto-created stable for personal use",
            ownerId: user.uid,
            ownerEmail: email.toLowerCase(),
            organizationId,
            isImplicit: true, // Flag to identify implicit stables
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          // Create organizationMember record for owner
          const memberId = `${user.uid}_${organizationId}`;

          const orgData = {
            name: `${firstName}'s Organization`,
            ownerId: user.uid,
            ownerEmail: email.toLowerCase(),
            organizationType: organizationType || ("personal" as const),
            subscriptionTier: "free" as const,
            implicitStableId, // Link to the implicit stable
            stats: {
              stableCount: 1, // Implicit stable counts
              totalMemberCount: 1,
            },
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          const memberData = {
            id: memberId,
            organizationId,
            userId: user.uid,
            userEmail: email.toLowerCase(),
            firstName,
            lastName,
            phoneNumber: phoneNumber || null,
            roles: ["administrator"],
            primaryRole: "administrator",
            status: "active",
            showInPlanning: true,
            stableAccess: "all",
            assignedStableIds: [],
            joinedAt: Timestamp.now(),
            invitedBy: "system",
            inviteAcceptedAt: Timestamp.now(),
          };

          // Atomic batch write — all three documents succeed or none do
          const batch = db.batch();
          batch.set(implicitStableRef, implicitStableData);
          batch.set(orgRef, orgData);
          batch.set(
            db.collection("organizationMembers").doc(memberId),
            memberData,
          );
          await batch.commit();

          request.log.info(
            { userId: user.uid, organizationId, implicitStableId },
            "Created personal organization with implicit stable on signup",
          );
        } catch (orgError) {
          // Log error but don't fail signup
          request.log.error(
            { error: orgError, userId: user.uid },
            "Failed to create personal organization on signup",
          );
        }

        // Auto-accept pending invites for this email
        try {
          await migrateInvitesOnSignup(user.uid, email);
          request.log.info(
            { userId: user.uid, email },
            "Migrated pending invites on signup",
          );
        } catch (inviteError) {
          // Log error but don't fail signup
          request.log.error(
            { error: inviteError, userId: user.uid },
            "Failed to migrate invites on signup",
          );
        }

        // Auto-set defaultOrganizationId to the first non-personal organization
        try {
          const activeMemberships = await db
            .collection("organizationMembers")
            .where("userId", "==", user.uid)
            .where("status", "==", "active")
            .get();

          for (const memberDoc of activeMemberships.docs) {
            const membership = memberDoc.data();
            const orgDoc = await db
              .collection("organizations")
              .doc(membership.organizationId)
              .get();

            if (
              orgDoc.exists &&
              orgDoc.data()?.organizationType !== "personal"
            ) {
              await db
                .collection("users")
                .doc(user.uid)
                .collection("settings")
                .doc("preferences")
                .set({ defaultOrganizationId: orgDoc.id }, { merge: true });

              request.log.info(
                {
                  userId: user.uid,
                  defaultOrganizationId: orgDoc.id,
                },
                "Auto-set defaultOrganizationId to invited organization",
              );
              break;
            }
          }
        } catch (prefError) {
          // Log error but don't fail signup
          request.log.error(
            { error: prefError, userId: user.uid },
            "Failed to auto-set default organization preference",
          );
        }

        return reply.status(201).send({
          user: {
            id: user.uid,
            ...userData,
          },
        });
      } catch (error) {
        request.log.error({ error }, "Failed to complete signup");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to complete signup",
        });
      }
    },
  );

  // GET /api/v1/auth/me - Get current user profile
  fastify.get(
    "/me",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;

        const userDoc = await db.collection("users").doc(user.uid).get();

        if (!userDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User profile not found",
          });
        }

        return reply.send({
          id: userDoc.id,
          ...userDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to get user profile");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get user profile",
        });
      }
    },
  );

  // Zod schema for settings update
  const settingsSchema = z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    darkMode: z.boolean().optional(),
    timezone: z.string().optional(),
  });

  // PATCH /api/v1/auth/me/settings - Update user settings
  fastify.patch(
    "/me/settings",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const validation = settingsSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const userDoc = await db.collection("users").doc(user.uid).get();

        if (!userDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User profile not found",
          });
        }

        // Build settings object with only provided fields
        const settings: Record<string, unknown> = {};
        if (validation.data.emailNotifications !== undefined) {
          settings["settings.emailNotifications"] =
            validation.data.emailNotifications;
        }
        if (validation.data.pushNotifications !== undefined) {
          settings["settings.pushNotifications"] =
            validation.data.pushNotifications;
        }
        if (validation.data.darkMode !== undefined) {
          settings["settings.darkMode"] = validation.data.darkMode;
        }
        if (validation.data.timezone !== undefined) {
          settings["settings.timezone"] = validation.data.timezone;
        }

        if (Object.keys(settings).length > 0) {
          settings.updatedAt = Timestamp.now();
          await db.collection("users").doc(user.uid).update(settings);
        }

        // Return updated user
        const updatedDoc = await db.collection("users").doc(user.uid).get();

        return reply.send({
          id: updatedDoc.id,
          ...updatedDoc.data(),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update user settings");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update user settings",
        });
      }
    },
  );
}
