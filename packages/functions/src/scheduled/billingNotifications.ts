import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp, FieldValue } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";

/**
 * Billing Notifications Scanner
 *
 * Runs daily at 08:00 Stockholm time to scan for:
 * - Trial periods expiring in 3 days or 1 day
 * - Subscriptions expiring in 7 days or 1 day (when cancelAtPeriodEnd is true)
 * - Trial ending soon with no payment method on file
 *
 * Uses sentReminders collection to prevent duplicate notifications.
 */
export const scanForBillingNotifications = onSchedule(
  {
    schedule: "0 8 * * *", // At 08:00 every day
    timeZone: "Europe/Stockholm",
    region: "europe-west1",
    retryCount: 2,
  },
  async (_event) => {
    const executionId = crypto.randomUUID();
    const now = new Date();

    logger.info(
      {
        executionId,
        timestamp: now.toISOString(),
      },
      "Starting billing notifications scan",
    );

    try {
      let totalNotifications = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      // Get all organizations with active subscriptions
      const orgsSnapshot = await db.collection("organizations").get();

      for (const orgDoc of orgsSnapshot.docs) {
        try {
          const org = orgDoc.data();
          const organizationId = orgDoc.id;
          const ownerId = org.ownerId;

          if (!ownerId) {
            totalSkipped++;
            continue;
          }

          const stripeSubscription = org.stripeSubscription;
          if (!stripeSubscription) {
            totalSkipped++;
            continue;
          }

          // ========================================================================
          // TRIAL EXPIRING NOTIFICATIONS
          // ========================================================================

          if (stripeSubscription.trialEnd) {
            const trialEnd = new Date(stripeSubscription.trialEnd);
            const daysUntilTrialEnd = Math.ceil(
              (trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            );

            // Send notification at 3 days and 1 day before trial ends
            const trialReminderDays = [3, 1];
            for (const reminderDay of trialReminderDays) {
              if (daysUntilTrialEnd === reminderDay) {
                const reminderDocId = `trial_expiring_${organizationId}_${reminderDay}`;
                const wasNotificationSent = await createNotificationIfNotExists(
                  reminderDocId,
                  ownerId,
                  "trial_expiring",
                  org.name,
                  reminderDay,
                  organizationId,
                  executionId,
                );

                if (wasNotificationSent) {
                  totalNotifications++;
                } else {
                  totalSkipped++;
                }
              }
            }

            // ========================================================================
            // PAYMENT METHOD REQUIRED (Trial ending, no payment method)
            // ========================================================================

            // Check if trial is ending soon (within 3 days) and no payment method
            if (daysUntilTrialEnd <= 3 && daysUntilTrialEnd >= 0) {
              // Check if there's a payment method (customer has a default payment method)
              // We assume if there's no subscriptionId yet, they haven't added payment
              const hasPaymentMethod =
                stripeSubscription.subscriptionId &&
                stripeSubscription.status !== "trialing";

              if (!hasPaymentMethod) {
                const reminderDocId = `payment_method_required_${organizationId}_${daysUntilTrialEnd}`;
                const wasNotificationSent = await createNotificationIfNotExists(
                  reminderDocId,
                  ownerId,
                  "payment_method_required",
                  org.name,
                  daysUntilTrialEnd,
                  organizationId,
                  executionId,
                );

                if (wasNotificationSent) {
                  totalNotifications++;
                } else {
                  totalSkipped++;
                }
              }
            }
          }

          // ========================================================================
          // SUBSCRIPTION EXPIRING NOTIFICATIONS (cancelAtPeriodEnd = true)
          // ========================================================================

          if (
            stripeSubscription.cancelAtPeriodEnd &&
            stripeSubscription.currentPeriodEnd
          ) {
            const periodEnd = new Date(stripeSubscription.currentPeriodEnd);
            const daysUntilExpiry = Math.ceil(
              (periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            );

            // Send notification at 7 days and 1 day before subscription ends
            const subscriptionReminderDays = [7, 1];
            for (const reminderDay of subscriptionReminderDays) {
              if (daysUntilExpiry === reminderDay) {
                const reminderDocId = `subscription_expiring_${organizationId}_${reminderDay}`;
                const wasNotificationSent = await createNotificationIfNotExists(
                  reminderDocId,
                  ownerId,
                  "subscription_expiring",
                  org.name,
                  reminderDay,
                  organizationId,
                  executionId,
                );

                if (wasNotificationSent) {
                  totalNotifications++;
                } else {
                  totalSkipped++;
                }
              }
            }
          }
        } catch (error) {
          totalErrors++;
          logger.error(
            {
              executionId,
              organizationId: orgDoc.id,
              error: formatErrorMessage(error),
            },
            "Error processing organization for billing notifications",
          );
        }
      }

      // ========================================================================
      // CLEANUP OLD SENT REMINDERS (billing-specific)
      // ========================================================================

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldRemindersSnapshot = await db
        .collection("sentReminders")
        .where("type", "in", [
          "trial_expiring",
          "subscription_expiring",
          "payment_method_required",
        ])
        .where("sentAt", "<", Timestamp.fromDate(thirtyDaysAgo))
        .limit(500)
        .get();

      if (!oldRemindersSnapshot.empty) {
        const batch = db.batch();
        oldRemindersSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        logger.info(
          {
            executionId,
            cleanedUp: oldRemindersSnapshot.size,
          },
          "Cleaned up old billing reminder records",
        );
      }

      logger.info(
        {
          executionId,
          totalNotifications,
          totalSkipped,
          totalErrors,
          duration: Date.now() - now.getTime(),
        },
        "Billing notifications scan complete",
      );
    } catch (error) {
      logger.error(
        {
          executionId,
          error: formatErrorMessage(error),
        },
        "Billing notifications scan failed",
      );
      throw error;
    }
  },
);

/**
 * Create notification if not already sent (prevents duplicates)
 * Uses transaction to ensure atomicity
 */
async function createNotificationIfNotExists(
  reminderDocId: string,
  userId: string,
  notificationType:
    | "trial_expiring"
    | "subscription_expiring"
    | "payment_method_required",
  organizationName: string,
  daysRemaining: number,
  organizationId: string,
  executionId: string,
): Promise<boolean> {
  const reminderRef = db.collection("sentReminders").doc(reminderDocId);

  const wasCreated = await db.runTransaction(async (transaction) => {
    const reminderDoc = await transaction.get(reminderRef);

    if (reminderDoc.exists) {
      return false; // Already sent
    }

    // Mark as sent within the transaction
    transaction.set(reminderRef, {
      type: notificationType,
      organizationId,
      userId,
      daysRemaining,
      sentAt: Timestamp.now(),
    });

    return true;
  });

  if (!wasCreated) {
    return false;
  }

  // Create the notification
  const now = FieldValue.serverTimestamp();

  const notificationData: Record<string, any> = {
    userId,
    type: notificationType,
    priority: "high",
    channels: ["inApp", "email"],
    deliveryStatus: { inApp: "pending", email: "pending" },
    deliveryAttempts: 0,
    read: false,
    entityType: "organization",
    entityId: organizationId,
    createdAt: now,
    updatedAt: now,
  };

  switch (notificationType) {
    case "trial_expiring":
      notificationData.title = "Your trial is ending soon";
      notificationData.titleKey = "notifications.trialExpiring.title";
      notificationData.body = `The trial for ${organizationName} expires in ${daysRemaining} days. Add a payment method to continue using all features.`;
      notificationData.bodyKey = "notifications.trialExpiring.body";
      notificationData.bodyParams = {
        organizationName,
        days: String(daysRemaining),
      };
      notificationData.actionUrl = "/settings/billing";
      break;

    case "subscription_expiring":
      notificationData.title = "Your subscription is ending soon";
      notificationData.titleKey = "notifications.subscriptionExpiring.title";
      notificationData.body = `The subscription for ${organizationName} ends in ${daysRemaining} days. Contact us if you'd like to continue.`;
      notificationData.bodyKey = "notifications.subscriptionExpiring.body";
      notificationData.bodyParams = {
        organizationName,
        days: String(daysRemaining),
      };
      notificationData.actionUrl = "/settings/billing";
      break;

    case "payment_method_required":
      notificationData.title = "Payment method required";
      notificationData.titleKey = "notifications.paymentMethodRequired.title";
      notificationData.body = `The trial for ${organizationName} is ending soon. Please add a payment method to continue.`;
      notificationData.bodyKey = "notifications.paymentMethodRequired.body";
      notificationData.bodyParams = { organizationName };
      notificationData.actionUrl = "/settings/billing";
      break;
  }

  await db.collection("notifications").add(notificationData);

  logger.info(
    {
      executionId,
      notificationType,
      organizationId,
      userId,
      daysRemaining,
    },
    "Created billing notification",
  );

  return true;
}
