import { Timestamp } from "firebase/firestore";
import type {
  VaccinationRecord,
  VaccinationStatusResult,
  VaccinationStatus,
  HorseVaccinationAssignment,
} from "@shared/types/vaccination";
import type { Horse } from "@/types/roles";
import type { VaccinationRule } from "@shared/types/organization";
import { toDate } from "@/utils/timestampUtils";
import { apiClient } from "@/lib/apiClient";

/**
 * Vaccination Service
 * Manages vaccination records and status calculations for horses
 */

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new vaccination record
 */
export async function createVaccinationRecord(
  data: Omit<VaccinationRecord, "id" | "createdAt" | "updatedAt">,
): Promise<VaccinationRecord> {
  try {
    return await apiClient.post<VaccinationRecord>(
      "/vaccination-records",
      data,
    );
  } catch (error) {
    console.error("Error creating vaccination record:", error);
    throw new Error("Failed to create vaccination record");
  }
}

/**
 * Update an existing vaccination record
 */
export async function updateVaccinationRecord(
  id: string,
  updates: Partial<VaccinationRecord>,
): Promise<void> {
  try {
    await apiClient.put(`/vaccination-records/${id}`, updates);
  } catch (error) {
    console.error("Error updating vaccination record:", error);
    throw new Error("Failed to update vaccination record");
  }
}

/**
 * Delete a vaccination record
 */
export async function deleteVaccinationRecord(id: string): Promise<void> {
  try {
    await apiClient.delete(`/vaccination-records/${id}`);
  } catch (error) {
    console.error("Error deleting vaccination record:", error);
    throw new Error("Failed to delete vaccination record");
  }
}

/**
 * Get all vaccination records for a specific horse
 */
export async function getHorseVaccinationRecords(
  horseId: string,
): Promise<VaccinationRecord[]> {
  try {
    const response = await apiClient.get<{ records: VaccinationRecord[] }>(
      `/vaccination-records/horse/${horseId}`,
    );

    return response.records;
  } catch (error) {
    console.error("Error fetching horse vaccination records:", error);
    throw new Error("Failed to fetch vaccination records");
  }
}

/**
 * Get all vaccination records for an organization
 */
export async function getOrganizationVaccinationRecords(
  organizationId: string,
): Promise<VaccinationRecord[]> {
  try {
    const response = await apiClient.get<{ records: VaccinationRecord[] }>(
      `/vaccination-records/organization/${organizationId}`,
    );

    return response.records;
  } catch (error) {
    console.error("Error fetching organization vaccination records:", error);
    throw new Error("Failed to fetch vaccination records");
  }
}

// ============================================================================
// Status Calculation
// ============================================================================

/**
 * Get vaccination status for a horse
 * Returns real-time status based on vaccination records and rules
 */
export async function getVaccinationStatus(
  horse: Horse,
): Promise<VaccinationStatusResult> {
  // No rule assigned
  if (!horse.vaccinationRuleId) {
    return {
      status: "no_rule",
      message: "No vaccination rule assigned",
    };
  }

  // Rule assigned but no records
  if (!horse.lastVaccinationDate) {
    return {
      status: "no_records",
      message: "Vaccination due - no records found",
      vaccinationRuleName: horse.vaccinationRuleName,
    };
  }

  // Calculate days until due
  const today = new Date();
  const nextDue = toDate(horse.nextVaccinationDue!);
  if (!nextDue) {
    return {
      status: "no_records",
      message: "Invalid next due date",
      vaccinationRuleName: horse.vaccinationRuleName,
    };
  }
  const daysUntilDue = Math.ceil(
    (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Status determination
  if (daysUntilDue < 0) {
    return {
      status: "expired",
      message: `Vaccination overdue by ${Math.abs(daysUntilDue)} days`,
      daysUntilDue,
      lastVaccinationDate: horse.lastVaccinationDate,
      nextDueDate: horse.nextVaccinationDue,
      vaccinationRuleName: horse.vaccinationRuleName,
    };
  } else if (daysUntilDue <= 30) {
    return {
      status: "expiring_soon",
      message: `Vaccination due in ${daysUntilDue} days`,
      daysUntilDue,
      lastVaccinationDate: horse.lastVaccinationDate,
      nextDueDate: horse.nextVaccinationDue,
      vaccinationRuleName: horse.vaccinationRuleName,
    };
  } else {
    return {
      status: "current",
      message: `Vaccination current - next due in ${daysUntilDue} days`,
      daysUntilDue,
      lastVaccinationDate: horse.lastVaccinationDate,
      nextDueDate: horse.nextVaccinationDue,
      vaccinationRuleName: horse.vaccinationRuleName,
    };
  }
}

/**
 * Check if a horse's vaccination is current
 */
export async function isVaccinationCurrent(horse: Horse): Promise<boolean> {
  const status = await getVaccinationStatus(horse);
  return status.status === "current";
}

/**
 * Get days until next vaccination is due
 * Returns null if no vaccination rule or records
 * Returns negative number if overdue
 */
export async function getDaysUntilVaccinationDue(
  horse: Horse,
): Promise<number | null> {
  const status = await getVaccinationStatus(horse);
  return status.daysUntilDue ?? null;
}

/**
 * Calculate next due date based on vaccination date and rule
 */
export function calculateNextDueDate(
  vaccinationDate: Timestamp,
  rule: VaccinationRule,
): Timestamp {
  const date = toDate(vaccinationDate);
  if (!date) {
    throw new Error("Invalid vaccination date");
  }

  // Add period months
  date.setMonth(date.getMonth() + rule.periodMonths);

  // Add period days
  date.setDate(date.getDate() + rule.periodDays);

  return Timestamp.fromDate(date);
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Update horse's cached vaccination fields
 * Should be called after any vaccination record changes
 * Now uses backend API instead of direct Firestore operations
 */
export async function updateHorseVaccinationCache(
  horseId: string,
): Promise<void> {
  try {
    await apiClient.post(`/vaccination-records/horse/${horseId}/update-cache`);
  } catch (error) {
    console.error("Error updating horse vaccination cache:", error);
    // Don't throw - cache update failures shouldn't block operations
  }
}

/**
 * Get horses with vaccinations expiring soon
 * Now uses backend API instead of direct Firestore queries
 */
export async function getExpiringSoon(
  organizationId: string,
  days: number = 30,
): Promise<Horse[]> {
  try {
    const response = await apiClient.get<{ horses: Horse[] }>(
      "/horses/expiring-vaccinations",
      { days: days.toString() },
    );

    return response.horses;
  } catch (error) {
    console.error("Error fetching expiring vaccinations:", error);
    throw new Error("Failed to fetch expiring vaccinations");
  }
}

// ============================================================================
// Multiple Vaccination Rule Assignment System (New)
// ============================================================================

/**
 * Response type for vaccination rule assignments
 */
export interface VaccinationRuleAssignmentsResponse {
  assignments: HorseVaccinationAssignment[];
  count: number;
  aggregateStatus: VaccinationStatus;
  nextVaccinationDue: string | null;
  lastVaccinationDate: string | null;
}

/**
 * Response type for assigning a vaccination rule
 */
export interface AssignVaccinationRuleResponse {
  success: boolean;
  assignment: HorseVaccinationAssignment;
  totalAssignments: number;
  aggregateStatus: VaccinationStatus;
  nextVaccinationDue: string | null;
}

/**
 * Response type for removing a vaccination rule
 */
export interface RemoveVaccinationRuleResponse {
  success: boolean;
  remainingAssignments: number;
  aggregateStatus: VaccinationStatus;
  nextVaccinationDue: string | null;
}

/**
 * Get all vaccination rules assigned to a horse
 */
export async function getHorseVaccinationRuleAssignments(
  horseId: string,
): Promise<VaccinationRuleAssignmentsResponse> {
  try {
    return await apiClient.get<VaccinationRuleAssignmentsResponse>(
      `/horses/${horseId}/vaccination-rules`,
    );
  } catch (error) {
    console.error("Error fetching horse vaccination rule assignments:", error);
    throw new Error("Failed to fetch vaccination rule assignments");
  }
}

/**
 * Assign a vaccination rule to a horse
 */
export async function assignVaccinationRule(
  horseId: string,
  ruleId: string,
): Promise<AssignVaccinationRuleResponse> {
  try {
    return await apiClient.post<AssignVaccinationRuleResponse>(
      `/horses/${horseId}/vaccination-rules`,
      { ruleId },
    );
  } catch (error) {
    console.error("Error assigning vaccination rule to horse:", error);
    throw new Error("Failed to assign vaccination rule");
  }
}

/**
 * Remove a vaccination rule assignment from a horse
 */
export async function removeVaccinationRule(
  horseId: string,
  ruleId: string,
): Promise<RemoveVaccinationRuleResponse> {
  try {
    return await apiClient.delete<RemoveVaccinationRuleResponse>(
      `/horses/${horseId}/vaccination-rules/${ruleId}`,
    );
  } catch (error) {
    console.error("Error removing vaccination rule from horse:", error);
    throw new Error("Failed to remove vaccination rule");
  }
}

/**
 * Force recalculation of vaccination statuses for a horse
 */
export async function recalculateVaccinationStatus(
  horseId: string,
): Promise<void> {
  try {
    await apiClient.post(`/horses/${horseId}/vaccination-rules/recalculate`);
  } catch (error) {
    console.error("Error recalculating vaccination status:", error);
    throw new Error("Failed to recalculate vaccination status");
  }
}
