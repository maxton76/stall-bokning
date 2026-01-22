import type { Timestamp } from "firebase/firestore";

/**
 * Horse ownership types for multi-owner support with percentage tracking
 */

/**
 * Ownership role types
 */
export type OwnershipRole =
  | "primary"
  | "co-owner"
  | "syndicate"
  | "leaseholder";

/**
 * Horse ownership document structure
 * Stored as subcollection: horses/{horseId}/ownership/{ownershipId}
 */
export interface HorseOwnership {
  id: string;
  horseId: string;
  horseName?: string; // Cached for display

  // Owner identity - can be linked to user, contact, or external
  userId?: string; // If owner is a system user
  contactId?: string; // If owner is a contact
  ownerName: string; // Display name (required)
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAddress?: string;

  // Ownership details
  percentage: number; // 0-100, decimal allowed (e.g., 33.33)
  role: OwnershipRole;

  // Dates
  startDate: Timestamp;
  endDate?: Timestamp; // Null = active ownership

  // Financial
  purchasePrice?: number;
  currency?: string; // Default: SEK

  // Legal
  contractReference?: string; // Reference to contract document
  notes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  lastModifiedBy: string;
}

/**
 * Ownership summary for display
 */
export interface OwnershipSummary {
  id: string;
  ownerName: string;
  ownerEmail?: string;
  percentage: number;
  role: OwnershipRole;
  isActive: boolean; // endDate is null or in the future
}

/**
 * Ownership history entry for tracking changes
 */
export interface OwnershipHistoryEntry {
  id: string;
  horseId: string;
  previousOwnerId?: string;
  newOwnerId?: string;
  previousOwnerName?: string;
  newOwnerName?: string;
  changeType:
    | "purchase"
    | "sale"
    | "transfer"
    | "percentage_change"
    | "role_change";
  changeDate: Timestamp;
  percentageBefore?: number;
  percentageAfter?: number;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
}

/**
 * Validation result for ownership percentages
 */
export interface OwnershipValidation {
  isValid: boolean;
  totalPercentage: number;
  errors: string[];
  warnings: string[];
}

/**
 * Create ownership input
 */
export interface CreateOwnershipInput {
  horseId: string;
  userId?: string;
  contactId?: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  percentage: number;
  role: OwnershipRole;
  startDate: Timestamp | Date;
  endDate?: Timestamp | Date;
  purchasePrice?: number;
  currency?: string;
  contractReference?: string;
  notes?: string;
}

/**
 * Update ownership input
 */
export interface UpdateOwnershipInput {
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  percentage?: number;
  role?: OwnershipRole;
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;
  purchasePrice?: number;
  currency?: string;
  contractReference?: string;
  notes?: string;
}

/**
 * Transfer ownership input
 */
export interface TransferOwnershipInput {
  fromOwnershipId: string;
  toOwnerName: string;
  toUserId?: string;
  toContactId?: string;
  toOwnerEmail?: string;
  toOwnerPhone?: string;
  percentage: number; // Percentage being transferred
  transferDate: Timestamp | Date;
  purchasePrice?: number;
  currency?: string;
  notes?: string;
}

/**
 * Helper function to validate ownership percentages
 */
export function validateOwnershipPercentages(
  ownerships: Pick<HorseOwnership, "percentage" | "endDate">[],
): OwnershipValidation {
  const activeOwnerships = ownerships.filter((o) => !o.endDate);
  const totalPercentage = activeOwnerships.reduce(
    (sum, o) => sum + o.percentage,
    0,
  );

  const errors: string[] = [];
  const warnings: string[] = [];

  if (totalPercentage > 100) {
    errors.push(
      `Total ownership percentage (${totalPercentage}%) exceeds 100%`,
    );
  }

  if (totalPercentage < 100 && totalPercentage > 0) {
    warnings.push(
      `Total ownership percentage (${totalPercentage}%) is less than 100%`,
    );
  }

  activeOwnerships.forEach((o) => {
    if (o.percentage <= 0) {
      errors.push("Ownership percentage must be greater than 0");
    }
    if (o.percentage > 100) {
      errors.push("Individual ownership percentage cannot exceed 100%");
    }
  });

  return {
    isValid: errors.length === 0,
    totalPercentage,
    errors,
    warnings,
  };
}
