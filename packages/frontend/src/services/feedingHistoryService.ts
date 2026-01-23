import { apiClient } from "@/lib/apiClient";
import type { AuditLog } from "@shared/types/auditLog";

/**
 * Filters for querying feeding history
 */
export interface FeedingHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  horseId?: string;
  action?: "create" | "update" | "delete" | "all";
  limit?: number;
}

/**
 * Get feeding history for a stable
 *
 * @param stableId - Stable ID
 * @param filters - Optional filters
 * @returns Promise with audit logs
 */
export async function getFeedingHistoryByStable(
  stableId: string,
  filters?: FeedingHistoryFilters,
): Promise<AuditLog[]> {
  const params: Record<string, string> = {};

  if (filters?.startDate) {
    params.startDate = filters.startDate.toISOString();
  }
  if (filters?.endDate) {
    params.endDate = filters.endDate.toISOString();
  }
  if (filters?.horseId && filters.horseId !== "all") {
    params.horseId = filters.horseId;
  }
  if (filters?.action && filters.action !== "all") {
    params.action = filters.action;
  }
  if (filters?.limit) {
    params.limit = String(filters.limit);
  }

  const response = await apiClient.get<{ auditLogs: any[]; count: number }>(
    `/feeding-history/stable/${stableId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  // Convert timestamp strings back to Date objects for frontend use
  return response.auditLogs.map((log) => ({
    ...log,
    timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
    details: log.details
      ? {
          ...log.details,
          changes: log.details.changes?.map((change: any) => ({
            ...change,
            timestamp: change.timestamp
              ? new Date(change.timestamp)
              : new Date(),
          })),
        }
      : undefined,
  }));
}

/**
 * Get feeding history for a specific horse
 *
 * @param horseId - Horse ID
 * @param filters - Optional filters
 * @returns Promise with audit logs and horse name
 */
export async function getFeedingHistoryByHorse(
  horseId: string,
  filters?: Omit<FeedingHistoryFilters, "horseId">,
): Promise<{ auditLogs: AuditLog[]; horseName: string }> {
  const params: Record<string, string> = {};

  if (filters?.startDate) {
    params.startDate = filters.startDate.toISOString();
  }
  if (filters?.endDate) {
    params.endDate = filters.endDate.toISOString();
  }
  if (filters?.action && filters.action !== "all") {
    params.action = filters.action;
  }
  if (filters?.limit) {
    params.limit = String(filters.limit);
  }

  const response = await apiClient.get<{
    auditLogs: any[];
    count: number;
    horseName: string;
  }>(
    `/feeding-history/horse/${horseId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );

  // Convert timestamp strings back to Date objects
  const auditLogs = response.auditLogs.map((log) => ({
    ...log,
    timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    createdAt: log.createdAt ? new Date(log.createdAt) : new Date(),
    details: log.details
      ? {
          ...log.details,
          changes: log.details.changes?.map((change: any) => ({
            ...change,
            timestamp: change.timestamp
              ? new Date(change.timestamp)
              : new Date(),
          })),
        }
      : undefined,
  }));

  return {
    auditLogs,
    horseName: response.horseName,
  };
}
