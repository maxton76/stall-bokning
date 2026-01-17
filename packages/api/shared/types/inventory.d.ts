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
  feedTypeId: string;
  feedTypeName: string;
  feedTypeCategory?: string;
  currentQuantity: number;
  unit: string;
  minimumStockLevel: number;
  reorderPoint: number;
  reorderQuantity?: number;
  status: InventoryStatus;
  supplierContactId?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  unitCost?: number;
  currency: string;
  lastPurchaseDate?: Timestamp;
  lastPurchasePrice?: number;
  storageLocation?: string;
  batchNumber?: string;
  expirationDate?: Timestamp;
  notes?: string;
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
  estimatedDaysRemaining?: number;
  totalValue?: number;
  isExpiringSoon?: boolean;
}
/**
 * Inventory Transaction
 * Audit log for all inventory changes
 * Stored in: inventoryTransactions/{id}
 */
export interface InventoryTransaction {
  id: string;
  inventoryId: string;
  stableId: string;
  organizationId?: string;
  type: InventoryTransactionType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  relatedActivityId?: string;
  relatedActivityTitle?: string;
  relatedHorseId?: string;
  relatedHorseName?: string;
  unitCost?: number;
  totalCost?: number;
  invoiceNumber?: string;
  invoiceId?: string;
  reason?: string;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
  createdByName?: string;
}
/**
 * Inventory Transaction for display in UI
 */
export interface InventoryTransactionDisplay extends Omit<
  InventoryTransaction,
  "createdAt"
> {
  createdAt: Date;
  quantityDisplay: string;
  typeDisplay: string;
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
  alertType: "low-stock" | "out-of-stock" | "expiring-soon";
  feedTypeName: string;
  currentQuantity: number;
  minimumStockLevel: number;
  unit: string;
  supplierContactId?: string;
  supplierName?: string;
  supplierPhone?: string;
  isAcknowledged: boolean;
  acknowledgedAt?: Timestamp;
  acknowledgedBy?: string;
  isResolved: boolean;
  resolvedAt?: Timestamp;
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
  severity: "warning" | "critical";
  shortageAmount: number;
}
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
  quantity: number;
  relatedActivityId?: string;
  relatedHorseId?: string;
  notes?: string;
}
export interface CreateAdjustmentData {
  newQuantity: number;
  reason: string;
  notes?: string;
}
export interface CreateWasteData {
  quantity: number;
  reason: string;
  notes?: string;
}
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
  feedTypeBreakdown: {
    feedTypeId: string;
    feedTypeName: string;
    feedTypeCategory: string;
    totalQuantity: number;
    unit: string;
    estimatedCost: number;
    usageCount: number;
  }[];
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
  totalQuantity: number;
  totalCost: number;
  averageDailyCost: number;
  feedingCompletionRate: number;
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
//# sourceMappingURL=inventory.d.ts.map
