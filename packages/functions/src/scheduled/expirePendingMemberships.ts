import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";

/**
 * Expire Pending Memberships
 *
 * Runs every 6 hours to find pending organization memberships that have
 * passed their expiresAt date. Marks them as "expired" with reason "timeout",
 * notifies the inviter, and marks the user's invite notification as read.
 */
export const expirePendingMemberships = onSchedule(
  {
    schedule: "0 */6 * * *", // Every 6 hours
    timeZone: "Europe/Stockholm",
    region: "europe-west1",
    retryCount: 2,
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = Timestamp.now();

    logger.info(
      { executionId },
      "Starting pending membership expiration check",
    );

    try {
      // Query all pending memberships where expiresAt <= now
      const expiredSnapshot = await db
        .collection("organizationMembers")
        .where("status", "==", "pending")
        .where("expiresAt", "<=", now)
        .get();

      if (expiredSnapshot.empty) {
        logger.info({ executionId }, "No expired memberships found");
        return;
      }

      logger.info(
        { executionId, count: expiredSnapshot.size },
        "Found expired memberships to process",
      );

      let processed = 0;
      let errors = 0;

      for (const memberDoc of expiredSnapshot.docs) {
        const member = memberDoc.data();
        const memberId = memberDoc.id;

        try {
          // Re-check status to prevent race condition with accept/decline
          const freshDoc = await db
            .collection("organizationMembers")
            .doc(memberId)
            .get();
          const freshData = freshDoc.data();
          if (!freshDoc.exists || freshData?.status !== "pending") {
            logger.info(
              { executionId, memberId, currentStatus: freshData?.status },
              "Skipping membership - status changed since query",
            );
            continue;
          }

          // Update membership to expired
          await db.collection("organizationMembers").doc(memberId).update({
            status: "expired",
            expiredAt: now,
            expiredReason: "timeout",
          });

          // Mark the user's invite notification as read
          const notifId = `membership_invite_${memberId}`;
          try {
            await db.collection("notifications").doc(notifId).update({
              read: true,
              readAt: now,
            });
          } catch {
            // Notification may not exist
          }

          // Notify the inviter about the timeout
          if (member.invitedBy) {
            let orgName = "";
            try {
              const orgDoc = await db
                .collection("organizations")
                .doc(member.organizationId)
                .get();
              orgName = orgDoc.data()?.name || "";
            } catch {
              // Non-critical
            }

            const responseNotifId = `membership_response_${memberId}_timeout`;
            try {
              await db
                .collection("notifications")
                .doc(responseNotifId)
                .set({
                  id: responseNotifId,
                  userId: member.invitedBy,
                  organizationId: member.organizationId,
                  type: "membership_invite_response",
                  priority: "normal",
                  title: "Invite Expired",
                  titleKey: "notifications.membershipInviteResponse.title",
                  body: `${member.userEmail}'s invitation to ${orgName} has expired`,
                  bodyKey: "notifications.membershipInviteResponse.body",
                  bodyParams: {
                    userEmail: member.userEmail,
                    organizationName: orgName,
                    reason: "timeout",
                  },
                  entityType: "organizationMember",
                  entityId: memberId,
                  channels: ["inApp"],
                  deliveryStatus: { inApp: "sent" },
                  deliveryAttempts: 1,
                  read: false,
                  createdAt: now,
                  updatedAt: now,
                });
            } catch {
              // Non-critical
            }
          }

          processed++;
        } catch (error) {
          errors++;
          logger.error(
            {
              executionId,
              memberId,
              error: formatErrorMessage(error),
            },
            "Failed to expire membership",
          );
        }
      }

      logger.info(
        { executionId, processed, errors },
        "Pending membership expiration complete",
      );
    } catch (error) {
      logger.error(
        { executionId, error: formatErrorMessage(error) },
        "Pending membership expiration failed",
      );
      throw error; // Trigger retry
    }
  },
);
