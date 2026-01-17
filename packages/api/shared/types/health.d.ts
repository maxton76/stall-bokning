import type { Timestamp } from "firebase/firestore";
/**
 * Health record types for horse medical history tracking
 */
/**
 * Types of health records
 */
export type HealthRecordType =
  | "veterinary"
  | "farrier"
  | "dental"
  | "medication"
  | "injury"
  | "deworming"
  | "other";
/**
 * Medication entry within a health record
 */
export interface MedicationEntry {
  name: string;
  dosage: string;
  frequency?: string;
  startDate?: Timestamp;
  endDate?: Timestamp;
  administeredBy?: string;
  notes?: string;
}
/**
 * Health record document structure
 * Stored as subcollection: horses/{horseId}/healthRecords/{recordId}
 */
export interface HealthRecord {
  id: string;
  horseId: string;
  horseName?: string;
  recordType: HealthRecordType;
  title: string;
  date: Timestamp;
  provider?: string;
  providerContactId?: string;
  clinic?: string;
  diagnosis?: string;
  treatment?: string;
  medications?: MedicationEntry[];
  symptoms?: string;
  findings?: string;
  cost?: number;
  currency?: string;
  followUpDate?: Timestamp;
  followUpNotes?: string;
  requiresFollowUp?: boolean;
  attachments?: HealthRecordAttachment[];
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  lastModifiedBy: string;
}
/**
 * Attachment reference for health records
 */
export interface HealthRecordAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Timestamp;
}
/**
 * Health record summary for list views
 */
export interface HealthRecordSummary {
  id: string;
  recordType: HealthRecordType;
  title: string;
  date: Timestamp;
  provider?: string;
  requiresFollowUp?: boolean;
  followUpDate?: Timestamp;
}
/**
 * Health record filter options
 */
export interface HealthRecordFilters {
  recordType?: HealthRecordType;
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  provider?: string;
  requiresFollowUp?: boolean;
}
/**
 * Health record creation input
 */
export interface CreateHealthRecordInput {
  horseId: string;
  recordType: HealthRecordType;
  title: string;
  date: Timestamp | Date;
  provider?: string;
  providerContactId?: string;
  clinic?: string;
  diagnosis?: string;
  treatment?: string;
  medications?: Omit<MedicationEntry, "startDate" | "endDate">[];
  symptoms?: string;
  findings?: string;
  cost?: number;
  currency?: string;
  followUpDate?: Timestamp | Date;
  followUpNotes?: string;
  requiresFollowUp?: boolean;
  notes?: string;
}
/**
 * Health record update input
 */
export interface UpdateHealthRecordInput {
  recordType?: HealthRecordType;
  title?: string;
  date?: Timestamp | Date;
  provider?: string;
  providerContactId?: string;
  clinic?: string;
  diagnosis?: string;
  treatment?: string;
  medications?: MedicationEntry[];
  symptoms?: string;
  findings?: string;
  cost?: number;
  currency?: string;
  followUpDate?: Timestamp | Date;
  followUpNotes?: string;
  requiresFollowUp?: boolean;
  notes?: string;
}
/**
 * Health statistics for a horse
 */
export interface HorseHealthStats {
  totalRecords: number;
  lastVeterinaryVisit?: Timestamp;
  lastFarrierVisit?: Timestamp;
  lastDentalVisit?: Timestamp;
  lastDewormingDate?: Timestamp;
  upcomingFollowUps: number;
  totalCostThisYear?: number;
}
//# sourceMappingURL=health.d.ts.map
