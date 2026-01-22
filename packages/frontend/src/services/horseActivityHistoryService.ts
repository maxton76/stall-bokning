import { authFetchJSON } from "@/utils/authFetch";
import type {
  HorseActivityHistoryEntry,
  HorseActivityHistoryResponse,
  RoutineCategory,
} from "@shared/types";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Options for filtering horse activity history
 */
export interface HorseActivityHistoryOptions {
  category?: RoutineCategory;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  cursor?: string;
}

/**
 * Response for horse activity history
 */
export interface HorseActivityHistoryResult {
  activities: HorseActivityHistoryEntry[];
  nextCursor?: string;
  hasMore: boolean;
  horseName?: string;
}

/**
 * Response for routine activity history
 */
export interface RoutineActivityHistoryResult {
  activities: HorseActivityHistoryEntry[];
  groupedByStep: Record<string, HorseActivityHistoryEntry[]>;
  routineInfo: {
    id: string;
    templateName: string;
    status: string;
    scheduledDate: string;
    completedAt?: string;
    completedBy?: string;
    completedByName?: string;
  };
}

/**
 * Get activity history for a specific horse
 *
 * @param horseId - ID of the horse
 * @param options - Filter options
 * @returns Paginated activity history
 *
 * @example
 * const { activities, hasMore, nextCursor } = await getHorseActivityHistory(horseId);
 * // Filter by category
 * const feedingHistory = await getHorseActivityHistory(horseId, { category: 'feeding' });
 */
export async function getHorseActivityHistory(
  horseId: string,
  options?: HorseActivityHistoryOptions,
): Promise<HorseActivityHistoryResult> {
  const params = new URLSearchParams();

  if (options?.category) {
    params.append("category", options.category);
  }
  if (options?.startDate) {
    const dateStr =
      options.startDate instanceof Date
        ? options.startDate.toISOString()
        : options.startDate;
    params.append("startDate", dateStr);
  }
  if (options?.endDate) {
    const dateStr =
      options.endDate instanceof Date
        ? options.endDate.toISOString()
        : options.endDate;
    params.append("endDate", dateStr);
  }
  if (options?.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options?.cursor) {
    params.append("cursor", options.cursor);
  }

  const queryString = params.toString();
  const url = `${API_URL}/api/v1/horse-activity-history/horse/${horseId}${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await authFetchJSON<HorseActivityHistoryResult>(url, {
    method: "GET",
  });

  return response;
}

/**
 * Get activity history for a completed routine
 * Returns activities grouped by step for the routine summary view
 *
 * @param routineInstanceId - ID of the routine instance
 * @returns Activities grouped by step ID
 *
 * @example
 * const { groupedByStep, routineInfo } = await getRoutineActivityHistory(routineId);
 * // Access activities for a specific step
 * const stepActivities = groupedByStep['step-abc-123'];
 */
export async function getRoutineActivityHistory(
  routineInstanceId: string,
): Promise<RoutineActivityHistoryResult> {
  const response = await authFetchJSON<RoutineActivityHistoryResult>(
    `${API_URL}/api/v1/horse-activity-history/routine/${routineInstanceId}`,
    { method: "GET" },
  );

  return response;
}

/**
 * Get activity history for a stable
 *
 * @param stableId - ID of the stable
 * @param options - Filter options (includes optional horseId filter)
 * @returns Paginated activity history
 */
export async function getStableActivityHistory(
  stableId: string,
  options?: HorseActivityHistoryOptions & { horseId?: string },
): Promise<HorseActivityHistoryResult> {
  const params = new URLSearchParams();

  if (options?.category) {
    params.append("category", options.category);
  }
  if (options?.startDate) {
    const dateStr =
      options.startDate instanceof Date
        ? options.startDate.toISOString()
        : options.startDate;
    params.append("startDate", dateStr);
  }
  if (options?.endDate) {
    const dateStr =
      options.endDate instanceof Date
        ? options.endDate.toISOString()
        : options.endDate;
    params.append("endDate", dateStr);
  }
  if (options?.horseId) {
    params.append("horseId", options.horseId);
  }
  if (options?.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options?.cursor) {
    params.append("cursor", options.cursor);
  }

  const queryString = params.toString();
  const url = `${API_URL}/api/v1/horse-activity-history/stable/${stableId}${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await authFetchJSON<HorseActivityHistoryResult>(url, {
    method: "GET",
  });

  return response;
}
