import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import type {
  OrganizationInvite,
  OrganizationRole,
  StableAccessLevel,
} from "@stall-bokning/shared/types/organization";

interface InviteData {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles: OrganizationRole[];
  primaryRole: OrganizationRole;
  showInPlanning: boolean;
  stableAccess: StableAccessLevel;
  assignedStableIds?: string[];
}

/**
 * Create a new organization invite for a non-existing user
 */
export async function createOrganizationInvite(
  organizationId: string,
  inviterUserId: string,
  inviteData: InviteData,
): Promise<{ token: string; inviteId: string }> {
  const token = uuidv4();
  const inviteId = uuidv4();

  // Get organization and inviter details for email
  const orgDoc = await db.collection("organizations").doc(organizationId).get();
  const inviterDoc = await db.collection("users").doc(inviterUserId).get();

  if (!orgDoc.exists) {
    throw new Error("Organization not found");
  }

  if (!inviterDoc.exists) {
    throw new Error("Inviter not found");
  }

  const orgData = orgDoc.data();
  const inviterData = inviterDoc.data();

  const invite: Omit<OrganizationInvite, "id"> = {
    organizationId,
    email: inviteData.email.toLowerCase(),
    firstName: inviteData.firstName,
    lastName: inviteData.lastName,
    phoneNumber: inviteData.phoneNumber,
    roles: inviteData.roles,
    primaryRole: inviteData.primaryRole,
    showInPlanning: inviteData.showInPlanning,
    stableAccess: inviteData.stableAccess,
    assignedStableIds: inviteData.assignedStableIds || [],
    token,
    status: "pending",
    expiresAt: Timestamp.fromMillis(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ) as any, // 7 days
    invitedBy: inviterUserId,
    invitedAt: Timestamp.now() as any,
    organizationName: orgData?.name || "",
    inviterName:
      `${inviterData?.firstName || ""} ${inviterData?.lastName || ""}`.trim(),
  };

  await db.collection("invites").doc(inviteId).set(invite);

  return { token, inviteId };
}

/**
 * Get an invite by token (only returns pending, non-expired invites)
 */
export async function getInviteByToken(
  token: string,
): Promise<(OrganizationInvite & { id: string }) | null> {
  const snapshot = await db
    .collection("invites")
    .where("token", "==", token)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const invite = doc.data() as Omit<OrganizationInvite, "id">;

  // Check expiration
  if (invite.expiresAt.toMillis() < Date.now()) {
    await db.collection("invites").doc(doc.id).update({
      status: "expired",
    });
    return null;
  }

  return { ...invite, id: doc.id };
}

/**
 * Accept an invite and create organization member
 */
export async function acceptInvite(
  inviteId: string,
  userId: string,
): Promise<void> {
  const inviteDoc = await db.collection("invites").doc(inviteId).get();

  if (!inviteDoc.exists) {
    throw new Error("Invite not found");
  }

  const invite = inviteDoc.data() as Omit<OrganizationInvite, "id">;

  // Create organizationMember
  const memberId = `${userId}_${invite.organizationId}`;

  await db
    .collection("organizationMembers")
    .doc(memberId)
    .set({
      id: memberId,
      organizationId: invite.organizationId,
      userId,
      userEmail: invite.email,
      firstName: invite.firstName || "",
      lastName: invite.lastName || "",
      phoneNumber: invite.phoneNumber,
      roles: invite.roles,
      primaryRole: invite.primaryRole,
      status: "active",
      showInPlanning: invite.showInPlanning,
      stableAccess: invite.stableAccess,
      assignedStableIds: invite.assignedStableIds || [],
      joinedAt: Timestamp.now(),
      invitedBy: invite.invitedBy,
      inviteAcceptedAt: Timestamp.now(),
      inviteToken: invite.token,
    });

  // Update invite status
  await db.collection("invites").doc(inviteId).update({
    status: "accepted",
    respondedAt: Timestamp.now(),
  });

  // Update organization stats
  await updateOrganizationStats(invite.organizationId);
}

/**
 * Decline an invite
 */
export async function declineInvite(inviteId: string): Promise<void> {
  await db.collection("invites").doc(inviteId).update({
    status: "declined",
    respondedAt: Timestamp.now(),
  });
}

/**
 * Migrate all pending invites for a user's email on signup
 */
export async function migrateInvitesOnSignup(
  userId: string,
  email: string,
): Promise<void> {
  // Find all pending invites for this email
  const snapshot = await db
    .collection("invites")
    .where("email", "==", email.toLowerCase())
    .where("status", "==", "pending")
    .get();

  // Auto-accept all pending invites
  for (const inviteDoc of snapshot.docs) {
    try {
      await acceptInvite(inviteDoc.id, userId);
    } catch (error) {
      console.error(`Failed to migrate invite ${inviteDoc.id}:`, error);
      // Continue with other invites even if one fails
    }
  }
}

/**
 * Update organization member count statistics
 */
async function updateOrganizationStats(organizationId: string): Promise<void> {
  // Count active members
  const membersSnapshot = await db
    .collection("organizationMembers")
    .where("organizationId", "==", organizationId)
    .where("status", "==", "active")
    .get();

  const totalMemberCount = membersSnapshot.size;

  // Update organization stats
  await db.collection("organizations").doc(organizationId).update({
    "stats.totalMemberCount": totalMemberCount,
  });
}
