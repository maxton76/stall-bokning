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
  organizationId: string;
  createdBy: string;
  status: BulkImportJobStatus;
  members: BulkImportMember[];
  progress: BulkImportProgress;
  results: BulkImportResult[];
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
