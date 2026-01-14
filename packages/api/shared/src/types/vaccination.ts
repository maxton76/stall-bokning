import { Timestamp } from "firebase/firestore";

/**
 * Vaccination record for a horse
 * Tracks individual vaccination events with veterinary details
 */
export interface VaccinationRecord {
  id: string;
  organizationId: string; // For org-scoped queries
  horseId: string; // Links to horses collection
  horseName: string; // Cached for display

  // Vaccination details
  vaccinationRuleId: string; // Links to vaccination rule
  vaccinationRuleName: string; // Cached for display
  vaccinationDate: Timestamp; // When vaccination was administered
  nextDueDate: Timestamp; // Calculated: vaccinationDate + rule.period

  // Veterinary details
  veterinarianName?: string;
  vaccineProduct?: string; // Vaccine brand/product name
  batchNumber?: string; // Vaccine batch/lot number
  notes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string; // userId who created record
  updatedAt: Timestamp;
  lastModifiedBy: string;
}

/**
 * Vaccination status enum
 * Represents the current vaccination compliance status for a horse
 */
export type VaccinationStatus =
  | "current" // Up to date - next vaccination not due yet
  | "expiring_soon" // Due within 30 days - warning state
  | "expired" // Overdue - vaccination needed immediately
  | "no_rule" // No vaccination rule assigned to horse
  | "no_records"; // Rule assigned but no vaccination records exist

/**
 * Vaccination status result with details
 * Returned by status calculation functions for UI display
 */
export interface VaccinationStatusResult {
  status: VaccinationStatus;
  message: string; // Human-readable status message
  daysUntilDue?: number; // Days until next vaccination (negative if overdue)
  lastVaccinationDate?: Timestamp;
  nextDueDate?: Timestamp;
  vaccinationRuleName?: string;
}
