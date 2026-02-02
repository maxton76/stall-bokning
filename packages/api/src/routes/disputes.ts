import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { checkModuleAccess } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import {
  canAccessOrganization,
  canManageOrganization,
  isSystemAdmin,
} from "../utils/authorization.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { logInvoiceEvent } from "../utils/invoiceAudit.js";
import type {
  DisputeStatus,
  CreateDisputeData,
  ResolveDisputeData,
  CreateDisputeMessageData,
} from "@equiduty/shared";

// ============================================================
// Zod Schemas
// ============================================================

const createDisputeSchema = z.object({
  invoiceId: z.string().min(1, "invoiceId is required"),
  subject: z.string().min(1, "subject is required").max(200),
  description: z.string().min(1, "description is required").max(5000),
});

const resolveDisputeSchema = z.object({
  resolutionType: z.enum([
    "credit_note",
    "adjustment",
    "explanation",
    "refund",
    "other",
  ]),
  resolutionNotes: z.string().min(1, "resolutionNotes is required").max(5000),
  creditNoteId: z.string().optional(),
  refundId: z.string().optional(),
});

const rejectDisputeSchema = z.object({
  reason: z.string().min(1, "reason is required").max(5000),
});

const createMessageSchema = z.object({
  message: z.string().min(1, "message is required").max(5000),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        type: z.string().min(1),
      }),
    )
    .optional(),
});

const COLLECTION = "disputes";

/** Invoice statuses that allow raising a dispute */
const DISPUTABLE_STATUSES = ["sent", "overdue", "paid", "partially_paid"];

export async function disputesRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing module required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  // ------------------------------------------------------------------
  // POST /:organizationId/disputes — Create a dispute
  // ------------------------------------------------------------------
  fastify.post(
    "/:organizationId/disputes",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };

        // Validate body
        const parseResult = createDisputeSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: parseResult.error.issues.map((i) => i.message).join(", "),
          });
        }
        const body: CreateDisputeData = parseResult.data;

        // Check organization access
        if (!isSystemAdmin(user.role)) {
          const hasAccess = await canAccessOrganization(
            user.uid,
            organizationId,
          );
          if (!hasAccess) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to access this organization",
            });
          }
        }

        // Fetch and validate the invoice
        const invoiceDoc = await db
          .collection("invoices")
          .doc(body.invoiceId)
          .get();

        if (!invoiceDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const invoice = invoiceDoc.data()!;

        // Invoice must belong to this organization
        if (invoice.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        // Invoice must be in a disputable status
        if (!DISPUTABLE_STATUSES.includes(invoice.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot dispute an invoice with status: ${invoice.status}. Allowed: ${DISPUTABLE_STATUSES.join(", ")}`,
          });
        }

        // The requesting user must be the invoice contact OR an org admin
        const isAdmin = isSystemAdmin(user.role)
          ? true
          : await canManageOrganization(user.uid, organizationId);

        if (!isAdmin) {
          // Non-admin: verify user is the contact on the invoice.
          // Look up the contact to match against the authenticated user's uid.
          const contactDoc = await db
            .collection("contacts")
            .doc(invoice.contactId)
            .get();

          if (!contactDoc.exists) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Invoice contact not found",
            });
          }

          const contact = contactDoc.data()!;
          // Match on userId field or email
          const isContactOwner =
            contact.userId === user.uid || contact.email === user.email;

          if (!isContactOwner) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You can only raise a dispute on invoices addressed to you",
            });
          }
        }

        const now = Timestamp.now();

        const disputeData = {
          organizationId,
          invoiceId: body.invoiceId,
          invoiceNumber: invoice.invoiceNumber || null,

          // Contact info (denormalized from invoice)
          contactId: invoice.contactId,
          contactName: invoice.contactName || null,
          contactEmail: invoice.contactEmail || null,

          // Dispute details
          status: "open" as DisputeStatus,
          subject: body.subject,
          description: body.description,

          // Resolution fields (null until resolved)
          resolutionType: null,
          resolutionNotes: null,
          creditNoteId: null,
          refundId: null,

          // Assignment
          assignedTo: null,
          resolvedBy: null,
          resolvedAt: null,

          // Metadata
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
        };

        const docRef = await db.collection(COLLECTION).add(disputeData);

        // Audit trail on the invoice
        await logInvoiceEvent(
          body.invoiceId,
          invoice.status,
          invoice.status,
          "dispute_raised",
          user.uid,
          {
            disputeId: docRef.id,
            subject: body.subject,
          },
        );

        return reply.status(201).send(
          serializeTimestamps({
            id: docRef.id,
            ...disputeData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create dispute");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create dispute",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // GET /:organizationId/disputes — List disputes for org (admin only)
  // ------------------------------------------------------------------
  fastify.get(
    "/:organizationId/disputes",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const {
          status,
          limit = "50",
          offset = "0",
        } = request.query as {
          status?: DisputeStatus;
          limit?: string;
          offset?: string;
        };

        // Admin-only endpoint
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage disputes for this organization",
            });
          }
        }

        // Build query
        let query = db
          .collection(COLLECTION)
          .where("organizationId", "==", organizationId) as any;

        if (status) {
          query = query.where("status", "==", status);
        }

        query = query.orderBy("createdAt", "desc");

        const parsedLimit = Math.min(parseInt(limit, 10) || 50, 500);
        const parsedOffset = parseInt(offset, 10) || 0;

        // Offset-based pagination: fetch offset + limit then slice
        const snapshot = await query.limit(parsedOffset + parsedLimit).get();
        const allDocs = snapshot.docs.slice(parsedOffset);

        const items = allDocs.map(
          (doc: FirebaseFirestore.QueryDocumentSnapshot) =>
            serializeTimestamps({
              id: doc.id,
              ...doc.data(),
            }),
        );

        return {
          items,
          pagination: {
            limit: parsedLimit,
            offset: parsedOffset,
            count: items.length,
          },
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch disputes");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch disputes",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // GET /:organizationId/disputes/:disputeId — Get dispute with messages
  // ------------------------------------------------------------------
  fastify.get(
    "/:organizationId/disputes/:disputeId",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, disputeId } = request.params as {
          organizationId: string;
          disputeId: string;
        };

        const doc = await db.collection(COLLECTION).doc(disputeId).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        const dispute = doc.data()!;

        // Must belong to this organization
        if (dispute.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        // Access: admin OR dispute creator
        if (!isSystemAdmin(user.role)) {
          const isAdmin = await canManageOrganization(user.uid, organizationId);
          if (!isAdmin && dispute.createdBy !== user.uid) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to view this dispute",
            });
          }
        }

        // Fetch messages subcollection
        const messagesSnapshot = await db
          .collection(COLLECTION)
          .doc(disputeId)
          .collection("messages")
          .orderBy("createdAt", "asc")
          .get();

        const messages = messagesSnapshot.docs.map(
          (msgDoc: FirebaseFirestore.QueryDocumentSnapshot) =>
            serializeTimestamps({
              id: msgDoc.id,
              ...msgDoc.data(),
            }),
        );

        return serializeTimestamps({
          id: doc.id,
          ...dispute,
          messages,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch dispute");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch dispute",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // POST /:organizationId/disputes/:disputeId/messages — Add message
  // ------------------------------------------------------------------
  fastify.post(
    "/:organizationId/disputes/:disputeId/messages",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, disputeId } = request.params as {
          organizationId: string;
          disputeId: string;
        };

        // Validate body
        const parseResult = createMessageSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: parseResult.error.issues.map((i) => i.message).join(", "),
          });
        }
        const body: CreateDisputeMessageData = parseResult.data;

        // Fetch dispute
        const disputeRef = db.collection(COLLECTION).doc(disputeId);
        const disputeDoc = await disputeRef.get();

        if (!disputeDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        const dispute = disputeDoc.data()!;

        // Must belong to this organization
        if (dispute.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        // Cannot add messages to resolved or rejected disputes
        if (["resolved", "rejected"].includes(dispute.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot add messages to a dispute with status: ${dispute.status}`,
          });
        }

        // Access: admin OR dispute creator
        const isAdmin = isSystemAdmin(user.role)
          ? true
          : await canManageOrganization(user.uid, organizationId);

        if (!isAdmin && dispute.createdBy !== user.uid) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to post on this dispute",
          });
        }

        const now = Timestamp.now();

        const messageData = {
          disputeId,
          authorId: user.uid,
          authorName: user.displayName || user.email || "Unknown",
          authorRole: isAdmin ? ("admin" as const) : ("member" as const),
          message: body.message,
          attachments: body.attachments || [],
          createdAt: now,
        };

        const msgRef = await disputeRef.collection("messages").add(messageData);

        // If admin is posting and dispute is still "open", auto-transition to "under_review"
        if (isAdmin && dispute.status === "open") {
          await disputeRef.update({
            status: "under_review" as DisputeStatus,
            assignedTo: user.uid,
            updatedAt: now,
          });
        } else {
          await disputeRef.update({ updatedAt: now });
        }

        return reply.status(201).send(
          serializeTimestamps({
            id: msgRef.id,
            ...messageData,
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create dispute message");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create dispute message",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // PUT /:organizationId/disputes/:disputeId/review — Mark under review
  // ------------------------------------------------------------------
  fastify.put(
    "/:organizationId/disputes/:disputeId/review",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, disputeId } = request.params as {
          organizationId: string;
          disputeId: string;
        };

        // Admin-only
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage disputes for this organization",
            });
          }
        }

        const disputeRef = db.collection(COLLECTION).doc(disputeId);
        const disputeDoc = await disputeRef.get();

        if (!disputeDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        const dispute = disputeDoc.data()!;

        if (dispute.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        if (dispute.status !== "open") {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Cannot mark dispute as under review from status: ${dispute.status}`,
          });
        }

        const now = Timestamp.now();

        await disputeRef.update({
          status: "under_review" as DisputeStatus,
          assignedTo: user.uid,
          updatedAt: now,
        });

        return serializeTimestamps({
          id: disputeId,
          ...dispute,
          status: "under_review",
          assignedTo: user.uid,
          updatedAt: now,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to update dispute to review");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update dispute status",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // PUT /:organizationId/disputes/:disputeId/resolve — Resolve dispute
  // ------------------------------------------------------------------
  fastify.put(
    "/:organizationId/disputes/:disputeId/resolve",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, disputeId } = request.params as {
          organizationId: string;
          disputeId: string;
        };

        // Admin-only
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to resolve disputes for this organization",
            });
          }
        }

        // Validate body
        const parseResult = resolveDisputeSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: parseResult.error.issues.map((i) => i.message).join(", "),
          });
        }
        const body: ResolveDisputeData = parseResult.data;

        const disputeRef = db.collection(COLLECTION).doc(disputeId);
        const disputeDoc = await disputeRef.get();

        if (!disputeDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        const dispute = disputeDoc.data()!;

        if (dispute.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        if (["resolved", "rejected"].includes(dispute.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Dispute is already ${dispute.status}`,
          });
        }

        const now = Timestamp.now();

        const updateData = {
          status: "resolved" as DisputeStatus,
          resolutionType: body.resolutionType,
          resolutionNotes: body.resolutionNotes,
          creditNoteId: body.creditNoteId || null,
          refundId: body.refundId || null,
          resolvedBy: user.uid,
          resolvedAt: now,
          updatedAt: now,
        };

        await disputeRef.update(updateData);

        // Audit trail on the invoice
        await logInvoiceEvent(
          dispute.invoiceId,
          dispute.status,
          dispute.status,
          "dispute_resolved",
          user.uid,
          {
            disputeId,
            resolutionType: body.resolutionType,
            creditNoteId: body.creditNoteId || null,
            refundId: body.refundId || null,
          },
        );

        return serializeTimestamps({
          id: disputeId,
          ...dispute,
          ...updateData,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to resolve dispute");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to resolve dispute",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // PUT /:organizationId/disputes/:disputeId/reject — Reject dispute
  // ------------------------------------------------------------------
  fastify.put(
    "/:organizationId/disputes/:disputeId/reject",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId, disputeId } = request.params as {
          organizationId: string;
          disputeId: string;
        };

        // Admin-only
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to reject disputes for this organization",
            });
          }
        }

        // Validate body
        const parseResult = rejectDisputeSchema.safeParse(request.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: parseResult.error.issues.map((i) => i.message).join(", "),
          });
        }
        const { reason } = parseResult.data;

        const disputeRef = db.collection(COLLECTION).doc(disputeId);
        const disputeDoc = await disputeRef.get();

        if (!disputeDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        const dispute = disputeDoc.data()!;

        if (dispute.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Dispute not found",
          });
        }

        if (["resolved", "rejected"].includes(dispute.status)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Dispute is already ${dispute.status}`,
          });
        }

        const now = Timestamp.now();

        const updateData = {
          status: "rejected" as DisputeStatus,
          resolutionNotes: reason,
          resolvedBy: user.uid,
          resolvedAt: now,
          updatedAt: now,
        };

        await disputeRef.update(updateData);

        // Audit trail on the invoice
        await logInvoiceEvent(
          dispute.invoiceId,
          dispute.status,
          dispute.status,
          "dispute_rejected",
          user.uid,
          {
            disputeId,
            reason,
          },
        );

        return serializeTimestamps({
          id: disputeId,
          ...dispute,
          ...updateData,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to reject dispute");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to reject dispute",
        });
      }
    },
  );
}
