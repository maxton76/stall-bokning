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
  horseName?: string;
  userId?: string;
  contactId?: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  percentage: number;
  role: OwnershipRole;
  startDate: Timestamp;
  endDate?: Timestamp;
  purchasePrice?: number;
  currency?: string;
  contractReference?: string;
  notes?: string;
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
  isActive: boolean;
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
  percentage: number;
  transferDate: Timestamp | Date;
  purchasePrice?: number;
  currency?: string;
  notes?: string;
}
/**
 * Helper function to validate ownership percentages
 */
export declare function validateOwnershipPercentages(
  ownerships: Pick<HorseOwnership, "percentage" | "endDate">[],
): OwnershipValidation;
//# sourceMappingURL=ownership.d.ts.map
