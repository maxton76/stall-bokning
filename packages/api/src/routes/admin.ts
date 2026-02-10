/**
 * Admin Routes
 *
 * API endpoints for system administration.
 * All endpoints require system_admin role.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, FieldPath } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { requireSystemAdmin } from "../middleware/requireSystemAdmin.js";
import type { AuthenticatedRequest } from "../types/index.js";
import type {
  AdminDashboardMetrics,
  AdminOrganizationSummary,
  AdminOrganizationDetail,
  AdminUserSummary,
  AdminUserDetail,
  TierDefinition,
  OrganizationSubscription,
  PaginatedResponse,
  SubscriptionTier,
  StripeProductMapping,
} from "@equiduty/shared";
import {
  DEFAULT_TIER_DEFINITIONS,
  SUBSCRIPTION_TIERS,
  getDefaultTierDefinition,
} from "@equiduty/shared";
import { stripe } from "../utils/stripe.js";
import {
  getPriceIdForTier,
  invalidateTierCache,
} from "../utils/stripeTierMapping.js";
import {
  getTierDefaults,
  invalidateTierDefaultsCache,
} from "../utils/tierDefaults.js";

const adminPreHandler = [authenticate, requireSystemAdmin];

// Valid system roles for user updates
const VALID_SYSTEM_ROLES = ["system_admin", "stable_owner", "member"];

/**
 * Validate that an :id param is safe and matches Firestore ID format
 * Firestore IDs: alphanumeric + hyphens + underscores (1-128 chars)
 * ✅ FIX: Strict regex validation prevents path traversal, URL encoding bypasses, null bytes
 */
function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

// ============================================
// JSON Schema definitions for request validation
// ============================================

const patchSubscriptionSchema = {
  body: {
    type: "object" as const,
    additionalProperties: false,
    properties: {
      tier: { type: "string" as const, minLength: 1, maxLength: 32 },
      limits: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          members: { type: "number" as const },
          stables: { type: "number" as const },
          horses: { type: "number" as const },
          routineTemplates: { type: "number" as const },
          routineSchedules: { type: "number" as const },
          feedingPlans: { type: "number" as const },
          facilities: { type: "number" as const },
          contacts: { type: "number" as const },
          supportContacts: { type: "number" as const },
        },
      },
      modules: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          analytics: { type: "boolean" as const },
          selectionProcess: { type: "boolean" as const },
          locationHistory: { type: "boolean" as const },
          photoEvidence: { type: "boolean" as const },
          leaveManagement: { type: "boolean" as const },
          inventory: { type: "boolean" as const },
          lessons: { type: "boolean" as const },
          staffMatrix: { type: "boolean" as const },
          advancedPermissions: { type: "boolean" as const },
          integrations: { type: "boolean" as const },
          manure: { type: "boolean" as const },
          aiAssistant: { type: "boolean" as const },
          supportAccess: { type: "boolean" as const },
        },
      },
      addons: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          portal: { type: "boolean" as const },
          invoicing: { type: "boolean" as const },
        },
      },
      overrides: {
        type: "object" as const,
      },
    },
  },
};

const patchUserSchema = {
  body: {
    type: "object" as const,
    additionalProperties: false,
    properties: {
      systemRole: {
        type: "string" as const,
        enum: VALID_SYSTEM_ROLES,
      },
      disabled: { type: "boolean" as const },
    },
  },
};

const putTierSchema = {
  body: {
    type: "object" as const,
    additionalProperties: false,
    properties: {
      name: { type: "string" as const },
      description: { type: "string" as const },
      price: { type: "number" as const },
      limits: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          members: { type: "number" as const },
          stables: { type: "number" as const },
          horses: { type: "number" as const },
          routineTemplates: { type: "number" as const },
          routineSchedules: { type: "number" as const },
          feedingPlans: { type: "number" as const },
          facilities: { type: "number" as const },
          contacts: { type: "number" as const },
          supportContacts: { type: "number" as const },
        },
      },
      modules: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          analytics: { type: "boolean" as const },
          selectionProcess: { type: "boolean" as const },
          locationHistory: { type: "boolean" as const },
          photoEvidence: { type: "boolean" as const },
          leaveManagement: { type: "boolean" as const },
          inventory: { type: "boolean" as const },
          lessons: { type: "boolean" as const },
          staffMatrix: { type: "boolean" as const },
          advancedPermissions: { type: "boolean" as const },
          integrations: { type: "boolean" as const },
          manure: { type: "boolean" as const },
          aiAssistant: { type: "boolean" as const },
          supportAccess: { type: "boolean" as const },
        },
      },
      addons: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          portal: { type: "boolean" as const },
          invoicing: { type: "boolean" as const },
        },
      },
      enabled: { type: "boolean" as const },
      isBillable: { type: "boolean" as const },
      sortOrder: { type: "number" as const },
      visibility: { type: "string" as const, enum: ["public", "hidden"] },
    },
  },
};

// ============================================
// JSON Schema for notification test endpoint
// ============================================

const testNotificationSchema = {
  body: {
    type: "object" as const,
    required: ["userId", "title", "body", "channels"],
    additionalProperties: false,
    properties: {
      userId: { type: "string" as const, minLength: 1, maxLength: 128 },
      title: { type: "string" as const, minLength: 1, maxLength: 200 },
      body: { type: "string" as const, minLength: 1, maxLength: 1000 },
      channels: {
        type: "array" as const,
        items: {
          type: "string" as const,
          enum: ["push", "inApp", "email"],
        },
        minItems: 1,
      },
      priority: {
        type: "string" as const,
        enum: ["low", "normal", "high", "urgent"],
      },
      actionUrl: { type: "string" as const, maxLength: 500 },
      imageUrl: { type: "string" as const, maxLength: 500 },
    },
  },
};

export const adminRoutes = async (fastify: FastifyInstance) => {
  // ============================================
  // DASHBOARD
  // ============================================

  /**
   * GET /dashboard - Mocked dashboard metrics
   */
  fastify.get(
    "/dashboard",
    { preHandler: adminPreHandler },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // Phase 1: Return mocked metrics
      const metrics: AdminDashboardMetrics = {
        totalOrganizations: 47,
        totalUsers: 312,
        totalHorses: 891,
        activeSubscriptions: {
          free: 28,
          standard: 12,
          pro: 5,
          enterprise: 2,
        },
        mrr: 8370,
        newSignups30d: 23,
        activeUsers7d: 156,
        openSupportTickets: 4,
      };

      return reply.send(metrics);
    },
  );

  // ============================================
  // ORGANIZATIONS
  // ============================================

  /**
   * GET /organizations - List all organizations (paginated, searchable)
   */
  fastify.get(
    "/organizations",
    { preHandler: adminPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        search,
        page = "1",
        limit = "20",
      } = request.query as {
        search?: string;
        page?: string;
        limit?: string;
      };

      const parsedPage = parseInt(page, 10);
      const parsedLimit = parseInt(limit, 10);
      const pageNum = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
      const limitNum = Math.min(
        100,
        Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit),
      );

      try {
        // Cap max fetch to prevent excessive memory usage
        const maxFetch = Math.min(limitNum * pageNum, 1000);
        let query = db
          .collection("organizations")
          .orderBy("createdAt", "desc")
          .limit(maxFetch);

        const snapshot = await query.get();
        let orgs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            tier:
              data.subscriptionTier ||
              data.subscription?.tier ||
              getDefaultTierDefinition().tier,
            memberCount: data.memberCount || data.stats?.totalMemberCount || 0,
            horseCount: data.horseCount || 0,
            stableCount: data.stableCount || data.stats?.stableCount || 0,
            createdAt: data.createdAt,
            ownerEmail: data.ownerEmail || "",
          } as AdminOrganizationSummary;
        });

        // Client-side search filter (Firestore doesn't support full-text search)
        if (search) {
          const searchLower = search.toLowerCase();
          orgs = orgs.filter(
            (org) =>
              org.name.toLowerCase().includes(searchLower) ||
              (org.ownerEmail &&
                org.ownerEmail.toLowerCase().includes(searchLower)),
          );
        }

        const total = orgs.length;
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedOrgs = orgs.slice(startIndex, startIndex + limitNum);

        const response: PaginatedResponse<AdminOrganizationSummary> = {
          data: paginatedOrgs,
          total,
          page: pageNum,
          limit: limitNum,
          hasMore: startIndex + limitNum < total,
        };

        return reply.send(response);
      } catch (error) {
        request.log.error({ error }, "Failed to list organizations");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organizations",
        });
      }
    },
  );

  /**
   * GET /organizations/:id - Organization detail with subscription
   */
  fastify.get(
    "/organizations/:id",
    { preHandler: adminPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      if (!isValidId(id)) {
        return reply.status(400).send({ error: "Invalid ID" });
      }

      try {
        const orgDoc = await db.collection("organizations").doc(id).get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        const data = orgDoc.data()!;

        // Build default subscription if none exists
        const defaultDef = getDefaultTierDefinition();
        const defaultSub: OrganizationSubscription = {
          tier: defaultDef.tier,
          limits: defaultDef.limits,
          modules: defaultDef.modules,
          addons: defaultDef.addons,
        };

        const detail: AdminOrganizationDetail = {
          id: orgDoc.id,
          name: data.name || "",
          tier:
            data.subscriptionTier || data.subscription?.tier || defaultDef.tier,
          memberCount: data.memberCount || data.stats?.totalMemberCount || 0,
          horseCount: data.horseCount || 0,
          stableCount: data.stableCount || data.stats?.stableCount || 0,
          createdAt: data.createdAt,
          ownerEmail: data.ownerEmail || "",
          subscription: data.subscription || defaultSub,
          ownerId: data.ownerId || "",
          ownerName: data.ownerName || "",
        };

        return reply.send(detail);
      } catch (error) {
        request.log.error({ error }, "Failed to get organization detail");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organization",
        });
      }
    },
  );

  /**
   * PATCH /organizations/:id/subscription - Update organization subscription
   */
  fastify.patch(
    "/organizations/:id/subscription",
    { preHandler: adminPreHandler, schema: patchSubscriptionSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      if (!isValidId(id)) {
        return reply.status(400).send({ error: "Invalid ID" });
      }

      const subscription = request.body as Partial<OrganizationSubscription>;

      try {
        const orgRef = db.collection("organizations").doc(id);
        const orgDoc = await orgRef.get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        // Merge subscription update
        const currentData = orgDoc.data()!;
        const currentSub = currentData.subscription || {};
        const updatedSub = {
          ...currentSub,
          ...subscription,
          // Deep merge nested objects
          ...(subscription.limits && {
            limits: { ...currentSub.limits, ...subscription.limits },
          }),
          ...(subscription.modules && {
            modules: { ...currentSub.modules, ...subscription.modules },
          }),
          ...(subscription.addons && {
            addons: { ...currentSub.addons, ...subscription.addons },
          }),
        };

        // Build update payload — sync subscriptionTier when tier changes
        const updatePayload: Record<string, unknown> = {
          subscription: updatedSub,
          updatedAt: new Date(),
        };

        if (subscription.tier) {
          updatePayload.subscriptionTier = subscription.tier;
        }

        // If tier change requires Stripe sync, use a transactional approach:
        // 1. Update Stripe first (external call)
        // 2. Only update Firestore if Stripe succeeds
        if (
          subscription.tier &&
          currentData.stripeSubscription?.subscriptionId
        ) {
          const stripeSubId = currentData.stripeSubscription.subscriptionId;
          const billingInterval =
            currentData.stripeSubscription.billingInterval || "month";

          try {
            const newTierDef = await getTierDefaults(subscription.tier);
            if (newTierDef && !newTierDef.isBillable) {
              await stripe.subscriptions.update(stripeSubId, {
                cancel_at_period_end: true,
              });
              request.log.info(
                { orgId: id, tier: subscription.tier },
                "Admin set tier to non-billable — Stripe subscription set to cancel at period end",
              );
            } else {
              const newPriceId = await getPriceIdForTier(
                subscription.tier,
                billingInterval,
              );

              if (newPriceId) {
                const stripeSub =
                  await stripe.subscriptions.retrieve(stripeSubId);
                const currentItemId = stripeSub.items.data[0]?.id;

                if (currentItemId) {
                  await stripe.subscriptions.update(stripeSubId, {
                    items: [{ id: currentItemId, price: newPriceId }],
                    cancel_at_period_end: false,
                    proration_behavior: "create_prorations",
                  });
                  request.log.info(
                    { orgId: id, tier: subscription.tier },
                    "Admin changed tier — Stripe subscription updated",
                  );
                }
              }
            }
          } catch (stripeError) {
            // Stripe failed — do NOT update Firestore to avoid divergence
            request.log.error(
              { error: stripeError, orgId: id },
              "Failed to sync tier change to Stripe — Firestore update aborted to prevent state divergence",
            );
            return reply.status(502).send({
              error: "Stripe sync failed",
              message: "Tier change was not applied. Please try again.",
            });
          }
        }

        // Stripe succeeded (or no Stripe sync needed) — now update Firestore
        await orgRef.update(updatePayload);

        return reply.send({ success: true, subscription: updatedSub });
      } catch (error) {
        request.log.error({ error }, "Failed to update subscription");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update subscription",
        });
      }
    },
  );

  // ============================================
  // USERS
  // ============================================

  /**
   * GET /users - List all users (paginated, searchable)
   */
  fastify.get(
    "/users",
    { preHandler: adminPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        search,
        page = "1",
        limit = "20",
      } = request.query as {
        search?: string;
        page?: string;
        limit?: string;
      };

      const parsedPage = parseInt(page, 10);
      const parsedLimit = parseInt(limit, 10);
      const pageNum = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
      const limitNum = Math.min(
        100,
        Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit),
      );

      try {
        // Cap max fetch to prevent excessive memory usage
        const maxFetch = Math.min(limitNum * pageNum, 1000);
        const snapshot = await db
          .collection("users")
          .orderBy("createdAt", "desc")
          .limit(maxFetch)
          .get();

        let users = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            email: data.email || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            systemRole: data.systemRole || "member",
            organizationCount: 0, // Will be populated separately if needed
            lastActive: data.lastActive,
            createdAt: data.createdAt,
            disabled: data.disabled || false,
          } as AdminUserSummary;
        });

        // Client-side search filter
        if (search) {
          const searchLower = search.toLowerCase();
          users = users.filter(
            (u) =>
              u.email.toLowerCase().includes(searchLower) ||
              u.firstName.toLowerCase().includes(searchLower) ||
              u.lastName.toLowerCase().includes(searchLower),
          );
        }

        const total = users.length;
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedUsers = users.slice(startIndex, startIndex + limitNum);

        const response: PaginatedResponse<AdminUserSummary> = {
          data: paginatedUsers,
          total,
          page: pageNum,
          limit: limitNum,
          hasMore: startIndex + limitNum < total,
        };

        return reply.send(response);
      } catch (error) {
        request.log.error({ error }, "Failed to list users");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch users",
        });
      }
    },
  );

  /**
   * GET /users/:id - User detail
   */
  fastify.get(
    "/users/:id",
    { preHandler: adminPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      if (!isValidId(id)) {
        return reply.status(400).send({ error: "Invalid ID" });
      }

      try {
        const userDoc = await db.collection("users").doc(id).get();

        if (!userDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          });
        }

        const data = userDoc.data()!;

        // Get user's organization memberships
        const memberships = await db
          .collection("organizationMembers")
          .where("userId", "==", id)
          .where("status", "==", "active")
          .get();

        const orgIds = memberships.docs.map((doc) => doc.data().organizationId);
        const organizations: Array<{ id: string; name: string; role: string }> =
          [];

        for (const orgId of orgIds) {
          const orgDoc = await db.collection("organizations").doc(orgId).get();
          if (orgDoc.exists) {
            const memberDoc = memberships.docs.find(
              (d) => d.data().organizationId === orgId,
            );
            organizations.push({
              id: orgId,
              name: orgDoc.data()!.name || "",
              role: memberDoc?.data()?.role || "member",
            });
          }
        }

        const detail: AdminUserDetail = {
          uid: userDoc.id,
          email: data.email || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          systemRole: data.systemRole || "member",
          organizationCount: organizations.length,
          lastActive: data.lastActive,
          createdAt: data.createdAt,
          disabled: data.disabled || false,
          organizations,
        };

        return reply.send(detail);
      } catch (error) {
        request.log.error({ error }, "Failed to get user detail");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch user",
        });
      }
    },
  );

  /**
   * PATCH /users/:id - Update user (disable, grant admin)
   */
  fastify.patch(
    "/users/:id",
    { preHandler: adminPreHandler, schema: patchUserSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      if (!isValidId(id)) {
        return reply.status(400).send({ error: "Invalid ID" });
      }

      const updates = request.body as {
        systemRole?: string;
        disabled?: boolean;
      };

      // Prevent self-demotion
      const currentUser = (request as AuthenticatedRequest).user;
      if (
        currentUser &&
        id === currentUser.uid &&
        updates.systemRole !== undefined &&
        updates.systemRole !== "system_admin"
      ) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Cannot demote yourself",
        });
      }

      try {
        const userRef = db.collection("users").doc(id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          });
        }

        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (updates.systemRole !== undefined) {
          updateData.systemRole = updates.systemRole;
        }

        if (updates.disabled !== undefined) {
          updateData.disabled = updates.disabled;
        }

        await userRef.update(updateData);

        return reply.send({ success: true });
      } catch (error) {
        request.log.error({ error }, "Failed to update user");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update user",
        });
      }
    },
  );

  // ============================================
  // TIER DEFINITIONS
  // ============================================

  /**
   * GET /tiers - List all tier definitions
   */
  fastify.get(
    "/tiers",
    { preHandler: adminPreHandler },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const snapshot = await db.collection("tierDefinitions").get();

        if (snapshot.empty) {
          // Return defaults if no tier definitions exist yet
          return reply.send(Object.values(DEFAULT_TIER_DEFINITIONS));
        }

        const tiers = snapshot.docs.map((doc) => ({
          ...doc.data(),
          tier: doc.id,
        })) as TierDefinition[];

        // Sort by sortOrder field
        tiers.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

        return reply.send(tiers);
      } catch (error) {
        _request.log.error({ error }, "Failed to list tiers");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch tier definitions",
        });
      }
    },
  );

  /**
   * PUT /tiers/:tier - Update a tier definition
   */
  fastify.put(
    "/tiers/:tier",
    { preHandler: adminPreHandler, schema: putTierSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tier } = request.params as { tier: string };

      // Validate tier key format (slug: lowercase alphanumeric + hyphens, max 32 chars)
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tier) || tier.length > 32) {
        return reply.status(400).send({
          error: "Bad Request",
          message:
            "Tier key must be lowercase alphanumeric with hyphens, max 32 characters",
        });
      }

      try {
        const tierRef = db.collection("tierDefinitions").doc(tier);

        const user = (request as AuthenticatedRequest).user;

        const definition = request.body as Partial<TierDefinition>;

        await tierRef.set(
          {
            ...definition,
            tier,
            updatedAt: new Date(),
            updatedBy: user?.uid || "unknown",
          },
          { merge: true },
        );

        invalidateTierDefaultsCache(tier);

        return reply.send({ success: true });
      } catch (error) {
        request.log.error({ error }, "Failed to update tier definition");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update tier definition",
        });
      }
    },
  );

  /**
   * POST /tiers/:tier/reset - Reset tier to default values
   */
  fastify.post(
    "/tiers/:tier/reset",
    { preHandler: adminPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tier } = request.params as { tier: string };

      if (!SUBSCRIPTION_TIERS.includes(tier)) {
        return reply.status(400).send({
          error: "Bad Request",
          message: `Invalid tier: ${tier}`,
        });
      }

      try {
        const defaults = DEFAULT_TIER_DEFINITIONS[tier as SubscriptionTier];
        const tierRef = db.collection("tierDefinitions").doc(tier);

        const user = (request as AuthenticatedRequest).user;

        await tierRef.set({
          ...defaults,
          updatedAt: new Date(),
          updatedBy: user?.uid || "unknown",
        });

        invalidateTierDefaultsCache(tier);

        return reply.send({ success: true, definition: defaults });
      } catch (error) {
        request.log.error({ error }, "Failed to reset tier definition");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to reset tier definition",
        });
      }
    },
  );

  /**
   * POST /tiers - Create a new tier definition
   */
  const createTierSchema = {
    body: {
      type: "object" as const,
      required: [
        "tier",
        "name",
        "description",
        "price",
        "limits",
        "modules",
        "addons",
      ],
      additionalProperties: false,
      properties: {
        tier: { type: "string" as const, minLength: 1, maxLength: 32 },
        name: { type: "string" as const, minLength: 1, maxLength: 100 },
        description: { type: "string" as const, maxLength: 500 },
        price: { type: "number" as const, minimum: 0 },
        limits: putTierSchema.body.properties.limits,
        modules: putTierSchema.body.properties.modules,
        addons: putTierSchema.body.properties.addons,
        enabled: { type: "boolean" as const },
        isBillable: { type: "boolean" as const },
        sortOrder: { type: "number" as const },
        visibility: { type: "string" as const, enum: ["public", "hidden"] },
        features: {
          type: "array" as const,
          items: { type: "string" as const },
        },
        popular: { type: "boolean" as const },
      },
    },
  };

  fastify.post(
    "/tiers",
    { preHandler: adminPreHandler, schema: createTierSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as TierDefinition;
      const tierKey = body.tier.trim().toLowerCase();

      // Validate slug format
      if (
        !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tierKey) ||
        tierKey.length > 32
      ) {
        return reply.status(400).send({
          error: "Bad Request",
          message:
            "Tier key must be lowercase alphanumeric with hyphens, max 32 characters",
        });
      }

      try {
        // Check if tier already exists
        const existing = await db
          .collection("tierDefinitions")
          .doc(tierKey)
          .get();
        if (existing.exists) {
          return reply.status(409).send({
            error: "Conflict",
            message: `Tier "${tierKey}" already exists`,
          });
        }

        const user = (request as AuthenticatedRequest).user;

        await db
          .collection("tierDefinitions")
          .doc(tierKey)
          .set({
            ...body,
            tier: tierKey,
            updatedAt: new Date(),
            updatedBy: user?.uid || "unknown",
          });

        invalidateTierDefaultsCache();

        return reply.status(201).send({ success: true, tier: tierKey });
      } catch (error) {
        request.log.error({ error }, "Failed to create tier");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create tier",
        });
      }
    },
  );

  /**
   * DELETE /tiers/:tier - Delete or soft-delete a tier
   */
  fastify.delete(
    "/tiers/:tier",
    { preHandler: adminPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tier } = request.params as { tier: string };

      // Check if this is the default tier (cannot be deleted)
      const tierDef = await getTierDefaults(tier);
      if (tierDef?.isDefault) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "The default tier cannot be deleted",
        });
      }

      try {
        const tierRef = db.collection("tierDefinitions").doc(tier);
        const tierDoc = await tierRef.get();

        if (!tierDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: `Tier "${tier}" not found`,
          });
        }

        // Check if any organizations use this tier
        const orgCount = await db
          .collection("organizations")
          .where("subscriptionTier", "==", tier)
          .count()
          .get();

        const count = orgCount.data().count;

        if (count > 0) {
          // Soft-delete: disable and hide
          const user = (request as AuthenticatedRequest).user;
          await tierRef.update({
            enabled: false,
            visibility: "hidden",
            updatedAt: new Date(),
            updatedBy: user?.uid || "unknown",
          });

          invalidateTierDefaultsCache(tier);

          return reply.send({
            success: true,
            softDeleted: true,
            organizationCount: count,
            message: `Tier disabled and hidden (${count} organization(s) still reference it)`,
          });
        }

        // Hard delete
        await tierRef.delete();
        invalidateTierDefaultsCache(tier);

        return reply.send({ success: true, softDeleted: false });
      } catch (error) {
        request.log.error({ error }, "Failed to delete tier");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete tier",
        });
      }
    },
  );

  // ============================================
  // STRIPE PRODUCTS
  // ============================================

  const putStripeProductSchema = {
    body: {
      type: "object" as const,
      required: ["stripeProductId", "prices"],
      additionalProperties: false,
      properties: {
        stripeProductId: { type: "string" as const, minLength: 1 },
        prices: {
          type: "object" as const,
          required: ["month", "year"],
          additionalProperties: false,
          properties: {
            month: { type: "string" as const, minLength: 1 },
            year: { type: "string" as const, minLength: 1 },
          },
        },
      },
    },
  };

  /**
   * GET /stripe-products - List all Stripe product mappings
   */
  fastify.get(
    "/stripe-products",
    { preHandler: adminPreHandler },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const snapshot = await db.collection("stripeProducts").get();

        const products: StripeProductMapping[] = snapshot.docs.map((doc) => ({
          tier: doc.id as SubscriptionTier,
          ...doc.data(),
        })) as StripeProductMapping[];

        return reply.send(products);
      } catch (error) {
        _request.log.error({ error }, "Failed to list stripe products");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch stripe products",
        });
      }
    },
  );

  /**
   * PUT /stripe-products/:tier - Upsert Stripe product mapping for a tier
   */
  fastify.put(
    "/stripe-products/:tier",
    { preHandler: adminPreHandler, schema: putStripeProductSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tier } = request.params as { tier: string };
      // Validate tier exists and is billable
      const tierDoc = await db.collection("tierDefinitions").doc(tier).get();
      const tierDef = tierDoc.exists
        ? tierDoc.data()
        : DEFAULT_TIER_DEFINITIONS[tier];
      if (!tierDef) {
        return reply.status(404).send({
          error: "Not Found",
          message: `Tier "${tier}" not found`,
        });
      }
      if (!tierDef.isBillable) {
        return reply.status(400).send({
          error: "Bad Request",
          message: `Tier "${tier}" is not billable. Enable billing in tier settings first.`,
        });
      }

      const body = request.body as {
        stripeProductId: string;
        prices: { month: string; year: string };
      };

      try {
        const user = (request as AuthenticatedRequest).user;

        await db
          .collection("stripeProducts")
          .doc(tier)
          .set(
            {
              tier,
              stripeProductId: body.stripeProductId,
              prices: body.prices,
              updatedAt: new Date(),
              updatedBy: user?.uid || "unknown",
            },
            { merge: true },
          );

        invalidateTierCache();

        return reply.send({ success: true });
      } catch (error) {
        request.log.error({ error }, "Failed to update stripe product mapping");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update stripe product mapping",
        });
      }
    },
  );

  /**
   * GET /api/v1/admin/organizations/:orgId/beta-features
   * Get beta features enabled for a specific organization
   */
  fastify.get<{
    Params: { orgId: string };
  }>(
    "/organizations/:orgId/beta-features",
    { preHandler: adminPreHandler },
    async (request, reply) => {
      try {
        const { orgId } = request.params;

        if (!isValidId(orgId)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid organization ID",
          });
        }

        const orgDoc = await db.collection("organizations").doc(orgId).get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: `Organization ${orgId} not found`,
          });
        }

        const org = orgDoc.data();
        const betaFeatures = (org?.betaFeatures as string[]) || [];

        return reply.send({
          success: true,
          data: {
            organizationId: orgId,
            betaFeatures,
          },
        });
      } catch (error) {
        request.log.error(
          { error },
          "Failed to get organization beta features",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get organization beta features",
        });
      }
    },
  );

  /**
   * PUT /api/v1/admin/organizations/:orgId/beta-features
   * Set beta features for a specific organization
   */
  fastify.put<{
    Params: { orgId: string };
    Body: { betaFeatures: string[] };
  }>(
    "/organizations/:orgId/beta-features",
    { preHandler: adminPreHandler },
    async (request, reply) => {
      try {
        const { orgId } = request.params;
        const { betaFeatures } = request.body as { betaFeatures: string[] };

        if (!isValidId(orgId)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid organization ID",
          });
        }

        if (!Array.isArray(betaFeatures)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "betaFeatures must be an array",
          });
        }

        // Validate array contains only non-empty strings
        if (
          betaFeatures.some(
            (f) => typeof f !== "string" || f.trim().length === 0,
          )
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "All betaFeatures must be non-empty strings",
          });
        }

        // Remove duplicates and trim
        const uniqueFeatures = [...new Set(betaFeatures.map((f) => f.trim()))];

        // Limit array size to prevent abuse
        if (uniqueFeatures.length > 100) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Maximum 100 beta features per organization",
          });
        }

        // Capture current features for audit trail
        let currentFeatures: string[] = [];
        let revokedFeatures: string[] = [];

        // Use transaction to prevent race conditions
        await db.runTransaction(async (transaction) => {
          const orgRef = db.collection("organizations").doc(orgId);
          const orgDoc = await transaction.get(orgRef);

          if (!orgDoc.exists) {
            throw new Error(`Organization ${orgId} not found`);
          }

          // Capture current beta features
          currentFeatures = (orgDoc.data()?.betaFeatures as string[]) || [];
          revokedFeatures = currentFeatures.filter(
            (f) => !uniqueFeatures.includes(f),
          );

          // Validate feature keys inside transaction to prevent TOCTOU
          const { getGlobalFeatureToggles } =
            await import("../services/featureToggleService.js");
          const toggles = await getGlobalFeatureToggles();

          for (const featureKey of uniqueFeatures) {
            if (!toggles[featureKey]) {
              throw new Error(`Invalid feature key: ${featureKey}`);
            }
          }

          // Update organization beta features
          transaction.update(orgRef, {
            betaFeatures: uniqueFeatures,
            updatedAt: new Date(),
          });
        });

        // Mandatory audit log for revoked beta access
        if (revokedFeatures.length > 0) {
          try {
            await db.collection("auditLogs").add({
              type: "beta_access_revoked",
              organizationId: orgId,
              features: revokedFeatures,
              timestamp: new Date(),
              performedBy: (request as any).user?.uid || "system",
            });
          } catch (auditError) {
            request.log.error(
              { auditError, orgId, features: revokedFeatures },
              "CRITICAL: Mandatory audit log failed",
            );
            // Fail the operation - audit logging is mandatory for compliance
            throw new Error("Operation failed: Audit logging is mandatory");
          }
        }

        // Invalidate cache immediately after successful update
        const { invalidateOrgBetaCache } =
          await import("../services/featureToggleService.js");
        invalidateOrgBetaCache(orgId);

        return reply.send({
          success: true,
          message: `Beta features updated for organization ${orgId}`,
          data: {
            organizationId: orgId,
            betaFeatures,
          },
        });
      } catch (error) {
        request.log.error(
          { error },
          "Failed to update organization beta features",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update organization beta features",
        });
      }
    },
  );

  // ============================================
  // NOTIFICATION TESTING
  // ============================================

  /**
   * GET /notifications/users-with-tokens - List users who have FCM tokens registered
   */
  fastify.get(
    "/notifications/users-with-tokens",
    { preHandler: adminPreHandler },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const usersSnapshot = await db.collection("users").get();
        const usersWithTokens: Array<{
          id: string;
          email: string;
          displayName: string;
          tokens: Array<{ deviceName: string; platform: string }>;
        }> = [];

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          // Check for FCM tokens in the user's notification preferences subcollection
          const prefsDoc = await db
            .collection("users")
            .doc(userDoc.id)
            .collection("preferences")
            .doc("notifications")
            .get();

          if (!prefsDoc.exists) continue;

          const prefs = prefsDoc.data();
          const fcmTokens = prefs?.push?.fcmTokens || [];

          if (fcmTokens.length === 0) continue;

          usersWithTokens.push({
            id: userDoc.id,
            email: userData.email || "",
            displayName:
              `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
              userData.email ||
              userDoc.id,
            tokens: fcmTokens.map(
              (t: { deviceName?: string; platform?: string }) => ({
                deviceName: t.deviceName || "Unknown device",
                platform: t.platform || "unknown",
              }),
            ),
          });
        }

        return reply.send({ users: usersWithTokens });
      } catch (error) {
        request.log.error({ error }, "Failed to list users with FCM tokens");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch users with tokens",
        });
      }
    },
  );

  /**
   * POST /notifications/test-send - Send a test notification
   */
  fastify.post(
    "/notifications/test-send",
    { preHandler: adminPreHandler, schema: testNotificationSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        userId,
        title,
        body,
        channels,
        priority = "normal",
        actionUrl,
        imageUrl,
      } = request.body as {
        userId: string;
        title: string;
        body: string;
        channels: string[];
        priority?: string;
        actionUrl?: string;
        imageUrl?: string;
      };

      if (!isValidId(userId)) {
        return reply.status(400).send({ error: "Invalid user ID" });
      }

      try {
        // Verify user exists
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
          return reply
            .status(404)
            .send({ error: "Not Found", message: "User not found" });
        }

        const userData = userDoc.data()!;
        const now = new Date();

        // Create notification document
        const notificationRef = db.collection("notifications").doc();
        const notificationData = {
          userId,
          userEmail: userData.email || "",
          type: "system_alert",
          priority,
          title,
          body,
          entityType: "organization",
          channels,
          deliveryStatus: Object.fromEntries(
            channels.map((ch: string) => [ch, "pending"]),
          ),
          deliveryAttempts: 0,
          read: false,
          ...(actionUrl && { actionUrl }),
          createdAt: now,
          updatedAt: now,
        };

        await notificationRef.set(notificationData);

        // Create queue items for each channel
        let queued = 0;

        for (const channel of channels) {
          if (channel === "push") {
            // Get user's FCM tokens
            const prefsDoc = await db
              .collection("users")
              .doc(userId)
              .collection("preferences")
              .doc("notifications")
              .get();

            const fcmTokens = prefsDoc.data()?.push?.fcmTokens || [];

            // Create one queue item per FCM token
            for (const tokenEntry of fcmTokens) {
              const queueRef = db.collection("notificationQueue").doc();
              await queueRef.set({
                notificationId: notificationRef.id,
                userId,
                channel: "push",
                priority,
                payload: {
                  title,
                  body,
                  ...(imageUrl && { imageUrl }),
                  data: {
                    notificationId: notificationRef.id,
                    type: "system_alert",
                    ...(actionUrl && { actionUrl }),
                  },
                },
                fcmToken: tokenEntry.token,
                status: "pending",
                attempts: 0,
                maxAttempts: 3,
                scheduledFor: now,
                createdAt: now,
              });
              queued++;
            }
          } else {
            // inApp or email — one queue item each
            const queueRef = db.collection("notificationQueue").doc();
            await queueRef.set({
              notificationId: notificationRef.id,
              userId,
              channel,
              priority,
              payload: {
                title,
                body,
                ...(imageUrl && { imageUrl }),
                data: {
                  notificationId: notificationRef.id,
                  type: "system_alert",
                  ...(actionUrl && { actionUrl }),
                },
              },
              ...(channel === "email" && {
                emailData: { to: userData.email },
              }),
              status: "pending",
              attempts: 0,
              maxAttempts: 3,
              scheduledFor: now,
              createdAt: now,
            });
            queued++;
          }
        }

        request.log.info(
          {
            notificationId: notificationRef.id,
            userId,
            channels,
            queued,
          },
          "Admin sent test notification",
        );

        return reply.send({
          success: true,
          notificationId: notificationRef.id,
          queued,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to send test notification");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to send test notification",
        });
      }
    },
  );

  // ============================================================================
  // HORSE MANAGEMENT
  // ============================================================================

  /**
   * GET /admin/horses - List all horses with admin context
   */
  fastify.get<{
    Querystring: {
      search?: string;
      page?: string;
      limit?: string;
    };
  }>("/horses", { preHandler: adminPreHandler }, async (request, reply) => {
    try {
      const { search, page = "1", limit = "20" } = request.query;
      const parsedPage = parseInt(page, 10);
      const parsedLimit = parseInt(limit, 10);
      const pageNum = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
      const limitNum = Math.min(
        100,
        Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit),
      );

      let horsesQuery = db.collection("horses").orderBy("name", "asc");

      // Apply search filter FIRST (before counting)
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        // Use searchName field for case-insensitive search
        horsesQuery = horsesQuery
          .where("searchName", ">=", searchLower)
          .where("searchName", "<=", searchLower + "\uf8ff");
      }

      // Get total count AFTER applying search filter
      const countSnapshot = await horsesQuery.count().get();
      const total = countSnapshot.data().count;

      // Apply pagination
      const offset = (pageNum - 1) * limitNum;
      const snapshot = await horsesQuery.limit(limitNum).offset(offset).get();

      // Collect all unique IDs for batch fetching (eliminates N+1 queries)
      const ownerIds = new Set<string>();
      const stableIds = new Set<string>();

      for (const doc of snapshot.docs) {
        const horse = doc.data();
        if (horse.ownerId) ownerIds.add(horse.ownerId);
        if (horse.currentStableId) stableIds.add(horse.currentStableId);
      }

      // Batch fetch owners (max 10 per query due to Firestore 'in' limit)
      const ownerMap = new Map<string, any>();
      if (ownerIds.size > 0) {
        const ownerIdArray = Array.from(ownerIds);
        // Handle batches of 10 (Firestore 'in' query limit)
        for (let i = 0; i < ownerIdArray.length; i += 10) {
          const batch = ownerIdArray.slice(i, i + 10);
          const ownerDocs = await db
            .collection("users")
            .where(FieldPath.documentId(), "in", batch)
            .get();
          ownerDocs.forEach((doc) => ownerMap.set(doc.id, doc.data()));
        }
      }

      // Batch fetch stables and collect organization IDs
      const stableMap = new Map<string, any>();
      const orgIds = new Set<string>();
      if (stableIds.size > 0) {
        const stableIdArray = Array.from(stableIds);
        // Handle batches of 10
        for (let i = 0; i < stableIdArray.length; i += 10) {
          const batch = stableIdArray.slice(i, i + 10);
          const stableDocs = await db
            .collection("stables")
            .where(FieldPath.documentId(), "in", batch)
            .get();
          stableDocs.forEach((doc) => {
            const data = doc.data();
            stableMap.set(doc.id, data);
            if (data.organizationId) orgIds.add(data.organizationId);
          });
        }
      }

      // Batch fetch organizations
      const orgMap = new Map<string, any>();
      if (orgIds.size > 0) {
        const orgIdArray = Array.from(orgIds);
        // Handle batches of 10
        for (let i = 0; i < orgIdArray.length; i += 10) {
          const batch = orgIdArray.slice(i, i + 10);
          const orgDocs = await db
            .collection("organizations")
            .where(FieldPath.documentId(), "in", batch)
            .get();
          orgDocs.forEach((doc) => orgMap.set(doc.id, doc.data()));
        }
      }

      // Build horses array using cached data (no individual queries)
      const horses = [];
      for (const doc of snapshot.docs) {
        const horse = doc.data();

        // Lookup from cached maps instead of individual queries
        const owner = horse.ownerId ? ownerMap.get(horse.ownerId) : null;
        const stable = horse.currentStableId
          ? stableMap.get(horse.currentStableId)
          : null;
        const org = stable?.organizationId
          ? orgMap.get(stable.organizationId)
          : null;

        horses.push({
          id: doc.id,
          name: horse.name,
          breed: horse.breed,
          color: horse.color,
          ownerId: horse.ownerId,
          ownerName: owner
            ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim()
            : undefined,
          ownerEmail: owner?.email,
          currentStableId: horse.currentStableId,
          currentStableName: stable?.name,
          organizationId: stable?.organizationId,
          organizationName: org?.name,
          isExternal: horse.isExternal || false,
          createdAt:
            horse.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
        });
      }

      return reply.send({
        data: horses,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: offset + limitNum < total,
      });
    } catch (error) {
      request.log.error({ error }, "Failed to fetch admin horses");
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to fetch horses",
      });
    }
  });
};
