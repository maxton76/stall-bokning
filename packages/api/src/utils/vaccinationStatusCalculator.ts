import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import type {
  VaccinationStatus,
  HorseVaccinationAssignment,
} from "@stall-bokning/shared";

/**
 * Days threshold for "expiring soon" status
 */
const EXPIRING_SOON_THRESHOLD_DAYS = 30;

/**
 * Calculate vaccination status based on next due date
 */
export function calculateVaccinationStatus(
  nextDueDate: Date | null,
): VaccinationStatus {
  if (!nextDueDate) {
    return "no_records";
  }

  const today = new Date();
  const daysUntilDue = Math.ceil(
    (nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilDue < 0) {
    return "expired";
  } else if (daysUntilDue <= EXPIRING_SOON_THRESHOLD_DAYS) {
    return "expiring_soon";
  } else {
    return "current";
  }
}

/**
 * Calculate the next due date based on vaccination date and rule period
 */
export function calculateNextDueDate(
  vaccinationDate: Date,
  periodMonths: number,
  periodDays: number,
): Date {
  const nextDue = new Date(vaccinationDate);
  nextDue.setMonth(nextDue.getMonth() + periodMonths);
  nextDue.setDate(nextDue.getDate() + periodDays);
  return nextDue;
}

/**
 * Get the worst (most urgent) vaccination status from a list of statuses
 * Priority: expired > expiring_soon > no_records > current > no_rule
 */
export function getWorstStatus(
  statuses: VaccinationStatus[],
): VaccinationStatus {
  if (statuses.length === 0) return "no_rule";

  const priority: Record<VaccinationStatus, number> = {
    expired: 1,
    expiring_soon: 2,
    no_records: 3,
    current: 4,
    no_rule: 5,
  };

  return statuses.reduce((worst, current) => {
    return priority[current] < priority[worst] ? current : worst;
  }, "no_rule" as VaccinationStatus);
}

/**
 * Get the nearest due date from a list of assignments
 */
export function getNearestDueDate(
  assignments: HorseVaccinationAssignment[],
): Date | null {
  const dueDates = assignments
    .filter((a) => a.nextDueDate)
    .map((a) =>
      a.nextDueDate instanceof Timestamp
        ? a.nextDueDate.toDate()
        : new Date(a.nextDueDate as unknown as string),
    );

  if (dueDates.length === 0) return null;

  return dueDates.reduce((nearest, current) =>
    current < nearest ? current : nearest,
  );
}

/**
 * Get the most recent vaccination date from a list of assignments
 */
export function getMostRecentVaccinationDate(
  assignments: HorseVaccinationAssignment[],
): Date | null {
  const dates = assignments
    .filter((a) => a.lastVaccinationDate)
    .map((a) =>
      a.lastVaccinationDate instanceof Timestamp
        ? a.lastVaccinationDate.toDate()
        : new Date(a.lastVaccinationDate as unknown as string),
    );

  if (dates.length === 0) return null;

  return dates.reduce((recent, current) =>
    current > recent ? current : recent,
  );
}

/**
 * Calculate status for a single vaccination rule assignment
 * based on the latest vaccination record for that rule
 */
export async function calculateAssignmentStatus(
  horseId: string,
  ruleId: string,
  rulePeriodMonths: number,
  rulePeriodDays: number,
): Promise<{
  status: VaccinationStatus;
  lastVaccinationDate: Timestamp | null;
  nextDueDate: Timestamp | null;
  latestRecordId: string | null;
}> {
  // Get the latest vaccination record for this horse and rule
  const recordsSnapshot = await db
    .collection("vaccinationRecords")
    .where("horseId", "==", horseId)
    .where("vaccinationRuleId", "==", ruleId)
    .orderBy("vaccinationDate", "desc")
    .limit(1)
    .get();

  if (recordsSnapshot.empty) {
    return {
      status: "no_records",
      lastVaccinationDate: null,
      nextDueDate: null,
      latestRecordId: null,
    };
  }

  const latestRecord = recordsSnapshot.docs[0]!;
  const recordData = latestRecord.data();
  const vaccinationDate = recordData.vaccinationDate.toDate();

  // Calculate next due date based on rule period
  const nextDue = calculateNextDueDate(
    vaccinationDate,
    rulePeriodMonths,
    rulePeriodDays,
  );
  const status = calculateVaccinationStatus(nextDue);

  return {
    status,
    lastVaccinationDate: recordData.vaccinationDate,
    nextDueDate: Timestamp.fromDate(nextDue),
    latestRecordId: latestRecord.id,
  };
}

/**
 * Recalculate vaccination status for all assignments of a horse
 * and update the horse document with aggregate status
 */
export async function recalculateHorseVaccinationStatus(
  horseId: string,
  userId: string,
): Promise<{
  assignments: any[]; // Uses admin SDK Timestamp which differs from client SDK
  aggregateStatus: VaccinationStatus;
  nearestDueDate: Date | null;
  mostRecentVaccinationDate: Date | null;
}> {
  const horseRef = db.collection("horses").doc(horseId);
  const horseDoc = await horseRef.get();

  if (!horseDoc.exists) {
    throw new Error("Horse not found");
  }

  const horse = horseDoc.data()!;
  const assignments: HorseVaccinationAssignment[] =
    horse.assignedVaccinationRules || [];

  if (assignments.length === 0) {
    // No rules assigned - update horse to reflect this
    await horseRef.update({
      assignedVaccinationRules: [],
      vaccinationRuleCount: 0,
      vaccinationStatus: "no_rule",
      lastVaccinationDate: null,
      nextVaccinationDue: null,
      updatedAt: Timestamp.now(),
      lastModifiedBy: userId,
    });

    return {
      assignments: [],
      aggregateStatus: "no_rule",
      nearestDueDate: null,
      mostRecentVaccinationDate: null,
    };
  }

  // Recalculate status for each assignment
  // Use 'any' to avoid admin SDK vs client SDK Timestamp type mismatch
  const updatedAssignments: any[] = [];

  for (const assignment of assignments) {
    const statusResult = await calculateAssignmentStatus(
      horseId,
      assignment.ruleId,
      assignment.rulePeriodMonths,
      assignment.rulePeriodDays,
    );

    updatedAssignments.push({
      ...assignment,
      status: statusResult.status,
      lastVaccinationDate: statusResult.lastVaccinationDate ?? undefined,
      nextDueDate: statusResult.nextDueDate ?? undefined,
      latestRecordId: statusResult.latestRecordId ?? undefined,
    });
  }

  // Calculate aggregate values
  const statuses = updatedAssignments.map((a) => a.status);
  const aggregateStatus = getWorstStatus(statuses);
  const nearestDueDate = getNearestDueDate(updatedAssignments);
  const mostRecentVaccinationDate =
    getMostRecentVaccinationDate(updatedAssignments);

  // Update horse document
  await horseRef.update({
    assignedVaccinationRules: updatedAssignments,
    vaccinationRuleCount: updatedAssignments.length,
    vaccinationStatus: aggregateStatus,
    lastVaccinationDate: mostRecentVaccinationDate
      ? Timestamp.fromDate(mostRecentVaccinationDate)
      : null,
    nextVaccinationDue: nearestDueDate
      ? Timestamp.fromDate(nearestDueDate)
      : null,
    updatedAt: Timestamp.now(),
    lastModifiedBy: userId,
  });

  return {
    assignments: updatedAssignments,
    aggregateStatus,
    nearestDueDate,
    mostRecentVaccinationDate,
  };
}

/**
 * Recalculate status for a specific assignment after a vaccination record change
 */
export async function updateAssignmentAfterRecordChange(
  horseId: string,
  _ruleId: string, // Kept for API compatibility but not used - we recalculate all
  userId: string,
): Promise<void> {
  // Just recalculate all assignments - simpler and ensures consistency
  await recalculateHorseVaccinationStatus(horseId, userId);
}
