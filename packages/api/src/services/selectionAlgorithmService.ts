/**
 * Selection Algorithm Service
 *
 * Implements 3 fairness algorithms for selection process turn order:
 * 1. Quota-Based Draft Pick (quota_based)
 * 2. Points Balance (points_balance)
 * 3. Fair Rotation (fair_rotation)
 *
 * Also handles history tracking for cross-occasion rotation.
 */

import { Timestamp } from "firebase-admin/firestore";
import { db } from "../utils/firebase.js";
import type {
  SelectionAlgorithm,
  SelectionProcessHistory,
  SelectionHistoryTurn,
  ComputedTurnOrder,
  CreateSelectionProcessMember,
  SelectionProcess,
} from "@equiduty/shared";

// ============================================================
// Main compute function
// ============================================================

/**
 * Compute turn order based on the selected algorithm
 */
export async function computeTurnOrder(params: {
  stableId: string;
  organizationId: string;
  algorithm: SelectionAlgorithm;
  memberIds: string[];
  selectionStartDate: string;
  selectionEndDate: string;
}): Promise<ComputedTurnOrder> {
  // Resolve member details (names and emails)
  const members = await resolveMemberDetails(
    params.stableId,
    params.organizationId,
    params.memberIds,
  );

  switch (params.algorithm) {
    case "quota_based":
      return computeQuotaBasedOrder({
        stableId: params.stableId,
        members,
        selectionStartDate: params.selectionStartDate,
        selectionEndDate: params.selectionEndDate,
      });

    case "points_balance":
      return computePointsBalanceOrder({
        stableId: params.stableId,
        members,
      });

    case "fair_rotation":
      return computeFairRotationOrder({
        stableId: params.stableId,
        members,
      });

    case "manual":
    default:
      // Manual: return members in provided order
      return {
        turns: members,
        algorithm: "manual",
        metadata: {},
      };
  }
}

// ============================================================
// Algorithm 1: Quota-Based Draft Pick
// ============================================================

async function computeQuotaBasedOrder(params: {
  stableId: string;
  members: CreateSelectionProcessMember[];
  selectionStartDate: string;
  selectionEndDate: string;
}): Promise<ComputedTurnOrder> {
  const { stableId, members, selectionStartDate, selectionEndDate } = params;

  // Sum pointsValue of all routine instances in the date range
  const startDate = Timestamp.fromDate(new Date(selectionStartDate));
  const endDate = Timestamp.fromDate(new Date(selectionEndDate));

  const instancesSnapshot = await db
    .collection("stables")
    .doc(stableId)
    .collection("routineInstances")
    .where("scheduledDate", ">=", startDate)
    .where("scheduledDate", "<=", endDate)
    .where("assignmentType", "==", "unassigned")
    .get();

  let totalAvailablePoints = 0;
  for (const doc of instancesSnapshot.docs) {
    const data = doc.data();
    totalAvailablePoints += data.pointsValue ?? 0;
  }

  const quotaPerMember =
    members.length > 0
      ? Math.round((totalAvailablePoints / members.length) * 10) / 10
      : 0;

  // Get last completed history for this stable
  const history = await getLastCompletedHistory(stableId);

  let orderedMembers: CreateSelectionProcessMember[];
  let previousProcessId: string | undefined;
  let previousProcessName: string | undefined;

  if (history) {
    // Reverse the order from last time
    previousProcessId = history.processId;
    previousProcessName = history.processName;

    const lastOrder = history.finalTurnOrder;
    const lastOrderUserIds = lastOrder
      .sort((a, b) => a.order - b.order)
      .map((t) => t.userId);

    // Reverse and map to current members
    const reversedIds = [...lastOrderUserIds].reverse();
    const memberMap = new Map(members.map((m) => [m.userId, m]));

    // Start with reversed members that still exist
    orderedMembers = [];
    for (const userId of reversedIds) {
      const member = memberMap.get(userId);
      if (member) {
        orderedMembers.push(member);
        memberMap.delete(userId);
      }
    }
    // Append new members at end (alphabetical)
    const remaining = [...memberMap.values()].sort((a, b) =>
      a.userName.localeCompare(b.userName, "sv"),
    );
    orderedMembers.push(...remaining);
  } else {
    // No history: sort alphabetically
    orderedMembers = [...members].sort((a, b) =>
      a.userName.localeCompare(b.userName, "sv"),
    );
  }

  return {
    turns: orderedMembers,
    algorithm: "quota_based",
    metadata: {
      quotaPerMember,
      totalAvailablePoints,
      previousProcessId,
      previousProcessName,
    },
  };
}

// ============================================================
// Algorithm 2: Points Balance
// ============================================================

async function computePointsBalanceOrder(params: {
  stableId: string;
  members: CreateSelectionProcessMember[];
}): Promise<ComputedTurnOrder> {
  const { stableId, members } = params;

  // Defensive: Early return if no members
  if (members.length === 0) {
    return {
      turns: [],
      algorithm: "points_balance",
      metadata: { memberPointsMap: {} },
    };
  }

  // Get stable's memoryHorizonDays from stable doc
  const stableDoc = await db.collection("stables").doc(stableId).get();
  const stableData = stableDoc.data();
  const memoryHorizonDays = stableData?.pointsSystem?.memoryHorizonDays ?? 90;

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - memoryHorizonDays);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  // Query completed routine instances for points aggregation
  const instancesSnapshot = await db
    .collection("stables")
    .doc(stableId)
    .collection("routineInstances")
    .where("status", "==", "completed")
    .where("completedAt", ">=", cutoffTimestamp)
    .get();

  // Initialize ALL members with 0 points explicitly
  const pointsMap: Record<string, number> = {};
  for (const member of members) {
    pointsMap[member.userId] = 0; // Explicitly set to 0, not null/undefined
  }

  // Add points from completed instances
  for (const doc of instancesSnapshot.docs) {
    const data = doc.data();
    const completedBy = data.completedBy as string | undefined;

    // Only count points for members in our list
    if (completedBy && completedBy in pointsMap) {
      const points = data.pointsAwarded ?? data.pointsValue ?? 0;
      pointsMap[completedBy] = (pointsMap[completedBy] ?? 0) + points;
    }
  }

  // Sort members by points (defensive: ensure no undefined/null values)
  const orderedMembers = [...members].sort((a, b) => {
    const pointsA = pointsMap[a.userId] ?? 0;
    const pointsB = pointsMap[b.userId] ?? 0;
    const pointsDiff = pointsA - pointsB;

    if (pointsDiff !== 0) return pointsDiff;
    return a.userName.localeCompare(b.userName, "sv");
  });

  // Defensive validation: ensure all members are in result
  if (orderedMembers.length !== members.length) {
    console.error(
      `Point balance ordering mismatch: input=${members.length}, output=${orderedMembers.length}`,
    );
  }

  return {
    turns: orderedMembers,
    algorithm: "points_balance",
    metadata: {
      memberPointsMap: pointsMap,
    },
  };
}

// ============================================================
// Algorithm 3: Fair Rotation (Round-Robin)
// ============================================================

async function computeFairRotationOrder(params: {
  stableId: string;
  members: CreateSelectionProcessMember[];
}): Promise<ComputedTurnOrder> {
  const { stableId, members } = params;

  // Get last completed history for this stable
  const history = await getLastCompletedHistory(stableId);

  let orderedMembers: CreateSelectionProcessMember[];
  let previousProcessId: string | undefined;
  let previousProcessName: string | undefined;

  if (history) {
    previousProcessId = history.processId;
    previousProcessName = history.processName;

    const lastOrder = history.finalTurnOrder
      .sort((a, b) => a.order - b.order)
      .map((t) => t.userId);

    const memberMap = new Map(members.map((m) => [m.userId, m]));

    // Shift by 1: second person becomes first, first goes to end
    const shiftedIds = [...lastOrder.slice(1), lastOrder[0]!];

    // Map to current members, filtering out removed members
    orderedMembers = [];
    for (const userId of shiftedIds) {
      const member = memberMap.get(userId);
      if (member) {
        orderedMembers.push(member);
        memberMap.delete(userId);
      }
    }

    // Append new members at end (alphabetical)
    const remaining = [...memberMap.values()].sort((a, b) =>
      a.userName.localeCompare(b.userName, "sv"),
    );
    orderedMembers.push(...remaining);
  } else {
    // No history: sort alphabetically
    orderedMembers = [...members].sort((a, b) =>
      a.userName.localeCompare(b.userName, "sv"),
    );
  }

  return {
    turns: orderedMembers,
    algorithm: "fair_rotation",
    metadata: {
      previousProcessId,
      previousProcessName,
    },
  };
}

// ============================================================
// History Helpers
// ============================================================

/**
 * Get the last completed selection process history for a stable
 */
export async function getLastCompletedHistory(
  stableId: string,
): Promise<SelectionProcessHistory | null> {
  const snapshot = await db
    .collection("selectionProcessHistory")
    .where("stableId", "==", stableId)
    .orderBy("completedAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0]!;
  return { id: doc.id, ...doc.data() } as SelectionProcessHistory;
}

/**
 * Save selection process history when a process completes
 * Called from the complete-turn endpoint when processCompleted = true
 */
export async function saveSelectionProcessHistory(
  process: SelectionProcess & { id: string },
): Promise<string> {
  // Read selections subcollection to calculate totalPointsPicked per member
  const selectionsSnapshot = await db
    .collection("selectionProcesses")
    .doc(process.id)
    .collection("selections")
    .get();

  // Aggregate points per user from selections
  const userPointsMap: Record<string, number> = {};
  for (const doc of selectionsSnapshot.docs) {
    const data = doc.data();
    const userId = data.selectedBy as string;
    if (!userPointsMap[userId]) userPointsMap[userId] = 0;
    userPointsMap[userId] += data.pointsValue ?? 0;
  }

  // Build final turn order from process turns
  const finalTurnOrder: SelectionHistoryTurn[] = process.turns.map((turn) => ({
    userId: turn.userId,
    userName: turn.userName,
    order: turn.order,
    selectionsCount: turn.selectionsCount,
    totalPointsPicked: userPointsMap[turn.userId] ?? 0,
  }));

  const historyData: Omit<SelectionProcessHistory, "id"> = {
    organizationId: process.organizationId,
    stableId: process.stableId,
    processId: process.id,
    processName: process.name,
    algorithm: process.algorithm ?? "manual",
    finalTurnOrder,
    completedAt: Timestamp.now(),
  };

  const docRef = await db
    .collection("selectionProcessHistory")
    .add(historyData);
  return docRef.id;
}

// ============================================================
// Member Resolution Helper
// ============================================================

/**
 * Resolve member details (name, email) from member IDs
 * Uses organizationMembers collection + stable owner fallback
 */
async function resolveMemberDetails(
  stableId: string,
  organizationId: string,
  memberIds: string[],
): Promise<CreateSelectionProcessMember[]> {
  // Get stable to check owner
  const stableDoc = await db.collection("stables").doc(stableId).get();
  const stableData = stableDoc.data();
  const ownerId = stableData?.ownerId;

  const memberMap = new Map<
    string,
    { firstName?: string; lastName?: string; userEmail?: string }
  >();

  // 1. Batch-fetch ALL memberIds from organizationMembers
  // organizationMembers doc ID = {userId}_{organizationId}
  const orgMemberRefs = memberIds.map((userId) =>
    db.collection("organizationMembers").doc(`${userId}_${organizationId}`),
  );
  const orgMemberDocs = await db.getAll(...orgMemberRefs);
  for (const doc of orgMemberDocs) {
    if (doc.exists) {
      const data = doc.data()!;
      const userId = data.userId as string;
      memberMap.set(userId, {
        firstName: data.firstName,
        lastName: data.lastName,
        userEmail: data.userEmail ?? data.email,
      });
    }
  }

  // 2. Check owner as fallback
  if (ownerId && memberIds.includes(ownerId) && !memberMap.has(ownerId)) {
    const ownerDoc = await db.collection("users").doc(ownerId).get();
    if (ownerDoc.exists) {
      const ownerData = ownerDoc.data()!;
      memberMap.set(ownerId, {
        firstName: ownerData.firstName,
        lastName: ownerData.lastName,
        userEmail: ownerData.email,
      });
    }
  }

  // 3. Build result - NEVER silently drop members
  const members: CreateSelectionProcessMember[] = [];
  for (const userId of memberIds) {
    const memberData = memberMap.get(userId);
    const name = memberData
      ? `${memberData.firstName ?? ""} ${memberData.lastName ?? ""}`.trim() ||
        memberData.userEmail ||
        userId
      : userId; // Fallback to userId if no data found anywhere
    members.push({
      userId,
      userName: name,
      userEmail: memberData?.userEmail || "",
    });
  }

  return members;
}
