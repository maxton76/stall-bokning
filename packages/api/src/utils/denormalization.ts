import { db } from "./firebase.js";

/**
 * Denormalization utilities for resolving entity names from IDs
 * Used across API routes to enrich response data with human-readable names
 */

/**
 * Get display names for a list of user IDs
 * Returns full name (firstName lastName) or email as fallback
 *
 * @param userIds - Array of user IDs to resolve
 * @returns Promise<string[]> - Array of display names in same order as input
 */
export async function getUserNames(userIds: string[]): Promise<string[]> {
  if (!userIds || userIds.length === 0) return [];

  const names: string[] = [];
  for (const userId of userIds) {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data()!;
      const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
      names.push(fullName || data.email || "Unknown");
    } else {
      names.push("Unknown");
    }
  }
  return names;
}

/**
 * Get display names for multiple user IDs in batch (optimized for large sets)
 * Uses a single batch read for better performance
 *
 * @param userIds - Array of user IDs to resolve
 * @returns Promise<Map<string, string>> - Map of userId to display name
 */
export async function getUserNamesMap(
  userIds: string[],
): Promise<Map<string, string>> {
  const namesMap = new Map<string, string>();
  if (!userIds || userIds.length === 0) return namesMap;

  // Deduplicate IDs
  const uniqueIds = [...new Set(userIds)];

  // Batch fetch users (Firestore allows up to 10 per batch)
  const batchSize = 10;
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const refs = batch.map((id) => db.collection("users").doc(id));
    const docs = await db.getAll(...refs);

    docs.forEach((doc, index) => {
      const userId = batch[index];
      if (doc.exists) {
        const data = doc.data()!;
        const fullName =
          `${data.firstName || ""} ${data.lastName || ""}`.trim();
        namesMap.set(userId, fullName || data.email || "Unknown");
      } else {
        namesMap.set(userId, "Unknown");
      }
    });
  }

  return namesMap;
}

/**
 * Get a single user's display name
 *
 * @param userId - User ID to resolve
 * @returns Promise<string> - Display name or "Unknown"
 */
export async function getUserName(userId: string): Promise<string> {
  if (!userId) return "Unknown";

  const userDoc = await db.collection("users").doc(userId).get();
  if (userDoc.exists) {
    const data = userDoc.data()!;
    const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
    return fullName || data.email || "Unknown";
  }
  return "Unknown";
}

/**
 * Get horse name from horse ID
 *
 * @param horseId - Horse ID to resolve
 * @returns Promise<string | undefined> - Horse name or undefined if not found
 */
export async function getHorseName(
  horseId: string,
): Promise<string | undefined> {
  if (!horseId) return undefined;

  const horseDoc = await db.collection("horses").doc(horseId).get();
  return horseDoc.exists ? horseDoc.data()?.name : undefined;
}

/**
 * Get horse names for multiple IDs in batch
 *
 * @param horseIds - Array of horse IDs to resolve
 * @returns Promise<Map<string, string>> - Map of horseId to name
 */
export async function getHorseNamesMap(
  horseIds: string[],
): Promise<Map<string, string>> {
  const namesMap = new Map<string, string>();
  if (!horseIds || horseIds.length === 0) return namesMap;

  // Deduplicate IDs
  const uniqueIds = [...new Set(horseIds)];

  // Batch fetch horses
  const batchSize = 10;
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const refs = batch.map((id) => db.collection("horses").doc(id));
    const docs = await db.getAll(...refs);

    docs.forEach((doc, index) => {
      const horseId = batch[index];
      if (doc.exists) {
        namesMap.set(horseId, doc.data()?.name || "Unknown");
      }
    });
  }

  return namesMap;
}

/**
 * Get horse group name from group ID
 *
 * @param groupId - Horse group ID to resolve
 * @returns Promise<string | undefined> - Group name or undefined if not found
 */
export async function getHorseGroupName(
  groupId: string,
): Promise<string | undefined> {
  if (!groupId) return undefined;

  const groupDoc = await db.collection("horseGroups").doc(groupId).get();
  return groupDoc.exists ? groupDoc.data()?.name : undefined;
}

/**
 * Get activity type name from type ID
 *
 * @param activityTypeId - Activity type ID to resolve
 * @returns Promise<string | undefined> - Activity type name or undefined
 */
export async function getActivityTypeName(
  activityTypeId: string,
): Promise<string | undefined> {
  if (!activityTypeId) return undefined;

  const typeDoc = await db
    .collection("activityTypes")
    .doc(activityTypeId)
    .get();
  return typeDoc.exists ? typeDoc.data()?.name : undefined;
}

/**
 * Get stable name from stable ID
 *
 * @param stableId - Stable ID to resolve
 * @returns Promise<string | undefined> - Stable name or undefined
 */
export async function getStableName(
  stableId: string,
): Promise<string | undefined> {
  if (!stableId) return undefined;

  const stableDoc = await db.collection("stables").doc(stableId).get();
  return stableDoc.exists ? stableDoc.data()?.name : undefined;
}

/**
 * Get organization name from organization ID
 *
 * @param organizationId - Organization ID to resolve
 * @returns Promise<string | undefined> - Organization name or undefined
 */
export async function getOrganizationName(
  organizationId: string,
): Promise<string | undefined> {
  if (!organizationId) return undefined;

  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  return orgDoc.exists ? orgDoc.data()?.name : undefined;
}
