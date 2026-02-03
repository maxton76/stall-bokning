/**
 * Process Bulk Import Trigger
 *
 * Firestore trigger that fires when a new bulkImportJobs document is created.
 * Processes each member in the job by invoking the existing invite logic.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

import { db, Timestamp } from "../lib/firebase.js";
import { formatErrorMessage } from "@equiduty/shared";
import { sendEmail } from "../notifications/sendEmail.js";
import { processHorseImportJob } from "./processHorseBulkImport.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BulkImportMember {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles: string[];
  primaryRole: string;
}

interface BulkImportResult {
  email: string;
  status: "success" | "error" | "skipped";
  type?: "existing_user" | "new_user";
  error?: string;
}

interface BulkImportJobData {
  id: string;
  organizationId: string;
  createdBy: string;
  status: string;
  members: BulkImportMember[];
  progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  results: BulkImportResult[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Write progress to Firestore every N members instead of every single one */
const PROGRESS_BATCH_SIZE = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a cryptographically secure invite token (same as inviteService)
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Small delay between operations to avoid overwhelming Firestore
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send invite email to a new user who needs to sign up
 */
async function sendInviteEmailToNewUser(
  email: string,
  organizationName: string,
  inviterName: string,
  token: string,
  executionId: string,
): Promise<void> {
  const baseUrl = process.env.FRONTEND_URL || "https://app.equiduty.se";
  const signupUrl = `${baseUrl}/signup?token=${token}`;

  try {
    await sendEmail(
      {
        to: email,
        subject: `Du har blivit inbjuden till ${organizationName}`,
        body: `${inviterName} har bjudit in dig till ${organizationName} på EquiDuty.\n\nKlicka på länken nedan för att skapa ditt konto och gå med:\n${signupUrl}\n\nDenna inbjudan gäller i 7 dagar.`,
      },
      signupUrl,
    );
  } catch (error) {
    logger.warn(
      { executionId, email, error: formatErrorMessage(error) },
      "Failed to send invite email to new user",
    );
  }
}

/**
 * Send invite email to an existing user with accept/decline links
 */
async function sendMemberInviteEmail(
  email: string,
  organizationName: string,
  inviterName: string,
  memberId: string,
  executionId: string,
): Promise<void> {
  const baseUrl = process.env.FRONTEND_URL || "https://app.equiduty.se";
  const acceptUrl = `${baseUrl}/invites/accept?memberId=${memberId}`;
  const declineUrl = `${baseUrl}/invites/decline?memberId=${memberId}`;

  try {
    await sendEmail(
      {
        to: email,
        subject: `Du har bjudits in till ${organizationName}`,
        body: `${inviterName} har bjudit in dig till ${organizationName} på EquiDuty.\n\nFör att acceptera inbjudan, klicka här:\n${acceptUrl}\n\nFör att avböja:\n${declineUrl}\n\nInbjudan upphör om 7 dagar.`,
      },
      acceptUrl,
    );
  } catch (error) {
    logger.warn(
      { executionId, email, error: formatErrorMessage(error) },
      "Failed to send member invite email",
    );
  }
}

/**
 * Process a single member invite - handles both existing and new users
 */
async function processSingleMember(
  member: BulkImportMember,
  organizationId: string,
  createdBy: string,
  orgData: FirebaseFirestore.DocumentData,
  inviterData: FirebaseFirestore.DocumentData | undefined,
  executionId: string,
): Promise<BulkImportResult> {
  const email = member.email.toLowerCase();

  try {
    // Check if already a member
    const existingMemberSnapshot = await db
      .collection("organizationMembers")
      .where("organizationId", "==", organizationId)
      .where("userEmail", "==", email)
      .limit(1)
      .get();

    if (!existingMemberSnapshot.empty) {
      return {
        email,
        status: "skipped",
        error: "Already a member of this organization",
      };
    }

    // Check if there's already a pending invite
    const existingInviteSnapshot = await db
      .collection("invites")
      .where("organizationId", "==", organizationId)
      .where("email", "==", email)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingInviteSnapshot.empty) {
      return {
        email,
        status: "skipped",
        error: "Already has a pending invitation",
      };
    }

    const organizationName = orgData?.name || "";
    const inviterName =
      `${inviterData?.firstName || ""} ${inviterData?.lastName || ""}`.trim();

    // Check if user exists in the system
    const userSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!userSnapshot.empty) {
      // EXISTING USER FLOW - create organizationMember with pending status
      const existingUser = userSnapshot.docs[0];
      const existingUserData = existingUser.data();
      const userId = existingUser.id;
      const memberId = `${userId}_${organizationId}`;

      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      await db
        .collection("organizationMembers")
        .doc(memberId)
        .set({
          id: memberId,
          organizationId,
          userId,
          userEmail: email,
          firstName: member.firstName || existingUserData.firstName || "",
          lastName: member.lastName || existingUserData.lastName || "",
          phoneNumber: member.phoneNumber || existingUserData.phoneNumber,
          roles: member.roles,
          primaryRole: member.primaryRole,
          status: "pending",
          showInPlanning: true,
          stableAccess: "all",
          assignedStableIds: [],
          expiresAt,
          joinedAt: Timestamp.now(),
          invitedBy: createdBy,
        });

      logger.info(
        { executionId, email, memberId },
        "Created pending membership for existing user",
      );

      // Create in-app notification for the invited user
      const notificationId = `membership_invite_${memberId}`;
      try {
        await db
          .collection("notifications")
          .doc(notificationId)
          .set({
            id: notificationId,
            userId,
            organizationId,
            type: "membership_invite",
            priority: "high",
            title: "Organization Invite",
            titleKey: "notifications.membershipInvite.title",
            body: `You've been invited to ${organizationName}`,
            bodyKey: "notifications.membershipInvite.body",
            bodyParams: {
              organizationName,
              inviterName,
            },
            entityType: "organizationMember",
            entityId: memberId,
            channels: ["inApp", "email"],
            deliveryStatus: { inApp: "sent" },
            deliveryAttempts: 1,
            read: false,
            actionUrl: `/invites/accept?memberId=${memberId}`,
            expiresAt,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
      } catch (notifError) {
        logger.warn(
          {
            executionId,
            email,
            error: formatErrorMessage(notifError as Error),
          },
          "Failed to create invite notification",
        );
      }

      // Send email with accept/decline links
      await sendMemberInviteEmail(
        email,
        organizationName,
        inviterName,
        memberId,
        executionId,
      );

      return {
        email,
        status: "success",
        type: "existing_user",
      };
    } else {
      // NON-EXISTING USER FLOW - create invite
      const token = generateSecureToken();
      const inviteId = uuidv4();

      // Create contact for invite
      const contactData = {
        contactType: "Personal",
        accessLevel: "organization",
        organizationId,
        linkedInviteId: inviteId,
        linkedMemberId: null,
        linkedUserId: null,
        badge: "member",
        source: "invite",
        hasLoginAccess: true,
        email,
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        phoneNumber: member.phoneNumber || "",
        invoiceLanguage: "en",
        address: {
          street: "",
          houseNumber: "",
          postcode: "",
          city: "",
          country: "",
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy,
      };

      const contactRef = await db.collection("contacts").add(contactData);

      // Create invite document
      const invite = {
        organizationId,
        email,
        firstName: member.firstName,
        lastName: member.lastName,
        phoneNumber: member.phoneNumber,
        contactType: "Personal",
        roles: member.roles,
        primaryRole: member.primaryRole,
        showInPlanning: true,
        stableAccess: "all",
        assignedStableIds: [],
        linkedContactId: contactRef.id,
        token,
        status: "pending",
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
        sentAt: Timestamp.now(),
        resentCount: 0,
        invitedBy: createdBy,
        invitedAt: Timestamp.now(),
        organizationName,
        inviterName,
      };

      await db.collection("invites").doc(inviteId).set(invite);

      logger.info(
        { executionId, email, inviteId },
        "Created invite for new user",
      );

      // Send invite email (fire-and-forget — don't fail the member on email error)
      await sendInviteEmailToNewUser(
        email,
        organizationName,
        inviterName,
        token,
        executionId,
      );

      return {
        email,
        status: "success",
        type: "new_user",
      };
    }
  } catch (error) {
    logger.error(
      { executionId, email, error: formatErrorMessage(error) },
      "Failed to process member",
    );

    return {
      email,
      status: "error",
      error: formatErrorMessage(error),
    };
  }
}

/**
 * Create an in-app notification for the user who initiated the import
 */
async function createCompletionNotification(
  userId: string,
  organizationId: string,
  succeeded: number,
  failed: number,
  total: number,
): Promise<void> {
  const now = Timestamp.now();
  const notificationId = crypto.randomUUID();

  const baseUrl = process.env.FRONTEND_URL || "https://app.equiduty.se";
  const actionUrl = `${baseUrl}/organizations/${organizationId}/users`;

  const allSucceeded = succeeded === total;

  await db
    .collection("notifications")
    .doc(notificationId)
    .set({
      userId,
      type: "system_alert",
      title: allSucceeded ? "Massimport klar" : "Massimport slutförd med fel",
      titleEn: allSucceeded
        ? "Bulk import complete"
        : "Bulk import completed with errors",
      body: `${succeeded} av ${total} medlemmar inbjudna.${failed > 0 ? ` ${failed} misslyckades.` : ""}`,
      bodyEn: `${succeeded} of ${total} members invited.${failed > 0 ? ` ${failed} failed.` : ""}`,
      data: {
        organizationId,
        actionUrl,
        succeeded,
        failed,
        total,
      },
      channels: ["inApp"],
      deliveryStatus: { inApp: "sent" },
      read: false,
      createdAt: now,
      updatedAt: now,
    });
}

// ============================================================================
// JOB PROCESSING LOGIC
// ============================================================================

/**
 * Core job processing — extracted so both the normal SDK path and the
 * fallback (manual Firestore read) can share the same logic.
 */
async function processJob(
  jobId: string,
  _initialData: BulkImportJobData | null,
  executionId: string,
): Promise<void> {
  const jobRef = db.collection("bulkImportJobs").doc(jobId);

  // C4: Idempotency check — atomically verify "pending" and transition to "processing"
  let jobData: BulkImportJobData;
  try {
    jobData = await db.runTransaction(async (transaction) => {
      const jobSnapshot = await transaction.get(jobRef);
      if (!jobSnapshot.exists) {
        throw new Error("JOB_NOT_FOUND");
      }
      const data = jobSnapshot.data() as BulkImportJobData;
      if (data.status !== "pending") {
        throw new Error("JOB_ALREADY_PROCESSED");
      }
      transaction.update(jobRef, {
        status: "processing",
        updatedAt: Timestamp.now(),
      });
      return data;
    });
  } catch (error: any) {
    if (
      error.message === "JOB_ALREADY_PROCESSED" ||
      error.message === "JOB_NOT_FOUND"
    ) {
      logger.warn(
        { executionId, jobId, error: error.message },
        "Bulk import job already processed or not found, skipping",
      );
      return;
    }
    throw error;
  }

  logger.info(
    {
      executionId,
      jobId,
      organizationId: jobData.organizationId,
      memberCount: jobData.members.length,
    },
    "Starting bulk import processing",
  );

  // Get organization and inviter data (once, reused for all members)
  const [orgDoc, inviterDoc] = await Promise.all([
    db.collection("organizations").doc(jobData.organizationId).get(),
    db.collection("users").doc(jobData.createdBy).get(),
  ]);

  const orgData = orgDoc.data();
  const inviterData = inviterDoc.exists ? inviterDoc.data() : undefined;

  if (!orgData) {
    logger.error(
      { executionId, jobId, organizationId: jobData.organizationId },
      "Organization not found",
    );
    await jobRef.update({
      status: "failed",
      updatedAt: Timestamp.now(),
    });
    return;
  }

  const results: BulkImportResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < jobData.members.length; i++) {
    const member = jobData.members[i];

    const result = await processSingleMember(
      member,
      jobData.organizationId,
      jobData.createdBy,
      orgData,
      inviterData,
      executionId,
    );

    results.push(result);

    if (result.status === "success") {
      succeeded++;
    } else {
      failed++;
    }

    // M6: Batch progress updates — write every PROGRESS_BATCH_SIZE members or on the last one
    const isLastMember = i === jobData.members.length - 1;
    if (isLastMember || (i + 1) % PROGRESS_BATCH_SIZE === 0) {
      await jobRef.update({
        "progress.processed": i + 1,
        "progress.succeeded": succeeded,
        "progress.failed": failed,
        results,
        updatedAt: Timestamp.now(),
      });
    }

    // Small delay between operations to avoid overwhelming Firestore
    if (!isLastMember) {
      await delay(300);
    }
  }

  // Mark job as completed
  await jobRef.update({
    status: "completed",
    updatedAt: Timestamp.now(),
  });

  // Create completion notification
  try {
    await createCompletionNotification(
      jobData.createdBy,
      jobData.organizationId,
      succeeded,
      failed,
      jobData.members.length,
    );
  } catch (error) {
    logger.error(
      { executionId, jobId, error: formatErrorMessage(error) },
      "Failed to create completion notification",
    );
  }

  logger.info(
    {
      executionId,
      jobId,
      total: jobData.members.length,
      succeeded,
      failed,
    },
    "Bulk import processing complete",
  );
}

// ============================================================================
// MAIN TRIGGER
// ============================================================================

export const processBulkImport = onDocumentCreated(
  {
    document: "bulkImportJobs/{jobId}",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const executionId = crypto.randomUUID();

    const jobId = event.params?.jobId;

    // If SDK couldn't parse the event, try to extract jobId and read from Firestore directly
    if (!event.data || !jobId) {
      // Attempt fallback: extract jobId from CloudEvent subject attribute
      const subject = (event as any).subject as string | undefined;
      let extractedJobId = subject?.match(/bulkImportJobs\/([^/]+)/)?.[1];

      // If subject is missing, try to decode raw protobuf bytes from the event.
      // Eventarc-triggered Gen2 functions may receive the event as a raw byte
      // array (keys 0,1,2,...) when the SDK can't deserialize the protobuf.
      if (!extractedJobId) {
        try {
          const rawEvent = event as unknown as Record<string, unknown>;
          // Check if event looks like a byte array (has numeric keys)
          if ("0" in rawEvent && typeof rawEvent["0"] === "number") {
            const maxIndex = Object.keys(rawEvent)
              .filter((k) => /^\d+$/.test(k))
              .reduce((max, k) => Math.max(max, parseInt(k, 10)), -1);
            if (maxIndex > 0) {
              const bytes = new Uint8Array(maxIndex + 1);
              for (let i = 0; i <= maxIndex; i++) {
                bytes[i] = (rawEvent[String(i)] as number) & 0xff;
              }
              const decoded = Buffer.from(bytes).toString("utf-8");
              const match = decoded.match(/bulkImportJobs\/([a-zA-Z0-9_-]+)/);
              if (match) {
                extractedJobId = match[1];
              }
            }
          }
        } catch {
          // Ignore decode errors — we'll fall through to the error below
        }
      }

      logger.warn(
        {
          executionId,
          jobId,
          subject,
          extractedJobId,
          eventDataType: typeof event.data,
        },
        "SDK event parsing failed — attempting fallback extraction",
      );

      if (!extractedJobId) {
        logger.error(
          { executionId },
          "Cannot extract jobId from event — no subject or unrecognized format",
        );
        return;
      }

      // Read the document directly from Firestore
      const fallbackDoc = await db
        .collection("bulkImportJobs")
        .doc(extractedJobId)
        .get();
      if (!fallbackDoc.exists) {
        logger.error(
          { executionId, extractedJobId },
          "Fallback: job document not found in Firestore",
        );
        return;
      }

      logger.info(
        { executionId, extractedJobId },
        "Fallback: successfully read job from Firestore, proceeding",
      );

      // Re-enter the processing logic with the fallback data
      const fallbackData = fallbackDoc.data() as BulkImportJobData & {
        type?: string;
      };

      // Route to horse import if type is "horses"
      if (fallbackData?.type === "horses") {
        await processHorseImportJob(
          extractedJobId,
          fallbackData as any,
          executionId,
        );
        return;
      }

      await processJob(extractedJobId, fallbackData, executionId);
      return;
    }

    // Normal path: SDK parsed the event successfully
    const eventData = event.data.data() as BulkImportJobData & {
      type?: string;
    };

    // Route to horse import if type is "horses"
    if (eventData?.type === "horses") {
      await processHorseImportJob(jobId, eventData as any, executionId);
      return;
    }

    await processJob(jobId, eventData, executionId);
  },
);
