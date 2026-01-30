/**
 * System Admin Authorization Middleware
 *
 * Checks that the authenticated user has system_admin role.
 * Must be used after the authenticate middleware.
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../utils/firebase.js";
import type { AuthenticatedRequest } from "../types/index.js";

/**
 * Middleware: Require system_admin role
 * Checks the user's systemRole field in the Firestore users collection.
 * Always performs the Firestore lookup to normalize timing (prevent side-channel).
 * Must be used after authenticate middleware.
 */
export async function requireSystemAdmin(
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

  // Always perform Firestore lookup to normalize timing regardless of token claim
  try {
    const userDoc = await db.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "System admin access required",
      });
    }

    const userData = userDoc.data();

    if (userData?.systemRole !== "system_admin") {
      return reply.status(403).send({
        error: "Forbidden",
        message: "System admin access required",
      });
    }
  } catch (error) {
    request.log.error({ error }, "Failed to verify system admin role");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Failed to verify permissions",
    });
  }
}
