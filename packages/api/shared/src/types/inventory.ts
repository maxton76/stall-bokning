import type { Timestamp } from "firebase/firestore";

/**
 * Feed Inventory Management Types
 * Tracks feed stock levels, transactions, and generates alerts
 */

/**
 * Inventory stock status
 */
export type InventoryStatus = "in-stock" | "low-stock" | "out-of-stock";

/**
 * Inventory transaction types
 * - restock: Adding new stock (purchase, delivery)
 * - usage: Deducting stock (feeding, consumption)
 * - adjustment: Manual correction (count, audit)
 * - waste: Spoiled or damaged stock
 */
export type InventoryTransactionType =
  | "restock"
  | "usage"
  | "adjustment"
  | "waste";

/**
 * Feed Inventory Item
 * Tracks stock levels for a specific feed type at a stable
 * Stored in: feedInventory/{id}
 */
export interface FeedInventory {
  id: string;
  stableId: string;
  organizationId?: string;

  // Feed type reference
  feedTypeId: string;
  feedTypeName: string; // Denormalized for display
  feedTypeCategory?: string; // Denormalized category

  // Stock levels
  currentQuantity: number; // Current stock amount
  unit: string; // Unit of measurement (kg, bags, bales, etc.)
  minimumStockLevel: number; // Trigger low-stock warning below this
  reorderPoint: number; // Suggested reorder level
  reorderQuantity?: number; // Suggested order quantity

  // Status (calculated from levels)
  status: InventoryStatus;

  // Supplier information
  supplierContactId?: string; // Reference to contact
  supplierName?: string; // Denormalized for display
  supplierPhone?: string; // Quick access for reordering
  supplierEmail?: string;

  // Cost tracking
  unitCost?: number; // Cost per unit
  currency: string; // Default: "SEK"
  lastPurchaseDate?: Timestamp;
  lastPurchasePrice?: number;

  // Storage
  storageLocation?: string; // Where stored (e.g., "Feed room", "Barn A")
  batchNumber?: string; // For tracking
  expirationDate?: Timestamp; // Best before date

  // Notes
  notes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

/**
 * Feed Inventory for display in UI
 */
export interface FeedInventoryDisplay extends Omit<
  FeedInventory,
  "lastPurchaseDate" | "expirationDate" | "createdAt" | "updatedAt"
> {
  lastPurchaseDate?: Date;
  expirationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  estimatedDaysRemaining?: number;
  totalValue?: number; // currentQuantity * unitCost
  isExpiringSoon?: boolean; // Within 30 days of expiration
}

/**
 * Inventory Transaction
 * Audit log for all inventory changes
 * Stored in: inventoryTransactions/{id}
 */
export interface InventoryTransaction {
  id: string;
  inventoryId: string; // Reference to FeedInventory
  stableId: string;
  organizationId?: string;

  // Transaction details
  type: InventoryTransactionType;
  quantity: number; // Positive for additions, negative for deductions
  previousQuantity: number; // Stock level before transaction
  newQuantity: number; // Stock level after transaction

  // References
  relatedActivityId?: string; // Activity that triggered usage
  relatedActivityTitle?: string; // Denormalized for display
  relatedHorseId?: string; // Horse if specific usage
  relatedHorseName?: string; // Denormalized

  // Cost tracking (for restocks)
  unitCost?: number;
  totalCost?: number;
  invoiceNumber?: string;
  invoiceId?: string; // Reference to invoice if tracked

  // Notes
  reason?: string; // Reason for adjustment/waste
  notes?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  createdByName?: string; // Denormalized for display
}

/**
 * Inventory Transaction for display in UI
 */
export interface InventoryTransactionDisplay extends Omit<
  InventoryTransaction,
  "createdAt"
> {
  createdAt: Date;
  // Computed fields
  quantityDisplay: string; // "+10 kg" or "-5 kg"
  typeDisplay: string; // Localized type name
}

/**
 * Low Stock Alert
 * Generated when inventory falls below minimum level
 * Stored in: inventoryAlerts/{id}
 */
export interface InventoryAlert {
  id: string;
  inventoryId: string;
  stableId: string;
  organizationId?: string;

  // Alert details
  alertType: "low-stock" | "out-of-stock" | "expiring-soon";
  feedTypeName: string;
  currentQuantity: number;
  minimumStockLevel: number;
  unit: string;

  // Supplier for quick reorder
  supplierContactId?: string;
  supplierName?: string;
  supplierPhone?: string;

  // Status
  isAcknowledged: boolean;
  acknowledgedAt?: Timestamp;
  acknowledgedBy?: string;
  isResolved: boolean;
  resolvedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
}

/**
 * Inventory Alert for display in UI
 */
export interface InventoryAlertDisplay extends Omit<
  InventoryAlert,
  "createdAt" | "acknowledgedAt" | "resolvedAt"
> {
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  // Computed fields
  severity: "warning" | "critical";
  shortageAmount: number; // How much below minimum
}

// ============================================================
// Create/Update DTOs
// ============================================================

export interface CreateFeedInventoryData {
  feedTypeId: string;
  currentQuantity: number;
  unit: string;
  minimumStockLevel: number;
  reorderPoint: number;
  reorderQuantity?: number;
  supplierContactId?: string;
  unitCost?: number;
  currency?: string;
  storageLocation?: string;
  batchNumber?: string;
  expirationDate?: string | Date;
  notes?: string;
}

export interface UpdateFeedInventoryData {
  currentQuantity?: number;
  unit?: string;
  minimumStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  supplierContactId?: string;
  unitCost?: number;
  currency?: string;
  storageLocation?: string;
  batchNumber?: string;
  expirationDate?: string | Date | null;
  notes?: string;
}

export interface CreateRestockData {
  quantity: number;
  unitCost?: number;
  invoiceNumber?: string;
  invoiceId?: string;
  notes?: string;
}

export interface CreateUsageData {
  quantity: number; // Positive number, will be deducted
  relatedActivityId?: string;
  relatedHorseId?: string;
  notes?: string;
}

export interface CreateAdjustmentData {
  newQuantity: number; // Absolute new quantity after adjustment
  reason: string; // Required for adjustments
  notes?: string;
}

export interface CreateWasteData {
  quantity: number; // Positive number, will be deducted
  reason: string; // Required: e.g., "spoiled", "damaged", "pest damage"
  notes?: string;
}

// ============================================================
// Analytics Types
// ============================================================

/**
 * Feed consumption analytics
 */
export interface FeedAnalytics {
  stableId: string;
  period: {
    start: Date;
    end: Date;
    type: "daily" | "weekly" | "monthly";
  };

  // Breakdown by feed type
  feedTypeBreakdown: {
    feedTypeId: string;
    feedTypeName: string;
    feedTypeCategory: string;
    totalQuantity: number;
    unit: string;
    estimatedCost: number;
    usageCount: number;
  }[];

  // Breakdown by horse
  horseBreakdown: {
    horseId: string;
    horseName: string;
    totalFeedings: number;
    feedTypes: {
      feedTypeId: string;
      feedTypeName: string;
      quantity: number;
      cost: number;
    }[];
    totalCost: number;
  }[];

  // Summary
  totalQuantity: number;
  totalCost: number;
  averageDailyCost: number;
  feedingCompletionRate: number; // Percentage of scheduled feedings completed
  wasteAmount: number;
  wasteCost: number;
}

/**
 * Inventory summary for dashboard
 */
export interface InventorySummary {
  stableId: string;
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  totalValue: number;
  currency: string;
  alerts: InventoryAlertDisplay[];
}
