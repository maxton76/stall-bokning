import { apiClient } from "@/lib/apiClient";
import type {
  HorseActivityHistoryEntry,
  HorseActivityHistoryResponse,
  RoutineCategory,
} from "@shared/types";

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
  const params: Record<string, string> = {};

  if (options?.category) {
    params.category = options.category;
  }
  if (options?.startDate) {
    params.startDate =
      options.startDate instanceof Date
        ? options.startDate.toISOString()
        : options.startDate;
  }
  if (options?.endDate) {
    params.endDate =
      options.endDate instanceof Date
        ? options.endDate.toISOString()
        : options.endDate;
  }
  if (options?.limit) {
    params.limit = options.limit.toString();
  }
  if (options?.cursor) {
    params.cursor = options.cursor;
  }

  return await apiClient.get<HorseActivityHistoryResult>(
    `/horse-activity-history/horse/${horseId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );
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
  return await apiClient.get<RoutineActivityHistoryResult>(
    `/horse-activity-history/routine/${routineInstanceId}`,
  );
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
  const params: Record<string, string> = {};

  if (options?.category) {
    params.category = options.category;
  }
  if (options?.startDate) {
    params.startDate =
      options.startDate instanceof Date
        ? options.startDate.toISOString()
        : options.startDate;
  }
  if (options?.endDate) {
    params.endDate =
      options.endDate instanceof Date
        ? options.endDate.toISOString()
        : options.endDate;
  }
  if (options?.horseId) {
    params.horseId = options.horseId;
  }
  if (options?.limit) {
    params.limit = options.limit.toString();
  }
  if (options?.cursor) {
    params.cursor = options.cursor;
  }

  return await apiClient.get<HorseActivityHistoryResult>(
    `/horse-activity-history/stable/${stableId}`,
    Object.keys(params).length > 0 ? params : undefined,
  );
}
