/**
 * Migration: Convert legacy facility availability to new schedule format.
 *
 * Converts `availableFrom`, `availableTo`, `daysAvailable` fields
 * into the new `availabilitySchedule` structure.
 *
 * Idempotent: Skips facilities that already have `availabilitySchedule`.
 * Batch processing: 500 documents at a time.
 *
 * Usage: POST /admin/migrate-facility-schedules
 */

import { db } from "../utils/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import {
  migrateLegacyAvailability,
  validateSchedule,
} from "../utils/facilityAvailability.js";

export async function migrateFacilitySchedules(): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: string[];
}> {
  const BATCH_SIZE = 500;
  const result = { total: 0, migrated: 0, skipped: 0, errors: [] as string[] };

  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let hasMore = true;

  while (hasMore) {
    let query = db
      .collection("facilities")
      .orderBy("__name__")
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      result.total++;
      const data = doc.data();

      // Skip if already migrated
      if (data.availabilitySchedule) {
        result.skipped++;
        continue;
      }

      try {
        const schedule = migrateLegacyAvailability({
          availableFrom: data.availableFrom,
          availableTo: data.availableTo,
          daysAvailable: data.daysAvailable,
        });

        // Validate migrated schedule to catch corrupt legacy data
        const validationErrors = validateSchedule(schedule);
        if (validationErrors.length > 0) {
          result.errors.push(
            `${doc.id}: invalid migrated schedule: ${validationErrors.join(", ")}`,
          );
          continue;
        }

        batch.update(doc.ref, {
          availabilitySchedule: schedule,
          updatedAt: Timestamp.now(),
        });

        batchCount++;
        result.migrated++;
      } catch (err: any) {
        result.errors.push(`${doc.id}: ${err.message}`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.docs.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  return result;
}
