import { db } from "../utils/firebase.js";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type {
  HorseActivityHistoryEntry,
  CreateHorseActivityHistoryInput,
  HorseActivityHistoryFilters,
  HorseActivityHistoryResponse,
} from "@stall-bokning/shared";

const COLLECTION_NAME = "horseActivityHistory";
const BATCH_CHUNK_SIZE = 450; // Firestore batch limit is 500, keep some buffer

/**
 * Create multiple horse activity history entries using batch writes
 * Automatically chunks into multiple batches if > 450 entries
 *
 * @param entries - Array of entries to create
 * @returns Array of created document IDs
 */
export async function createActivityHistoryEntries(
  entries: CreateHorseActivityHistoryInput[],
): Promise<string[]> {
  if (entries.length === 0) {
    return [];
  }

  const now = Timestamp.now();
  const docIds: string[] = [];

  // Chunk entries for batch processing
  const chunks: CreateHorseActivityHistoryInput[][] = [];
  for (let i = 0; i < entries.length; i += BATCH_CHUNK_SIZE) {
    chunks.push(entries.slice(i, i + BATCH_CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const batch = db.batch();

    for (const entry of chunk) {
      const docRef = db.collection(COLLECTION_NAME).doc();
      docIds.push(docRef.id);

      // Convert scheduledDate to Timestamp if needed
      const scheduledDate =
        entry.scheduledDate instanceof Date
          ? Timestamp.fromDate(entry.scheduledDate)
          : entry.scheduledDate;

      const historyEntry: Omit<HorseActivityHistoryEntry, "id"> = {
        horseId: entry.horseId,
        routineInstanceId: entry.routineInstanceId,
        routineStepId: entry.routineStepId,
        organizationId: entry.organizationId,
        stableId: entry.stableId,
        horseName: entry.horseName,
        stableName: entry.stableName,
        routineTemplateName: entry.routineTemplateName,
        routineType: entry.routineType,
        stepName: entry.stepName,
        category: entry.category,
        stepOrder: entry.stepOrder,
        executionStatus: entry.executionStatus,
        executedAt: now,
        executedBy: entry.executedBy,
        executedByName: entry.executedByName,
        scheduledDate: scheduledDate as any,
        skipReason: entry.skipReason,
        notes: entry.notes,
        photoUrls: entry.photoUrls,
        feedingSnapshot: entry.feedingSnapshot,
        medicationSnapshot: entry.medicationSnapshot,
        blanketSnapshot: entry.blanketSnapshot,
        horseContextSnapshot: entry.horseContextSnapshot,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      batch.set(docRef, historyEntry);
    }

    await batch.commit();
  }

  return docIds;
}

/**
 * Get activity history for a specific horse with optional filtering and pagination
 *
 * @param horseId - Horse ID to query
 * @param filters - Optional filters for category, date range, and pagination
 * @returns Paginated history entries
 */
export async function getByHorseId(
  horseId: string,
  filters?: HorseActivityHistoryFilters,
): Promise<HorseActivityHistoryResponse> {
  const limit = filters?.limit ?? 50;
  // Fetch one extra to determine if there are more results
  const fetchLimit = limit + 1;

  let query = db.collection(COLLECTION_NAME).where("horseId", "==", horseId);

  // Apply category filter if provided
  if (filters?.category) {
    query = query.where("category", "==", filters.category) as any;
  }

  // Apply date range filters
  if (filters?.startDate) {
    const startDate =
      typeof filters.startDate === "string"
        ? new Date(filters.startDate)
        : filters.startDate;
    query = query.where(
      "executedAt",
      ">=",
      Timestamp.fromDate(startDate),
    ) as any;
  }

  if (filters?.endDate) {
    const endDate =
      typeof filters.endDate === "string"
        ? new Date(filters.endDate)
        : filters.endDate;
    // Set to end of day
    endDate.setHours(23, 59, 59, 999);
    query = query.where("executedAt", "<=", Timestamp.fromDate(endDate)) as any;
  }

  // Order by execution date descending
  query = query.orderBy("executedAt", "desc");

  // Handle cursor-based pagination
  if (filters?.cursor) {
    const cursorDoc = await db
      .collection(COLLECTION_NAME)
      .doc(filters.cursor)
      .get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc) as any;
    }
  }

  query = query.limit(fetchLimit);

  const snapshot = await query.get();
  const activities: HorseActivityHistoryEntry[] = [];
  let lastDocId: string | null = null;

  snapshot.docs.forEach((doc, index) => {
    // Only include up to the limit
    if (index < limit) {
      activities.push({
        id: doc.id,
        ...doc.data(),
      } as HorseActivityHistoryEntry);
      lastDocId = doc.id;
    }
  });

  const hasMore = snapshot.docs.length > limit;
  const nextCursor = hasMore && lastDocId ? lastDocId : undefined;

  return {
    activities,
    nextCursor,
    hasMore,
  };
}

/**
 * Get activity history for a specific routine instance
 * Useful for displaying completed routine summary
 *
 * @param routineInstanceId - Routine instance ID to query
 * @returns Activities grouped by step
 */
export async function getByRoutineInstanceId(
  routineInstanceId: string,
): Promise<{
  activities: HorseActivityHistoryEntry[];
  groupedByStep: Record<string, HorseActivityHistoryEntry[]>;
}> {
  const query = db
    .collection(COLLECTION_NAME)
    .where("routineInstanceId", "==", routineInstanceId)
    .orderBy("stepOrder", "asc");

  const snapshot = await query.get();

  const activities: HorseActivityHistoryEntry[] = [];
  const groupedByStep: Record<string, HorseActivityHistoryEntry[]> = {};

  snapshot.docs.forEach((doc) => {
    const activity = {
      id: doc.id,
      ...doc.data(),
    } as HorseActivityHistoryEntry;

    activities.push(activity);

    // Group by step ID
    if (!groupedByStep[activity.routineStepId]) {
      groupedByStep[activity.routineStepId] = [];
    }
    groupedByStep[activity.routineStepId].push(activity);
  });

  return {
    activities,
    groupedByStep,
  };
}

/**
 * Get activity history for a stable with optional filtering
 *
 * @param stableId - Stable ID to query
 * @param filters - Optional filters
 * @returns Paginated history entries
 */
export async function getByStableId(
  stableId: string,
  filters?: HorseActivityHistoryFilters & { horseId?: string },
): Promise<HorseActivityHistoryResponse> {
  const limit = filters?.limit ?? 50;
  const fetchLimit = limit + 1;

  let query = db.collection(COLLECTION_NAME).where("stableId", "==", stableId);

  if (filters?.category) {
    query = query.where("category", "==", filters.category) as any;
  }

  if (filters?.startDate) {
    const startDate =
      typeof filters.startDate === "string"
        ? new Date(filters.startDate)
        : filters.startDate;
    query = query.where(
      "executedAt",
      ">=",
      Timestamp.fromDate(startDate),
    ) as any;
  }

  if (filters?.endDate) {
    const endDate =
      typeof filters.endDate === "string"
        ? new Date(filters.endDate)
        : filters.endDate;
    endDate.setHours(23, 59, 59, 999);
    query = query.where("executedAt", "<=", Timestamp.fromDate(endDate)) as any;
  }

  query = query.orderBy("executedAt", "desc");

  if (filters?.cursor) {
    const cursorDoc = await db
      .collection(COLLECTION_NAME)
      .doc(filters.cursor)
      .get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc) as any;
    }
  }

  query = query.limit(fetchLimit);

  const snapshot = await query.get();
  const activities: HorseActivityHistoryEntry[] = [];
  let lastDocId: string | null = null;

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data() as Omit<HorseActivityHistoryEntry, "id">;
    // Apply horseId filter in memory (to avoid composite index complexity)
    if (filters?.horseId && data.horseId !== filters.horseId) {
      return;
    }
    if (index < limit) {
      activities.push({
        id: doc.id,
        ...data,
      } as HorseActivityHistoryEntry);
      lastDocId = doc.id;
    }
  });

  const hasMore = snapshot.docs.length > limit;
  const nextCursor = hasMore && lastDocId ? lastDocId : undefined;

  return {
    activities,
    nextCursor,
    hasMore,
  };
}

/**
 * Update an existing history entry (for corrections when re-opening routine)
 *
 * @param entryId - Document ID to update
 * @param updates - Fields to update
 */
export async function updateEntry(
  entryId: string,
  updates: Partial<
    Pick<
      HorseActivityHistoryEntry,
      | "executionStatus"
      | "skipReason"
      | "notes"
      | "photoUrls"
      | "feedingSnapshot"
      | "medicationSnapshot"
      | "blanketSnapshot"
    >
  >,
): Promise<void> {
  const docRef = db.collection(COLLECTION_NAME).doc(entryId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error(`Activity history entry not found: ${entryId}`);
  }

  await docRef.update({
    ...updates,
    updatedAt: Timestamp.now(),
    version: FieldValue.increment(1),
  });
}

/**
 * Find existing history entry for a specific horse/routine/step combination
 * Used when re-opening routines to update instead of create
 *
 * @param routineInstanceId - Routine instance ID
 * @param routineStepId - Step ID
 * @param horseId - Horse ID
 * @returns Existing entry or null
 */
export async function findExistingEntry(
  routineInstanceId: string,
  routineStepId: string,
  horseId: string,
): Promise<HorseActivityHistoryEntry | null> {
  const query = db
    .collection(COLLECTION_NAME)
    .where("routineInstanceId", "==", routineInstanceId)
    .where("routineStepId", "==", routineStepId)
    .where("horseId", "==", horseId)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as HorseActivityHistoryEntry;
}

/**
 * Delete history entries for a routine instance
 * Used when completely re-doing a routine (rare case)
 *
 * @param routineInstanceId - Routine instance ID
 * @returns Number of deleted entries
 */
export async function deleteByRoutineInstanceId(
  routineInstanceId: string,
): Promise<number> {
  const query = db
    .collection(COLLECTION_NAME)
    .where("routineInstanceId", "==", routineInstanceId);

  const snapshot = await query.get();

  if (snapshot.empty) {
    return 0;
  }

  // Chunk deletes for batch processing
  const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < snapshot.docs.length; i += BATCH_CHUNK_SIZE) {
    chunks.push(snapshot.docs.slice(i, i + BATCH_CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  return snapshot.docs.length;
}
