import { Timestamp } from "firebase/firestore";
/**
 * Vaccination record for a horse
 * Tracks individual vaccination events with veterinary details
 */
export interface VaccinationRecord {
  id: string;
  organizationId: string;
  horseId: string;
  horseName: string;
  vaccinationRuleId: string;
  vaccinationRuleName: string;
  vaccinationDate: Timestamp;
  nextDueDate: Timestamp;
  veterinarianName?: string;
  vaccineProduct?: string;
  batchNumber?: string;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  lastModifiedBy: string;
}
/**
 * Vaccination status enum
 * Represents the current vaccination compliance status for a horse
 */
export type VaccinationStatus =
  | "current"
  | "expiring_soon"
  | "expired"
  | "no_rule"
  | "no_records";
/**
 * Vaccination status result with details
 * Returned by status calculation functions for UI display
 */
export interface VaccinationStatusResult {
  status: VaccinationStatus;
  message: string;
  daysUntilDue?: number;
  lastVaccinationDate?: Timestamp;
  nextDueDate?: Timestamp;
  vaccinationRuleName?: string;
}
//# sourceMappingURL=vaccination.d.ts.map
