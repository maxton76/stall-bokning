/**
 * Firestore Utilities
 * Consolidated from frontend/src/utils/firestoreHelpers.ts
 *
 * Provides Firestore helper functions for document mapping,
 * data cleaning, and timestamp management.
 * Uses Firebase client SDK (for frontend/shared contexts).
 */
/**
 * Map Firestore documents to typed objects with id
 * Works with Firebase client SDK snapshots
 */
export function mapDocsToObjects(snapshot) {
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
/**
 * Extract document IDs from a QuerySnapshot
 */
export function extractDocIds(snapshot) {
  return snapshot.docs.map((doc) => doc.id);
}
/**
 * Remove undefined values from objects
 * Firestore doesn't accept undefined - optional fields should be omitted
 */
export function removeUndefined(obj) {
  const result = {};
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
export function createTimestamps(userId, TimestampClass) {
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
export function updateTimestamps(userId, TimestampClass) {
  return {
    updatedAt: TimestampClass.now(),
    lastModifiedBy: userId,
  };
}
