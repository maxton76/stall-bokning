/**
 * Routine Schedule Deleted Trigger
 *
 * Watches for deleted routineSchedules documents and removes
 * all non-completed routine instances associated with that schedule.
 * Completed and in-progress instances are preserved for history.
 */

import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Delete routine instances in batches
 * Only deletes instances that are not completed or in_progress
 */
async function deleteNonCompletedInstances(
  scheduleId: string,
  executionId: string,
): Promise<{ deleted: number; preserved: number }> {
  const BATCH_SIZE = 500; // Firestore batch limit
  let totalDeleted = 0;
  let totalPreserved = 0;

  // Query all instances for this schedule
  const instancesSnapshot = await db
    .collection("routineInstances")
    .where("scheduleId", "==", scheduleId)
    .get();

  if (instancesSnapshot.empty) {
    logger.info({ executionId, scheduleId }, "No instances found for schedule");
    return { deleted: 0, preserved: 0 };
  }

  // Separate instances by status
  const instancesToDelete: FirebaseFirestore.DocumentReference[] = [];
  const instancesToPreserve: string[] = [];

  for (const doc of instancesSnapshot.docs) {
    const data = doc.data();
    const status = data.status as string;

    // Preserve completed and in_progress instances for history
    if (status === "completed" || status === "in_progress") {
      instancesToPreserve.push(doc.id);
      totalPreserved++;
    } else {
      // Delete scheduled, missed, cancelled instances
      instancesToDelete.push(doc.ref);
    }
  }

  logger.info(
    {
      executionId,
      scheduleId,
      totalInstances: instancesSnapshot.size,
      toDelete: instancesToDelete.length,
      toPreserve: instancesToPreserve.length,
      preservedStatuses:
        instancesToPreserve.length > 0 ? "completed/in_progress" : "none",
    },
    "Categorized instances for deletion",
  );

  // Delete in batches
  for (let i = 0; i < instancesToDelete.length; i += BATCH_SIZE) {
    const batchRefs = instancesToDelete.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const ref of batchRefs) {
      batch.delete(ref);
    }

    await batch.commit();
    totalDeleted += batchRefs.length;

    logger.info(
      {
        executionId,
        scheduleId,
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        batchSize: batchRefs.length,
        totalDeleted,
      },
      "Delete batch committed",
    );
  }

  return { deleted: totalDeleted, preserved: totalPreserved };
}

// ============================================================================
// MAIN TRIGGER
// ============================================================================

/**
 * Firestore trigger for routine schedule deletion
 *
 * Removes all non-completed routine instances when a schedule is deleted.
 * Completed and in-progress instances are preserved for historical records.
 */
export const onRoutineScheduleDeleted = onDocumentDeleted(
  {
    document: "routineSchedules/{scheduleId}",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutes
  },
  async (event) => {
    const executionId = crypto.randomUUID();
    const scheduleId = event.params.scheduleId;

    if (!event.data) {
      logger.warn(
        { executionId, scheduleId },
        "No data in schedule delete event",
      );
      return;
    }

    const deletedData = event.data.data();

    logger.info(
      {
        executionId,
        scheduleId,
        templateId: deletedData?.templateId,
        stableId: deletedData?.stableId,
        scheduleName: deletedData?.name || deletedData?.templateName,
      },
      "Processing routine schedule deletion",
    );

    try {
      const result = await deleteNonCompletedInstances(scheduleId, executionId);

      logger.info(
        {
          executionId,
          scheduleId,
          instancesDeleted: result.deleted,
          instancesPreserved: result.preserved,
        },
        "Routine schedule deletion cleanup complete",
      );
    } catch (error) {
      logger.error(
        {
          executionId,
          scheduleId,
          error: formatErrorMessage(error),
        },
        "Failed to delete routine instances",
      );
      throw error; // Trigger retry
    }
  },
);
