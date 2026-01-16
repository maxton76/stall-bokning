/**
 * Serialization Utilities
 *
 * Centralized serialization helpers for API responses.
 * Handles Firestore Timestamp conversion and other data transformations.
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Recursively serialize Firestore Timestamps to ISO strings for API responses
 *
 * This function handles:
 * - Firestore Timestamp objects → ISO date strings
 * - Arrays → Recursively processes each element
 * - Objects → Recursively processes each property
 * - Primitives → Passed through unchanged
 *
 * @param obj - The object to serialize (can be any type)
 * @returns The serialized object with timestamps converted to ISO strings
 *
 * @example
 * const doc = { createdAt: Timestamp.now(), name: "Test" };
 * const serialized = serializeTimestamps(doc);
 * // { createdAt: "2024-01-15T10:30:00.000Z", name: "Test" }
 */
export function serializeTimestamps<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Check for Firestore Timestamp (has toDate method)
  if (
    obj instanceof Timestamp ||
    (obj && typeof (obj as any).toDate === "function")
  ) {
    return (obj as any).toDate().toISOString() as unknown as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serializeTimestamps) as unknown as T;
  }

  // Handle plain objects
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as object)) {
      result[key] = serializeTimestamps((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }

  // Return primitives unchanged
  return obj;
}

/**
 * Serialize a single Timestamp to ISO string
 *
 * @param timestamp - Firestore Timestamp or Date
 * @returns ISO date string or null if input is null/undefined
 */
export function serializeTimestamp(
  timestamp: Timestamp | Date | null | undefined,
): string | null {
  if (!timestamp) {
    return null;
  }

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  // Handle Timestamp-like objects with toDate method
  if (typeof (timestamp as any).toDate === "function") {
    return (timestamp as any).toDate().toISOString();
  }

  return null;
}
