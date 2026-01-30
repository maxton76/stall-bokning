import { FieldValue } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import type {
  OrganizationInvite,
  InviteStatus,
} from "@equiduty/shared/types/organization";

/**
 * Invite Repository
 *
 * Centralized data access layer for organization invites collection.
 */

/**
 * Find invite by token
 *
 * @param token - Invite token
 * @returns Invite document or null if not found
 */
export async function findByToken(
  token: string,
): Promise<OrganizationInvite | null> {
  const snapshot = await db
    .collection("invites")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as OrganizationInvite;
}

/**
 * Find all pending invites for an email address
 *
 * @param email - Email address (should be lowercase)
 * @returns Array of pending invites
 */
export async function findPendingByEmail(
  email: string,
): Promise<OrganizationInvite[]> {
  const snapshot = await db
    .collection("invites")
    .where("email", "==", email.toLowerCase())
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrganizationInvite[];
}

/**
 * Find all invites for an organization
 *
 * @param organizationId - Organization ID
 * @param status - Optional status filter
 * @returns Array of invites
 */
export async function findByOrganization(
  organizationId: string,
  status?: InviteStatus,
): Promise<OrganizationInvite[]> {
  let query = db
    .collection("invites")
    .where("organizationId", "==", organizationId);

  if (status) {
    query = query.where("status", "==", status) as any;
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrganizationInvite[];
}

/**
 * Create a new invite
 *
 * @param data - Invite data
 * @returns Created invite ID
 */
export async function create(
  data: Omit<OrganizationInvite, "id" | "invitedAt" | "status">,
): Promise<string> {
  const inviteData = {
    ...data,
    status: "pending" as InviteStatus,
    invitedAt: FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("invites").add(inviteData);
  return docRef.id;
}

/**
 * Update invite status
 *
 * @param inviteId - Invite ID
 * @param status - New status
 */
export async function updateStatus(
  inviteId: string,
  status: InviteStatus,
): Promise<void> {
  await db.collection("invites").doc(inviteId).update({
    status,
    respondedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Delete an invite
 *
 * @param inviteId - Invite ID
 */
export async function deleteInvite(inviteId: string): Promise<void> {
  await db.collection("invites").doc(inviteId).delete();
}

/**
 * Expire old pending invites (for scheduled cleanup)
 *
 * @returns Number of invites expired
 */
export async function expirePendingInvites(): Promise<number> {
  const now = new Date();

  const snapshot = await db
    .collection("invites")
    .where("status", "==", "pending")
    .where("expiresAt", "<", now)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "expired",
      respondedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return snapshot.size;
}
