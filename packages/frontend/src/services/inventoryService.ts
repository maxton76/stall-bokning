import type {
  FeedInventory,
  InventoryTransaction,
  InventoryAlert,
  InventorySummary,
  InventoryStatus,
  CreateFeedInventoryData,
  UpdateFeedInventoryData,
  CreateRestockData,
  CreateUsageData,
  CreateAdjustmentData,
  CreateWasteData,
} from "@stall-bokning/shared";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// Inventory CRUD Operations
// ============================================================================

/**
 * Get all inventory items for a stable
 * @param stableId - Stable ID
 * @param status - Optional status filter
 * @returns Promise with inventory items
 */
export async function getStableInventory(
  stableId: string,
  status?: InventoryStatus,
): Promise<FeedInventory[]> {
  const params: Record<string, string> = {};
  if (status) {
    params.status = status;
  }

  const response = await apiClient.get<{ inventory: FeedInventory[] }>(
    `/inventory/stable/${stableId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.inventory;
}

/**
 * Get a single inventory item by ID
 * @param inventoryId - Inventory item ID
 * @returns Promise with inventory item
 */
export async function getInventoryItem(
  inventoryId: string,
): Promise<FeedInventory | null> {
  try {
    return await apiClient.get<FeedInventory>(`/inventory/${inventoryId}`);
  } catch {
    return null;
  }
}

/**
 * Create a new inventory item
 * @param data - Inventory data including stableId
 * @returns Promise with created inventory ID
 */
export async function createInventoryItem(
  data: CreateFeedInventoryData & { stableId: string },
): Promise<{ id: string }> {
  return await apiClient.post<{ id: string }>("/inventory", data);
}

/**
 * Update an inventory item
 * @param inventoryId - Inventory item ID
 * @param updates - Partial update data
 * @returns Promise with updated inventory item
 */
export async function updateInventoryItem(
  inventoryId: string,
  updates: UpdateFeedInventoryData,
): Promise<FeedInventory> {
  return await apiClient.put<FeedInventory>(
    `/inventory/${inventoryId}`,
    updates,
  );
}

/**
 * Delete an inventory item
 * @param inventoryId - Inventory item ID
 * @returns Promise that resolves when deleted
 */
export async function deleteInventoryItem(inventoryId: string): Promise<void> {
  await apiClient.delete(`/inventory/${inventoryId}`);
}

// ============================================================================
// Transaction Operations
// ============================================================================

/**
 * Record a restock transaction
 * @param inventoryId - Inventory item ID
 * @param data - Restock data
 * @returns Promise with transaction and updated inventory
 */
export async function recordRestock(
  inventoryId: string,
  data: CreateRestockData,
): Promise<{
  success: boolean;
  transaction: InventoryTransaction;
  inventory: FeedInventory;
}> {
  return await apiClient.post<{
    success: boolean;
    transaction: InventoryTransaction;
    inventory: FeedInventory;
  }>(`/inventory/${inventoryId}/restock`, data);
}

/**
 * Record a usage transaction
 * @param inventoryId - Inventory item ID
 * @param data - Usage data
 * @returns Promise with transaction and updated inventory
 */
export async function recordUsage(
  inventoryId: string,
  data: CreateUsageData,
): Promise<{
  success: boolean;
  transaction: InventoryTransaction;
  inventory: FeedInventory;
}> {
  return await apiClient.post<{
    success: boolean;
    transaction: InventoryTransaction;
    inventory: FeedInventory;
  }>(`/inventory/${inventoryId}/usage`, data);
}

/**
 * Record an adjustment transaction
 * @param inventoryId - Inventory item ID
 * @param data - Adjustment data
 * @returns Promise with transaction and updated inventory
 */
export async function recordAdjustment(
  inventoryId: string,
  data: CreateAdjustmentData,
): Promise<{
  success: boolean;
  transaction: InventoryTransaction;
  inventory: FeedInventory;
}> {
  return await apiClient.post<{
    success: boolean;
    transaction: InventoryTransaction;
    inventory: FeedInventory;
  }>(`/inventory/${inventoryId}/adjustment`, data);
}

/**
 * Get transaction history for an inventory item
 * @param inventoryId - Inventory item ID
 * @param options - Query options
 * @returns Promise with transactions
 */
export async function getInventoryTransactions(
  inventoryId: string,
  options?: { limit?: number; type?: string },
): Promise<InventoryTransaction[]> {
  const params: Record<string, string> = {};
  if (options?.limit) {
    params.limit = options.limit.toString();
  }
  if (options?.type) {
    params.type = options.type;
  }

  const response = await apiClient.get<{
    transactions: InventoryTransaction[];
  }>(
    `/inventory/${inventoryId}/transactions`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.transactions;
}

// ============================================================================
// Alerts Operations
// ============================================================================

/**
 * Get inventory alerts for a stable
 * @param stableId - Stable ID
 * @param includeResolved - Include resolved alerts
 * @returns Promise with alerts
 */
export async function getInventoryAlerts(
  stableId: string,
  includeResolved = false,
): Promise<InventoryAlert[]> {
  const response = await apiClient.get<{ alerts: InventoryAlert[] }>(
    `/inventory/stable/${stableId}/alerts`,
    { includeResolved: includeResolved.toString() },
  );

  return response.alerts;
}

/**
 * Acknowledge an inventory alert
 * @param alertId - Alert ID
 * @returns Promise that resolves when acknowledged
 */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  await apiClient.put(`/inventory/alerts/${alertId}/acknowledge`, {});
}

// ============================================================================
// Summary Operations
// ============================================================================

/**
 * Get inventory summary/dashboard data for a stable
 * @param stableId - Stable ID
 * @returns Promise with inventory summary
 */
export async function getInventorySummary(
  stableId: string,
): Promise<InventorySummary> {
  return await apiClient.get<InventorySummary>(
    `/inventory/stable/${stableId}/summary`,
  );
}
