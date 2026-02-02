import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { isModuleEnabled } from "../middleware/checkModuleAccess.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { Timestamp } from "firebase-admin/firestore";

/**
 * Portal Context Request - extends AuthenticatedRequest with portal-specific context
 */
export interface PortalContextRequest extends AuthenticatedRequest {
  portalUser: {
    contactId: string;
    contactName: string;
    organizationId: string;
    organizationName: string;
    role: "owner" | "co_owner" | "caretaker";
    permissions: {
      canViewInvoices: boolean;
      canPayInvoices: boolean;
      canViewActivities: boolean;
      canViewHealthRecords: boolean;
      canCommunicate: boolean;
    };
  };
}

/**
 * Portal authentication middleware
 * Verifies user is a portal user (contact with hasLoginAccess and linkedUserId)
 */
async function requirePortalAccess(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = (request as AuthenticatedRequest).user;

  if (!user) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  try {
    // Find contact linked to this user with portal access
    const contactsSnapshot = await db
      .collection("contacts")
      .where("linkedUserId", "==", user.uid)
      .where("hasLoginAccess", "==", true)
      .limit(1)
      .get();

    if (contactsSnapshot.empty) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Portal access not enabled for this account",
      });
    }

    const contactDoc = contactsSnapshot.docs[0];
    const contact = contactDoc.data();

    if (!contact.organizationId) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Contact not associated with an organization",
      });
    }

    // Get organization info
    const orgDoc = await db
      .collection("organizations")
      .doc(contact.organizationId)
      .get();

    if (!orgDoc.exists) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Organization not found",
      });
    }

    const org = orgDoc.data();

    // Check if portal module is enabled for this organization
    const portalEnabled = await isModuleEnabled(
      contact.organizationId,
      "portal",
    );
    if (!portalEnabled) {
      return reply.status(403).send({
        error: "Module not available",
        message:
          'The "portal" feature is not included in your subscription. Please upgrade to access this feature.',
        moduleKey: "portal",
      });
    }

    // Build contact display name
    const contactName =
      contact.contactType === "Personal"
        ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
        : contact.businessName || "";

    // Check for portal access record (optional - for enhanced permissions)
    const portalAccessDoc = await db
      .collection("portalAccess")
      .doc(contactDoc.id)
      .get();

    const portalAccess = portalAccessDoc.exists ? portalAccessDoc.data() : null;

    // Attach portal context to request
    (request as PortalContextRequest).portalUser = {
      contactId: contactDoc.id,
      contactName: contactName || contact.email || "Portal User",
      organizationId: contact.organizationId,
      organizationName: org?.name || "Organization",
      role: portalAccess?.role || "owner",
      permissions: {
        canViewInvoices: portalAccess?.canViewInvoices ?? true,
        canPayInvoices: portalAccess?.canPayInvoices ?? true,
        canViewActivities: portalAccess?.canViewActivities ?? true,
        canViewHealthRecords: portalAccess?.canViewHealthRecords ?? true,
        canCommunicate: portalAccess?.canCommunicate ?? true,
      },
    };
  } catch (error) {
    request.log.error({ error }, "Portal access check failed");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Failed to verify portal access",
    });
  }
}

/**
 * Serialize timestamps in an object
 */
function serializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeTimestamps);
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = serializeTimestamps(obj[key]);
    }
    return result;
  }

  return obj;
}

export async function portalRoutes(fastify: FastifyInstance) {
  // ============================================
  // DASHBOARD
  // ============================================

  /**
   * GET /portal/dashboard
   * Get portal dashboard data for the authenticated portal user
   */
  fastify.get(
    "/dashboard",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;

        // Get horses owned by this contact
        const horsesSnapshot = await db
          .collection("horses")
          .where("ownerContactId", "==", portal.contactId)
          .get();

        const horses = horsesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Get unpaid invoices for this contact
        const unpaidInvoicesSnapshot = await db
          .collection("invoices")
          .where("contactId", "==", portal.contactId)
          .where("status", "in", [
            "sent",
            "pending",
            "partially_paid",
            "overdue",
          ])
          .orderBy("dueDate", "asc")
          .limit(5)
          .get();

        const unpaidInvoices = unpaidInvoicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Calculate totals
        const totalAmountDue = unpaidInvoices.reduce(
          (sum, inv: any) => sum + (inv.amountDue || 0),
          0,
        );

        // Get upcoming activities for horses
        const now = Timestamp.now();
        const upcomingActivitiesSnapshot = await db
          .collection("activities")
          .where("organizationId", "==", portal.organizationId)
          .where("status", "in", ["scheduled", "confirmed"])
          .where("scheduledDate", ">=", now)
          .orderBy("scheduledDate", "asc")
          .limit(10)
          .get();

        // Filter to activities related to the user's horses
        const horseIds = horses.map((h) => h.id);
        const upcomingActivities = upcomingActivitiesSnapshot.docs
          .filter((doc) => {
            const data = doc.data();
            return horseIds.includes(data.horseId);
          })
          .slice(0, 5)
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

        // Get unread message count
        const threadsSnapshot = await db
          .collection("portalThreads")
          .where("contactId", "==", portal.contactId)
          .where("isClosed", "==", false)
          .get();

        const unreadMessageCount = threadsSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data();
          return sum + (data.unreadCount || 0);
        }, 0);

        // Build alerts
        const alerts: any[] = [];

        // Add overdue invoice alerts
        unpaidInvoices.forEach((inv: any) => {
          if (inv.status === "overdue") {
            alerts.push({
              id: `overdue-${inv.id}`,
              type: "invoice_overdue",
              priority: "high",
              title: "Overdue Invoice",
              message: `Invoice ${inv.invoiceNumber} is overdue`,
              actionUrl: `/portal/invoices/${inv.id}`,
              actionLabel: "View Invoice",
              relatedEntityType: "invoice",
              relatedEntityId: inv.id,
              isDismissible: false,
              createdAt: inv.dueDate,
            });
          }
        });

        const dashboardData = {
          contactName: portal.contactName,
          organizationName: portal.organizationName,
          horseCount: horses.length,
          unpaidInvoiceCount: unpaidInvoices.length,
          totalAmountDue,
          currency: "SEK",
          upcomingActivityCount: upcomingActivities.length,
          unreadMessageCount,
          recentInvoices: unpaidInvoices.map(serializeTimestamps),
          upcomingActivities: upcomingActivities.map(serializeTimestamps),
          horses: horses.map((h) =>
            serializeTimestamps({
              id: h.id,
              name: (h as any).name,
              registrationNumber: (h as any).registrationNumber,
              breed: (h as any).breed,
              color: (h as any).color,
              gender: (h as any).gender,
              photoUrl: (h as any).photoUrl,
              stableName: (h as any).stableName,
            }),
          ),
          alerts: alerts.map(serializeTimestamps),
        };

        return dashboardData;
      } catch (error) {
        request.log.error({ error }, "Failed to fetch portal dashboard");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch dashboard data",
        });
      }
    },
  );

  // ============================================
  // HORSES
  // ============================================

  /**
   * GET /portal/my-horses
   * Get all horses owned by or associated with the portal user
   */
  fastify.get(
    "/my-horses",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;

        // Get horses where contact is owner
        const ownedHorsesSnapshot = await db
          .collection("horses")
          .where("ownerContactId", "==", portal.contactId)
          .get();

        const ownedHorses = ownedHorsesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          ownershipType: "owner",
        }));

        // Get horses where contact is co-owner or caretaker (via horseOwnership collection)
        const ownershipSnapshot = await db
          .collection("horseOwnership")
          .where("contactId", "==", portal.contactId)
          .where("status", "==", "active")
          .get();

        const associatedHorseIds = ownershipSnapshot.docs
          .filter((doc) => {
            const data = doc.data();
            return (
              data.ownershipType === "co_owner" ||
              data.ownershipType === "leaser" ||
              data.ownershipType === "caretaker"
            );
          })
          .map((doc) => ({
            horseId: doc.data().horseId,
            ownershipType: doc.data().ownershipType,
          }));

        // Fetch associated horses
        const associatedHorses: any[] = [];
        for (const ownership of associatedHorseIds) {
          const horseDoc = await db
            .collection("horses")
            .doc(ownership.horseId)
            .get();

          if (horseDoc.exists) {
            associatedHorses.push({
              id: horseDoc.id,
              ...horseDoc.data(),
              ownershipType: ownership.ownershipType,
            });
          }
        }

        // Combine and deduplicate
        const allHorses = [...ownedHorses, ...associatedHorses];
        const uniqueHorses = Array.from(
          new Map(allHorses.map((h) => [h.id, h])).values(),
        );

        // Enhance with upcoming activity count
        const now = Timestamp.now();
        const enhancedHorses = await Promise.all(
          uniqueHorses.map(async (horse) => {
            // Get upcoming activities count
            const activitiesSnapshot = await db
              .collection("activities")
              .where("horseId", "==", horse.id)
              .where("status", "in", ["scheduled", "confirmed"])
              .where("scheduledDate", ">=", now)
              .limit(10)
              .get();

            // Get recent health records count
            const healthSnapshot = await db
              .collection("healthRecords")
              .where("horseId", "==", horse.id)
              .orderBy("recordDate", "desc")
              .limit(1)
              .get();

            const lastActivity = healthSnapshot.empty
              ? null
              : healthSnapshot.docs[0].data().recordDate;

            return {
              ...horse,
              upcomingActivities: activitiesSnapshot.size,
              pendingHealthItems: 0,
              lastActivityDate: lastActivity,
            };
          }),
        );

        return {
          horses: enhancedHorses.map(serializeTimestamps),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch portal horses");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horses",
        });
      }
    },
  );

  /**
   * GET /portal/my-horses/:horseId
   * Get detailed info for a specific horse
   */
  fastify.get(
    "/my-horses/:horseId",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;
        const { horseId } = request.params as { horseId: string };

        // Get horse document
        const horseDoc = await db.collection("horses").doc(horseId).get();

        if (!horseDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Horse not found",
          });
        }

        const horse = horseDoc.data();

        // Verify ownership/association
        const isOwner = horse?.ownerContactId === portal.contactId;

        if (!isOwner) {
          // Check horseOwnership collection
          const ownershipSnapshot = await db
            .collection("horseOwnership")
            .where("horseId", "==", horseId)
            .where("contactId", "==", portal.contactId)
            .where("status", "==", "active")
            .limit(1)
            .get();

          if (ownershipSnapshot.empty) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have access to this horse",
            });
          }
        }

        // Get recent activities if permitted
        let recentActivities: any[] = [];
        if (portal.permissions.canViewActivities) {
          const activitiesSnapshot = await db
            .collection("activities")
            .where("horseId", "==", horseId)
            .orderBy("scheduledDate", "desc")
            .limit(10)
            .get();

          recentActivities = activitiesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }

        // Get health records if permitted
        let healthRecords: any[] = [];
        if (portal.permissions.canViewHealthRecords) {
          const healthSnapshot = await db
            .collection("healthRecords")
            .where("horseId", "==", horseId)
            .orderBy("recordDate", "desc")
            .limit(10)
            .get();

          healthRecords = healthSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }

        // Get vaccination records
        const vaccinationSnapshot = await db
          .collection("vaccinationRecords")
          .where("horseId", "==", horseId)
          .orderBy("dateAdministered", "desc")
          .limit(10)
          .get();

        const vaccinations = vaccinationSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return {
          horse: serializeTimestamps({
            id: horseDoc.id,
            ...horse,
          }),
          recentActivities: recentActivities.map(serializeTimestamps),
          healthRecords: healthRecords.map(serializeTimestamps),
          vaccinations: vaccinations.map(serializeTimestamps),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch horse details");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch horse details",
        });
      }
    },
  );

  // ============================================
  // INVOICES
  // ============================================

  /**
   * GET /portal/my-invoices
   * Get all invoices for the portal user
   */
  fastify.get(
    "/my-invoices",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;

        if (!portal.permissions.canViewInvoices) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Invoice viewing not permitted",
          });
        }

        const {
          status,
          limit = "20",
          offset = "0",
        } = request.query as {
          status?: string;
          limit?: string;
          offset?: string;
        };

        let query = db
          .collection("invoices")
          .where("contactId", "==", portal.contactId)
          .orderBy("issueDate", "desc");

        if (status) {
          query = db
            .collection("invoices")
            .where("contactId", "==", portal.contactId)
            .where("status", "==", status)
            .orderBy("issueDate", "desc");
        }

        const snapshot = await query
          .limit(parseInt(limit))
          .offset(parseInt(offset))
          .get();

        const invoices = snapshot.docs.map((doc) => {
          const data = doc.data();
          const now = new Date();
          const dueDate = data.dueDate?.toDate();
          const isOverdue = dueDate && dueDate < now && data.status !== "paid";
          const daysOverdue = isOverdue
            ? Math.floor(
                (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
              )
            : 0;

          return {
            id: doc.id,
            ...data,
            isOverdue,
            daysOverdue,
            canPayOnline: data.stripeInvoiceUrl ? true : false,
          };
        });

        // Get total count
        const countSnapshot = await db
          .collection("invoices")
          .where("contactId", "==", portal.contactId)
          .count()
          .get();

        return {
          invoices: invoices.map(serializeTimestamps),
          total: countSnapshot.data().count,
          limit: parseInt(limit),
          offset: parseInt(offset),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch portal invoices");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch invoices",
        });
      }
    },
  );

  /**
   * GET /portal/my-invoices/:invoiceId
   * Get detailed invoice information
   */
  fastify.get(
    "/my-invoices/:invoiceId",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;
        const { invoiceId } = request.params as { invoiceId: string };

        if (!portal.permissions.canViewInvoices) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Invoice viewing not permitted",
          });
        }

        const invoiceDoc = await db.collection("invoices").doc(invoiceId).get();

        if (!invoiceDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Invoice not found",
          });
        }

        const invoice = invoiceDoc.data();

        // Verify ownership
        if (invoice?.contactId !== portal.contactId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this invoice",
          });
        }

        const now = new Date();
        const dueDate = invoice.dueDate?.toDate();
        const isOverdue = dueDate && dueDate < now && invoice.status !== "paid";
        const daysOverdue = isOverdue
          ? Math.floor(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 0;

        return serializeTimestamps({
          id: invoiceDoc.id,
          ...invoice,
          isOverdue,
          daysOverdue,
          canPayOnline: invoice.stripeInvoiceUrl ? true : false,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to fetch invoice details");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch invoice details",
        });
      }
    },
  );

  // ============================================
  // ACTIVITIES
  // ============================================

  /**
   * GET /portal/my-activities
   * Get activities for all horses associated with the portal user
   */
  fastify.get(
    "/my-activities",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;

        if (!portal.permissions.canViewActivities) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Activity viewing not permitted",
          });
        }

        const {
          horseId,
          status,
          dateFrom,
          dateTo,
          limit = "20",
          offset = "0",
        } = request.query as {
          horseId?: string;
          status?: string;
          dateFrom?: string;
          dateTo?: string;
          limit?: string;
          offset?: string;
        };

        // First get all horses for this contact
        const horsesSnapshot = await db
          .collection("horses")
          .where("ownerContactId", "==", portal.contactId)
          .get();

        const ownedHorseIds = horsesSnapshot.docs.map((doc) => doc.id);

        // Get associated horses
        const ownershipSnapshot = await db
          .collection("horseOwnership")
          .where("contactId", "==", portal.contactId)
          .where("status", "==", "active")
          .get();

        const associatedHorseIds = ownershipSnapshot.docs.map(
          (doc) => doc.data().horseId,
        );

        const allHorseIds = [
          ...new Set([...ownedHorseIds, ...associatedHorseIds]),
        ];

        if (allHorseIds.length === 0) {
          return {
            activities: [],
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
          };
        }

        // Build query - Firestore has a limit of 10 for 'in' queries
        const targetHorseIds = horseId ? [horseId] : allHorseIds.slice(0, 10);

        let query = db
          .collection("activities")
          .where("horseId", "in", targetHorseIds)
          .orderBy("scheduledDate", "desc");

        if (dateFrom) {
          query = query.where(
            "scheduledDate",
            ">=",
            Timestamp.fromDate(new Date(dateFrom)),
          );
        }

        if (dateTo) {
          query = query.where(
            "scheduledDate",
            "<=",
            Timestamp.fromDate(new Date(dateTo)),
          );
        }

        const snapshot = await query
          .limit(parseInt(limit))
          .offset(parseInt(offset))
          .get();

        // Filter by status if provided (client-side filter)
        let activities = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (status) {
          activities = activities.filter((a: any) => a.status === status);
        }

        return {
          activities: activities.map(serializeTimestamps),
          total: activities.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch portal activities");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch activities",
        });
      }
    },
  );

  // ============================================
  // MESSAGES / COMMUNICATION
  // ============================================

  /**
   * GET /portal/threads
   * Get message threads for the portal user
   */
  fastify.get(
    "/threads",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;

        if (!portal.permissions.canCommunicate) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Communication not permitted",
          });
        }

        const snapshot = await db
          .collection("portalThreads")
          .where("contactId", "==", portal.contactId)
          .orderBy("lastMessageAt", "desc")
          .get();

        const threads = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return {
          threads: threads.map(serializeTimestamps),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch portal threads");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch threads",
        });
      }
    },
  );

  /**
   * POST /portal/threads
   * Create a new message thread
   */
  fastify.post(
    "/threads",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;

        if (!portal.permissions.canCommunicate) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Communication not permitted",
          });
        }

        const schema = z.object({
          subject: z.string().min(1).max(200),
          initialMessage: z.string().min(1).max(5000),
        });

        const validation = schema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const { subject, initialMessage } = validation.data;
        const now = Timestamp.now();

        // Create thread
        const threadRef = await db.collection("portalThreads").add({
          contactId: portal.contactId,
          organizationId: portal.organizationId,
          subject,
          contactName: portal.contactName,
          organizationName: portal.organizationName,
          lastMessageAt: now,
          lastMessagePreview:
            initialMessage.length > 100
              ? initialMessage.substring(0, 100) + "..."
              : initialMessage,
          unreadCount: 0,
          isClosed: false,
          createdAt: now,
          updatedAt: now,
        });

        // Create initial message
        await db.collection("portalMessages").add({
          threadId: threadRef.id,
          content: initialMessage,
          senderType: "portal_user",
          senderId: portal.contactId,
          senderName: portal.contactName,
          isRead: false,
          createdAt: now,
        });

        const threadDoc = await threadRef.get();

        return reply.status(201).send(
          serializeTimestamps({
            id: threadRef.id,
            ...threadDoc.data(),
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to create thread");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create thread",
        });
      }
    },
  );

  /**
   * GET /portal/threads/:threadId/messages
   * Get messages in a thread
   */
  fastify.get(
    "/threads/:threadId/messages",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;
        const { threadId } = request.params as { threadId: string };

        if (!portal.permissions.canCommunicate) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Communication not permitted",
          });
        }

        // Verify thread ownership
        const threadDoc = await db
          .collection("portalThreads")
          .doc(threadId)
          .get();

        if (!threadDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Thread not found",
          });
        }

        const thread = threadDoc.data();

        if (thread?.contactId !== portal.contactId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this thread",
          });
        }

        const snapshot = await db
          .collection("portalMessages")
          .where("threadId", "==", threadId)
          .orderBy("createdAt", "asc")
          .get();

        const messages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Mark messages as read
        const unreadMessages = snapshot.docs.filter(
          (doc) => !doc.data().isRead && doc.data().senderType === "staff",
        );

        if (unreadMessages.length > 0) {
          const batch = db.batch();
          unreadMessages.forEach((doc) => {
            batch.update(doc.ref, { isRead: true, readAt: Timestamp.now() });
          });
          await batch.commit();

          // Update thread unread count
          await threadDoc.ref.update({ unreadCount: 0 });
        }

        return {
          thread: serializeTimestamps({
            id: threadDoc.id,
            ...thread,
          }),
          messages: messages.map(serializeTimestamps),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch messages");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch messages",
        });
      }
    },
  );

  /**
   * POST /portal/threads/:threadId/messages
   * Send a message in a thread
   */
  fastify.post(
    "/threads/:threadId/messages",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;
        const { threadId } = request.params as { threadId: string };

        if (!portal.permissions.canCommunicate) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Communication not permitted",
          });
        }

        const schema = z.object({
          content: z.string().min(1).max(5000),
        });

        const validation = schema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        // Verify thread ownership
        const threadDoc = await db
          .collection("portalThreads")
          .doc(threadId)
          .get();

        if (!threadDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Thread not found",
          });
        }

        const thread = threadDoc.data();

        if (thread?.contactId !== portal.contactId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this thread",
          });
        }

        if (thread?.isClosed) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Thread is closed",
          });
        }

        const { content } = validation.data;
        const now = Timestamp.now();

        // Create message
        const messageRef = await db.collection("portalMessages").add({
          threadId,
          content,
          senderType: "portal_user",
          senderId: portal.contactId,
          senderName: portal.contactName,
          isRead: false,
          createdAt: now,
        });

        // Update thread
        await threadDoc.ref.update({
          lastMessageAt: now,
          lastMessagePreview:
            content.length > 100 ? content.substring(0, 100) + "..." : content,
          updatedAt: now,
        });

        const messageDoc = await messageRef.get();

        return reply.status(201).send(
          serializeTimestamps({
            id: messageRef.id,
            ...messageDoc.data(),
          }),
        );
      } catch (error) {
        request.log.error({ error }, "Failed to send message");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to send message",
        });
      }
    },
  );

  // ============================================
  // PROFILE / PREFERENCES
  // ============================================

  /**
   * GET /portal/profile
   * Get portal user profile
   */
  fastify.get(
    "/profile",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;

        // Get contact details
        const contactDoc = await db
          .collection("contacts")
          .doc(portal.contactId)
          .get();

        if (!contactDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Contact not found",
          });
        }

        // Get notification preferences
        const prefsDoc = await db
          .collection("portalNotificationPreferences")
          .doc(portal.contactId)
          .get();

        const preferences = prefsDoc.exists
          ? prefsDoc.data()
          : {
              emailEnabled: true,
              emailOnInvoice: true,
              emailOnPaymentConfirmation: true,
              emailOnActivityReminder: true,
              emailOnHealthUpdate: true,
              emailOnMessage: true,
              pushEnabled: false,
              invoiceReminderDaysBefore: [7, 1],
              activityReminderHoursBefore: [24],
            };

        return {
          contact: serializeTimestamps({
            id: contactDoc.id,
            ...contactDoc.data(),
          }),
          organization: {
            id: portal.organizationId,
            name: portal.organizationName,
          },
          role: portal.role,
          permissions: portal.permissions,
          notificationPreferences: preferences,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch portal profile");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch profile",
        });
      }
    },
  );

  /**
   * PATCH /portal/notification-preferences
   * Update notification preferences
   */
  fastify.patch(
    "/notification-preferences",
    {
      preHandler: [authenticate, requirePortalAccess],
    },
    async (request, reply) => {
      try {
        const portal = (request as PortalContextRequest).portalUser;

        const schema = z.object({
          emailEnabled: z.boolean().optional(),
          emailOnInvoice: z.boolean().optional(),
          emailOnPaymentConfirmation: z.boolean().optional(),
          emailOnActivityReminder: z.boolean().optional(),
          emailOnHealthUpdate: z.boolean().optional(),
          emailOnMessage: z.boolean().optional(),
          pushEnabled: z.boolean().optional(),
          invoiceReminderDaysBefore: z.array(z.number()).optional(),
          activityReminderHoursBefore: z.array(z.number()).optional(),
        });

        const validation = schema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const prefsRef = db
          .collection("portalNotificationPreferences")
          .doc(portal.contactId);

        await prefsRef.set(
          {
            contactId: portal.contactId,
            ...validation.data,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );

        const updatedDoc = await prefsRef.get();

        return serializeTimestamps(updatedDoc.data());
      } catch (error) {
        request.log.error({ error }, "Failed to update preferences");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update preferences",
        });
      }
    },
  );
}
