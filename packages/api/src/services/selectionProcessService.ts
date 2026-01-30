import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import type {
  SelectionProcess,
  SelectionProcessTurn,
  SelectionEntry,
  FirestoreTimestamp,
} from "@equiduty/shared";

/**
 * Selection Process Service
 *
 * Business logic for selection processes including:
 * - Active process validation
 * - Selection entry recording
 * - Member turn notifications
 * - Stable member validation
 */

// ============================================================
// Process Validation
// ============================================================

/**
 * Get the active selection process for a stable
 * Returns null if no active selection process exists
 * A stable can only have one active process at a time
 */
export async function getActiveSelectionProcessForStable(
  stableId: string,
): Promise<SelectionProcess | null> {
  const snapshot = await db
    .collection("selectionProcesses")
    .where("stableId", "==", stableId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as SelectionProcess;
}

/**
 * Validate that all members in the order are actual stable members
 *
 * @param stableId - The stable's ID
 * @param memberUserIds - Array of user IDs to validate
 * @returns Object with validation result and invalid user IDs if any
 */
export async function validateStableMembers(
  stableId: string,
  memberUserIds: string[],
): Promise<{ valid: boolean; invalidUserIds: string[] }> {
  // Get the stable to find its organization
  const stableDoc = await db.collection("stables").doc(stableId).get();
  if (!stableDoc.exists) {
    return { valid: false, invalidUserIds: memberUserIds };
  }

  const stable = stableDoc.data();
  const organizationId = stable?.organizationId;

  if (!organizationId) {
    return { valid: false, invalidUserIds: memberUserIds };
  }

  // Get all active organization members with access to this stable
  const membersSnapshot = await db
    .collection("organizationMembers")
    .where("organizationId", "==", organizationId)
    .where("status", "==", "active")
    .get();

  // Build a set of valid user IDs (those with stable access)
  const validUserIds = new Set<string>();

  for (const doc of membersSnapshot.docs) {
    const member = doc.data();
    const userId = member.userId;

    // Check if member has access to this specific stable
    if (member.stableAccess === "all") {
      validUserIds.add(userId);
    } else if (member.stableAccess === "specific") {
      const assignedStables = member.assignedStableIds || [];
      if (assignedStables.includes(stableId)) {
        validUserIds.add(userId);
      }
    }
  }

  // Also include the stable owner
  if (stable?.ownerId) {
    validUserIds.add(stable.ownerId);
  }

  // Find any invalid user IDs
  const invalidUserIds = memberUserIds.filter((id) => !validUserIds.has(id));

  return {
    valid: invalidUserIds.length === 0,
    invalidUserIds,
  };
}

// ============================================================
// Selection Entry Management
// ============================================================

/**
 * Record a selection entry when a user selects a routine during their turn
 */
export async function recordSelectionEntry(
  processId: string,
  routineInstanceId: string,
  userId: string,
  userName: string,
  turnOrder: number,
  routineTemplateName: string,
  scheduledDate: FirestoreTimestamp,
): Promise<string> {
  const now = Timestamp.now();

  // Selection entry structure matches the SelectionEntry type
  const selectionEntry = {
    routineInstanceId,
    selectedBy: userId,
    selectedByName: userName,
    turnOrder,
    routineTemplateName,
    scheduledDate,
    selectedAt: now,
  };

  const docRef = await db
    .collection("selectionProcesses")
    .doc(processId)
    .collection("selections")
    .add(selectionEntry);

  // Update the selections count for the user's turn
  const processDoc = await db
    .collection("selectionProcesses")
    .doc(processId)
    .get();

  if (processDoc.exists) {
    const process = processDoc.data() as SelectionProcess;
    const updatedTurns = process.turns.map((turn: SelectionProcessTurn) => {
      if (turn.userId === userId) {
        return {
          ...turn,
          selectionsCount: (turn.selectionsCount || 0) + 1,
        };
      }
      return turn;
    });

    await db.collection("selectionProcesses").doc(processId).update({
      turns: updatedTurns,
      updatedAt: now,
    });
  }

  return docRef.id;
}

/**
 * Get all selections for a process
 *
 * @param processId - The selection process ID
 * @returns Array of selection entries
 */
export async function getSelectionsForProcess(
  processId: string,
): Promise<SelectionEntry[]> {
  const snapshot = await db
    .collection("selectionProcesses")
    .doc(processId)
    .collection("selections")
    .orderBy("selectedAt", "asc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SelectionEntry[];
}

// ============================================================
// Turn Management
// ============================================================

/**
 * Get the current turn user info from a selection process
 */
export function getCurrentTurnInfo(process: SelectionProcess): {
  userId: string | null;
  userName: string | null;
  turnOrder: number | null;
} {
  if (
    process.currentTurnIndex < 0 ||
    process.currentTurnIndex >= process.turns.length
  ) {
    return { userId: null, userName: null, turnOrder: null };
  }

  const currentTurn = process.turns[process.currentTurnIndex];
  return {
    userId: currentTurn.userId,
    userName: currentTurn.userName,
    turnOrder: currentTurn.order,
  };
}

/**
 * Create turns array from member order
 *
 * @param memberOrder - Array of members in selection order
 * @returns Array of SelectionProcessTurn objects
 */
export function createTurnsFromMemberOrder(
  memberOrder: Array<{ userId: string; userName: string; userEmail: string }>,
): SelectionProcessTurn[] {
  return memberOrder.map((member, index) => ({
    userId: member.userId,
    userName: member.userName,
    userEmail: member.userEmail,
    order: index + 1, // 1-based
    status: "pending" as const,
    selectionsCount: 0,
  }));
}

/**
 * Check if it's a specific user's turn
 *
 * @param process - The selection process
 * @param userId - The user to check
 * @returns True if it's the user's turn
 */
export function isUsersTurn(
  process: SelectionProcess,
  userId: string,
): boolean {
  const currentTurn = getCurrentTurnInfo(process);
  return currentTurn.userId === userId;
}

/**
 * Get user's turn info from a process
 *
 * @param process - The selection process
 * @param userId - The user's ID
 * @returns Turn info or null if user is not in the process
 */
export function getUserTurnInfo(
  process: SelectionProcess,
  userId: string,
): { order: number; status: string; turnsAhead: number } | null {
  const turnIndex = process.turns.findIndex((t) => t.userId === userId);

  if (turnIndex === -1) {
    return null;
  }

  const turn = process.turns[turnIndex];
  const turnsAhead =
    process.status === "active" && process.currentTurnIndex >= 0
      ? Math.max(0, turnIndex - process.currentTurnIndex)
      : turnIndex;

  return {
    order: turn.order,
    status: turn.status,
    turnsAhead,
  };
}

// ============================================================
// Turn Notifications
// ============================================================

/**
 * Queue a notification to a member that it's their turn to select
 *
 * @param userId - The user to notify
 * @param userName - The user's display name
 * @param userEmail - The user's email
 * @param processId - The selection process ID
 * @param processName - The selection process name
 * @param stableId - The stable ID
 * @param organizationId - The organization ID
 */
export async function notifyMemberTurnStarted(
  userId: string,
  userName: string,
  userEmail: string,
  processId: string,
  processName: string,
  stableId: string,
  organizationId: string,
): Promise<void> {
  const now = Timestamp.now();

  // Create notification record
  await db.collection("notifications").add({
    userId,
    userName,
    userEmail,
    organizationId,
    stableId,
    type: "selection_turn_started",
    priority: "high",
    title: "Det ar din tur att valja pass",
    titleKey: "notifications.selectionTurnStarted.title",
    body: `Det ar din tur att valja rutinpass i "${processName}". Ga in och valj dina pass nu.`,
    bodyKey: "notifications.selectionTurnStarted.body",
    bodyParams: { processName },
    entityType: "selectionProcess",
    entityId: processId,
    channels: ["inApp", "push", "email"],
    deliveryStatus: {
      inApp: "pending",
      push: "pending",
      email: "pending",
    },
    deliveryAttempts: 0,
    read: false,
    actionUrl: `/selection-processes/${processId}`,
    actionLabel: "Valj pass",
    createdAt: now,
    updatedAt: now,
  });

  // Queue for delivery
  const channels = ["inApp", "push", "email"];
  for (const channel of channels) {
    await db.collection("notificationQueue").add({
      notificationId: processId,
      userId,
      channel,
      priority: "high",
      payload: {
        title: "Det ar din tur att valja pass",
        body: `Det ar din tur att valja rutinpass i "${processName}". Ga in och valj dina pass nu.`,
        data: {
          type: "selection_turn_started",
          entityType: "selectionProcess",
          entityId: processId,
          actionUrl: `/selection-processes/${processId}`,
        },
      },
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      scheduledFor: now,
      createdAt: now,
    });
  }
}

/**
 * Queue a notification that the selection process is complete
 *
 * @param turns - All turns in the process (to notify all members)
 * @param processId - The selection process ID
 * @param processName - The selection process name
 * @param stableId - The stable ID
 * @param organizationId - The organization ID
 */
export async function notifyProcessCompleted(
  turns: SelectionProcessTurn[],
  processId: string,
  processName: string,
  stableId: string,
  organizationId: string,
): Promise<void> {
  const now = Timestamp.now();

  // Notify all members
  for (const turn of turns) {
    await db.collection("notifications").add({
      userId: turn.userId,
      userEmail: turn.userEmail,
      organizationId,
      stableId,
      type: "selection_process_completed",
      priority: "normal",
      title: "Rutinval avslutat",
      titleKey: "notifications.selectionProcessCompleted.title",
      body: `Alla har nu valt sina pass i "${processName}".`,
      bodyKey: "notifications.selectionProcessCompleted.body",
      bodyParams: { processName },
      entityType: "selectionProcess",
      entityId: processId,
      channels: ["inApp"],
      deliveryStatus: {
        inApp: "pending",
      },
      deliveryAttempts: 0,
      read: false,
      actionUrl: `/selection-processes/${processId}`,
      createdAt: now,
      updatedAt: now,
    });
  }
}
