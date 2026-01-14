/**
 * Firestore Utilities
 * Consolidated from frontend/src/utils/firestoreHelpers.ts
 *
 * Provides Firestore helper functions for document mapping,
 * data cleaning, and timestamp management.
 * Uses Firebase client SDK (for frontend/shared contexts).
 */

import type {
  QuerySnapshot,
  DocumentData,
  Timestamp,
} from "firebase/firestore";

/**
 * Map Firestore documents to typed objects with id
 * Works with Firebase client SDK snapshots
 */
export function mapDocsToObjects<T>(
  snapshot: QuerySnapshot<DocumentData>,
): T[] {
  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as T,
  );
}

/**
 * Extract document IDs from a QuerySnapshot
 */
export function extractDocIds(snapshot: QuerySnapshot<DocumentData>): string[] {
  return snapshot.docs.map((doc) => doc.id);
}

/**
 * Remove undefined values from objects
 * Firestore doesn't accept undefined - optional fields should be omitted
 */
export function removeUndefined<T extends Record<string, any>>(
  obj: T,
): Partial<T> {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Create standard timestamp fields for new documents
 * @param userId - ID of user creating the document
 * @param TimestampClass - Timestamp class from firebase/firestore
 */
export function createTimestamps(
  userId: string,
  TimestampClass: typeof Timestamp,
) {
  return {
    createdAt: TimestampClass.now(),
    updatedAt: TimestampClass.now(),
    lastModifiedBy: userId,
  };
}

/**
 * Create standard timestamp fields for document updates
 * @param userId - ID of user updating the document
 * @param TimestampClass - Timestamp class from firebase/firestore
 */
export function updateTimestamps(
  userId: string,
  TimestampClass: typeof Timestamp,
) {
  return {
    updatedAt: TimestampClass.now(),
    lastModifiedBy: userId,
  };
}
