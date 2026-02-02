import type {
  ChargeableItem,
  CreateChargeableItemData,
  UpdateChargeableItemData,
} from "@equiduty/shared";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// Chargeable Item CRUD Operations
// ============================================================================

/**
 * Get all chargeable items for an organization
 * @param organizationId - Organization ID
 * @param options - Query options (category filter, active status)
 * @returns Promise with chargeable items
 */
export async function getChargeableItems(
  organizationId: string,
  options?: { category?: string; isActive?: boolean },
): Promise<ChargeableItem[]> {
  const params: Record<string, string> = {};
  if (options?.category) {
    params.category = options.category;
  }
  if (options?.isActive !== undefined) {
    params.isActive = String(options.isActive);
  }

  const response = await apiClient.get<{ chargeableItems: ChargeableItem[] }>(
    `/organizations/${organizationId}/chargeable-items`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.chargeableItems;
}

/**
 * Get a single chargeable item by ID
 * @param organizationId - Organization ID
 * @param id - Chargeable item ID
 * @returns Promise with chargeable item
 */
export async function getChargeableItem(
  organizationId: string,
  id: string,
): Promise<ChargeableItem> {
  return await apiClient.get<ChargeableItem>(
    `/organizations/${organizationId}/chargeable-items/${id}`,
  );
}

/**
 * Create a new chargeable item
 * @param organizationId - Organization ID
 * @param data - Chargeable item data (prices in ore)
 * @returns Promise with created chargeable item
 */
export async function createChargeableItem(
  organizationId: string,
  data: CreateChargeableItemData,
): Promise<ChargeableItem> {
  return await apiClient.post<ChargeableItem>(
    `/organizations/${organizationId}/chargeable-items`,
    data,
  );
}

/**
 * Update a chargeable item
 * @param organizationId - Organization ID
 * @param id - Chargeable item ID
 * @param data - Partial update data (prices in ore)
 * @returns Promise with updated chargeable item
 */
export async function updateChargeableItem(
  organizationId: string,
  id: string,
  data: UpdateChargeableItemData,
): Promise<ChargeableItem> {
  return await apiClient.patch<ChargeableItem>(
    `/organizations/${organizationId}/chargeable-items/${id}`,
    data,
  );
}

/**
 * Delete a chargeable item
 * @param organizationId - Organization ID
 * @param id - Chargeable item ID
 * @returns Promise that resolves when deleted
 */
export async function deleteChargeableItem(
  organizationId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(
    `/organizations/${organizationId}/chargeable-items/${id}`,
  );
}
