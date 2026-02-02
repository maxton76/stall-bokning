import { apiClient } from "@/lib/apiClient";
import type {
  TrainerCommissionConfig,
  TrainerCommission,
  CreateTrainerCommissionConfigData,
  UpdateTrainerCommissionConfigData,
  CalculateCommissionData,
} from "@equiduty/shared";

// ============================================================================
// Commission Config Operations
// ============================================================================

/**
 * Get all commission configs for an organization.
 * @param organizationId - Organization ID
 * @param params - Optional filter params (trainerId, isActive)
 */
export async function getCommissionConfigs(
  organizationId: string,
  params?: { trainerId?: string; isActive?: boolean },
): Promise<TrainerCommissionConfig[]> {
  const queryParams: Record<string, string | boolean | undefined> = {};
  if (params?.trainerId) queryParams.trainerId = params.trainerId;
  if (params?.isActive !== undefined) queryParams.isActive = params.isActive;

  const response = await apiClient.get<{
    configs: TrainerCommissionConfig[];
  }>(`/organizations/${organizationId}/commission-configs`, queryParams);

  return response.configs;
}

/**
 * Create a new commission config.
 * @param organizationId - Organization ID
 * @param data - Commission config data
 */
export async function createCommissionConfig(
  organizationId: string,
  data: CreateTrainerCommissionConfigData,
): Promise<TrainerCommissionConfig> {
  return apiClient.post<TrainerCommissionConfig>(
    `/organizations/${organizationId}/commission-configs`,
    data,
  );
}

/**
 * Update an existing commission config.
 * @param organizationId - Organization ID
 * @param configId - Config ID
 * @param data - Partial update data
 */
export async function updateCommissionConfig(
  organizationId: string,
  configId: string,
  data: UpdateTrainerCommissionConfigData,
): Promise<TrainerCommissionConfig> {
  return apiClient.put<TrainerCommissionConfig>(
    `/organizations/${organizationId}/commission-configs/${configId}`,
    data,
  );
}

// ============================================================================
// Commission Operations
// ============================================================================

/**
 * Calculate commissions for a billing period.
 * @param organizationId - Organization ID
 * @param data - Period and optional trainer filter
 */
export async function calculateCommissions(
  organizationId: string,
  data: CalculateCommissionData,
): Promise<TrainerCommission[]> {
  const response = await apiClient.post<{
    commissions: TrainerCommission[];
  }>(`/organizations/${organizationId}/commissions/calculate`, data);

  return response.commissions;
}

/**
 * Get commissions for an organization.
 * @param organizationId - Organization ID
 * @param params - Optional filters
 */
export async function getCommissions(
  organizationId: string,
  params?: {
    trainerId?: string;
    status?: string;
    periodStart?: string;
    periodEnd?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{
  items: TrainerCommission[];
  pagination: { limit: number; offset: number; count: number };
}> {
  const queryParams: Record<string, string | number | undefined> = {};
  if (params?.trainerId) queryParams.trainerId = params.trainerId;
  if (params?.status) queryParams.status = params.status;
  if (params?.periodStart) queryParams.periodStart = params.periodStart;
  if (params?.periodEnd) queryParams.periodEnd = params.periodEnd;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.offset) queryParams.offset = params.offset;

  return apiClient.get<{
    items: TrainerCommission[];
    pagination: { limit: number; offset: number; count: number };
  }>(`/organizations/${organizationId}/commissions`, queryParams);
}

/**
 * Get a single commission by ID.
 * @param organizationId - Organization ID
 * @param commissionId - Commission ID
 */
export async function getCommissionDetail(
  organizationId: string,
  commissionId: string,
): Promise<TrainerCommission> {
  return apiClient.get<TrainerCommission>(
    `/organizations/${organizationId}/commissions/${commissionId}`,
  );
}

/**
 * Approve a commission.
 * @param organizationId - Organization ID
 * @param commissionId - Commission ID
 * @param notes - Optional approval notes
 */
export async function approveCommission(
  organizationId: string,
  commissionId: string,
  notes?: string,
): Promise<TrainerCommission> {
  return apiClient.put<TrainerCommission>(
    `/organizations/${organizationId}/commissions/${commissionId}/approve`,
    { notes },
  );
}

/**
 * Reject a commission.
 * @param organizationId - Organization ID
 * @param commissionId - Commission ID
 * @param reason - Rejection reason (required)
 */
export async function rejectCommission(
  organizationId: string,
  commissionId: string,
  reason: string,
): Promise<TrainerCommission> {
  return apiClient.put<TrainerCommission>(
    `/organizations/${organizationId}/commissions/${commissionId}/reject`,
    { reason },
  );
}

/**
 * Export commissions as CSV (returns Blob).
 * @param organizationId - Organization ID
 * @param params - Optional filters
 */
export async function exportCommissionsCSV(
  organizationId: string,
  params?: {
    periodStart?: string;
    periodEnd?: string;
    trainerId?: string;
    status?: string;
  },
): Promise<Blob> {
  const queryParams: Record<string, string | undefined> = {};
  if (params?.periodStart) queryParams.periodStart = params.periodStart;
  if (params?.periodEnd) queryParams.periodEnd = params.periodEnd;
  if (params?.trainerId) queryParams.trainerId = params.trainerId;
  if (params?.status) queryParams.status = params.status;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) searchParams.append(key, value);
  }

  const queryString = searchParams.toString();
  const path = `/organizations/${organizationId}/commissions/export${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.raw(path, { method: "GET" });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ||
        `Export failed with status ${response.status}`,
    );
  }

  return response.blob();
}
