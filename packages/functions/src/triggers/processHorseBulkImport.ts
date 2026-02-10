/**
 * Process Horse Bulk Import
 *
 * Creates horse documents in Firestore for each horse in a bulk import job.
 * Handles location history, ownership, and placement logic.
 */

import { logger } from "firebase-functions";
import * as crypto from "crypto";

import { db, Timestamp } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BulkImportHorse {
  name: string;
  ownerEmail: string;
  ownerId: string;
  ownerName: string;
  color: string;
  currentStableId: string;
  currentStableName: string;
  dateOfBirth?: string; // ISO 8601 string
  ueln?: string; // UELN number
  chipNumber?: string; // Microchip number
}

interface BulkImportHorseResult {
  horseName: string;
  ownerEmail: string;
  status: "success" | "error";
  horseId?: string;
  error?: string;
}

interface HorseBulkImportJobData {
  id: string;
  type: "horses";
  organizationId: string;
  createdBy: string;
  status: string;
  horses: BulkImportHorse[];
  progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  horseResults: BulkImportHorseResult[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PROGRESS_BATCH_SIZE = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find the owner's organization ID (same logic as POST /horses).
 */
async function findOwnerOrganizationId(userId: string): Promise<string | null> {
  // Try personal organization first
  const personalOrgsSnapshot = await db
    .collection("organizations")
    .where("ownerId", "==", userId)
    .where("organizationType", "==", "personal")
    .limit(1)
    .get();

  if (!personalOrgsSnapshot.empty) {
    return personalOrgsSnapshot.docs[0].id;
  }

  // Fall back to any organization owned by the user
  const anyOrgSnapshot = await db
    .collection("organizations")
    .where("ownerId", "==", userId)
    .limit(1)
    .get();

  if (!anyOrgSnapshot.empty) {
    return anyOrgSnapshot.docs[0].id;
  }

  return null;
}

/**
 * Process a single horse creation.
 */
async function processSingleHorse(
  horse: BulkImportHorse,
  organizationId: string,
  createdBy: string,
  executionId: string,
): Promise<BulkImportHorseResult> {
  try {
    // Find owner's organization
    const ownerOrganizationId = await findOwnerOrganizationId(horse.ownerId);

    const horseData: Record<string, unknown> = {
      name: horse.name,
      color: horse.color,
      ownerId: horse.ownerId,
      ownerName: horse.ownerName,
      ownerEmail: horse.ownerEmail,
      ownerOrganizationId: ownerOrganizationId || null,
      ownershipType: "member",
      isExternal: false,
      status: "active",
      currentStableId: horse.currentStableId,
      currentStableName: horse.currentStableName,
      dateOfArrival: Timestamp.now(),
      assignedAt: Timestamp.now(),
      hasSpecialInstructions: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
      lastModifiedBy: createdBy,
    };

    // Add optional fields if provided
    if (horse.dateOfBirth) {
      horseData.dateOfBirth = Timestamp.fromDate(new Date(horse.dateOfBirth));
    }
    if (horse.ueln) {
      horseData.ueln = horse.ueln;
    }
    if (horse.chipNumber) {
      horseData.chipNumber = horse.chipNumber;
    }

    // Handle placement if stable org differs from owner org
    if (ownerOrganizationId) {
      try {
        const stableDoc = await db
          .collection("stables")
          .doc(horse.currentStableId)
          .get();

        if (stableDoc.exists) {
          const stableOrgId = stableDoc.data()?.organizationId;
          if (stableOrgId && stableOrgId !== ownerOrganizationId) {
            horseData.placementOrganizationId = stableOrgId;
            horseData.placementStableId = horse.currentStableId;
            horseData.placementDate = Timestamp.now();
          }
        }
      } catch (stableError) {
        logger.warn(
          {
            executionId,
            horseName: horse.name,
            error: formatErrorMessage(stableError),
          },
          "Failed to determine placement organization for horse",
        );
      }
    }

    // Create horse document
    const docRef = await db.collection("horses").add(horseData);
    const horseId = docRef.id;

    // Create initial location history entry
    await db
      .collection("horses")
      .doc(horseId)
      .collection("locationHistory")
      .add({
        horseName: horse.name,
        locationType: "stable",
        stableId: horse.currentStableId,
        stableName: horse.currentStableName,
        arrivalDate: Timestamp.now(),
        departureDate: null,
        createdAt: Timestamp.now(),
        createdBy,
        lastModifiedBy: createdBy,
      });

    logger.info(
      { executionId, horseId, horseName: horse.name, ownerId: horse.ownerId },
      "Horse created successfully",
    );

    return {
      horseName: horse.name,
      ownerEmail: horse.ownerEmail,
      status: "success",
      horseId,
    };
  } catch (error) {
    logger.error(
      { executionId, horseName: horse.name, error: formatErrorMessage(error) },
      "Failed to create horse",
    );

    return {
      horseName: horse.name,
      ownerEmail: horse.ownerEmail,
      status: "error",
      error: formatErrorMessage(error),
    };
  }
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process a horse bulk import job.
 */
export async function processHorseImportJob(
  jobId: string,
  initialData: HorseBulkImportJobData | null,
  executionId: string,
): Promise<void> {
  const jobRef = db.collection("bulkImportJobs").doc(jobId);

  // Idempotency check — atomically verify "pending" and transition to "processing"
  let jobData: HorseBulkImportJobData;
  try {
    jobData = await db.runTransaction(async (transaction) => {
      const jobSnapshot = await transaction.get(jobRef);
      if (!jobSnapshot.exists) {
        throw new Error("JOB_NOT_FOUND");
      }
      const data = jobSnapshot.data() as HorseBulkImportJobData;
      if (data.status !== "pending") {
        throw new Error("JOB_ALREADY_PROCESSED");
      }
      transaction.update(jobRef, {
        status: "processing",
        updatedAt: Timestamp.now(),
      });
      return data;
    });
  } catch (error: any) {
    if (
      error.message === "JOB_ALREADY_PROCESSED" ||
      error.message === "JOB_NOT_FOUND"
    ) {
      logger.warn(
        { executionId, jobId, error: error.message },
        "Horse bulk import job already processed or not found, skipping",
      );
      return;
    }
    throw error;
  }

  logger.info(
    {
      executionId,
      jobId,
      organizationId: jobData.organizationId,
      horseCount: jobData.horses.length,
    },
    "Starting horse bulk import processing",
  );

  const results: BulkImportHorseResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < jobData.horses.length; i++) {
    const horse = jobData.horses[i];

    const result = await processSingleHorse(
      horse,
      jobData.organizationId,
      jobData.createdBy,
      executionId,
    );

    results.push(result);

    if (result.status === "success") {
      succeeded++;
    } else {
      failed++;
    }

    // Batch progress updates
    const isLastHorse = i === jobData.horses.length - 1;
    if (isLastHorse || (i + 1) % PROGRESS_BATCH_SIZE === 0) {
      await jobRef.update({
        "progress.processed": i + 1,
        "progress.succeeded": succeeded,
        "progress.failed": failed,
        horseResults: results,
        updatedAt: Timestamp.now(),
      });
    }

    // Delay between operations
    if (!isLastHorse) {
      await delay(300);
    }
  }

  // Mark job as completed
  await jobRef.update({
    status: "completed",
    updatedAt: Timestamp.now(),
  });

  // Create completion notification
  try {
    const notificationId = crypto.randomUUID();
    const allSucceeded = succeeded === jobData.horses.length;

    await db
      .collection("notifications")
      .doc(notificationId)
      .set({
        userId: jobData.createdBy,
        type: "system_alert",
        title: allSucceeded
          ? "Import av hästar klar"
          : "Import av hästar slutförd med fel",
        titleEn: allSucceeded
          ? "Horse import complete"
          : "Horse import completed with errors",
        body: `${succeeded} av ${jobData.horses.length} hästar importerade.${failed > 0 ? ` ${failed} misslyckades.` : ""}`,
        bodyEn: `${succeeded} of ${jobData.horses.length} horses imported.${failed > 0 ? ` ${failed} failed.` : ""}`,
        data: {
          organizationId: jobData.organizationId,
          succeeded,
          failed,
          total: jobData.horses.length,
        },
        channels: ["inApp"],
        deliveryStatus: { inApp: "sent" },
        read: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
  } catch (error) {
    logger.error(
      { executionId, jobId, error: formatErrorMessage(error) },
      "Failed to create horse import completion notification",
    );
  }

  logger.info(
    {
      executionId,
      jobId,
      total: jobData.horses.length,
      succeeded,
      failed,
    },
    "Horse bulk import processing complete",
  );
}
