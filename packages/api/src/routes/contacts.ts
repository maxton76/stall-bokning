import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../utils/firebase.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const createContactSchema = z.object({
  contactType: z.enum(["Personal", "Business"]),
  accessLevel: z.enum(["user", "organization"]),
  organizationId: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  iban: z.string().optional(),
  invoiceLanguage: z.string().optional(),
  note: z.string().optional(),
  address: addressSchema.optional(),
  // Personal contact fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  secondPhoneNumber: z.string().optional(),
  breedingInfo: z.string().optional(),
  // Business contact fields
  businessName: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  eoriNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  // Source tracking (optional - defaults will be set)
  source: z.enum(["manual", "invite", "import", "sync"]).optional(),
  badge: z.enum(["primary", "stable", "member", "external"]).optional(),
  hasLoginAccess: z.boolean().optional(),
  // Linking fields (optional)
  linkedInviteId: z.string().optional(),
  linkedMemberId: z.string().optional(),
  linkedUserId: z.string().optional(),
});

const updateContactSchema = z.object({
  contactType: z.enum(["Personal", "Business"]).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  iban: z.string().optional(),
  invoiceLanguage: z.string().optional(),
  note: z.string().optional(),
  address: addressSchema.optional(),
  // Personal contact fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  secondPhoneNumber: z.string().optional(),
  breedingInfo: z.string().optional(),
  // Business contact fields
  businessName: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  eoriNumber: z.string().optional(),
  contactPerson: z.string().optional(),
});

export async function contactsRoutes(fastify: FastifyInstance) {
  // Create contact
  fastify.post(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const validation = createContactSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const data = validation.data;

        // Validate organization access if creating organization-level contact
        if (data.accessLevel === "organization" && data.organizationId) {
          const memberId = `${user.uid}_${data.organizationId}`;
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(memberId)
            .get();

          if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have access to this organization",
            });
          }
        }

        const baseData = {
          contactType: data.contactType,
          accessLevel: data.accessLevel,
          organizationId:
            data.accessLevel === "organization" ? data.organizationId : null,
          userId: data.accessLevel === "user" ? user.uid : null,
          // Linking fields
          linkedInviteId: data.linkedInviteId || null,
          linkedMemberId: data.linkedMemberId || null,
          linkedUserId: data.linkedUserId || null,
          // Badge and source
          badge: data.badge || "external",
          source: data.source || "manual",
          hasLoginAccess: data.hasLoginAccess ?? false,
          // Common fields
          email: data.email || null,
          phoneNumber: data.phoneNumber || null,
          iban: data.iban || null,
          invoiceLanguage: data.invoiceLanguage || null,
          note: data.note || null,
          address: data.address || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.uid,
        };

        let contactData: any;
        if (data.contactType === "Personal") {
          contactData = {
            ...baseData,
            firstName: data.firstName || null,
            lastName: data.lastName || null,
            title: data.title || null,
            secondPhoneNumber: data.secondPhoneNumber || null,
            breedingInfo: data.breedingInfo || null,
          };
        } else {
          contactData = {
            ...baseData,
            businessName: data.businessName || null,
            companyRegistrationNumber: data.companyRegistrationNumber || null,
            vatNumber: data.vatNumber || null,
            eoriNumber: data.eoriNumber || null,
            contactPerson: data.contactPerson || null,
          };
        }

        const contactRef = await db.collection("contacts").add(contactData);

        return reply.status(201).send({
          id: contactRef.id,
          ...contactData,
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create contact");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create contact",
        });
      }
    },
  );

  // Get contact by ID
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const contactDoc = await db.collection("contacts").doc(id).get();

        if (!contactDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Contact not found",
          });
        }

        const contact = contactDoc.data();

        // Verify access permissions
        if (contact?.accessLevel === "user" && contact.userId !== user.uid) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to view this contact",
          });
        }

        if (contact?.accessLevel === "organization" && contact.organizationId) {
          const memberId = `${user.uid}_${contact.organizationId}`;
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(memberId)
            .get();

          if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to view this contact",
            });
          }
        }

        return {
          id: contactDoc.id,
          ...contact,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch contact");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch contact",
        });
      }
    },
  );

  // Get user contacts (user-level + organization-level if orgId provided)
  // Supports filters: badge, hasLoginAccess, search
  fastify.get(
    "/",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { organizationId, accessLevel, badge, hasLoginAccess, search } =
          request.query as {
            organizationId?: string;
            accessLevel?: "user" | "organization";
            badge?: "primary" | "stable" | "member" | "external";
            hasLoginAccess?: string; // "true" or "false"
            search?: string;
          };
        const user = (request as AuthenticatedRequest).user!;

        let contacts: any[] = [];

        // Get organization contacts if organizationId provided
        if (
          organizationId &&
          (!accessLevel || accessLevel === "organization")
        ) {
          const memberId = `${user.uid}_${organizationId}`;
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(memberId)
            .get();

          if (memberDoc.exists && memberDoc.data()?.status === "active") {
            let query = db
              .collection("contacts")
              .where("accessLevel", "==", "organization")
              .where("organizationId", "==", organizationId);

            // Apply badge filter if provided
            if (badge) {
              query = query.where("badge", "==", badge);
            }

            // Apply hasLoginAccess filter if provided
            if (hasLoginAccess !== undefined) {
              const hasAccess = hasLoginAccess === "true";
              query = query.where("hasLoginAccess", "==", hasAccess);
            }

            const orgContactsSnapshot = await query
              .orderBy("createdAt", "desc")
              .get();

            orgContactsSnapshot.docs.forEach((doc) => {
              contacts.push({
                id: doc.id,
                ...doc.data(),
              });
            });
          }
        }

        // Get user's personal contacts
        if (!accessLevel || accessLevel === "user") {
          let query = db
            .collection("contacts")
            .where("accessLevel", "==", "user")
            .where("userId", "==", user.uid);

          // Apply badge filter if provided
          if (badge) {
            query = query.where("badge", "==", badge);
          }

          // Apply hasLoginAccess filter if provided
          if (hasLoginAccess !== undefined) {
            const hasAccess = hasLoginAccess === "true";
            query = query.where("hasLoginAccess", "==", hasAccess);
          }

          const userContactsSnapshot = await query
            .orderBy("createdAt", "desc")
            .get();

          userContactsSnapshot.docs.forEach((doc) => {
            contacts.push({
              id: doc.id,
              ...doc.data(),
            });
          });
        }

        // Apply client-side search filter if provided
        if (search && search.trim()) {
          const searchLower = search.toLowerCase().trim();
          contacts = contacts.filter((contact) => {
            const firstName = contact.firstName?.toLowerCase() || "";
            const lastName = contact.lastName?.toLowerCase() || "";
            const businessName = contact.businessName?.toLowerCase() || "";
            const email = contact.email?.toLowerCase() || "";
            const fullName = `${firstName} ${lastName}`.trim();

            return (
              firstName.includes(searchLower) ||
              lastName.includes(searchLower) ||
              fullName.includes(searchLower) ||
              businessName.includes(searchLower) ||
              email.includes(searchLower)
            );
          });
        }

        return { contacts };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch contacts");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch contacts",
        });
      }
    },
  );

  // Update contact
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const validation = updateContactSchema.safeParse(request.body);

        if (!validation.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid input",
            details: validation.error.errors,
          });
        }

        const user = (request as AuthenticatedRequest).user!;
        const contactDoc = await db.collection("contacts").doc(id).get();

        if (!contactDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Contact not found",
          });
        }

        const contact = contactDoc.data();

        // Verify access permissions
        if (contact?.accessLevel === "user" && contact.userId !== user.uid) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to update this contact",
          });
        }

        if (contact?.accessLevel === "organization" && contact.organizationId) {
          const memberId = `${user.uid}_${contact.organizationId}`;
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(memberId)
            .get();

          if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to update this contact",
            });
          }
        }

        const dataToUpdate = {
          ...validation.data,
          updatedAt: new Date(),
        };

        await db.collection("contacts").doc(id).update(dataToUpdate);
        const updatedDoc = await db.collection("contacts").doc(id).get();

        return {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        };
      } catch (error) {
        request.log.error({ error }, "Failed to update contact");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update contact",
        });
      }
    },
  );

  // Delete contact
  fastify.delete(
    "/:id",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const user = (request as AuthenticatedRequest).user!;

        const contactDoc = await db.collection("contacts").doc(id).get();

        if (!contactDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Contact not found",
          });
        }

        const contact = contactDoc.data();

        // Verify access permissions
        if (contact?.accessLevel === "user" && contact.userId !== user.uid) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have permission to delete this contact",
          });
        }

        if (contact?.accessLevel === "organization" && contact.organizationId) {
          const memberId = `${user.uid}_${contact.organizationId}`;
          const memberDoc = await db
            .collection("organizationMembers")
            .doc(memberId)
            .get();

          if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
            return reply.status(403).send({
              error: "Forbidden",
              message: "You do not have permission to delete this contact",
            });
          }
        }

        await db.collection("contacts").doc(id).delete();

        return reply.status(204).send();
      } catch (error) {
        request.log.error({ error }, "Failed to delete contact");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete contact",
        });
      }
    },
  );

  // POST /api/v1/contacts/check-duplicate - Check for duplicate contacts
  // SECURITY: Only returns isDuplicate boolean and matchType, never exposes contact data
  fastify.post(
    "/check-duplicate",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { email, organizationId, firstName, lastName, businessName } =
          request.body as {
            email?: string;
            organizationId: string;
            firstName?: string;
            lastName?: string;
            businessName?: string;
          };
        const user = (request as AuthenticatedRequest).user!;

        // Verify organization membership
        const memberId = `${user.uid}_${organizationId}`;
        const memberDoc = await db
          .collection("organizationMembers")
          .doc(memberId)
          .get();

        if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You do not have access to this organization",
          });
        }

        // Check by email if provided
        if (email) {
          const emailSnapshot = await db
            .collection("contacts")
            .where("organizationId", "==", organizationId)
            .where("email", "==", email.toLowerCase())
            .limit(1)
            .get();

          if (!emailSnapshot.empty) {
            return reply.send({ isDuplicate: true, matchType: "email" });
          }
        }

        // Check by name if provided
        if (firstName && lastName) {
          const nameSnapshot = await db
            .collection("contacts")
            .where("organizationId", "==", organizationId)
            .where("firstName", "==", firstName)
            .where("lastName", "==", lastName)
            .limit(1)
            .get();

          if (!nameSnapshot.empty) {
            return reply.send({ isDuplicate: true, matchType: "name" });
          }
        }

        // Check by business name if provided (for Business contacts)
        if (businessName) {
          const businessSnapshot = await db
            .collection("contacts")
            .where("organizationId", "==", organizationId)
            .where("businessName", "==", businessName)
            .limit(1)
            .get();

          if (!businessSnapshot.empty) {
            return reply.send({ isDuplicate: true, matchType: "businessName" });
          }
        }

        // No duplicates found
        return reply.send({ isDuplicate: false });
      } catch (error) {
        request.log.error({ error }, "Failed to check for duplicates");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to check for duplicates",
        });
      }
    },
  );
}
