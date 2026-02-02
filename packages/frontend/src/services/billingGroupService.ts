import type {
  BillingGroup,
  CreateBillingGroupData,
  UpdateBillingGroupData,
} from "@equiduty/shared";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// Billing Group CRUD Operations
// ============================================================================

/**
 * Get all billing groups for an organization
 * @param organizationId - Organization ID
 * @returns Promise with billing groups
 */
export async function getBillingGroups(
  organizationId: string,
): Promise<BillingGroup[]> {
  const response = await apiClient.get<{ billingGroups: BillingGroup[] }>(
    `/organizations/${organizationId}/billing-groups`,
  );

  return response.billingGroups;
}

/**
 * Get a single billing group by ID
 * @param organizationId - Organization ID
 * @param id - Billing group ID
 * @returns Promise with billing group
 */
export async function getBillingGroup(
  organizationId: string,
  id: string,
): Promise<BillingGroup> {
  return await apiClient.get<BillingGroup>(
    `/organizations/${organizationId}/billing-groups/${id}`,
  );
}

/**
 * Create a new billing group
 * @param organizationId - Organization ID
 * @param data - Billing group data
 * @returns Promise with created billing group
 */
export async function createBillingGroup(
  organizationId: string,
  data: CreateBillingGroupData,
): Promise<BillingGroup> {
  return await apiClient.post<BillingGroup>(
    `/organizations/${organizationId}/billing-groups`,
    data,
  );
}

/**
 * Update a billing group
 * @param organizationId - Organization ID
 * @param id - Billing group ID
 * @param data - Partial update data
 * @returns Promise with updated billing group
 */
export async function updateBillingGroup(
  organizationId: string,
  id: string,
  data: UpdateBillingGroupData,
): Promise<BillingGroup> {
  return await apiClient.patch<BillingGroup>(
    `/organizations/${organizationId}/billing-groups/${id}`,
    data,
  );
}

/**
 * Add a member to a billing group
 * @param organizationId - Organization ID
 * @param id - Billing group ID
 * @param memberId - Member ID to add
 * @returns Promise with updated billing group
 */
export async function addBillingGroupMember(
  organizationId: string,
  id: string,
  memberId: string,
): Promise<BillingGroup> {
  return await apiClient.post<BillingGroup>(
    `/organizations/${organizationId}/billing-groups/${id}/members`,
    { memberId },
  );
}

/**
 * Remove a member from a billing group
 * @param organizationId - Organization ID
 * @param id - Billing group ID
 * @param memberId - Member ID to remove
 * @returns Promise that resolves when removed
 */
export async function removeBillingGroupMember(
  organizationId: string,
  id: string,
  memberId: string,
): Promise<void> {
  await apiClient.delete(
    `/organizations/${organizationId}/billing-groups/${id}/members/${memberId}`,
  );
}

/**
 * Delete a billing group
 * @param organizationId - Organization ID
 * @param id - Billing group ID
 * @returns Promise that resolves when deleted
 */
export async function deleteBillingGroup(
  organizationId: string,
  id: string,
): Promise<void> {
  await apiClient.delete(
    `/organizations/${organizationId}/billing-groups/${id}`,
  );
}
