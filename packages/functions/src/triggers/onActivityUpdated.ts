/**
 * Activity Updated Trigger
 *
 * Watches for activity document updates and notifies horse owners
 * when a non-owner adds or changes notes or media on their horse's activity.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ActivityData {
  type?: string;
  horseId?: string;
  horseName?: string;
  stableId?: string;
  stableName?: string;
  note?: string;
  mediaIds?: string[];
  lastModifiedBy?: string;
  lastModifiedAt?: FirebaseFirestore.Timestamp;
  createdBy?: string;
}

interface OwnershipData {
  userId?: string;
  ownerName?: string;
  role?: string;
  endDate?: FirebaseFirestore.Timestamp | null;
}

interface UserData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get display name for a user
 */
function getUserDisplayName(userData: UserData | undefined): string {
  if (!userData) return "Någon";

  if (userData.firstName && userData.lastName) {
    return `${userData.firstName} ${userData.lastName}`;
  }
  if (userData.displayName) {
    return userData.displayName;
  }
  return "Någon";
}

/**
 * Find active horse owners with linked user accounts
 * Queries the ownership subcollection: horses/{horseId}/ownership/
 */
async function getHorseOwnerUserIds(
  horseId: string,
): Promise<Array<{ userId: string; ownerName: string }>> {
  const ownershipSnapshot = await db
    .collection("horses")
    .doc(horseId)
    .collection("ownership")
    .get();

  const owners: Array<{ userId: string; ownerName: string }> = [];

  for (const doc of ownershipSnapshot.docs) {
    const data = doc.data() as OwnershipData;

    // Skip if no linked user account
    if (!data.userId) continue;

    // Skip if ownership has ended
    if (data.endDate && data.endDate.toDate() < new Date()) continue;

    owners.push({
      userId: data.userId,
      ownerName: data.ownerName || "Ägare",
    });
  }

  return owners;
}

/**
 * Create notification and queue item for a horse owner
 */
async function createOwnerNotification(params: {
  ownerUserId: string;
  type: "activity_note_added" | "activity_media_added";
  activityId: string;
  horseName: string;
  authorName: string;
  stableId?: string;
  executionId: string;
}): Promise<void> {
  const {
    ownerUserId,
    type,
    activityId,
    horseName,
    authorName,
    stableId,
    executionId,
  } = params;

  const now = Timestamp.now();
  const notificationId = crypto.randomUUID();

  const isNote = type === "activity_note_added";
  const title = isNote
    ? `Ny anteckning för ${horseName}`
    : `Ny bild/media för ${horseName}`;
  const body = isNote
    ? `${authorName} lade till en anteckning på aktiviteten`
    : `${authorName} lade till media på aktiviteten`;
  const titleKey = isNote
    ? "notifications.activityNoteAdded.title"
    : "notifications.activityMediaAdded.title";
  const bodyKey = isNote
    ? "notifications.activityNoteAdded.body"
    : "notifications.activityMediaAdded.body";

  const actionUrl = `equiduty://activity/${activityId}`;
  const channels = ["inApp", "push"];

  const batch = db.batch();

  // Create notification document
  const notificationRef = db.collection("notifications").doc(notificationId);
  batch.set(notificationRef, {
    userId: ownerUserId,
    type,
    priority: "normal",
    title,
    titleKey,
    body,
    bodyKey,
    bodyParams: { authorName, horseName },
    entityType: "activity",
    entityId: activityId,
    channels,
    deliveryStatus: {
      inApp: "sent",
      push: "pending",
    },
    read: false,
    actionUrl,
    ...(stableId ? { stableId } : {}),
    createdAt: now,
    updatedAt: now,
  });

  // Queue for push delivery
  const queueItemId = crypto.randomUUID();
  const queueRef = db.collection("notificationQueue").doc(queueItemId);
  batch.set(queueRef, {
    notificationId,
    userId: ownerUserId,
    channel: "push",
    priority: "normal",
    payload: {
      title,
      body,
      data: {
        actionUrl,
        type,
        activityId,
      },
    },
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    scheduledFor: now,
    createdAt: now,
  });

  await batch.commit();

  logger.info(
    {
      executionId,
      ownerUserId,
      notificationId,
      type,
      activityId,
    },
    "Created activity update notification for horse owner",
  );
}

// ============================================================================
// MAIN TRIGGER
// ============================================================================

/**
 * Firestore trigger for activity document updates
 *
 * Triggers when:
 * 1. The `note` field is added or changed (note added/updated)
 * 2. The `mediaIds` array grows (media added)
 *
 * Notifies horse owner(s) unless the modifier IS the owner.
 */
export const onActivityUpdated = onDocumentUpdated(
  {
    document: "activities/{activityId}",
    region: "europe-west1",
  },
  async (event) => {
    const executionId = crypto.randomUUID();

    if (!event.data) {
      logger.warn({ executionId }, "No data in activity update event");
      return;
    }

    const beforeData = event.data.before.data() as ActivityData | undefined;
    const afterData = event.data.after.data() as ActivityData | undefined;
    const activityId = event.params.activityId;

    if (!afterData) {
      logger.warn(
        { executionId, activityId },
        "No after data in activity update",
      );
      return;
    }

    // Only process activity-type entries (not tasks or messages)
    if (afterData.type && afterData.type !== "activity") {
      return;
    }

    // Determine what changed
    const noteAdded =
      !!afterData.note &&
      afterData.note.trim() !== "" &&
      afterData.note !== beforeData?.note;

    const beforeMediaCount = beforeData?.mediaIds?.length ?? 0;
    const afterMediaCount = afterData.mediaIds?.length ?? 0;
    const mediaAdded = afterMediaCount > beforeMediaCount;

    // Nothing relevant changed
    if (!noteAdded && !mediaAdded) {
      return;
    }

    // Must have a horse reference
    const horseId = afterData.horseId;
    if (!horseId) {
      logger.debug(
        { executionId, activityId },
        "Activity has no horseId - skipping notification",
      );
      return;
    }

    const modifiedBy = afterData.lastModifiedBy || afterData.createdBy;
    if (!modifiedBy) {
      logger.warn(
        { executionId, activityId },
        "No lastModifiedBy or createdBy on activity - skipping",
      );
      return;
    }

    logger.info(
      {
        executionId,
        activityId,
        horseId,
        noteAdded,
        mediaAdded,
        modifiedBy,
      },
      "Processing activity update for owner notifications",
    );

    try {
      // Find horse owners
      const owners = await getHorseOwnerUserIds(horseId);

      if (owners.length === 0) {
        logger.debug(
          { executionId, activityId, horseId },
          "No active owners with user accounts found - skipping",
        );
        return;
      }

      // Get modifier's display name
      let authorName = "Någon";
      try {
        const userDoc = await db.collection("users").doc(modifiedBy).get();
        if (userDoc.exists) {
          authorName = getUserDisplayName(userDoc.data() as UserData);
        }
      } catch (error) {
        logger.warn(
          { executionId, userId: modifiedBy, error: formatErrorMessage(error) },
          "Failed to get modifier user data",
        );
      }

      const horseName = afterData.horseName || "din häst";

      let notificationsSent = 0;
      let errors = 0;

      for (const owner of owners) {
        // Skip notification if the modifier IS the owner
        if (owner.userId === modifiedBy) {
          logger.debug(
            { executionId, activityId, userId: owner.userId },
            "Modifier is the owner - skipping notification",
          );
          continue;
        }

        try {
          // Send note notification
          if (noteAdded) {
            await createOwnerNotification({
              ownerUserId: owner.userId,
              type: "activity_note_added",
              activityId,
              horseName,
              authorName,
              stableId: afterData.stableId,
              executionId,
            });
            notificationsSent++;
          }

          // Send media notification
          if (mediaAdded) {
            await createOwnerNotification({
              ownerUserId: owner.userId,
              type: "activity_media_added",
              activityId,
              horseName,
              authorName,
              stableId: afterData.stableId,
              executionId,
            });
            notificationsSent++;
          }
        } catch (error) {
          errors++;
          logger.error(
            {
              executionId,
              activityId,
              ownerUserId: owner.userId,
              error: formatErrorMessage(error),
            },
            "Failed to create notification for horse owner",
          );
        }
      }

      logger.info(
        {
          executionId,
          activityId,
          horseId,
          ownersFound: owners.length,
          notificationsSent,
          errors,
        },
        "Activity update notification processing complete",
      );
    } catch (error) {
      logger.error(
        {
          executionId,
          activityId,
          error: formatErrorMessage(error),
        },
        "Failed to process activity update notifications",
      );
      // Don't throw - we don't want retries that could cause duplicate notifications
    }
  },
);
