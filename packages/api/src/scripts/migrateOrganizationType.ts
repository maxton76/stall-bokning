/**
 * Migration Script: Organization Type Migration
 *
 * This script migrates existing organizations to include the organizationType field.
 *
 * Logic:
 * - Count stables per org
 * - Count non-owner members per org
 * - If stables > 1 OR members > 0 → 'business'
 * - Else → 'personal'
 * - For personal orgs, create implicit stable if none exists
 *
 * Run with: npx ts-node --esm src/scripts/migrateOrganizationType.ts
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
  organizationId: string;
  name: string;
  previousType: string | undefined;
  newType: "personal" | "business";
  stableCount: number;
  memberCount: number;
  createdImplicitStable: boolean;
  implicitStableId?: string;
  error?: string;
}

async function migrateOrganizationType(dryRun = true): Promise<void> {
  console.log("=".repeat(60));
  console.log("Organization Type Migration");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("=".repeat(60));

  const results: MigrationResult[] = [];

  try {
    // Get all organizations
    const orgsSnapshot = await db.collection("organizations").get();
    console.log(`Found ${orgsSnapshot.size} organizations to process\n`);

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      const orgData = orgDoc.data();
      const result: MigrationResult = {
        organizationId: orgId,
        name: orgData.name || "Unknown",
        previousType: orgData.organizationType,
        newType: "personal",
        stableCount: 0,
        memberCount: 0,
        createdImplicitStable: false,
      };

      try {
        // Skip if organizationType is already set
        if (orgData.organizationType) {
          console.log(
            `[SKIP] ${orgData.name} - already has type: ${orgData.organizationType}`,
          );
          continue;
        }

        // Count stables for this organization
        const stablesSnapshot = await db
          .collection("stables")
          .where("organizationId", "==", orgId)
          .get();
        result.stableCount = stablesSnapshot.size;

        // Count non-owner members for this organization
        const membersSnapshot = await db
          .collection("organizationMembers")
          .where("organizationId", "==", orgId)
          .where("userId", "!=", orgData.ownerId)
          .where("status", "==", "active")
          .get();
        result.memberCount = membersSnapshot.size;

        // Determine organization type
        // Business if: multiple stables OR has non-owner members
        if (result.stableCount > 1 || result.memberCount > 0) {
          result.newType = "business";
        } else {
          result.newType = "personal";
        }

        console.log(
          `[${result.newType.toUpperCase()}] ${orgData.name} - stables: ${result.stableCount}, members: ${result.memberCount}`,
        );

        if (!dryRun) {
          // Update organization with organizationType
          const updateData: Record<string, unknown> = {
            organizationType: result.newType,
            updatedAt: Timestamp.now(),
          };

          // For personal orgs, create implicit stable if none exists
          if (result.newType === "personal" && result.stableCount === 0) {
            const implicitStableRef = db.collection("stables").doc();
            const implicitStableData = {
              id: implicitStableRef.id,
              name: "Mina hästar", // "My Horses" in Swedish
              description: "Automatiskt skapad stall för personlig användning",
              ownerId: orgData.ownerId,
              ownerEmail: orgData.ownerEmail,
              organizationId: orgId,
              isImplicit: true, // Flag to identify implicit stables
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            await implicitStableRef.set(implicitStableData);
            updateData.implicitStableId = implicitStableRef.id;
            result.createdImplicitStable = true;
            result.implicitStableId = implicitStableRef.id;

            // Update organization stats
            updateData["stats.stableCount"] = 1;

            console.log(`  → Created implicit stable: ${implicitStableRef.id}`);
          } else if (
            result.newType === "personal" &&
            result.stableCount === 1
          ) {
            // Set existing stable as implicit
            const existingStable = stablesSnapshot.docs[0];
            updateData.implicitStableId = existingStable.id;
            result.implicitStableId = existingStable.id;

            // Mark the existing stable as implicit
            await existingStable.ref.update({
              isImplicit: true,
              updatedAt: Timestamp.now(),
            });

            console.log(
              `  → Marked existing stable as implicit: ${existingStable.id}`,
            );
          }

          await db.collection("organizations").doc(orgId).update(updateData);
        }

        results.push(result);
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        console.error(`[ERROR] ${orgData.name}: ${result.error}`);
        results.push(result);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));

    const personalCount = results.filter(
      (r) => r.newType === "personal",
    ).length;
    const businessCount = results.filter(
      (r) => r.newType === "business",
    ).length;
    const errorCount = results.filter((r) => r.error).length;
    const implicitStablesCreated = results.filter(
      (r) => r.createdImplicitStable,
    ).length;

    console.log(`Total organizations processed: ${results.length}`);
    console.log(`Personal organizations: ${personalCount}`);
    console.log(`Business organizations: ${businessCount}`);
    console.log(`Implicit stables created: ${implicitStablesCreated}`);
    console.log(`Errors: ${errorCount}`);

    if (dryRun) {
      console.log(
        "\n⚠️  DRY RUN - No changes were made. Run with --live to apply changes.",
      );
    } else {
      console.log("\n✅ Migration completed successfully!");
    }

    // Print errors if any
    if (errorCount > 0) {
      console.log("\nErrors:");
      results
        .filter((r) => r.error)
        .forEach((r) => {
          console.log(`  - ${r.name} (${r.organizationId}): ${r.error}`);
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

migrateOrganizationType(!isLive)
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
