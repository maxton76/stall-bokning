import type { FeedAnalytics } from "@equiduty/shared";
import type { HorseFeeding, FeedType, FeedInventory } from "@equiduty/shared";
import { getHorseFeedingsByStable } from "./horseFeedingService";
import { getFeedTypesByOrganization } from "./feedTypeService";
import { getStableInventory } from "./inventoryService";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  differenceInDays,
} from "date-fns";

/**
 * Period options for analytics
 */
export type AnalyticsPeriod = "weekly" | "monthly";

/**
 * Calculate feed analytics for a stable
 */
export async function getFeedAnalytics(
  stableId: string,
  organizationId: string,
  period: AnalyticsPeriod,
  referenceDate: Date = new Date(),
): Promise<FeedAnalytics> {
  // Determine date range
  let start: Date;
  let end: Date;

  if (period === "weekly") {
    start = startOfWeek(referenceDate, { weekStartsOn: 1 });
    end = endOfWeek(referenceDate, { weekStartsOn: 1 });
  } else {
    start = startOfMonth(referenceDate);
    end = endOfMonth(referenceDate);
  }

  // Fetch data in parallel
  const [horseFeedings, feedTypes, inventory] = await Promise.all([
    getHorseFeedingsByStable(stableId, { activeOnly: true }),
    getFeedTypesByOrganization(organizationId, true),
    getStableInventory(stableId).catch(() => [] as FeedInventory[]),
  ]);

  // Create lookup maps
  const feedTypeMap = new Map<string, FeedType>();
  feedTypes.forEach((ft) => feedTypeMap.set(ft.id, ft));

  const inventoryMap = new Map<string, FeedInventory>();
  inventory.forEach((inv) => inventoryMap.set(inv.feedTypeId, inv));

  // Calculate days in period
  const daysInPeriod = differenceInDays(end, start) + 1;
  const dates = eachDayOfInterval({ start, end });

  // Track scheduled feedings per day
  let totalScheduledFeedings = 0;

  // Calculate feed type breakdown
  const feedTypeBreakdownMap = new Map<
    string,
    {
      feedTypeId: string;
      feedTypeName: string;
      feedTypeCategory: string;
      totalQuantity: number;
      unit: string;
      estimatedCost: number;
      usageCount: number;
    }
  >();

  // Calculate horse breakdown
  const horseBreakdownMap = new Map<
    string,
    {
      horseId: string;
      horseName: string;
      totalFeedings: number;
      feedTypes: Map<
        string,
        {
          feedTypeId: string;
          feedTypeName: string;
          quantity: number;
          cost: number;
        }
      >;
      totalCost: number;
    }
  >();

  // Process feedings for each day in the period
  for (const date of dates) {
    const dateStr = format(date, "yyyy-MM-dd");

    // Find active feedings for this date
    const activeFeedingsForDate = horseFeedings.filter((feeding) => {
      const feedingStart = feeding.startDate;
      const feedingEnd = feeding.endDate;

      // Check if feeding is active on this date
      const isAfterStart = feedingStart <= dateStr;
      const isBeforeEnd = !feedingEnd || feedingEnd >= dateStr;

      return feeding.isActive && isAfterStart && isBeforeEnd;
    });

    totalScheduledFeedings += activeFeedingsForDate.length;

    // Process each feeding
    for (const feeding of activeFeedingsForDate) {
      const feedType = feedTypeMap.get(feeding.feedTypeId);
      const inventoryItem = inventoryMap.get(feeding.feedTypeId);
      const unitCost = inventoryItem?.unitCost || 0;

      // Update feed type breakdown
      const existingFeedType = feedTypeBreakdownMap.get(feeding.feedTypeId);
      if (existingFeedType) {
        existingFeedType.totalQuantity += feeding.quantity;
        existingFeedType.estimatedCost += feeding.quantity * unitCost;
        existingFeedType.usageCount += 1;
      } else {
        feedTypeBreakdownMap.set(feeding.feedTypeId, {
          feedTypeId: feeding.feedTypeId,
          feedTypeName: feeding.feedTypeName || feedType?.name || "Unknown",
          feedTypeCategory:
            feeding.feedTypeCategory || feedType?.category || "unknown",
          totalQuantity: feeding.quantity,
          unit: feeding.quantityMeasure || feedType?.quantityMeasure || "kg",
          estimatedCost: feeding.quantity * unitCost,
          usageCount: 1,
        });
      }

      // Update horse breakdown
      const existingHorse = horseBreakdownMap.get(feeding.horseId);
      const feedingCost = feeding.quantity * unitCost;

      if (existingHorse) {
        existingHorse.totalFeedings += 1;
        existingHorse.totalCost += feedingCost;

        const existingHorseFeedType = existingHorse.feedTypes.get(
          feeding.feedTypeId,
        );
        if (existingHorseFeedType) {
          existingHorseFeedType.quantity += feeding.quantity;
          existingHorseFeedType.cost += feedingCost;
        } else {
          existingHorse.feedTypes.set(feeding.feedTypeId, {
            feedTypeId: feeding.feedTypeId,
            feedTypeName: feeding.feedTypeName || feedType?.name || "Unknown",
            quantity: feeding.quantity,
            cost: feedingCost,
          });
        }
      } else {
        const horseFeedTypes = new Map();
        horseFeedTypes.set(feeding.feedTypeId, {
          feedTypeId: feeding.feedTypeId,
          feedTypeName: feeding.feedTypeName || feedType?.name || "Unknown",
          quantity: feeding.quantity,
          cost: feedingCost,
        });

        horseBreakdownMap.set(feeding.horseId, {
          horseId: feeding.horseId,
          horseName: feeding.horseName || "Unknown",
          totalFeedings: 1,
          feedTypes: horseFeedTypes,
          totalCost: feedingCost,
        });
      }
    }
  }

  // Convert maps to arrays
  const feedTypeBreakdown = Array.from(feedTypeBreakdownMap.values()).sort(
    (a, b) => b.estimatedCost - a.estimatedCost,
  );

  const horseBreakdown = Array.from(horseBreakdownMap.values())
    .map((horse) => ({
      horseId: horse.horseId,
      horseName: horse.horseName,
      totalFeedings: horse.totalFeedings,
      feedTypes: Array.from(horse.feedTypes.values()),
      totalCost: horse.totalCost,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  // Calculate totals
  const totalQuantity = feedTypeBreakdown.reduce(
    (sum, ft) => sum + ft.totalQuantity,
    0,
  );
  const totalCost = feedTypeBreakdown.reduce(
    (sum, ft) => sum + ft.estimatedCost,
    0,
  );
  const averageDailyCost = daysInPeriod > 0 ? totalCost / daysInPeriod : 0;

  // For now, assume 100% completion rate (actual tracking would require activity completion data)
  const feedingCompletionRate = 100;

  // Waste amounts would come from inventory transactions
  const wasteAmount = 0;
  const wasteCost = 0;

  return {
    stableId,
    period: {
      start,
      end,
      type: period === "weekly" ? "weekly" : "monthly",
    },
    feedTypeBreakdown,
    horseBreakdown,
    totalQuantity,
    totalCost,
    averageDailyCost,
    feedingCompletionRate,
    wasteAmount,
    wasteCost,
  };
}

/**
 * Get feed cost trends over time
 */
export interface CostTrendData {
  date: string;
  displayDate: string;
  totalCost: number;
  feedingCount: number;
}

export async function getFeedCostTrend(
  stableId: string,
  organizationId: string,
  months: number = 6,
): Promise<CostTrendData[]> {
  const trends: CostTrendData[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const referenceDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const analytics = await getFeedAnalytics(
      stableId,
      organizationId,
      "monthly",
      referenceDate,
    );

    trends.push({
      date: format(referenceDate, "yyyy-MM"),
      displayDate: format(referenceDate, "MMM yyyy"),
      totalCost: Math.round(analytics.totalCost),
      feedingCount: analytics.horseBreakdown.reduce(
        (sum, h) => sum + h.totalFeedings,
        0,
      ),
    });
  }

  return trends;
}
