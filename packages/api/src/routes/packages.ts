import type { FastifyInstance } from "fastify";
import { Timestamp } from "firebase-admin/firestore";
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

export async function packagesRoutes(fastify: FastifyInstance) {
  // Addon gate: invoicing addon required
  fastify.addHook("preHandler", checkModuleAccess("invoicing"));

  // ---------------------------------------------------------------------------
  // Package Definitions (templates)
  // ---------------------------------------------------------------------------

  /**
   * GET /:organizationId/packages
   * List package definitions for an organization.
   * Query params: isActive (default "true"), limit (default "100")
   */
  fastify.get(
    "/:organizationId/packages",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = (request as AuthenticatedRequest).user!;
        const { organizationId } = request.params as {
          organizationId: string;
        };
        const { isActive = "true", limit = "100" } = request.query as {
          isActive?: string;
          limit?: string;
        };

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

        // Build query
        let query = db
          .collection("packageDefinitions")
          .where("organizationId", "==", organizationId);

        const activeFilter = isActive !== "false";
        query = query.where("isActive", "==", activeFilter) as any;

        query = query.orderBy("name", "asc").limit(parseInt(limit)) as any;

        const snapshot = await query.get();

        const items = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { items };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch package definitions");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch package definitions",
        });
      }
    },
  );

  /**
   * POST /:organizationId/packages
   * Create a new package definition.
   * Required: name, chargeableItemId, totalUnits, price (ore), expiryPolicy, cancellationPolicy
   * Optional: description, validityDays, transferableWithinGroup (default false)
   */
  fastify.post(
    "/:organizationId/packages",
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

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage packages for this organization",
            });
          }
        }

        // Validate required fields
        const requiredFields = [
          "name",
          "chargeableItemId",
          "totalUnits",
          "price",
          "expiryPolicy",
          "cancellationPolicy",
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

        // Validate cancellationPolicy enum
        const validPolicies = [
          "no_refund",
          "pro_rata_unit",
          "pro_rata_package",
          "full_refund",
        ];
        if (!validPolicies.includes(data.cancellationPolicy)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Invalid cancellationPolicy. Must be one of: ${validPolicies.join(", ")}`,
          });
        }

        // Validate numeric fields
        if (
          typeof data.totalUnits !== "number" ||
          data.totalUnits <= 0 ||
          !Number.isInteger(data.totalUnits)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "totalUnits must be a positive integer",
          });
        }

        if (typeof data.price !== "number" || data.price < 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "price must be a non-negative number (in ore)",
          });
        }

        // Verify chargeable item exists and belongs to the organization
        const chargeableItemDoc = await db
          .collection("chargeableItems")
          .doc(data.chargeableItemId)
          .get();

        if (!chargeableItemDoc.exists) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Chargeable item not found",
          });
        }

        const chargeableItem = chargeableItemDoc.data()!;
        if (chargeableItem.organizationId !== organizationId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Chargeable item does not belong to this organization",
          });
        }

        const packageData = {
          organizationId,
          name: data.name,
          description: data.description || null,
          chargeableItemId: data.chargeableItemId,
          totalUnits: data.totalUnits,
          price: data.price,
          expiryPolicy: data.expiryPolicy,
          cancellationPolicy: data.cancellationPolicy,
          validityDays: data.validityDays || null,
          transferableWithinGroup: data.transferableWithinGroup ?? false,
          isActive: true,

          // Metadata
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        const docRef = await db
          .collection("packageDefinitions")
          .add(packageData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(packageData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to create package definition");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create package definition",
        });
      }
    },
  );

  /**
   * PATCH /:organizationId/packages/:id
   * Update a package definition (partial update).
   */
  fastify.patch(
    "/:organizationId/packages/:id",
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

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage packages for this organization",
            });
          }
        }

        const docRef = db.collection("packageDefinitions").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Package definition not found",
          });
        }

        const existing = doc.data()!;

        // Verify package belongs to the organization
        if (existing.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Package definition not found",
          });
        }

        // Prevent changing immutable fields
        delete updates.organizationId;
        delete updates.createdAt;
        delete updates.createdBy;

        // Validate cancellationPolicy if provided
        if (updates.cancellationPolicy) {
          const validPolicies = [
            "no_refund",
            "pro_rata_unit",
            "pro_rata_package",
            "full_refund",
          ];
          if (!validPolicies.includes(updates.cancellationPolicy)) {
            return reply.status(400).send({
              error: "Bad Request",
              message: `Invalid cancellationPolicy. Must be one of: ${validPolicies.join(", ")}`,
            });
          }
        }

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        };

        await docRef.update(updateData);

        return serializeTimestamps({ id, ...existing, ...updateData });
      } catch (error) {
        request.log.error({ error }, "Failed to update package definition");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update package definition",
        });
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Member Packages (purchased instances)
  // ---------------------------------------------------------------------------

  /**
   * POST /:organizationId/packages/:id/purchase
   * Purchase a package for a member.
   * Body: { memberId: string, billingGroupId?: string }
   */
  fastify.post(
    "/:organizationId/packages/:id/purchase",
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
        const data = request.body as {
          memberId: string;
          billingGroupId?: string;
        };

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to purchase packages for this organization",
            });
          }
        }

        if (!data.memberId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "memberId is required",
          });
        }

        // Fetch the package definition
        const pkgDoc = await db.collection("packageDefinitions").doc(id).get();

        if (!pkgDoc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Package definition not found",
          });
        }

        const pkgDef = pkgDoc.data()!;

        // Verify package belongs to the organization
        if (pkgDef.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Package definition not found",
          });
        }

        if (!pkgDef.isActive) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Cannot purchase an inactive package",
          });
        }

        const now = Timestamp.now();
        const purchaseDate = now;

        // Calculate expiry date if validityDays is set
        let expiresAt: Timestamp | null = null;
        if (pkgDef.validityDays && pkgDef.validityDays > 0) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + pkgDef.validityDays);
          expiresAt = Timestamp.fromDate(expiryDate);
        }

        const memberPackageData: Record<string, any> = {
          organizationId,
          packageDefinitionId: id,
          memberId: data.memberId,
          purchaseDate,
          expiresAt,
          remainingUnits: pkgDef.totalUnits,
          totalUnits: pkgDef.totalUnits,
          price: pkgDef.price,
          status: "active",

          // Denormalized fields for convenience
          packageName: pkgDef.name,
          chargeableItemId: pkgDef.chargeableItemId,
          cancellationPolicy: pkgDef.cancellationPolicy,
          validityDays: pkgDef.validityDays || null,

          // Metadata
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
          updatedBy: user.uid,
        };

        // Only set billingGroupId if package allows transfer within group
        if (data.billingGroupId && pkgDef.transferableWithinGroup) {
          memberPackageData.billingGroupId = data.billingGroupId;
        } else {
          memberPackageData.billingGroupId = null;
        }

        const docRef = await db
          .collection("memberPackages")
          .add(memberPackageData);

        return reply.status(201).send({
          id: docRef.id,
          ...serializeTimestamps(memberPackageData),
        });
      } catch (error) {
        request.log.error({ error }, "Failed to purchase package");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to purchase package",
        });
      }
    },
  );

  /**
   * GET /:organizationId/member-packages
   * List purchased packages for an organization.
   * Query params: memberId, status, limit (default "100")
   */
  fastify.get(
    "/:organizationId/member-packages",
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
          memberId,
          status,
          limit = "100",
        } = request.query as {
          memberId?: string;
          status?: string;
          limit?: string;
        };

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

        // Build query
        let query = db
          .collection("memberPackages")
          .where("organizationId", "==", organizationId);

        if (memberId) {
          query = query.where("memberId", "==", memberId) as any;
        }

        if (status) {
          query = query.where("status", "==", status) as any;
        }

        query = query
          .orderBy("purchaseDate", "desc")
          .limit(parseInt(limit)) as any;

        const snapshot = await query.get();

        const items = snapshot.docs.map((doc) =>
          serializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }),
        );

        return { items };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch member packages");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch member packages",
        });
      }
    },
  );

  /**
   * GET /:organizationId/member-packages/:id
   * Get a purchased package with its usage (deduction) history.
   */
  fastify.get(
    "/:organizationId/member-packages/:id",
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

        const doc = await db.collection("memberPackages").doc(id).get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member package not found",
          });
        }

        const memberPkg = doc.data()!;

        // Verify package belongs to the organization
        if (memberPkg.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member package not found",
          });
        }

        // Fetch deduction history
        const deductionsSnapshot = await db
          .collection("packageDeductions")
          .where("memberPackageId", "==", id)
          .orderBy("deductedAt", "desc")
          .get();

        const deductions = deductionsSnapshot.docs.map((d) =>
          serializeTimestamps({
            id: d.id,
            ...d.data(),
          }),
        );

        return {
          ...serializeTimestamps({ id: doc.id, ...memberPkg }),
          deductions,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to fetch member package");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch member package",
        });
      }
    },
  );

  /**
   * POST /:organizationId/member-packages/:id/deduct
   * Manual deduction of units from a member package.
   * Uses a Firestore transaction to prevent race conditions.
   * Body: { units: number, lineItemId?: string }
   */
  fastify.post(
    "/:organizationId/member-packages/:id/deduct",
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
        const data = request.body as {
          units: number;
          lineItemId?: string;
        };

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage packages for this organization",
            });
          }
        }

        if (
          !data.units ||
          typeof data.units !== "number" ||
          data.units <= 0 ||
          !Number.isInteger(data.units)
        ) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "units must be a positive integer",
          });
        }

        const memberPkgRef = db.collection("memberPackages").doc(id);

        // Use a transaction to atomically read, validate, and update
        const result = await db.runTransaction(async (transaction) => {
          const memberPkgDoc = await transaction.get(memberPkgRef);

          if (!memberPkgDoc.exists) {
            return { error: 404, message: "Member package not found" };
          }

          const memberPkg = memberPkgDoc.data()!;

          // Verify package belongs to the organization
          if (memberPkg.organizationId !== organizationId) {
            return { error: 404, message: "Member package not found" };
          }

          if (memberPkg.status !== "active") {
            return {
              error: 400,
              message: `Cannot deduct from a package with status: ${memberPkg.status}`,
            };
          }

          if (memberPkg.remainingUnits < data.units) {
            return {
              error: 400,
              message: `Insufficient units. Remaining: ${memberPkg.remainingUnits}, requested: ${data.units}`,
            };
          }

          // Check expiry
          if (memberPkg.expiresAt) {
            const expiresAt =
              memberPkg.expiresAt instanceof Timestamp
                ? memberPkg.expiresAt.toDate()
                : new Date(memberPkg.expiresAt);
            if (expiresAt < new Date()) {
              // Mark as expired within the transaction
              transaction.update(memberPkgRef, {
                status: "expired",
                updatedAt: Timestamp.now(),
                updatedBy: user.uid,
              });
              return {
                error: 400,
                message: "Package has expired",
              };
            }
          }

          const newRemaining = memberPkg.remainingUnits - data.units;
          const newStatus = newRemaining === 0 ? "depleted" : "active";
          const now = Timestamp.now();

          // Update member package
          transaction.update(memberPkgRef, {
            remainingUnits: newRemaining,
            status: newStatus,
            updatedAt: now,
            updatedBy: user.uid,
          });

          // Create deduction record
          const deductionData = {
            memberPackageId: id,
            organizationId,
            memberId: memberPkg.memberId,
            units: data.units,
            lineItemId: data.lineItemId || null,
            deductedAt: now,
            deductedBy: user.uid,
          };

          const deductionRef = db.collection("packageDeductions").doc();
          transaction.set(deductionRef, deductionData);

          return {
            success: true,
            deductionId: deductionRef.id,
            deduction: deductionData,
            remainingUnits: newRemaining,
            status: newStatus,
          };
        });

        // Handle transaction results
        if ("error" in result) {
          return reply.status(result.error as number).send({
            error: result.error === 404 ? "Not Found" : "Bad Request",
            message: result.message,
          });
        }

        return {
          success: true,
          deductionId: result.deductionId,
          deduction: serializeTimestamps(result.deduction),
          remainingUnits: result.remainingUnits,
          status: result.status,
        };
      } catch (error) {
        request.log.error({ error }, "Failed to deduct from package");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to deduct from package",
        });
      }
    },
  );

  /**
   * POST /:organizationId/member-packages/:id/cancel
   * Cancel a member package with policy-based refund calculation.
   * Returns refund amount in ore -- the caller handles creating the actual credit/refund.
   */
  fastify.post(
    "/:organizationId/member-packages/:id/cancel",
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

        // Check organization management access
        if (!isSystemAdmin(user.role)) {
          const canManage = await canManageOrganization(
            user.uid,
            organizationId,
          );
          if (!canManage) {
            return reply.status(403).send({
              error: "Forbidden",
              message:
                "You do not have permission to manage packages for this organization",
            });
          }
        }

        const docRef = db.collection("memberPackages").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member package not found",
          });
        }

        const memberPkg = doc.data()!;

        // Verify package belongs to the organization
        if (memberPkg.organizationId !== organizationId) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Member package not found",
          });
        }

        if (memberPkg.status === "cancelled") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Package is already cancelled",
          });
        }

        if (memberPkg.status === "depleted") {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Cannot cancel a fully depleted package",
          });
        }

        // Calculate refund based on cancellation policy
        const policy = memberPkg.cancellationPolicy;
        const price: number = memberPkg.price;
        const totalUnits: number = memberPkg.totalUnits;
        const remainingUnits: number = memberPkg.remainingUnits;
        let refundAmount = 0;

        switch (policy) {
          case "no_refund":
            refundAmount = 0;
            break;

          case "pro_rata_unit":
            // Refund proportional to unused units
            refundAmount = Math.round((remainingUnits / totalUnits) * price);
            break;

          case "pro_rata_package": {
            // Refund proportional to remaining validity days
            const validityDays = memberPkg.validityDays;
            if (validityDays && validityDays > 0 && memberPkg.purchaseDate) {
              const purchaseDate =
                memberPkg.purchaseDate instanceof Timestamp
                  ? memberPkg.purchaseDate.toDate()
                  : new Date(memberPkg.purchaseDate);
              const now = new Date();
              const elapsedMs = now.getTime() - purchaseDate.getTime();
              const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
              const remainingDays = Math.max(0, validityDays - elapsedDays);
              refundAmount = Math.round((remainingDays / validityDays) * price);
            } else {
              // If no validity period set, fall back to no refund
              refundAmount = 0;
            }
            break;
          }

          case "full_refund":
            refundAmount = price;
            break;

          default:
            refundAmount = 0;
            break;
        }

        const now = Timestamp.now();

        await docRef.update({
          status: "cancelled",
          cancelledAt: now,
          refundAmount,
          updatedAt: now,
          updatedBy: user.uid,
        });

        return {
          success: true,
          id,
          status: "cancelled",
          cancellationPolicy: policy,
          refundAmount,
          currency: "SEK",
        };
      } catch (error) {
        request.log.error({ error }, "Failed to cancel member package");
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to cancel member package",
        });
      }
    },
  );
}
