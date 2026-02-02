import type {
  PackageDefinition,
  CreatePackageDefinitionData,
  UpdatePackageDefinitionData,
  MemberPackage,
  PurchasePackageData,
} from "@equiduty/shared";
import { apiClient } from "@/lib/apiClient";

// ============================================================================
// Package Definition CRUD Operations
// ============================================================================

/**
 * Get all package definitions for an organization
 * @param organizationId - Organization ID
 * @returns Promise with package definitions
 */
export async function getPackageDefinitions(
  organizationId: string,
): Promise<PackageDefinition[]> {
  const response = await apiClient.get<{
    packageDefinitions: PackageDefinition[];
  }>(`/organizations/${organizationId}/packages`);

  return response.packageDefinitions;
}

/**
 * Create a new package definition
 * @param organizationId - Organization ID
 * @param data - Package definition data (price in ore)
 * @returns Promise with created package definition
 */
export async function createPackageDefinition(
  organizationId: string,
  data: CreatePackageDefinitionData,
): Promise<PackageDefinition> {
  return await apiClient.post<PackageDefinition>(
    `/organizations/${organizationId}/packages`,
    data,
  );
}

/**
 * Update a package definition
 * @param organizationId - Organization ID
 * @param id - Package definition ID
 * @param data - Partial update data (price in ore)
 * @returns Promise with updated package definition
 */
export async function updatePackageDefinition(
  organizationId: string,
  id: string,
  data: UpdatePackageDefinitionData,
): Promise<PackageDefinition> {
  return await apiClient.patch<PackageDefinition>(
    `/organizations/${organizationId}/packages/${id}`,
    data,
  );
}

// ============================================================================
// Member Package Operations
// ============================================================================

/**
 * Purchase a package for a member
 * @param organizationId - Organization ID
 * @param packageId - Package definition ID
 * @param data - Purchase data (memberId, optional billingGroupId)
 * @returns Promise with created member package
 */
export async function purchasePackage(
  organizationId: string,
  packageId: string,
  data: PurchasePackageData,
): Promise<MemberPackage> {
  return await apiClient.post<MemberPackage>(
    `/organizations/${organizationId}/packages/${packageId}/purchase`,
    data,
  );
}

/**
 * Get member packages for an organization
 * @param organizationId - Organization ID
 * @param options - Optional filters (memberId, status)
 * @returns Promise with member packages
 */
export async function getMemberPackages(
  organizationId: string,
  options?: { memberId?: string; status?: string },
): Promise<MemberPackage[]> {
  const params: Record<string, string> = {};
  if (options?.memberId) {
    params.memberId = options.memberId;
  }
  if (options?.status) {
    params.status = options.status;
  }

  const response = await apiClient.get<{ memberPackages: MemberPackage[] }>(
    `/organizations/${organizationId}/member-packages`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  return response.memberPackages;
}

/**
 * Get a single member package by ID
 * @param organizationId - Organization ID
 * @param id - Member package ID
 * @returns Promise with member package
 */
export async function getMemberPackage(
  organizationId: string,
  id: string,
): Promise<MemberPackage> {
  return await apiClient.get<MemberPackage>(
    `/organizations/${organizationId}/member-packages/${id}`,
  );
}

/**
 * Deduct units from a member package
 * @param organizationId - Organization ID
 * @param packageId - Member package ID
 * @param data - Deduction data (units, lineItemId)
 * @returns Promise with updated member package
 */
export async function deductFromPackage(
  organizationId: string,
  packageId: string,
  data: { units: number; lineItemId: string },
): Promise<MemberPackage> {
  return await apiClient.post<MemberPackage>(
    `/organizations/${organizationId}/member-packages/${packageId}/deduct`,
    data,
  );
}

/**
 * Cancel a member package
 * @param organizationId - Organization ID
 * @param packageId - Member package ID
 * @returns Promise with updated member package
 */
export async function cancelMemberPackage(
  organizationId: string,
  packageId: string,
): Promise<MemberPackage> {
  return await apiClient.post<MemberPackage>(
    `/organizations/${organizationId}/member-packages/${packageId}/cancel`,
  );
}
