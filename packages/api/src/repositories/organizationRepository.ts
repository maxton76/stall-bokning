import { FieldValue } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import type {
  Organization,
  CreateOrganizationData,
} from "@equiduty/shared/types/organization";

/**
 * Organization Repository
 *
 * Centralized data access layer for organizations collection.
 */

/**
 * Find organization by ID
 *
 * @param id - Organization ID
 * @returns Organization document or null if not found
 */
export async function findById(id: string): Promise<Organization | null> {
  const doc = await db.collection("organizations").doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as Organization;
}

/**
 * Find all organizations owned by a user
 *
 * @param ownerId - User ID of the owner
 * @returns Array of organizations
 */
export async function findByOwnerId(ownerId: string): Promise<Organization[]> {
  const snapshot = await db
    .collection("organizations")
    .where("ownerId", "==", ownerId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Organization[];
}

/**
 * Find all organizations where user is either owner or active member
 *
 * @param userId - User ID
 * @returns Array of organizations
 */
export async function findUserOrganizations(
  userId: string,
): Promise<Organization[]> {
  // Get organizations where user is owner
  const ownerOrgs = await findByOwnerId(userId);

  // Get organizations where user is an active member
  const memberSnapshot = await db
    .collection("organizationMembers")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .get();

  const memberOrgIds = memberSnapshot.docs.map(
    (doc) => doc.data().organizationId,
  );

  // Fetch member organizations
  const memberOrgs =
    memberOrgIds.length > 0
      ? await Promise.all(memberOrgIds.map((id) => findById(id)))
      : [];

  // Combine and deduplicate
  const allOrgs = [
    ...ownerOrgs,
    ...memberOrgs.filter((org) => org !== null),
  ] as Organization[];

  // Remove duplicates based on ID
  const uniqueOrgs = Array.from(
    new Map(allOrgs.map((org) => [org.id, org])).values(),
  );

  return uniqueOrgs;
}

/**
 * Create a new organization
 *
 * @param data - Organization data
 * @param ownerId - Owner user ID
 * @param ownerEmail - Owner email (for caching)
 * @returns Created organization ID
 */
export async function create(
  data: CreateOrganizationData,
  ownerId: string,
  ownerEmail: string,
): Promise<string> {
  const organizationData = {
    ...data,
    ownerId,
    ownerEmail,
    subscriptionTier: "free" as const,
    stats: {
      stableCount: 0,
      totalMemberCount: 0,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("organizations").add(organizationData);
  return docRef.id;
}

/**
 * Update an existing organization
 *
 * @param id - Organization ID
 * @param updates - Partial organization data to update
 */
export async function update(
  id: string,
  updates: Partial<Organization>,
): Promise<void> {
  await db
    .collection("organizations")
    .doc(id)
    .update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Delete an organization
 *
 * @param id - Organization ID
 */
export async function deleteOrganization(id: string): Promise<void> {
  await db.collection("organizations").doc(id).delete();
}

/**
 * Update organization statistics
 * Eliminates Pattern 4: Manual stats update (2+ duplicates)
 *
 * @param organizationId - Organization ID
 * @param stats - Stats object to update
 */
export async function updateStats(
  organizationId: string,
  stats: { stableCount?: number; totalMemberCount?: number },
): Promise<void> {
  const updateData: any = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (stats.stableCount !== undefined) {
    updateData["stats.stableCount"] = stats.stableCount;
  }

  if (stats.totalMemberCount !== undefined) {
    updateData["stats.totalMemberCount"] = stats.totalMemberCount;
  }

  await db.collection("organizations").doc(organizationId).update(updateData);
}
