import { authFetchJSON } from "@/utils/authFetch";
import type { AuditLog } from "@shared/types/auditLog";

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1/feeding-history`;

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
  const params = new URLSearchParams();

  if (filters?.startDate) {
    params.append("startDate", filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    params.append("endDate", filters.endDate.toISOString());
  }
  if (filters?.horseId && filters.horseId !== "all") {
    params.append("horseId", filters.horseId);
  }
  if (filters?.action && filters.action !== "all") {
    params.append("action", filters.action);
  }
  if (filters?.limit) {
    params.append("limit", String(filters.limit));
  }

  const url = `${API_BASE}/stable/${stableId}${params.toString() ? "?" + params.toString() : ""}`;
  const response = await authFetchJSON<{ auditLogs: any[]; count: number }>(
    url,
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
  const params = new URLSearchParams();

  if (filters?.startDate) {
    params.append("startDate", filters.startDate.toISOString());
  }
  if (filters?.endDate) {
    params.append("endDate", filters.endDate.toISOString());
  }
  if (filters?.action && filters.action !== "all") {
    params.append("action", filters.action);
  }
  if (filters?.limit) {
    params.append("limit", String(filters.limit));
  }

  const url = `${API_BASE}/horse/${horseId}${params.toString() ? "?" + params.toString() : ""}`;
  const response = await authFetchJSON<{
    auditLogs: any[];
    count: number;
    horseName: string;
  }>(url);

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
