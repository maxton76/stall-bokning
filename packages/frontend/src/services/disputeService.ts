import type {
  Dispute,
  DisputeMessage,
  DisputeStatus,
  CreateDisputeData,
  ResolveDisputeData,
  CreateDisputeMessageData,
} from "@equiduty/shared";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// Dispute CRUD Operations
// ============================================================================

/**
 * Get all disputes for an organization
 * @param organizationId - Organization ID
 * @param options - Query options (status filter, pagination)
 * @returns Promise with disputes
 */
export async function getOrganizationDisputes(
  organizationId: string,
  options?: {
    status?: DisputeStatus;
    invoiceId?: string;
    limit?: number;
    offset?: number;
  },
): Promise<Dispute[]> {
  const params: Record<string, string> = {};
  if (options?.status) {
    params.status = options.status;
  }
  if (options?.invoiceId) {
    params.invoiceId = options.invoiceId;
  }
  if (options?.limit) {
    params.limit = options.limit.toString();
  }
  if (options?.offset) {
    params.offset = options.offset.toString();
  }

  const response = await apiClient.get<{ disputes: Dispute[] }>(
    `/organizations/${organizationId}/disputes`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.disputes;
}

/**
 * Get a single dispute by ID
 * @param organizationId - Organization ID
 * @param disputeId - Dispute ID
 * @returns Promise with dispute and messages
 */
export async function getDisputeDetail(
  organizationId: string,
  disputeId: string,
): Promise<{ dispute: Dispute; messages: DisputeMessage[] }> {
  return await apiClient.get<{ dispute: Dispute; messages: DisputeMessage[] }>(
    `/organizations/${organizationId}/disputes/${disputeId}`,
  );
}

/**
 * Create a new dispute
 * @param organizationId - Organization ID
 * @param data - Dispute data (invoiceId, subject, description)
 * @returns Promise with created dispute
 */
export async function createDispute(
  organizationId: string,
  data: CreateDisputeData,
): Promise<Dispute> {
  return await apiClient.post<Dispute>(
    `/organizations/${organizationId}/disputes`,
    data,
  );
}

/**
 * Add a message to a dispute thread
 * @param organizationId - Organization ID
 * @param disputeId - Dispute ID
 * @param data - Message data
 * @returns Promise with created message
 */
export async function addDisputeMessage(
  organizationId: string,
  disputeId: string,
  data: CreateDisputeMessageData,
): Promise<DisputeMessage> {
  return await apiClient.post<DisputeMessage>(
    `/organizations/${organizationId}/disputes/${disputeId}/messages`,
    data,
  );
}

/**
 * Mark a dispute as under review
 * @param organizationId - Organization ID
 * @param disputeId - Dispute ID
 * @returns Promise with updated dispute
 */
export async function reviewDispute(
  organizationId: string,
  disputeId: string,
): Promise<Dispute> {
  return await apiClient.put<Dispute>(
    `/organizations/${organizationId}/disputes/${disputeId}/review`,
    {},
  );
}

/**
 * Resolve a dispute
 * @param organizationId - Organization ID
 * @param disputeId - Dispute ID
 * @param data - Resolution data (type, notes, optional credit/refund IDs)
 * @returns Promise with updated dispute
 */
export async function resolveDispute(
  organizationId: string,
  disputeId: string,
  data: ResolveDisputeData,
): Promise<Dispute> {
  return await apiClient.put<Dispute>(
    `/organizations/${organizationId}/disputes/${disputeId}/resolve`,
    data,
  );
}

/**
 * Reject a dispute
 * @param organizationId - Organization ID
 * @param disputeId - Dispute ID
 * @param data - Rejection reason
 * @returns Promise with updated dispute
 */
export async function rejectDispute(
  organizationId: string,
  disputeId: string,
  data: { reason: string },
): Promise<Dispute> {
  return await apiClient.put<Dispute>(
    `/organizations/${organizationId}/disputes/${disputeId}/reject`,
    data,
  );
}
