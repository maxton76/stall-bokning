/**
 * Migration Script: Horse Ownership Migration
 *
 * This script migrates existing horses to include the ownerOrganizationId field
 * and sets up placement fields for horses at stables.
 *
 * Logic:
 * - For each horse:
 *   - Find owner's personal organization
 *   - Set ownerOrganizationId to that org
 *   - If horse has currentStableId:
 *     - Get stable's organizationId
 *     - Set placementOrganizationId, placementStableId, placementDate
 *
 * Run with: npx ts-node --esm src/scripts/migrateHorseOwnership.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(__dirname, "../../service-account-dev.json");

  initializeApp({
    credential: cert(serviceAccountPath),
  });
}

const db = getFirestore();

interface MigrationResult {
  horseId: string;
  horseName: string;
  ownerId: string;
  ownerOrganizationId?: string;
  placementOrganizationId?: string;
  placementStableId?: string;
  placementDate?: string;
  skipped: boolean;
  skipReason?: string;
  error?: string;
}

/**
 * Find user's personal organization (organizationType: 'personal')
 * Falls back to any organization owned by the user
 */
async function findOwnerPersonalOrg(userId: string): Promise<string | null> {
  // First, try to find a personal organization
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
 * Get stable's organization ID
 */
async function getStableOrganizationId(
  stableId: string,
): Promise<string | null> {
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) {
    return null;
  }
  return stableDoc.data()?.organizationId || null;
}

async function migrateHorseOwnership(dryRun = true): Promise<void> {
  console.log("=".repeat(60));
  console.log("Horse Ownership Migration");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("=".repeat(60));

  const results: MigrationResult[] = [];
  const ownerOrgCache = new Map<string, string | null>();
  const stableOrgCache = new Map<string, string | null>();

  try {
    // Get all horses
    const horsesSnapshot = await db.collection("horses").get();
    console.log(`Found ${horsesSnapshot.size} horses to process\n`);

    for (const horseDoc of horsesSnapshot.docs) {
      const horseId = horseDoc.id;
      const horseData = horseDoc.data();
      const result: MigrationResult = {
        horseId,
        horseName: horseData.name || "Unknown",
        ownerId: horseData.ownerId,
        skipped: false,
      };

      try {
        // Skip if already has ownerOrganizationId
        if (horseData.ownerOrganizationId) {
          result.skipped = true;
          result.skipReason = "Already has ownerOrganizationId";
          console.log(
            `[SKIP] ${horseData.name} - already has ownerOrganizationId`,
          );
          results.push(result);
          continue;
        }

        // Find owner's personal organization
        let ownerOrgId = ownerOrgCache.get(horseData.ownerId);
        if (ownerOrgId === undefined) {
          ownerOrgId = await findOwnerPersonalOrg(horseData.ownerId);
          ownerOrgCache.set(horseData.ownerId, ownerOrgId);
        }

        if (!ownerOrgId) {
          result.skipped = true;
          result.skipReason = "Owner has no organization";
          console.log(
            `[WARN] ${horseData.name} - owner ${horseData.ownerId} has no organization`,
          );
          results.push(result);
          continue;
        }

        result.ownerOrganizationId = ownerOrgId;

        // Check if horse is placed at a stable
        if (horseData.currentStableId) {
          let stableOrgId = stableOrgCache.get(horseData.currentStableId);
          if (stableOrgId === undefined) {
            stableOrgId = await getStableOrganizationId(
              horseData.currentStableId,
            );
            stableOrgCache.set(horseData.currentStableId, stableOrgId);
          }

          if (stableOrgId && stableOrgId !== ownerOrgId) {
            // Horse is placed at a different organization's stable
            result.placementOrganizationId = stableOrgId;
            result.placementStableId = horseData.currentStableId;
            // Use assignedAt if available, otherwise use current time
            result.placementDate = horseData.assignedAt
              ? (horseData.assignedAt as Timestamp).toDate().toISOString()
              : new Date().toISOString();

            console.log(
              `[PLACED] ${horseData.name} - owner org: ${ownerOrgId}, placement org: ${stableOrgId}`,
            );
          } else {
            console.log(
              `[OWN STABLE] ${horseData.name} - owner org: ${ownerOrgId}`,
            );
          }
        } else {
          console.log(
            `[NO STABLE] ${horseData.name} - owner org: ${ownerOrgId}`,
          );
        }

        if (!dryRun) {
          const updateData: Record<string, unknown> = {
            ownerOrganizationId: ownerOrgId,
            updatedAt: Timestamp.now(),
          };

          if (result.placementOrganizationId) {
            updateData.placementOrganizationId = result.placementOrganizationId;
            updateData.placementStableId = result.placementStableId;
            updateData.placementDate = horseData.assignedAt || Timestamp.now();
          }

          await db.collection("horses").doc(horseId).update(updateData);
        }

        results.push(result);
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        console.error(`[ERROR] ${horseData.name}: ${result.error}`);
        results.push(result);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));

    const migratedCount = results.filter(
      (r) => !r.skipped && !r.error && r.ownerOrganizationId,
    ).length;
    const placedCount = results.filter((r) => r.placementOrganizationId).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const errorCount = results.filter((r) => r.error).length;

    console.log(`Total horses processed: ${results.length}`);
    console.log(`Migrated with ownerOrganizationId: ${migratedCount}`);
    console.log(`With placement at different org: ${placedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    if (dryRun) {
      console.log(
        "\n DRY RUN - No changes were made. Run with --live to apply changes.",
      );
    } else {
      console.log("\n Migration completed successfully!");
    }

    // Print errors if any
    if (errorCount > 0) {
      console.log("\nErrors:");
      results
        .filter((r) => r.error)
        .forEach((r) => {
          console.log(`  - ${r.horseName} (${r.horseId}): ${r.error}`);
        });
    }

    // Print skipped horses by reason
    const skipReasons = new Map<string, number>();
    results
      .filter((r) => r.skipped)
      .forEach((r) => {
        const reason = r.skipReason || "Unknown";
        skipReasons.set(reason, (skipReasons.get(reason) || 0) + 1);
      });

    if (skipReasons.size > 0) {
      console.log("\nSkipped horses by reason:");
      skipReasons.forEach((count, reason) => {
        console.log(`  - ${reason}: ${count}`);
      });
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isLive = args.includes("--live");

migrateHorseOwnership(!isLive)
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
