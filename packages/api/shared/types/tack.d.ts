import type { Timestamp } from "firebase/firestore";
/**
 * Digital tack room types for equipment inventory management
 */
/**
 * Tack item categories
 */
export type TackCategory =
  | "saddle"
  | "bridle"
  | "blanket"
  | "boots"
  | "grooming"
  | "halter"
  | "lunge"
  | "protective"
  | "rider"
  | "other";
/**
 * Equipment condition levels
 */
export type TackCondition =
  | "new"
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "needs_repair";
/**
 * Tack item document structure
 * Stored as subcollection: horses/{horseId}/tack/{tackId}
 */
export interface TackItem {
  id: string;
  horseId: string;
  horseName?: string;
  category: TackCategory;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  size?: string;
  color?: string;
  condition: TackCondition;
  conditionNotes?: string;
  lastConditionCheck?: Timestamp;
  purchaseDate?: Timestamp;
  purchasePrice?: number;
  currency?: string;
  purchasedFrom?: string;
  receiptUrl?: string;
  warrantyExpiry?: Timestamp;
  warrantyNotes?: string;
  storageLocation?: string;
  isShared?: boolean;
  lastMaintenanceDate?: Timestamp;
  nextMaintenanceDate?: Timestamp;
  maintenanceNotes?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isActive?: boolean;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  lastModifiedBy: string;
}
/**
 * Tack item summary for list views
 */
export interface TackItemSummary {
  id: string;
  category: TackCategory;
  name: string;
  brand?: string;
  condition: TackCondition;
  imageUrl?: string;
  storageLocation?: string;
  needsMaintenance?: boolean;
}
/**
 * Tack filter options
 */
export interface TackFilters {
  category?: TackCategory;
  condition?: TackCondition;
  isShared?: boolean;
  isActive?: boolean;
  needsMaintenance?: boolean;
}
/**
 * Create tack item input
 */
export interface CreateTackItemInput {
  horseId: string;
  category: TackCategory;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  size?: string;
  color?: string;
  condition: TackCondition;
  conditionNotes?: string;
  purchaseDate?: Timestamp | Date;
  purchasePrice?: number;
  currency?: string;
  purchasedFrom?: string;
  warrantyExpiry?: Timestamp | Date;
  warrantyNotes?: string;
  storageLocation?: string;
  isShared?: boolean;
  nextMaintenanceDate?: Timestamp | Date;
  maintenanceNotes?: string;
}
/**
 * Update tack item input
 */
export interface UpdateTackItemInput {
  name?: string;
  description?: string;
  brand?: string;
  model?: string;
  size?: string;
  color?: string;
  condition?: TackCondition;
  conditionNotes?: string;
  purchaseDate?: Timestamp | Date;
  purchasePrice?: number;
  currency?: string;
  purchasedFrom?: string;
  warrantyExpiry?: Timestamp | Date;
  warrantyNotes?: string;
  storageLocation?: string;
  isShared?: boolean;
  nextMaintenanceDate?: Timestamp | Date;
  maintenanceNotes?: string;
  isActive?: boolean;
}
/**
 * Tack inventory statistics
 */
export interface TackInventoryStats {
  totalItems: number;
  totalValue: number;
  itemsByCategory: Record<TackCategory, number>;
  needsMaintenanceCount: number;
  poorConditionCount: number;
}
/**
 * Helper to get display name for a tack category
 */
export declare function getTackCategoryDisplayName(
  category: TackCategory,
  locale?: "en" | "sv",
): string;
/**
 * Helper to get display name for condition
 */
export declare function getTackConditionDisplayName(
  condition: TackCondition,
  locale?: "en" | "sv",
): string;
/**
 * Get condition color for UI
 */
export declare function getTackConditionColor(condition: TackCondition): string;
//# sourceMappingURL=tack.d.ts.map
