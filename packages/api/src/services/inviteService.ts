import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import type {
  OrganizationInvite,
  OrganizationRole,
  StableAccessLevel,
  ContactType,
  InviteContactAddress,
} from "@equiduty/shared/types/organization";

/**
 * Generate a cryptographically secure invite token
 * Uses 32 bytes (256 bits) of randomness for security against enumeration attacks
 * @returns 64-character hexadecimal string
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

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
  // Contact creation fields
  contactType: ContactType;
  businessName?: string;
  address?: InviteContactAddress;
}

/**
 * Create a new organization invite for a non-existing user
 * Also auto-creates a Contact linked to this invite
 */
export async function createOrganizationInvite(
  organizationId: string,
  inviterUserId: string,
  inviteData: InviteData,
): Promise<{ token: string; inviteId: string; contactId: string }> {
  // Use cryptographically secure token for security-sensitive invite token
  const token = generateSecureToken();
  // UUID is fine for document IDs (uniqueness, not security)
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

  // Create contact auto-linked to this invite
  const contactId = await createContactForInvite(
    organizationId,
    inviteId,
    inviteData,
    inviterUserId,
  );

  const invite: Omit<OrganizationInvite, "id"> = {
    organizationId,
    email: inviteData.email.toLowerCase(),
    firstName: inviteData.firstName,
    lastName: inviteData.lastName,
    phoneNumber: inviteData.phoneNumber,
    // Contact type fields
    contactType: inviteData.contactType,
    businessName: inviteData.businessName,
    address: inviteData.address,
    // Role assignment
    roles: inviteData.roles,
    primaryRole: inviteData.primaryRole,
    showInPlanning: inviteData.showInPlanning,
    stableAccess: inviteData.stableAccess,
    assignedStableIds: inviteData.assignedStableIds || [],
    // Contact integration
    linkedContactId: contactId,
    // Invite metadata
    token,
    status: "pending",
    expiresAt: Timestamp.fromMillis(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ) as any, // 7 days
    // Email tracking
    sentAt: Timestamp.now() as any,
    resentCount: 0,
    // Audit trail
    invitedBy: inviterUserId,
    invitedAt: Timestamp.now() as any,
    // Organization cache
    organizationName: orgData?.name || "",
    inviterName:
      `${inviterData?.firstName || ""} ${inviterData?.lastName || ""}`.trim(),
  };

  await db.collection("invites").doc(inviteId).set(invite);

  return { token, inviteId, contactId };
}

/**
 * Create a Contact for an invite (auto-created during invitation)
 */
async function createContactForInvite(
  organizationId: string,
  inviteId: string,
  inviteData: InviteData,
  createdBy: string,
): Promise<string> {
  const now = Timestamp.now();

  // Build contact data based on contact type
  const baseContactData = {
    contactType: inviteData.contactType,
    accessLevel: "organization" as const,
    organizationId,
    // Linking fields
    linkedInviteId: inviteId,
    linkedMemberId: undefined,
    linkedUserId: undefined,
    // Badge and source
    badge: "member" as const,
    source: "invite" as const,
    hasLoginAccess: true,
    // Common fields
    email: inviteData.email.toLowerCase(),
    phoneNumber: inviteData.phoneNumber || "",
    invoiceLanguage: "en" as const,
    address: inviteData.address || {
      street: "",
      houseNumber: "",
      postcode: "",
      city: "",
      country: "",
    },
    // Metadata
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  let contactData: any;

  if (inviteData.contactType === "Personal") {
    contactData = {
      ...baseContactData,
      firstName: inviteData.firstName || "",
      lastName: inviteData.lastName || "",
    };
  } else {
    // Business contact
    contactData = {
      ...baseContactData,
      businessName: inviteData.businessName || "",
      contactPerson: {
        firstName: inviteData.firstName || "",
        lastName: inviteData.lastName || "",
      },
    };
  }

  const contactRef = await db.collection("contacts").add(contactData);
  return contactRef.id;
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
 * Also updates the linked Contact with member and user IDs
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

  // Update linked Contact: linkedInviteId → linkedMemberId, add linkedUserId
  if (invite.linkedContactId) {
    await db.collection("contacts").doc(invite.linkedContactId).update({
      linkedInviteId: null, // Clear invite link
      linkedMemberId: memberId, // Add member link
      linkedUserId: userId, // Add user link
      updatedAt: Timestamp.now(),
    });
  }

  // Update organization stats
  await updateOrganizationStats(invite.organizationId);
}

/**
 * Decline an invite
 * Also updates the linked Contact to external badge
 */
export async function declineInvite(inviteId: string): Promise<void> {
  const inviteDoc = await db.collection("invites").doc(inviteId).get();

  if (!inviteDoc.exists) {
    throw new Error("Invite not found");
  }

  const invite = inviteDoc.data() as Omit<OrganizationInvite, "id">;

  await db.collection("invites").doc(inviteId).update({
    status: "declined",
    respondedAt: Timestamp.now(),
  });

  // Update linked Contact: convert to external badge
  if (invite.linkedContactId) {
    await db.collection("contacts").doc(invite.linkedContactId).update({
      linkedInviteId: null, // Clear invite link
      badge: "external", // Convert to external
      hasLoginAccess: false, // Remove login access
      updatedAt: Timestamp.now(),
    });
  }
}

/**
 * Cancel an invite (admin action)
 * Also updates the linked Contact to external badge
 */
export async function cancelInvite(inviteId: string): Promise<void> {
  const inviteDoc = await db.collection("invites").doc(inviteId).get();

  if (!inviteDoc.exists) {
    throw new Error("Invite not found");
  }

  const invite = inviteDoc.data() as Omit<OrganizationInvite, "id">;

  // Delete the invite
  await db.collection("invites").doc(inviteId).delete();

  // Update linked Contact: convert to external badge
  if (invite.linkedContactId) {
    await db.collection("contacts").doc(invite.linkedContactId).update({
      linkedInviteId: null, // Clear invite link
      badge: "external", // Convert to external
      hasLoginAccess: false, // Remove login access
      updatedAt: Timestamp.now(),
    });
  }
}

/**
 * Resend an invite email
 */
export async function resendInvite(
  inviteId: string,
): Promise<{ token: string; expiresAt: Timestamp }> {
  const inviteDoc = await db.collection("invites").doc(inviteId).get();

  if (!inviteDoc.exists) {
    throw new Error("Invite not found");
  }

  const invite = inviteDoc.data() as Omit<OrganizationInvite, "id">;

  if (invite.status !== "pending") {
    throw new Error("Can only resend pending invites");
  }

  // Generate new expiration (7 days from now)
  const newExpiresAt = Timestamp.fromMillis(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  // Update invite with new expiration and resend tracking
  await db
    .collection("invites")
    .doc(inviteId)
    .update({
      expiresAt: newExpiresAt,
      lastResentAt: Timestamp.now(),
      resentCount: (invite.resentCount || 0) + 1,
    });

  return { token: invite.token, expiresAt: newExpiresAt as any };
}

/**
 * Get pending invites for an organization
 */
export async function getOrganizationInvites(
  organizationId: string,
): Promise<(OrganizationInvite & { id: string })[]> {
  const snapshot = await db
    .collection("invites")
    .where("organizationId", "==", organizationId)
    .where("status", "==", "pending")
    .orderBy("invitedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<OrganizationInvite, "id">),
  }));
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
