import type { Timestamp } from "firebase/firestore";

/**
 * Line Item Types
 * Standalone billable line items with source linking and idempotency.
 * All monetary amounts stored in öre (1 SEK = 100 öre).
 * Stored in: lineItems/{id}
 */

/**
 * Source type indicating where the line item originated
 */
export type LineItemSourceType =
  | "activity"
  | "booking"
  | "recurring"
  | "manual"
  | "package_purchase"
  | "cancellation_fee"
  | "no_show_fee"
  | "reminder_fee";

/**
 * Line item status
 */
export type LineItemStatus = "pending" | "invoiced" | "credited";

/**
 * Line item — individual billable charge
 */
export interface LineItem {
  id: string;
  organizationId: string;

  /** Parent invoice ID (null if pending/unbilled) */
  invoiceId?: string;
  /** Charged member */
  memberId: string;
  /** Who pays (may differ from member for family billing) */
  billingContactId: string;

  /** Service date */
  date: Timestamp;
  /** Reference to catalog item */
  chargeableItemId?: string;
  /** Line item description */
  description: string;

  /** Quantity */
  quantity: number;
  /** Price per unit in öre */
  unitPrice: number;
  /** VAT rate percentage */
  vatRate: number;

  /** Calculated: quantity * unitPrice (öre) */
  totalExclVat: number;
  /** Calculated: VAT amount (öre) */
  totalVat: number;
  /** Calculated: total incl. VAT (öre) */
  totalInclVat: number;

  /** Source type indicating origin */
  sourceType: LineItemSourceType;
  /** Reference to source entity ID */
  sourceId?: string;
  /** Idempotency key to prevent double-billing */
  idempotencyKey: string;

  /** If deducted from klippkort instead of billed */
  packageDeductionId?: string;
  /** Which horse (for per-horse charges) */
  horseId?: string;

  /** Line item status */
  status: LineItemStatus;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateLineItemData {
  memberId: string;
  billingContactId: string;
  date: string | Date;
  chargeableItemId?: string;
  description: string;
  quantity: number;
  /** Price per unit in öre */
  unitPrice: number;
  vatRate: number;
  sourceType: LineItemSourceType;
  sourceId?: string;
  idempotencyKey: string;
  packageDeductionId?: string;
  horseId?: string;
}

export interface UpdateLineItemData {
  description?: string;
  quantity?: number;
  /** Price per unit in öre */
  unitPrice?: number;
  vatRate?: number;
  chargeableItemId?: string;
  horseId?: string;
}
