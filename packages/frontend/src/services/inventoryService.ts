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
import { authFetchJSON } from "@/utils/authFetch";

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
  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{ inventory: FeedInventory[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/stable/${stableId}${queryString}`,
    { method: "GET" },
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
    const response = await authFetchJSON<FeedInventory>(
      `${import.meta.env.VITE_API_URL}/api/v1/inventory/${inventoryId}`,
      { method: "GET" },
    );
    return response;
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
  const response = await authFetchJSON<{ id: string }>(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response;
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
  const response = await authFetchJSON<FeedInventory>(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/${inventoryId}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );

  return response;
}

/**
 * Delete an inventory item
 * @param inventoryId - Inventory item ID
 * @returns Promise that resolves when deleted
 */
export async function deleteInventoryItem(inventoryId: string): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/${inventoryId}`,
    { method: "DELETE" },
  );
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
  const response = await authFetchJSON<{
    success: boolean;
    transaction: InventoryTransaction;
    inventory: FeedInventory;
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/${inventoryId}/restock`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response;
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
  const response = await authFetchJSON<{
    success: boolean;
    transaction: InventoryTransaction;
    inventory: FeedInventory;
  }>(`${import.meta.env.VITE_API_URL}/api/v1/inventory/${inventoryId}/usage`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response;
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
  const response = await authFetchJSON<{
    success: boolean;
    transaction: InventoryTransaction;
    inventory: FeedInventory;
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/${inventoryId}/adjustment`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response;
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
  const params = new URLSearchParams();
  if (options?.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options?.type) {
    params.append("type", options.type);
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";

  const response = await authFetchJSON<{
    transactions: InventoryTransaction[];
  }>(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/${inventoryId}/transactions${queryString}`,
    { method: "GET" },
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
  const params = new URLSearchParams({
    includeResolved: includeResolved.toString(),
  });

  const response = await authFetchJSON<{ alerts: InventoryAlert[] }>(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/stable/${stableId}/alerts?${params.toString()}`,
    { method: "GET" },
  );

  return response.alerts;
}

/**
 * Acknowledge an inventory alert
 * @param alertId - Alert ID
 * @returns Promise that resolves when acknowledged
 */
export async function acknowledgeAlert(alertId: string): Promise<void> {
  await authFetchJSON(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/alerts/${alertId}/acknowledge`,
    { method: "PUT" },
  );
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
  const response = await authFetchJSON<InventorySummary>(
    `${import.meta.env.VITE_API_URL}/api/v1/inventory/stable/${stableId}/summary`,
    { method: "GET" },
  );

  return response;
}
