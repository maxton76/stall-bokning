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
  horseName?: string; // Cached for display

  // Item details
  category: TackCategory;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  size?: string;
  color?: string;

  // Condition tracking
  condition: TackCondition;
  conditionNotes?: string;
  lastConditionCheck?: Timestamp;

  // Purchase information
  purchaseDate?: Timestamp;
  purchasePrice?: number;
  currency?: string; // Default: SEK
  purchasedFrom?: string;
  receiptUrl?: string; // Firebase Storage URL

  // Warranty
  warrantyExpiry?: Timestamp;
  warrantyNotes?: string;

  // Storage
  storageLocation?: string; // e.g., "Tack room shelf 3"
  isShared?: boolean; // Can be used with other horses

  // Maintenance
  lastMaintenanceDate?: Timestamp;
  nextMaintenanceDate?: Timestamp;
  maintenanceNotes?: string;

  // Image
  imageUrl?: string;
  thumbnailUrl?: string;

  // Status
  isActive?: boolean; // False = retired/sold/disposed

  // Metadata
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
export function getTackCategoryDisplayName(
  category: TackCategory,
  locale: "en" | "sv" = "en",
): string {
  const labels: Record<TackCategory, { en: string; sv: string }> = {
    saddle: { en: "Saddle", sv: "Sadel" },
    bridle: { en: "Bridle", sv: "Huvudlag" },
    blanket: { en: "Blanket/Rug", sv: "Täcke" },
    boots: { en: "Boots", sv: "Benskydd" },
    grooming: { en: "Grooming", sv: "Ryktning" },
    halter: { en: "Halter", sv: "Grimma" },
    lunge: { en: "Lunging", sv: "Longering" },
    protective: { en: "Protective Gear", sv: "Skyddsutrustning" },
    rider: { en: "Rider Equipment", sv: "Ryttarutrustning" },
    other: { en: "Other", sv: "Övrigt" },
  };

  return labels[category]?.[locale] || category;
}

/**
 * Helper to get display name for condition
 */
export function getTackConditionDisplayName(
  condition: TackCondition,
  locale: "en" | "sv" = "en",
): string {
  const labels: Record<TackCondition, { en: string; sv: string }> = {
    new: { en: "New", sv: "Ny" },
    excellent: { en: "Excellent", sv: "Utmärkt" },
    good: { en: "Good", sv: "Bra" },
    fair: { en: "Fair", sv: "Okej" },
    poor: { en: "Poor", sv: "Dålig" },
    needs_repair: { en: "Needs Repair", sv: "Behöver reparation" },
  };

  return labels[condition]?.[locale] || condition;
}

/**
 * Get condition color for UI
 */
export function getTackConditionColor(condition: TackCondition): string {
  const colors: Record<TackCondition, string> = {
    new: "green",
    excellent: "green",
    good: "blue",
    fair: "yellow",
    poor: "orange",
    needs_repair: "red",
  };

  return colors[condition] || "gray";
}
