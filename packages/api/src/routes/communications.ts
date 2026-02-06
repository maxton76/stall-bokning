/**
 * Communication History API Routes
 *
 * Provides endpoints for managing communication records with contacts.
 *
 * SECURITY FIXES:
 * - Fixed authorization middleware import and usage
 * - Added Zod validation for all inputs
 * - Proper error handling and input sanitization
 */

import { FastifyInstance } from "fastify";
import {
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import type {
  CommunicationRecord,
  CommunicationTemplate,
} from "@equiduty/shared";
import {
  extractTemplateVariables,
  substituteTemplateVariables,
} from "@equiduty/shared";
import {
  createCommunicationSchema,
  updateCommunicationSchema,
  createTemplateSchema,
  updateTemplateSchema,
  useTemplateSchema,
  listCommunicationsQuerySchema,
  contactCommunicationsQuerySchema,
  listTemplatesQuerySchema,
} from "../schemas/communications.js";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get document with organization access check
 * DRY: Consolidated document access pattern
 */
async function getDocumentWithOrgCheck<T>(
  collection: string,
  docId: string,
  organizationId: string,
): Promise<{
  data: (T & { id: string }) | null;
  error?: { status: number; message: string };
}> {
  const doc = await db.collection(collection).doc(docId).get();

  if (!doc.exists) {
    return { data: null, error: { status: 404, message: "Not found" } };
  }

  const data = doc.data() as T & { organizationId: string };

  if (data.organizationId !== organizationId) {
    // Return 404 for security (don't reveal existence)
    return { data: null, error: { status: 404, message: "Not found" } };
  }

  return { data: { id: doc.id, ...data } as T & { id: string } };
}

// ============================================================================
// Route Registration
// ============================================================================

export async function communicationsRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // Communication Records CRUD
  // ============================================================================

  /**
   * List communication records for an organization
   * GET /organizations/:organizationId/communications
   */
  fastify.get<{
    Params: { organizationId: string };
    Querystring: Record<string, string | undefined>;
  }>(
    "/organizations/:organizationId/communications",
    {
      preHandler: [authenticate, requirePermission("view_members", "params")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;

      // Validate and parse query parameters
      const queryResult = listCommunicationsQuerySchema.safeParse(
        request.query,
      );
      if (!queryResult.success) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          details: queryResult.error.issues,
        });
      }

      const {
        contactId,
        type,
        direction,
        status,
        startDate,
        endDate,
        search,
        page,
        pageSize,
        sortField = "occurredAt",
        sortDirection = "desc",
      } = queryResult.data;

      // Build query
      let query = db
        .collection("communicationRecords")
        .where("organizationId", "==", organizationId);

      // Apply filters
      if (contactId) {
        query = query.where("contactId", "==", contactId);
      }

      if (type) {
        const types = type.split(",").filter(Boolean);
        if (types.length === 1) {
          query = query.where("type", "==", types[0]);
        } else if (types.length > 1) {
          query = query.where("type", "in", types.slice(0, 10)); // Firestore limit
        }
      }

      if (direction) {
        query = query.where("direction", "==", direction);
      }

      if (status) {
        const statuses = status.split(",").filter(Boolean);
        if (statuses.length === 1) {
          query = query.where("status", "==", statuses[0]);
        } else if (statuses.length > 1) {
          query = query.where("status", "in", statuses.slice(0, 10));
        }
      }

      if (startDate) {
        query = query.where(
          "occurredAt",
          ">=",
          Timestamp.fromDate(new Date(startDate)),
        );
      }

      if (endDate) {
        query = query.where(
          "occurredAt",
          "<=",
          Timestamp.fromDate(new Date(endDate)),
        );
      }

      // Apply sorting
      const validSortFields = [
        "occurredAt",
        "createdAt",
        "contactName",
        "type",
      ];
      const field = validSortFields.includes(sortField)
        ? sortField
        : "occurredAt";
      const dir = sortDirection === "asc" ? "asc" : "desc";
      query = query.orderBy(field, dir);

      // Get total count (without pagination)
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Apply pagination
      const pageNum = page ?? 1;
      const size = pageSize ?? 20;
      const offset = (pageNum - 1) * size;

      query = query.offset(offset).limit(size);

      // Execute query
      const snapshot = await query.get();

      let items = snapshot.docs.map(
        (doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        }),
      ) as CommunicationRecord[];

      // Apply text search filter (client-side, limited to fetched results)
      if (search && search.length >= 2) {
        const searchLower = search.toLowerCase();
        items = items.filter(
          (item) =>
            item.contactName?.toLowerCase().includes(searchLower) ||
            item.subject?.toLowerCase().includes(searchLower) ||
            item.content?.toLowerCase().includes(searchLower) ||
            item.summary?.toLowerCase().includes(searchLower),
        );
      }

      return reply.send({
        items,
        total,
        page: pageNum,
        pageSize: size,
        hasMore: offset + items.length < total,
      });
    },
  );

  /**
   * Get a single communication record
   * GET /organizations/:organizationId/communications/:communicationId
   */
  fastify.get<{
    Params: { organizationId: string; communicationId: string };
  }>(
    "/organizations/:organizationId/communications/:communicationId",
    {
      preHandler: [authenticate, requirePermission("view_members", "params")],
    },
    async (request, reply) => {
      const { organizationId, communicationId } = request.params;

      const result = await getDocumentWithOrgCheck<CommunicationRecord>(
        "communicationRecords",
        communicationId,
        organizationId,
      );

      if (result.error) {
        return reply
          .status(result.error.status)
          .send({ error: result.error.message });
      }

      return reply.send(result.data);
    },
  );

  /**
   * Create a new communication record
   * POST /organizations/:organizationId/communications
   */
  fastify.post<{
    Params: { organizationId: string };
    Body: unknown;
  }>(
    "/organizations/:organizationId/communications",
    {
      preHandler: [
        authenticate,
        requirePermission("send_communications", "params"),
      ],
    },
    async (request, reply) => {
      const { organizationId } = request.params;

      // Validate request body
      const parseResult = createCommunicationSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      const input = parseResult.data;

      // Get contact name
      const contactDoc = await db
        .collection("contacts")
        .doc(input.contactId)
        .get();
      if (!contactDoc.exists) {
        return reply.status(400).send({ error: "Contact not found" });
      }
      const contactData = contactDoc.data();

      // Check contact belongs to organization
      if (contactData?.organizationId !== organizationId) {
        return reply.status(400).send({ error: "Contact not found" });
      }

      const contactName =
        contactData?.type === "business"
          ? contactData.businessName
          : `${contactData?.firstName || ""} ${contactData?.lastName || ""}`.trim();

      const now = Timestamp.now();
      const user = (request as AuthenticatedRequest).user!;

      // Build record without explicit type to avoid Timestamp incompatibility
      const record = {
        organizationId,
        contactId: input.contactId,
        contactName,
        type: input.type,
        direction: input.direction,
        status: input.scheduledAt ? "scheduled" : "sent",
        subject: input.subject,
        content: input.content,
        summary: input.summary,
        attachments: input.attachments?.map((a, i) => ({
          id: `attachment_${i}_${Date.now()}`,
          fileName: a.name,
          fileType: a.mimeType || "application/octet-stream",
          fileSize: a.size || 0,
          url: a.url,
        })),
        relatedInvoiceId: input.relatedInvoiceId,
        relatedHorseId: input.relatedHorseId,
        relatedActivityId: input.relatedActivityId,
        metadata: input.metadata,
        scheduledAt: input.scheduledAt
          ? Timestamp.fromDate(new Date(input.scheduledAt as string))
          : undefined,
        occurredAt: input.occurredAt
          ? Timestamp.fromDate(new Date(input.occurredAt as string))
          : now,
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
        createdByName: user.displayName || user.email || "Unknown",
      };

      const docRef = await db.collection("communicationRecords").add(record);

      return reply.status(201).send({ id: docRef.id, ...record });
    },
  );

  /**
   * Update a communication record
   * PATCH /organizations/:organizationId/communications/:communicationId
   */
  fastify.patch<{
    Params: { organizationId: string; communicationId: string };
    Body: unknown;
  }>(
    "/organizations/:organizationId/communications/:communicationId",
    {
      preHandler: [
        authenticate,
        requirePermission("send_communications", "params"),
      ],
    },
    async (request, reply) => {
      const { organizationId, communicationId } = request.params;

      // Validate request body
      const parseResult = updateCommunicationSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      const input = parseResult.data;

      const result = await getDocumentWithOrgCheck<CommunicationRecord>(
        "communicationRecords",
        communicationId,
        organizationId,
      );

      if (result.error) {
        return reply
          .status(result.error.status)
          .send({ error: result.error.message });
      }

      const record = result.data!;
      const docRef = db.collection("communicationRecords").doc(communicationId);

      // Build updates without explicit type to avoid Timestamp incompatibility
      const updates: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (input.subject !== undefined) updates.subject = input.subject;
      if (input.content !== undefined) updates.content = input.content;
      if (input.summary !== undefined) updates.summary = input.summary;
      if (input.status !== undefined) updates.status = input.status;
      if (input.relatedInvoiceId !== undefined)
        updates.relatedInvoiceId = input.relatedInvoiceId ?? undefined;
      if (input.relatedHorseId !== undefined)
        updates.relatedHorseId = input.relatedHorseId ?? undefined;
      if (input.relatedActivityId !== undefined)
        updates.relatedActivityId = input.relatedActivityId ?? undefined;
      if (input.occurredAt !== undefined)
        updates.occurredAt = Timestamp.fromDate(
          new Date(input.occurredAt as string),
        );
      if (input.scheduledAt !== undefined)
        updates.scheduledAt = Timestamp.fromDate(
          new Date(input.scheduledAt as string),
        );
      if (input.metadata !== undefined) updates.metadata = input.metadata;

      await docRef.update(updates);

      return reply.send({ ...record, ...updates });
    },
  );

  /**
   * Delete a communication record
   * DELETE /organizations/:organizationId/communications/:communicationId
   */
  fastify.delete<{
    Params: { organizationId: string; communicationId: string };
  }>(
    "/organizations/:organizationId/communications/:communicationId",
    {
      preHandler: [
        authenticate,
        requirePermission("manage_org_settings", "params"),
      ],
    },
    async (request, reply) => {
      const { organizationId, communicationId } = request.params;

      const result = await getDocumentWithOrgCheck<CommunicationRecord>(
        "communicationRecords",
        communicationId,
        organizationId,
      );

      if (result.error) {
        return reply
          .status(result.error.status)
          .send({ error: result.error.message });
      }

      await db.collection("communicationRecords").doc(communicationId).delete();

      return reply.status(204).send();
    },
  );

  // ============================================================================
  // Communication by Contact
  // ============================================================================

  /**
   * Get communication history for a specific contact
   * GET /organizations/:organizationId/contacts/:contactId/communications
   */
  fastify.get<{
    Params: { organizationId: string; contactId: string };
    Querystring: Record<string, string | undefined>;
  }>(
    "/organizations/:organizationId/contacts/:contactId/communications",
    {
      preHandler: [authenticate, requirePermission("view_members", "params")],
    },
    async (request, reply) => {
      const { organizationId, contactId } = request.params;

      // Validate query
      const queryResult = contactCommunicationsQuerySchema.safeParse(
        request.query,
      );
      if (!queryResult.success) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          details: queryResult.error.issues,
        });
      }

      const { type, limit } = queryResult.data;

      let query = db
        .collection("communicationRecords")
        .where("organizationId", "==", organizationId)
        .where("contactId", "==", contactId)
        .orderBy("occurredAt", "desc");

      if (type) {
        query = query.where("type", "==", type);
      }

      query = query.limit(limit ?? 50);

      const snapshot = await query.get();

      const items = snapshot.docs.map(
        (doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        }),
      );

      return reply.send({ items });
    },
  );

  /**
   * Get communication statistics for a contact
   * GET /organizations/:organizationId/contacts/:contactId/communication-stats
   */
  fastify.get<{
    Params: { organizationId: string; contactId: string };
  }>(
    "/organizations/:organizationId/contacts/:contactId/communication-stats",
    {
      preHandler: [authenticate, requirePermission("view_members", "params")],
    },
    async (request, reply) => {
      const { organizationId, contactId } = request.params;

      const snapshot = await db
        .collection("communicationRecords")
        .where("organizationId", "==", organizationId)
        .where("contactId", "==", contactId)
        .get();

      const stats = {
        contactId,
        totalCommunications: snapshot.size,
        byType: {
          email: 0,
          sms: 0,
          phone: 0,
          meeting: 0,
          note: 0,
          telegram: 0,
          in_app: 0,
        } as Record<string, number>,
        byDirection: {
          outbound: 0,
          inbound: 0,
        } as Record<string, number>,
        lastCommunication: undefined as Timestamp | undefined,
      };

      snapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const type = data.type as string;
        const direction = data.direction as string;

        if (type in stats.byType) stats.byType[type]++;
        if (direction in stats.byDirection) stats.byDirection[direction]++;

        if (
          !stats.lastCommunication ||
          data.occurredAt?.toMillis() > stats.lastCommunication.toMillis()
        ) {
          stats.lastCommunication = data.occurredAt;
        }
      });

      return reply.send(stats);
    },
  );

  // ============================================================================
  // Communication Templates
  // ============================================================================

  /**
   * List communication templates
   * GET /organizations/:organizationId/communication-templates
   */
  fastify.get<{
    Params: { organizationId: string };
    Querystring: Record<string, string | undefined>;
  }>(
    "/organizations/:organizationId/communication-templates",
    {
      preHandler: [authenticate, requirePermission("view_members", "params")],
    },
    async (request, reply) => {
      const { organizationId } = request.params;

      // Validate query
      const queryResult = listTemplatesQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          error: "Invalid query parameters",
          details: queryResult.error.issues,
        });
      }

      const { type, category } = queryResult.data;

      let query = db
        .collection("communicationTemplates")
        .where("organizationId", "==", organizationId);

      if (type) {
        query = query.where("type", "==", type);
      }

      if (category) {
        query = query.where("category", "==", category);
      }

      const snapshot = await query.orderBy("name", "asc").get();

      const templates = snapshot.docs.map(
        (doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        }),
      );

      return reply.send({ templates });
    },
  );

  /**
   * Create a communication template
   * POST /organizations/:organizationId/communication-templates
   */
  fastify.post<{
    Params: { organizationId: string };
    Body: unknown;
  }>(
    "/organizations/:organizationId/communication-templates",
    {
      preHandler: [
        authenticate,
        requirePermission("manage_org_settings", "params"),
      ],
    },
    async (request, reply) => {
      const { organizationId } = request.params;

      // Validate request body
      const parseResult = createTemplateSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      const input = parseResult.data;
      const now = Timestamp.now();
      const user = (request as AuthenticatedRequest).user!;

      // Extract variables from content
      const extractedVariables = extractTemplateVariables(input.content);

      // Build template without explicit type to avoid Timestamp incompatibility
      const template = {
        organizationId,
        name: input.name,
        description: input.description,
        type: input.type,
        subject: input.subject,
        content: input.content,
        variables: input.variables || extractedVariables,
        category: input.category,
        tags: input.tags,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
      };

      const docRef = await db
        .collection("communicationTemplates")
        .add(template);

      return reply.status(201).send({ id: docRef.id, ...template });
    },
  );

  /**
   * Update a communication template
   * PATCH /organizations/:organizationId/communication-templates/:templateId
   */
  fastify.patch<{
    Params: { organizationId: string; templateId: string };
    Body: unknown;
  }>(
    "/organizations/:organizationId/communication-templates/:templateId",
    {
      preHandler: [
        authenticate,
        requirePermission("manage_org_settings", "params"),
      ],
    },
    async (request, reply) => {
      const { organizationId, templateId } = request.params;

      // Validate request body
      const parseResult = updateTemplateSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      const input = parseResult.data;

      const result = await getDocumentWithOrgCheck<CommunicationTemplate>(
        "communicationTemplates",
        templateId,
        organizationId,
      );

      if (result.error) {
        return reply
          .status(result.error.status)
          .send({ error: result.error.message });
      }

      const template = result.data!;
      const docRef = db.collection("communicationTemplates").doc(templateId);

      // Build updates without explicit type to avoid Timestamp incompatibility
      const updates: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined)
        updates.description = input.description;
      if (input.type !== undefined) updates.type = input.type;
      if (input.subject !== undefined) updates.subject = input.subject;
      if (input.content !== undefined) {
        updates.content = input.content;
        // Re-extract variables
        updates.variables =
          input.variables || extractTemplateVariables(input.content);
      }
      if (input.category !== undefined) updates.category = input.category;
      if (input.tags !== undefined) updates.tags = input.tags;

      await docRef.update(updates);

      return reply.send({ ...template, ...updates });
    },
  );

  /**
   * Delete a communication template
   * DELETE /organizations/:organizationId/communication-templates/:templateId
   */
  fastify.delete<{
    Params: { organizationId: string; templateId: string };
  }>(
    "/organizations/:organizationId/communication-templates/:templateId",
    {
      preHandler: [
        authenticate,
        requirePermission("manage_org_settings", "params"),
      ],
    },
    async (request, reply) => {
      const { organizationId, templateId } = request.params;

      const result = await getDocumentWithOrgCheck<CommunicationTemplate>(
        "communicationTemplates",
        templateId,
        organizationId,
      );

      if (result.error) {
        return reply
          .status(result.error.status)
          .send({ error: result.error.message });
      }

      await db.collection("communicationTemplates").doc(templateId).delete();

      return reply.status(204).send();
    },
  );

  /**
   * Use a template (increment usage count)
   * POST /organizations/:organizationId/communication-templates/:templateId/use
   */
  fastify.post<{
    Params: { organizationId: string; templateId: string };
    Body: unknown;
  }>(
    "/organizations/:organizationId/communication-templates/:templateId/use",
    {
      preHandler: [
        authenticate,
        requirePermission("send_communications", "params"),
      ],
    },
    async (request, reply) => {
      const { organizationId, templateId } = request.params;

      // Validate request body
      const parseResult = useTemplateSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.issues,
        });
      }

      const { variables = {} } = parseResult.data;

      const result = await getDocumentWithOrgCheck<CommunicationTemplate>(
        "communicationTemplates",
        templateId,
        organizationId,
      );

      if (result.error) {
        return reply
          .status(result.error.status)
          .send({ error: result.error.message });
      }

      const template = result.data!;
      const docRef = db.collection("communicationTemplates").doc(templateId);

      // Replace variables in content using shared utility
      const content = substituteTemplateVariables(template.content, variables);
      const subject = substituteTemplateVariables(
        template.subject || "",
        variables,
      );

      // Update usage count
      await docRef.update({
        usageCount: (template.usageCount || 0) + 1,
        lastUsedAt: Timestamp.now(),
      });

      return reply.send({
        subject,
        content,
        type: template.type,
      });
    },
  );
}
