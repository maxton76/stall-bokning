import type { FastifyInstance } from "fastify";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { isSystemAdmin } from "../utils/authorization.js";
import { hasPermission } from "../utils/permissionEngine.js";
import { serializeTimestamps } from "../utils/serialization.js";

export async function billingGroupsRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing addon required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  /**
   * GET /:organizationId/billing-groups
   * List billing groups for an organization
   * Query params: limit
   */
  fastify.get(
    "/:organizationId/billing-groups",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { limit = "100" } = request.query as {
          limit?: string;
        };

        // Check organization access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "view_invoices",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        // Build query
        const query = db
          .collection("billingGroups")
          .where("organizationId", "==", organizationId)
          .orderBy("createdAt", "desc")
          .limit(parseInt(limit));

        const snapshot = await query.get();

        // Collect unique billingContactIds for denormalization
        const contactIds = new Set<string>();
        for (const doc of snapshot.docs) {
          contactIds.add(doc.data().billingContactId);
        }

        // Batch-fetch billing contact names
        const contactNameMap = new Map<string, string>();
        if (contactIds.size > 0) {
          const contactDocs = await Promise.all(
            Array.from(contactIds).map((id) =>
              db.collection("billingContacts").doc(id).get(),
            ),
          );
          for (const cDoc of contactDocs) {
            if (cDoc.exists) {
              const cData = cDoc.data()!;
              contactNameMap.set(
                cDoc.id,
                cData.name || cData.displayName || cDoc.id,
              );
            }
          }
        }

        const items = snapshot.docs.map((doc) => {
          const data = doc.data();
          return serializeTimestamps({
            id: doc.id,
            ...data,
            billingContactName:
              contactNameMap.get(data.billingContactId) || null,
          });
        });

        return { items };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch billing groups");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch billing groups",
        });
      }
    },
  );

  /**
   * GET /:organizationId/billing-groups/:id
   * Get a single billing group with its members
   */
  fastify.get(
    "/:organizationId/billing-groups/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, id } = request.params as {
          organizationId: string;
          id: string;
        };

        // Check organization access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "view_invoices",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        const doc = await db.collection("billingGroups").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        const item = doc.data()!;

        // Verify group belongs to the organization
        if (item.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        return serializeTimestamps({ id: doc.id, ...item });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch billing group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch billing group",
        });
      }
    },
  );

  /**
   * POST /:organizationId/billing-groups
   * Create a new billing group
   */
  fastify.post(
    "/:organizationId/billing-groups",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const data = request.body as any;

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_billing_groups",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage billing groups for this organization",
            });
          }
        }

        // Validate required fields
        const requiredFields = [
          "billingContactId",
          "memberIds",
          "relationshipType",
        ];
        const missingFields = requiredFields.filter(
          (field) => data[field] === undefined || data[field] === null,
        );

        if (missingFields.length > 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Missing required fields: ${missingFields.join(", ")}`,
          });
        }

        // Validate memberIds is an array
        if (!Array.isArray(data.memberIds)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "memberIds must be an array",
          });
        }

        // Validate relationshipType
        const validRelationships = [
          "parent",
          "guardian",
          "company",
          "sponsor",
          "other",
        ];
        if (!validRelationships.includes(data.relationshipType)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Invalid relationshipType. Must be one of: ${validRelationships.join(", ")}`,
          });
        }

        // Validate billingContactId exists in billingContacts collection
        const contactDoc = await db
          .collection("billingContacts")
          .doc(data.billingContactId)
          .get();

        if (!contactDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Billing contact not found",
          });
        }

        const contactData = contactDoc.data()!;

        // Verify the contact belongs to the same organization
        if (contactData.organizationId !== organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Billing contact does not belong to this organization",
          });
        }

        const groupData = {
          organizationId,
          billingContactId: data.billingContactId,
          memberIds: data.memberIds,
          relationshipType: data.relationshipType,
          label: data.label || null,

          // Metadata
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        const docRef = await db.collection("billingGroups").add(groupData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(groupData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create billing group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create billing group",
        });
      }
    },
  );

  /**
   * PATCH /:organizationId/billing-groups/:id
   * Update a billing group (partial update)
   */
  fastify.patch(
    "/:organizationId/billing-groups/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, id } = request.params as {
          organizationId: string;
          id: string;
        };
        const updates = request.body as any;

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_billing_groups",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage billing groups for this organization",
            });
          }
        }

        const docRef = db.collection("billingGroups").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        const existing = doc.data()!;

        // Verify group belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        // Only allow updating specific fields
        const allowedFields = ["billingContactId", "relationshipType", "label"];
        const updateData: Record<string, any> = {};

        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            updateData[field] = updates[field];
          }
        }

        // Validate relationshipType if provided
        if (updateData.relationshipType) {
          const validRelationships = [
            "parent",
            "guardian",
            "company",
            "sponsor",
            "other",
          ];
          if (!validRelationships.includes(updateData.relationshipType)) {
            return reply.status(400).send({
              error: "Bad Request",
              message: `Invalid relationshipType. Must be one of: ${validRelationships.join(", ")}`,
            });
          }
        }

        // Validate billingContactId if being changed
        if (
          updateData.billingContactId &&
          updateData.billingContactId !== existing.billingContactId
        ) {
          const contactDoc = await db
            .collection("billingContacts")
            .doc(updateData.billingContactId)
            .get();

          if (!contactDoc.exists) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Billing contact not found",
            });
          }

          const contactData = contactDoc.data()!;
          if (contactData.organizationId !== organizationId) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Billing contact does not belong to this organization",
            });
          }
        }

        updateData.updatedAt = Timestamp.now();
        updateData.updatedBy = user.uid;

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update billing group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update billing group",
        });
      }
    },
  );

  /**
   * POST /:organizationId/billing-groups/:id/members
   * Add a member to the billing group
   */
  fastify.post(
    "/:organizationId/billing-groups/:id/members",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, id } = request.params as {
          organizationId: string;
          id: string;
        };
        const { memberId } = request.body as { memberId: string };

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_billing_groups",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage billing groups for this organization",
            });
          }
        }

        if (!memberId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "memberId is required",
          });
        }

        const docRef = db.collection("billingGroups").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        const existing = doc.data()!;

        // Verify group belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        await docRef.update({
          memberIds: FieldValue.arrayUnion(memberId),
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        return { success: true, id, memberId };
      } catch (error) {
        request.log.error({ error }, "Failed to add member to billing group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to add member to billing group",
        });
      }
    },
  );

  /**
   * DELETE /:organizationId/billing-groups/:id/members/:memberId
   * Remove a member from the billing group
   */
  fastify.delete(
    "/:organizationId/billing-groups/:id/members/:memberId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, id, memberId } = request.params as {
          organizationId: string;
          id: string;
          memberId: string;
        };

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_billing_groups",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage billing groups for this organization",
            });
          }
        }

        const docRef = db.collection("billingGroups").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        const existing = doc.data()!;

        // Verify group belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        await docRef.update({
          memberIds: FieldValue.arrayRemove(memberId),
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

        return { success: true, id, memberId };
      } catch (error) {
        request.log.error(
          { error },
          "Failed to remove member from billing group",
        );
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to remove member from billing group",
        });
      }
    },
  );

  /**
   * DELETE /:organizationId/billing-groups/:id
   * Delete a billing group
   */
  fastify.delete(
    "/:organizationId/billing-groups/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, id } = request.params as {
          organizationId: string;
          id: string;
        };

        // Check organization management access (V2 permission engine)
        if (!isSystemAdmin(user.role)) {
          const allowed = await hasPermission(
            user.uid,
            organizationId,
            "manage_billing_groups",
          );
          if (!allowed) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage billing groups for this organization",
            });
          }
        }

        const docRef = db.collection("billingGroups").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        const existing = doc.data()!;

        // Verify group belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Billing group not found",
          });
        }

        await docRef.delete();

        return { success: true, id };
      } catch (error) {
        request.log.error({ error }, "Failed to delete billing group");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete billing group",
        });
      }
    },
  );
}
