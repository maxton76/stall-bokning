/**
 * Admin Service
 *
 * API client for admin portal endpoints.
 * All endpoints require system_admin role.
 */

import { apiClient } from "@/lib/apiClient";
import type {
  AdminDashboardMetrics,
  AdminOrganizationSummary,
  AdminOrganizationDetail,
  AdminUserSummary,
  AdminUserDetail,
  TierDefinition,
  OrganizationSubscription,
  PaginatedResponse,
} from "@stall-bokning/shared";

// ============================================
// DASHBOARD
// ============================================

export async function getDashboardMetrics(): Promise<AdminDashboardMetrics> {
  return apiClient.get<AdminDashboardMetrics>("/admin/dashboard");
}

// ============================================
// ORGANIZATIONS
// ============================================

export async function getOrganizations(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminOrganizationSummary>> {
  return apiClient.get<PaginatedResponse<AdminOrganizationSummary>>(
    "/admin/organizations",
    params as Record<string, string | number | boolean | undefined>,
  );
}

export async function getOrganization(
  orgId: string,
): Promise<AdminOrganizationDetail> {
  return apiClient.get<AdminOrganizationDetail>(
    `/admin/organizations/${orgId}`,
  );
}

export async function updateOrganizationSubscription(
  orgId: string,
  subscription: Partial<OrganizationSubscription>,
): Promise<{ success: boolean; subscription: OrganizationSubscription }> {
  return apiClient.patch<{
    success: boolean;
    subscription: OrganizationSubscription;
  }>(`/admin/organizations/${orgId}/subscription`, subscription);
}

// ============================================
// USERS
// ============================================

export async function getUsers(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminUserSummary>> {
  return apiClient.get<PaginatedResponse<AdminUserSummary>>(
    "/admin/users",
    params as Record<string, string | number | boolean | undefined>,
  );
}

export async function getUser(userId: string): Promise<AdminUserDetail> {
  return apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
}

export async function updateUser(
  userId: string,
  data: { systemRole?: string; disabled?: boolean },
): Promise<{ success: boolean }> {
  return apiClient.patch<{ success: boolean }>(`/admin/users/${userId}`, data);
}

// ============================================
// TIER DEFINITIONS
// ============================================

export async function getTierDefinitions(): Promise<TierDefinition[]> {
  return apiClient.get<TierDefinition[]>("/admin/tiers");
}

export async function updateTierDefinition(
  tier: string,
  definition: Partial<TierDefinition>,
): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(
    `/admin/tiers/${tier}`,
    definition,
  );
}

export async function resetTierDefaults(
  tier: string,
): Promise<{ success: boolean; definition: TierDefinition }> {
  return apiClient.post<{ success: boolean; definition: TierDefinition }>(
    `/admin/tiers/${tier}/reset`,
  );
}
