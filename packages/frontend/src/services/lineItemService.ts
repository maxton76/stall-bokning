import type {
  LineItem,
  CreateLineItemData,
  UpdateLineItemData,
} from "@equiduty/shared";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// Line Item CRUD Operations
// ============================================================================

/**
 * Get line items for an organization with optional filters
 * @param organizationId - Organization ID
 * @param options - Query options (memberId, status, sourceType, date range, limit)
 * @returns Promise with line items
 */
export async function getLineItems(
  organizationId: string,
  options?: {
    memberId?: string;
    status?: string;
    sourceType?: string;
    from?: string;
    to?: string;
    limit?: number;
  },
): Promise<LineItem[]> {
  const params: Record<string, string> = {};
  if (options?.memberId) params.memberId = options.memberId;
  if (options?.status) params.status = options.status;
  if (options?.sourceType) params.sourceType = options.sourceType;
  if (options?.from) params.from = options.from;
  if (options?.to) params.to = options.to;
  if (options?.limit) params.limit = String(options.limit);

  const response = await apiClient.get<{ lineItems: LineItem[] }>(
    `/organizations/${organizationId}/line-items`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.lineItems;
}

/**
 * Create a new line item
 * @param organizationId - Organization ID
 * @param data - Line item data (prices in ore)
 * @returns Promise with created line item
 */
export async function createLineItem(
  organizationId: string,
  data: CreateLineItemData,
): Promise<LineItem> {
  return await apiClient.post<LineItem>(
    `/organizations/${organizationId}/line-items`,
    data,
  );
}

/**
 * Update a line item
 * @param organizationId - Organization ID
 * @param id - Line item ID
 * @param data - Partial update data (prices in ore)
 * @returns Promise with updated line item
 */
export async function updateLineItem(
  organizationId: string,
  id: string,
  data: UpdateLineItemData,
): Promise<LineItem> {
  return await apiClient.patch<LineItem>(
    `/organizations/${organizationId}/line-items/${id}`,
    data,
  );
}

/**
 * Delete a line item
 * @param organizationId - Organization ID
 * @param id - Line item ID
 * @returns Promise that resolves when deleted
 */
export async function deleteLineItem(
  organizationId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(`/organizations/${organizationId}/line-items/${id}`);
}

/**
 * Generate invoices from pending line items
 * @param organizationId - Organization ID
 * @param options - Optional date range filter
 * @returns Promise with generation result summary
 */
export async function generateInvoicesFromLineItems(
  organizationId: string,
  options?: { from?: string; to?: string },
): Promise<{
  invoicesCreated: number;
  lineItemsProcessed: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    contactName: string;
    total: number;
  }>;
}> {
  return await apiClient.post(
    `/invoices/organization/${organizationId}/generate`,
    options || {},
  );
}
