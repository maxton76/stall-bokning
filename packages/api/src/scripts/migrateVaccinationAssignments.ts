/**
 * Migration Script: Vaccination Rule Assignments
 *
 * This script migrates horses from the legacy single-rule vaccination system
 * to the new multi-rule vaccination assignment system.
 *
 * What it does:
 * 1. Finds horses with `vaccinationRuleId` set (legacy single-rule)
 * 2. Creates an assignment entry in `assignedVaccinationRules[]`
 * 3. Calculates the vaccination status based on existing records
 * 4. Keeps the deprecated fields for backward compatibility
 *
 * Usage:
 * npx ts-node -r tsconfig-paths/register src/scripts/migrateVaccinationAssignments.ts
 *
 * Or via task:
 * task run:script SCRIPT=migrateVaccinationAssignments
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

interface VaccinationRecord {
  id: string;
  horseId: string;
  vaccinationRuleId: string;
  vaccinationDate: Timestamp;
  nextDueDate: Timestamp;
}

interface VaccinationRule {
  id: string;
  name: string;
  periodMonths: number;
  periodDays: number;
}

interface HorseVaccinationAssignment {
  ruleId: string;
  ruleName: string;
  rulePeriodMonths: number;
  rulePeriodDays: number;
  assignedAt: Timestamp;
  assignedBy: string;
  lastVaccinationDate?: Timestamp;
  nextDueDate?: Timestamp;
  status: "current" | "expiring_soon" | "expired" | "no_records";
  latestRecordId?: string;
}

type VaccinationStatus = "current" | "expiring_soon" | "expired" | "no_records";

/**
 * Calculate vaccination status based on next due date
 */
function calculateStatus(
  nextDueDate: Timestamp | undefined,
  warningDays: number = 30,
): VaccinationStatus {
  if (!nextDueDate) return "no_records";

  const now = new Date();
  const dueDate = nextDueDate.toDate();
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (daysUntilDue < 0) return "expired";
  if (daysUntilDue <= warningDays) return "expiring_soon";
  return "current";
}

async function migrateVaccinationAssignments(): Promise<void> {
  console.log("🚀 Starting vaccination assignment migration...\n");

  const stats = {
    totalHorses: 0,
    alreadyMigrated: 0,
    migrated: 0,
    skippedNoRule: 0,
    skippedRuleNotFound: 0,
    errors: 0,
  };

  try {
    // Find all active horses with vaccinationRuleId set
    const horsesSnapshot = await db
      .collection("horses")
      .where("status", "==", "active")
      .get();

    console.log(`📊 Found ${horsesSnapshot.size} active horses\n`);
    stats.totalHorses = horsesSnapshot.size;

    // Cache vaccination rules for efficiency
    const rulesCache = new Map<string, VaccinationRule>();

    for (const horseDoc of horsesSnapshot.docs) {
      const horse = horseDoc.data();
      const horseId = horseDoc.id;

      try {
        // Skip if already migrated (has assignedVaccinationRules)
        if (
          horse.assignedVaccinationRules &&
          Array.isArray(horse.assignedVaccinationRules) &&
          horse.assignedVaccinationRules.length > 0
        ) {
          stats.alreadyMigrated++;
          console.log(`⏭️  ${horse.name}: Already migrated, skipping`);
          continue;
        }

        // Skip if no legacy rule assigned
        if (!horse.vaccinationRuleId) {
          stats.skippedNoRule++;
          console.log(`⏭️  ${horse.name}: No vaccination rule assigned`);
          continue;
        }

        // Get the vaccination rule
        let rule = rulesCache.get(horse.vaccinationRuleId);
        if (!rule) {
          const ruleDoc = await db
            .collection("vaccinationRules")
            .doc(horse.vaccinationRuleId)
            .get();

          if (!ruleDoc.exists) {
            stats.skippedRuleNotFound++;
            console.log(
              `⚠️  ${horse.name}: Vaccination rule ${horse.vaccinationRuleId} not found`,
            );
            continue;
          }

          const ruleData = ruleDoc.data()!;
          rule = {
            id: ruleDoc.id,
            name: ruleData.name,
            periodMonths: ruleData.periodMonths || 0,
            periodDays: ruleData.periodDays || 0,
          };
          rulesCache.set(horse.vaccinationRuleId, rule);
        }

        // Get the latest vaccination record for this horse and rule
        const recordsSnapshot = await db
          .collection("vaccinationRecords")
          .where("horseId", "==", horseId)
          .where("vaccinationRuleId", "==", horse.vaccinationRuleId)
          .orderBy("vaccinationDate", "desc")
          .limit(1)
          .get();

        let lastVaccinationDate: Timestamp | undefined;
        let nextDueDate: Timestamp | undefined;
        let latestRecordId: string | undefined;

        if (!recordsSnapshot.empty) {
          const latestRecord =
            recordsSnapshot.docs[0].data() as VaccinationRecord;
          latestRecordId = recordsSnapshot.docs[0].id;
          lastVaccinationDate = latestRecord.vaccinationDate;
          nextDueDate = latestRecord.nextDueDate;
        } else if (horse.nextVaccinationDue) {
          // Use existing nextVaccinationDue if no records found
          nextDueDate = horse.nextVaccinationDue;
        }

        // Calculate status
        const status = calculateStatus(nextDueDate, rule.periodDays || 30);

        // Create the assignment
        const assignment: HorseVaccinationAssignment = {
          ruleId: rule.id,
          ruleName: rule.name,
          rulePeriodMonths: rule.periodMonths,
          rulePeriodDays: rule.periodDays,
          assignedAt: horse.updatedAt || Timestamp.now(),
          assignedBy: horse.lastModifiedBy || "migration",
          lastVaccinationDate,
          nextDueDate,
          status,
          latestRecordId,
        };

        // Calculate aggregate values
        const aggregateNextDue = nextDueDate;
        const aggregateLastVaccination = lastVaccinationDate;
        const aggregateStatus = status;

        // Update the horse document
        await horseDoc.ref.update({
          // New multi-rule fields
          assignedVaccinationRules: [assignment],
          vaccinationRuleCount: 1,

          // Aggregate fields (updated to match new system)
          nextVaccinationDue: aggregateNextDue || null,
          lastVaccinationDate: aggregateLastVaccination || null,
          vaccinationStatus: aggregateStatus,

          // Keep legacy fields for backward compatibility (already set)
          // vaccinationRuleId: unchanged
          // vaccinationRuleName: unchanged

          updatedAt: Timestamp.now(),
        });

        stats.migrated++;
        console.log(
          `✅ ${horse.name}: Migrated with rule "${rule.name}" (${status})`,
        );
      } catch (error) {
        stats.errors++;
        console.error(`❌ ${horse.name}: Error during migration:`, error);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Migration Summary");
    console.log("=".repeat(60));
    console.log(`Total horses processed:    ${stats.totalHorses}`);
    console.log(`Successfully migrated:     ${stats.migrated}`);
    console.log(`Already migrated:          ${stats.alreadyMigrated}`);
    console.log(`Skipped (no rule):         ${stats.skippedNoRule}`);
    console.log(`Skipped (rule not found):  ${stats.skippedRuleNotFound}`);
    console.log(`Errors:                    ${stats.errors}`);
    console.log("=".repeat(60));

    if (stats.errors > 0) {
      console.log("\n⚠️  Some horses had errors during migration.");
      console.log("Please review the logs above and re-run if needed.");
    } else {
      console.log("\n✅ Migration completed successfully!");
    }
  } catch (error) {
    console.error("❌ Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateVaccinationAssignments()
  .then(() => {
    console.log("\n🏁 Migration script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
