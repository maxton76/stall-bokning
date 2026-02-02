import type { Timestamp } from "firebase/firestore";

/**
 * Billing Group Types
 * Supports family, company, and sponsor billing consolidation.
 * Stored in: billingGroups/{id}
 */

/**
 * Relationship type between billing contact and members
 */
export type BillingGroupRelationshipType =
  | "parent"
  | "guardian"
  | "company"
  | "sponsor"
  | "other";

/**
 * Billing group — links members to a billing contact
 */
export interface BillingGroup {
  id: string;
  organizationId: string;

  /** The person who receives and pays invoices */
  billingContactId: string;
  /** Linked members whose charges roll up */
  memberIds: string[];
  /** Relationship type */
  relationshipType: BillingGroupRelationshipType;
  /** Optional display label (e.g., "Familjen Andersson") */
  label?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateBillingGroupData {
  billingContactId: string;
  memberIds: string[];
  relationshipType: BillingGroupRelationshipType;
  label?: string;
}

export interface UpdateBillingGroupData {
  billingContactId?: string;
  relationshipType?: BillingGroupRelationshipType;
  label?: string;
}
