/**
 * Admin Routes
 *
 * API endpoints for system administration.
 * All endpoints require system_admin role.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
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
 * Validate that an :id param is safe (no path separators)
 */
function isValidId(id: string): boolean {
  return !!id && !id.includes("/") && !id.includes("\\") && !id.includes("..");
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
        // Server-side pagination with Firestore limit + cursor
        let query = db
          .collection("organizations")
          .orderBy("createdAt", "desc")
          .limit(limitNum * pageNum); // Fetch enough docs for current page

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
        const snapshot = await db
          .collection("users")
          .orderBy("createdAt", "desc")
          .limit(limitNum * pageNum) // Limit fetch size
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
        request.log.error({ error }, "Failed to get organization beta features");
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

        // Validate that all feature keys exist in global toggles
        const { getGlobalFeatureToggles } = await import(
          "../services/featureToggleService.js"
        );
        const toggles = await getGlobalFeatureToggles();

        for (const featureKey of betaFeatures) {
          if (!toggles[featureKey]) {
            return reply.status(400).send({
              error: "Bad Request",
              message: `Invalid feature key: ${featureKey}`,
            });
          }
        }

        const orgDoc = await db.collection("organizations").doc(orgId).get();

        if (!orgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: `Organization ${orgId} not found`,
          });
        }

        // Update organization beta features
        await db.collection("organizations").doc(orgId).update({
          betaFeatures,
          updatedAt: new Date(),
        });

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
};
