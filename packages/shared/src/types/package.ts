import type { Timestamp } from "firebase/firestore";

/**
 * Prepaid Package (Klippkort) Types
 * Supports purchase, tracking, and deduction of prepaid lesson/service bundles.
 * All monetary amounts stored in öre (1 SEK = 100 öre).
 */

/**
 * Policy for handling expired package sessions
 */
export type PackageExpiryPolicy = "expire" | "rollover" | "partial_refund";

/**
 * Policy for mid-term cancellation refunds
 */
export type PackageCancellationPolicy =
  | "no_refund"
  | "pro_rata_unit"
  | "pro_rata_package"
  | "full_refund";

/**
 * Status of a purchased package
 */
export type MemberPackageStatus =
  | "active"
  | "expired"
  | "depleted"
  | "refunded"
  | "cancelled";

/**
 * Package definition (template)
 * Stored in: packageDefinitions/{id}
 */
export interface PackageDefinition {
  id: string;
  organizationId: string;

  /** Package name (e.g., "10-kort Hoppning") */
  name: string;
  /** Description */
  description?: string;
  /** Which chargeable item this covers */
  chargeableItemId: string;
  /** Number of sessions/uses included */
  totalUnits: number;
  /** Total package price in öre (may be discounted vs. unit price × qty) */
  price: number;

  /** Days from purchase until expiry (null = no expiry) */
  validityDays?: number;
  /** Policy for expired sessions */
  expiryPolicy: PackageExpiryPolicy;

  /** Whether sessions can be used by any member in the same billing group */
  transferableWithinGroup: boolean;
  /** Org-configurable policy for mid-term cancellations */
  cancellationPolicy: PackageCancellationPolicy;

  /** Whether this package is active for purchase */
  isActive: boolean;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Purchased package instance
 * Stored in: memberPackages/{id}
 */
export interface MemberPackage {
  id: string;
  organizationId: string;

  /** Who owns the package */
  memberId: string;
  /** Billing group that owns the package (if transferableWithinGroup) */
  billingGroupId?: string;
  /** Which package definition */
  packageDefinitionId: string;

  /** When purchased */
  purchaseDate: Timestamp;
  /** Calculated expiry date (null = no expiry) */
  expiresAt?: Timestamp;
  /** Remaining units to use */
  remainingUnits: number;
  /** Total units at purchase time */
  totalUnits: number;
  /** Package status */
  status: MemberPackageStatus;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Package deduction record — tracks usage of prepaid sessions
 * Stored in: packageDeductions/{id}
 */
export interface PackageDeduction {
  id: string;
  organizationId: string;

  /** Which purchased package was deducted from */
  memberPackageId: string;
  /** Which line item this deduction was applied to */
  lineItemId: string;
  /** Number of units deducted */
  units: number;

  /** When the deduction happened */
  deductedAt: Timestamp;
  /** Who triggered the deduction */
  deductedBy: string;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreatePackageDefinitionData {
  name: string;
  description?: string;
  chargeableItemId: string;
  totalUnits: number;
  /** Price in öre */
  price: number;
  validityDays?: number;
  expiryPolicy: PackageExpiryPolicy;
  transferableWithinGroup?: boolean;
  cancellationPolicy: PackageCancellationPolicy;
}

export interface UpdatePackageDefinitionData {
  name?: string;
  description?: string;
  chargeableItemId?: string;
  totalUnits?: number;
  /** Price in öre */
  price?: number;
  validityDays?: number;
  expiryPolicy?: PackageExpiryPolicy;
  transferableWithinGroup?: boolean;
  cancellationPolicy?: PackageCancellationPolicy;
  isActive?: boolean;
}

export interface PurchasePackageData {
  memberId: string;
  billingGroupId?: string;
}
