import type { Timestamp } from "firebase/firestore";

/**
 * Invoice Dispute Types
 * Supports dispute creation, resolution tracking, and communication.
 * All monetary amounts stored in ore (1 SEK = 100 ore) as integers.
 */

/**
 * Dispute status lifecycle
 * - open: Dispute filed, awaiting review
 * - under_review: Admin is investigating the dispute
 * - resolved: Dispute has been resolved (see resolutionType)
 * - rejected: Dispute was rejected with explanation
 */
export type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";

/**
 * How the dispute was resolved
 * - credit_note: A credit note was issued
 * - adjustment: Invoice was adjusted
 * - explanation: Clarification provided, no financial change
 * - refund: Payment was refunded
 * - other: Other resolution
 */
export type DisputeResolutionType =
  | "credit_note"
  | "adjustment"
  | "explanation"
  | "refund"
  | "other";

/**
 * Dispute document
 * Tracks a customer dispute against an invoice.
 * Stored in: disputes/{id}
 */
export interface Dispute {
  id: string;
  organizationId: string;
  invoiceId: string;
  invoiceNumber: string; // Denormalized for display

  // Contact information (denormalized)
  contactId: string;
  contactName: string;
  contactEmail: string;

  // Dispute details
  status: DisputeStatus;
  subject: string;
  description: string;

  // Resolution
  resolutionType?: DisputeResolutionType;
  resolutionNotes?: string;
  /** Credit note ID if resolution created a credit note */
  creditNoteId?: string;
  /** Refund ID if resolution created a refund */
  refundId?: string;

  // Assignment
  /** Admin user ID assigned to handle this dispute */
  assignedTo?: string;
  /** User ID of admin who resolved the dispute */
  resolvedBy?: string;
  resolvedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

/**
 * Dispute message — threaded communication on a dispute
 * Stored in: disputes/{disputeId}/messages/{id}
 */
export interface DisputeMessage {
  id: string;
  disputeId: string;

  // Author
  authorId: string;
  authorName: string;
  authorRole: "member" | "admin";

  // Content
  message: string;
  attachments?: DisputeAttachment[];

  // Metadata
  createdAt: Timestamp;
}

/**
 * File attachment on a dispute message
 */
export interface DisputeAttachment {
  name: string;
  url: string;
  /** MIME type (e.g., "application/pdf", "image/png") */
  type: string;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateDisputeData {
  invoiceId: string;
  subject: string;
  description: string;
}

export interface ResolveDisputeData {
  resolutionType: DisputeResolutionType;
  resolutionNotes: string;
  /** Credit note ID if a credit note was created as part of resolution */
  creditNoteId?: string;
  /** Refund ID if a refund was issued as part of resolution */
  refundId?: string;
}

export interface CreateDisputeMessageData {
  message: string;
  attachments?: DisputeAttachment[];
}
