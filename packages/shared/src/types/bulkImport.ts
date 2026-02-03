import type { Timestamp } from "firebase/firestore";
import type { OrganizationRole } from "./organization.js";

/**
 * Bulk Import Job status
 */
export type BulkImportJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/**
 * Individual member data for bulk import
 */
export interface BulkImportMember {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  roles: OrganizationRole[];
  primaryRole: OrganizationRole;
}

/**
 * Result of processing a single member in a bulk import
 */
export interface BulkImportResult {
  email: string;
  status: "success" | "error" | "skipped";
  type?: "existing_user" | "new_user";
  error?: string;
}

/**
 * Individual horse data for bulk import
 */
export interface BulkImportHorse {
  name: string;
  ownerEmail: string;
  ownerId: string;
  ownerName: string;
  color: string;
  currentStableId: string;
  currentStableName: string;
}

/**
 * Result of processing a single horse in a bulk import
 */
export interface BulkImportHorseResult {
  horseName: string;
  ownerEmail: string;
  status: "success" | "error";
  horseId?: string;
  error?: string;
}

/**
 * Bulk import job type discriminator
 */
export type BulkImportJobType = "members" | "horses";

/**
 * Progress tracking for bulk import jobs
 */
export interface BulkImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}

/**
 * Bulk Import Job document stored in Firestore
 */
export interface BulkImportJob {
  id: string;
  type?: BulkImportJobType;
  organizationId: string;
  createdBy: string;
  status: BulkImportJobStatus;
  members: BulkImportMember[];
  horses?: BulkImportHorse[];
  progress: BulkImportProgress;
  results: BulkImportResult[];
  horseResults?: BulkImportHorseResult[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Request body for the bulk import API endpoint
 */
export interface BulkImportRequest {
  members: BulkImportMember[];
}

/**
 * Response from the bulk import API endpoint
 */
export interface BulkImportResponse {
  jobId: string;
}

/**
 * Request body for the horse bulk import API endpoint
 */
export interface HorseBulkImportRequest {
  horses: BulkImportHorse[];
}

/**
 * Request body for resolving member emails
 */
export interface ResolveMemberEmailsRequest {
  emails: string[];
}

/**
 * Response from resolving member emails
 */
export interface ResolveMemberEmailsResponse {
  resolved: Array<{ email: string; userId: string; name: string }>;
  unresolved: string[];
}
