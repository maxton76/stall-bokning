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
export declare function mapDocsToObjects<T>(
  snapshot: QuerySnapshot<DocumentData>,
): T[];
/**
 * Extract document IDs from a QuerySnapshot
 */
export declare function extractDocIds(
  snapshot: QuerySnapshot<DocumentData>,
): string[];
/**
 * Remove undefined values from objects
 * Firestore doesn't accept undefined - optional fields should be omitted
 */
export declare function removeUndefined<T extends Record<string, any>>(
  obj: T,
): Partial<T>;
/**
 * Create standard timestamp fields for new documents
 * @param userId - ID of user creating the document
 * @param TimestampClass - Timestamp class from firebase/firestore
 */
export declare function createTimestamps(
  userId: string,
  TimestampClass: typeof Timestamp,
): {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastModifiedBy: string;
};
/**
 * Create standard timestamp fields for document updates
 * @param userId - ID of user updating the document
 * @param TimestampClass - Timestamp class from firebase/firestore
 */
export declare function updateTimestamps(
  userId: string,
  TimestampClass: typeof Timestamp,
): {
  updatedAt: Timestamp;
  lastModifiedBy: string;
};
//# sourceMappingURL=firestore.d.ts.map
