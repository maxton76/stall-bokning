import { Timestamp } from "firebase/firestore";
import type {
  VaccinationRecord,
  VaccinationStatusResult,
} from "@shared/types/vaccination";
import type { Horse } from "@/types/roles";
import type { VaccinationRule } from "@shared/types/organization";
import { toDate } from "@/utils/timestampUtils";
import { authFetchJSON } from "@/utils/authFetch";

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
    const record = await authFetchJSON<VaccinationRecord>(
      `${import.meta.env.VITE_API_URL}/api/v1/vaccination-records`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );

    return record;
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
    await authFetchJSON<VaccinationRecord>(
      `${import.meta.env.VITE_API_URL}/api/v1/vaccination-records/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      },
    );
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
    await authFetchJSON<{ success: boolean; id: string }>(
      `${import.meta.env.VITE_API_URL}/api/v1/vaccination-records/${id}`,
      {
        method: "DELETE",
      },
    );
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
    const response = await authFetchJSON<{ records: VaccinationRecord[] }>(
      `${import.meta.env.VITE_API_URL}/api/v1/vaccination-records/horse/${horseId}`,
      { method: "GET" },
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
    const response = await authFetchJSON<{ records: VaccinationRecord[] }>(
      `${import.meta.env.VITE_API_URL}/api/v1/vaccination-records/organization/${organizationId}`,
      { method: "GET" },
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
    await authFetchJSON<{ success: boolean; status: string }>(
      `${import.meta.env.VITE_API_URL}/api/v1/vaccination-records/horse/${horseId}/update-cache`,
      { method: "POST" },
    );
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
    const response = await authFetchJSON<{ horses: Horse[] }>(
      `${import.meta.env.VITE_API_URL}/api/v1/horses/expiring-vaccinations?days=${days}`,
      { method: "GET" },
    );

    return response.horses;
  } catch (error) {
    console.error("Error fetching expiring vaccinations:", error);
    throw new Error("Failed to fetch expiring vaccinations");
  }
}
