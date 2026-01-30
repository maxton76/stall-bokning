/**
 * Feeding types for horse feeding management
 */

export type FeedCategory =
  | "roughage"
  | "concentrate"
  | "supplement"
  | "medicine";

export type QuantityMeasure =
  | "scoop"
  | "teaspoon"
  | "tablespoon"
  | "cup"
  | "ml"
  | "l"
  | "g"
  | "kg"
  | "custom";

/**
 * Feed type definition (e.g., "Müsli Plus", "Hay")
 * Organization-scoped configuration - shared across all stables in the organization
 */
export interface FeedType {
  id: string;
  organizationId: string;
  name: string;
  brand?: string | null;
  category: FeedCategory;
  quantityMeasure: QuantityMeasure;
  defaultQuantity: number;
  warning?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Feeding time slot definition (e.g., "morning" at 07:00)
 * Stable-scoped configuration
 */
export interface FeedingTime {
  id: string;
  stableId: string;
  name: string;
  time: string; // HH:mm format
  sortOrder: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Horse feeding assignment
 * Links a horse to a feed type at a specific feeding time
 */
export interface HorseFeeding {
  id: string;
  stableId: string;
  horseId: string;
  feedTypeId: string;
  feedingTimeId: string;
  quantity: number;
  startDate: string;
  endDate?: string;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Denormalized fields for display efficiency
  feedTypeName: string;
  feedTypeCategory: FeedCategory;
  quantityMeasure: QuantityMeasure;
  horseName: string;
  feedingTimeName: string;
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateFeedTypeData {
  name: string;
  brand?: string | null;
  category: FeedCategory;
  quantityMeasure: QuantityMeasure;
  defaultQuantity: number;
  warning?: string;
}

export interface UpdateFeedTypeData extends Partial<CreateFeedTypeData> {
  isActive?: boolean;
}

export interface CreateFeedingTimeData {
  name: string;
  time: string;
  sortOrder?: number;
}

export interface UpdateFeedingTimeData extends Partial<CreateFeedingTimeData> {
  isActive?: boolean;
}

export interface CreateHorseFeedingData {
  horseId: string;
  feedTypeId: string;
  feedingTimeId: string;
  quantity: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateHorseFeedingData extends Partial<CreateHorseFeedingData> {
  isActive?: boolean;
}
