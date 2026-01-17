/**
 * Common types shared across packages
 * These types are designed to be compatible with both firebase-admin and firebase client SDK
 */
/**
 * Platform-agnostic Timestamp interface
 * Compatible with both firebase-admin/firestore Timestamp and firebase/firestore Timestamp
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}
/**
 * Type alias for Timestamp that can be used in shared types
 * This allows the API (using firebase-admin) and frontend (using firebase client)
 * to both use the same type definitions
 */
export type TimestampLike = FirestoreTimestamp;
//# sourceMappingURL=common.d.ts.map
