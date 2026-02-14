/**
 * Authorization Middleware for Facility Reservations
 * Prevents users from modifying other users' reservations
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import type { AuthenticatedRequest } from "../types/index.js";

/**
 * Check if user has organization membership with stable access
 */
async function hasOrgStableAccess(
  stableId: string,
  userId: string,
): Promise<boolean> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return false;

  const stable = stableDoc.data()!;
  const organizationId = stable.organizationId;

  if (!organizationId) return false;

  // Check organizationMembers collection
  const memberId = `${userId}_${organizationId}`;
  const memberDoc = await db
    .collection("organizationMembers")
    .doc(memberId)
    .get();

  if (!memberDoc.exists) return false;

  const member = memberDoc.data()!;
  if (member.status !== "active") return false;

  // Check stable access permissions
  if (member.stableAccess === "all") return true;
  if (member.stableAccess === "specific") {
    const assignedStables = member.assignedStableIds || [];
    if (assignedStables.includes(stableId)) return true;
  }

  return false;
}

/**
 * Check if user has access to a stable (owner or org member)
 */
async function hasStableAccess(
  stableId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "system_admin") return true;

  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) return false;

  const stable = stableDoc.data()!;

  // Check ownership
  if (stable.ownerId === userId) return true;

  // Check organization membership with stable access
  if (await hasOrgStableAccess(stableId, userId)) return true;

  return false;
}

/**
 * Middleware: Check reservation ownership
 * Ensures user owns reservation OR has admin access to the facility's stable
 */
export async function checkReservationOwnership(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params as { id: string };
    const user = (request as AuthenticatedRequest).user!;

    const reservationDoc = await db
      .collection("facilityReservations")
      .doc(id)
      .get();

    if (!reservationDoc.exists) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Reservation not found",
      });
    }

    const reservation = reservationDoc.data()!;

    // Check ownership
    if (reservation.userId !== user.uid) {
      // Check if user has admin access to this facility's stable
      const hasAdminAccess = await hasStableAccess(
        reservation.stableId,
        user.uid,
        user.role,
      );

      if (!hasAdminAccess) {
        return reply.status(403).send({
          error: "UNAUTHORIZED",
          message: "You do not have permission to modify this reservation",
        });
      }
    }

    // Authorization passed - attach reservation to request
    (request as any).reservation = reservation;
  } catch (error) {
    request.log.error({ error }, "Authorization error");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Failed to check authorization",
    });
  }
}
