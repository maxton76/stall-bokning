/**
 * Feature Requests Routes
 *
 * API endpoints for the feature request / voting system.
 * Any authenticated user can create, vote, and comment.
 * System admins can manage status and priority.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validation.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { serializeTimestamps } from "../utils/serialization.js";
import { stripHtml } from "../utils/sanitization.js";
import type {
  FeatureRequest,
  FeatureRequestComment,
  FeatureRequestListResponse,
  FeatureRequestDetailResponse,
  FeatureRequestVoteResponse,
} from "@equiduty/shared";

// =============================================================================
// Validation Schemas
// =============================================================================

const createSchema = z.object({
  title: z
    .string()
    .transform(stripHtml)
    .pipe(z.string().trim().min(1).max(200)),
  description: z
    .string()
    .transform(stripHtml)
    .pipe(z.string().trim().min(1).max(5000)),
  category: z.enum([
    "improvement",
    "new_feature",
    "integration",
    "bug_fix",
    "other",
  ]),
});

const updateStatusSchema = z.object({
  status: z.enum([
    "open",
    "under_review",
    "planned",
    "in_progress",
    "completed",
    "declined",
  ]),
  adminResponse: z
    .string()
    .transform(stripHtml)
    .pipe(z.string().trim().max(5000))
    .optional(),
});

const setPrioritySchema = z.object({
  priority: z.enum(["low", "medium", "high", "critical"]).nullable(),
});

const createCommentSchema = z.object({
  body: z
    .string()
    .transform(stripHtml)
    .pipe(z.string().trim().min(1).max(3000)),
});

const listQuerySchema = z.object({
  status: z
    .enum([
      "open",
      "under_review",
      "planned",
      "in_progress",
      "completed",
      "declined",
    ])
    .optional(),
  category: z
    .enum(["improvement", "new_feature", "integration", "bug_fix", "other"])
    .optional(),
  sort: z.enum(["votes", "newest", "oldest"]).default("votes"),
  mine: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(Number(v) || 20, 50)),
});

const commentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(Number(v) || 20, 50)),
});

// =============================================================================
// Helpers
// =============================================================================

const COLLECTION = "featureRequests";
const DEFAULT_COMMENT_PAGE_SIZE = 20;

function sendNotFound(
  reply: import("fastify").FastifyReply,
  message = "Feature request not found",
) {
  return reply.status(404).send({ error: "Not Found", message });
}

function formatDisplayName(
  firstName: string | undefined,
  lastName: string | undefined,
): string {
  if (!firstName) return "Anonym";
  if (!lastName) return firstName;
  return `${firstName} ${lastName.charAt(0)}.`;
}

async function getUserDisplayName(userId: string): Promise<string> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return "Anonym";
  const data = userDoc.data()!;
  return formatDisplayName(data.firstName, data.lastName);
}

function serializeRequest(
  doc: FirebaseFirestore.DocumentSnapshot,
): Omit<FeatureRequest, "hasVoted"> {
  const data = doc.data()!;
  return serializeTimestamps({
    id: doc.id,
    title: data.title,
    description: data.description,
    category: data.category,
    status: data.status,
    priority: data.priority ?? null,
    authorId: data.authorId,
    authorDisplayName: data.authorDisplayName,
    voteCount: data.voteCount ?? 0,
    commentCount: data.commentCount ?? 0,
    adminResponse: data.adminResponse ?? null,
    adminResponseAuthorName: data.adminResponseAuthorName ?? null,
    adminResponseAt: data.adminResponseAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

function serializeComment(
  doc: FirebaseFirestore.DocumentSnapshot,
): FeatureRequestComment {
  const data = doc.data()!;
  return serializeTimestamps({
    id: doc.id,
    body: data.body,
    authorId: data.authorId,
    authorDisplayName: data.authorDisplayName,
    isAdmin: data.isAdmin ?? false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

// =============================================================================
// Routes
// =============================================================================

export async function featureRequestsRoutes(fastify: FastifyInstance) {
  // ─── LIST ────────────────────────────────────────────────────────────
  fastify.get(
    "/",
    {
      preHandler: [authenticate, validateQuery(listQuerySchema)],
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const query = (request as any).validatedQuery as z.infer<
        typeof listQuerySchema
      >;

      let ref: FirebaseFirestore.Query = db.collection(COLLECTION);

      // Filters
      if (query.mine) {
        ref = ref.where("authorId", "==", user.uid);
      }
      if (query.status) {
        ref = ref.where("status", "==", query.status);
      }
      if (query.category) {
        ref = ref.where("category", "==", query.category);
      }

      // Sort
      if (query.sort === "votes") {
        ref = ref.orderBy("voteCount", "desc");
      } else if (query.sort === "newest") {
        ref = ref.orderBy("createdAt", "desc");
      } else {
        ref = ref.orderBy("createdAt", "asc");
      }

      // Cursor-based pagination
      if (query.cursor) {
        const cursorDoc = await db
          .collection(COLLECTION)
          .doc(query.cursor)
          .get();
        if (cursorDoc.exists) {
          ref = ref.startAfter(cursorDoc);
        }
      }

      ref = ref.limit(query.limit + 1); // +1 to detect next page

      const snapshot = await ref.get();
      const docs = snapshot.docs;
      const hasMore = docs.length > query.limit;
      const pageDocs = hasMore ? docs.slice(0, query.limit) : docs;

      // Serialize
      const items = pageDocs.map(serializeRequest);

      // Enrich with hasVoted for current user (batch check)
      if (pageDocs.length > 0) {
        const voteChecks = await Promise.all(
          pageDocs.map((doc) =>
            doc.ref.collection("votes").doc(user.uid).get(),
          ),
        );
        voteChecks.forEach((voteDoc, i) => {
          (items[i] as FeatureRequest).hasVoted = voteDoc.exists;
        });
      }

      const response: FeatureRequestListResponse = {
        items: items as FeatureRequest[],
        nextCursor: hasMore ? pageDocs[pageDocs.length - 1].id : null,
      };

      return reply.send(response);
    },
  );

  // ─── CREATE ──────────────────────────────────────────────────────────
  fastify.post(
    "/",
    {
      preHandler: [authenticate, validateBody(createSchema)],
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const input = (request as any).validatedBody as z.infer<
        typeof createSchema
      >;

      const displayName = await getUserDisplayName(user.uid);
      const now = FieldValue.serverTimestamp();

      const docRef = await db.collection(COLLECTION).add({
        title: input.title,
        description: input.description,
        category: input.category,
        status: "open",
        priority: null,
        authorId: user.uid,
        authorDisplayName: displayName,
        voteCount: 0,
        commentCount: 0,
        adminResponse: null,
        adminResponseAuthorName: null,
        adminResponseAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const created = await docRef.get();
      const data = serializeRequest(created);

      return reply.status(201).send({ ...data, hasVoted: false });
    },
  );

  // ─── GET DETAIL ──────────────────────────────────────────────────────
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };

      const doc = await db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) {
        return sendNotFound(reply);
      }

      const item = serializeRequest(doc) as FeatureRequest;

      // Check vote
      const voteDoc = await doc.ref.collection("votes").doc(user.uid).get();
      item.hasVoted = voteDoc.exists;

      // First page of comments
      const commentsSnap = await doc.ref
        .collection("comments")
        .orderBy("createdAt", "asc")
        .limit(DEFAULT_COMMENT_PAGE_SIZE + 1)
        .get();

      const commentDocs = commentsSnap.docs;
      const hasMoreComments = commentDocs.length > DEFAULT_COMMENT_PAGE_SIZE;
      const pageComments = hasMoreComments
        ? commentDocs.slice(0, DEFAULT_COMMENT_PAGE_SIZE)
        : commentDocs;

      const response: FeatureRequestDetailResponse = {
        request: item,
        comments: pageComments.map(serializeComment),
        commentsNextCursor: hasMoreComments
          ? pageComments[pageComments.length - 1].id
          : null,
      };

      return reply.send(response);
    },
  );

  // ─── TOGGLE VOTE ─────────────────────────────────────────────────────
  fastify.post(
    "/:id/vote",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };

      const requestRef = db.collection(COLLECTION).doc(id);
      const voteRef = requestRef.collection("votes").doc(user.uid);

      let result: FeatureRequestVoteResponse;
      try {
        result = await db.runTransaction(async (tx) => {
          const requestDoc = await tx.get(requestRef);
          if (!requestDoc.exists) {
            throw new Error("NOT_FOUND");
          }

          const voteDoc = await tx.get(voteRef);

          if (voteDoc.exists) {
            // Remove vote
            tx.delete(voteRef);
            tx.update(requestRef, {
              voteCount: FieldValue.increment(-1),
              updatedAt: FieldValue.serverTimestamp(),
            });
            return {
              voted: false,
              voteCount: (requestDoc.data()!.voteCount ?? 1) - 1,
            };
          } else {
            // Add vote
            tx.set(voteRef, { createdAt: FieldValue.serverTimestamp() });
            tx.update(requestRef, {
              voteCount: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
            });
            return {
              voted: true,
              voteCount: (requestDoc.data()!.voteCount ?? 0) + 1,
            };
          }
        });
      } catch (error) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
          return sendNotFound(reply);
        }
        throw error;
      }

      return reply.send(result);
    },
  );

  // ─── LIST COMMENTS ───────────────────────────────────────────────────
  fastify.get(
    "/:id/comments",
    {
      preHandler: [authenticate, validateQuery(commentsQuerySchema)],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = (request as any).validatedQuery as z.infer<
        typeof commentsQuerySchema
      >;

      const requestRef = db.collection(COLLECTION).doc(id);
      const requestDoc = await requestRef.get();
      if (!requestDoc.exists) {
        return sendNotFound(reply);
      }

      let ref: FirebaseFirestore.Query = requestRef
        .collection("comments")
        .orderBy("createdAt", "asc");

      if (query.cursor) {
        const cursorDoc = await requestRef
          .collection("comments")
          .doc(query.cursor)
          .get();
        if (cursorDoc.exists) {
          ref = ref.startAfter(cursorDoc);
        }
      }

      ref = ref.limit(query.limit + 1);
      const snapshot = await ref.get();
      const docs = snapshot.docs;
      const hasMore = docs.length > query.limit;
      const pageDocs = hasMore ? docs.slice(0, query.limit) : docs;

      return reply.send({
        comments: pageDocs.map(serializeComment),
        nextCursor: hasMore ? pageDocs[pageDocs.length - 1].id : null,
      });
    },
  );

  // ─── ADD COMMENT ─────────────────────────────────────────────────────
  fastify.post(
    "/:id/comments",
    {
      preHandler: [authenticate, validateBody(createCommentSchema)],
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const input = (request as any).validatedBody as z.infer<
        typeof createCommentSchema
      >;

      const requestRef = db.collection(COLLECTION).doc(id);
      const requestDoc = await requestRef.get();
      if (!requestDoc.exists) {
        return sendNotFound(reply);
      }

      const displayName = await getUserDisplayName(user.uid);
      const isAdmin = user.role === "system_admin";
      const now = FieldValue.serverTimestamp();

      const batch = db.batch();

      const commentRef = requestRef.collection("comments").doc();
      batch.set(commentRef, {
        body: input.body,
        authorId: user.uid,
        authorDisplayName: displayName,
        isAdmin,
        createdAt: now,
        updatedAt: now,
      });

      batch.update(requestRef, {
        commentCount: FieldValue.increment(1),
        updatedAt: now,
      });

      await batch.commit();

      const created = await commentRef.get();
      return reply.status(201).send(serializeComment(created));
    },
  );

  // ─── UPDATE STATUS (admin) ───────────────────────────────────────────
  fastify.put(
    "/:id/status",
    {
      preHandler: [
        authenticate,
        requireRole(["system_admin"]),
        validateBody(updateStatusSchema),
      ],
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user!;
      const { id } = request.params as { id: string };
      const input = (request as any).validatedBody as z.infer<
        typeof updateStatusSchema
      >;

      const requestRef = db.collection(COLLECTION).doc(id);
      const requestDoc = await requestRef.get();
      if (!requestDoc.exists) {
        return sendNotFound(reply);
      }

      const adminDisplayName = await getUserDisplayName(user.uid);
      const updates: Record<string, any> = {
        status: input.status,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (input.adminResponse !== undefined) {
        updates.adminResponse = input.adminResponse;
        updates.adminResponseAuthorName = adminDisplayName;
        updates.adminResponseAt = FieldValue.serverTimestamp();
      }

      await requestRef.update(updates);

      const updated = await requestRef.get();
      return reply.send(serializeRequest(updated));
    },
  );

  // ─── SET PRIORITY (admin) ────────────────────────────────────────────
  fastify.put(
    "/:id/priority",
    {
      preHandler: [
        authenticate,
        requireRole(["system_admin"]),
        validateBody(setPrioritySchema),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = (request as any).validatedBody as z.infer<
        typeof setPrioritySchema
      >;

      const requestRef = db.collection(COLLECTION).doc(id);
      const requestDoc = await requestRef.get();
      if (!requestDoc.exists) {
        return sendNotFound(reply);
      }

      await requestRef.update({
        priority: input.priority,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const updated = await requestRef.get();
      return reply.send(serializeRequest(updated));
    },
  );
}
