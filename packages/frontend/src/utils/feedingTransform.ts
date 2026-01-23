/**
 * Utility functions for transforming horse feeding data
 * for display in routine flow components
 */

import type { HorseFeeding, QuantityMeasure } from "@shared/types";

/**
 * Feeding info structure expected by HorseContextCard
 */
export interface FeedingInfoForCard {
  feedType: string;
  quantity: string;
  supplements?: string[];
}

/**
 * Swedish quantity labels for different measures
 */
const QUANTITY_LABELS: Record<
  QuantityMeasure,
  { singular: string; plural: string }
> = {
  scoop: { singular: "skopa", plural: "skopor" },
  teaspoon: { singular: "tesked", plural: "teskedar" },
  tablespoon: { singular: "matsked", plural: "matskedar" },
  cup: { singular: "kopp", plural: "koppar" },
  ml: { singular: "ml", plural: "ml" },
  l: { singular: "l", plural: "l" },
  g: { singular: "g", plural: "g" },
  kg: { singular: "kg", plural: "kg" },
  custom: { singular: "", plural: "" },
};

/**
 * Format quantity with appropriate unit label
 *
 * @param quantity - Numeric quantity
 * @param measure - Unit of measurement
 * @returns Formatted string like "2 skopor" or "500 g"
 */
export function formatQuantity(
  quantity: number,
  measure: QuantityMeasure,
): string {
  const labels = QUANTITY_LABELS[measure];
  if (!labels) {
    return `${quantity}`;
  }

  // Use plural form for quantities other than exactly 1
  const label = quantity === 1 ? labels.singular : labels.plural;

  // For units like ml, g, kg, l - no space before unit
  if (["ml", "l", "g", "kg"].includes(measure)) {
    return `${quantity} ${label}`;
  }

  return `${quantity} ${label}`;
}

/**
 * Priority order for selecting the primary feed type
 * Lower index = higher priority
 */
const CATEGORY_PRIORITY = ["roughage", "concentrate", "supplement", "medicine"];

/**
 * Transform an array of horse feedings into a map
 * keyed by horse ID with aggregated feeding info
 *
 * @param feedings - Array of HorseFeeding records
 * @returns Map where key is horseId and value is FeedingInfoForCard
 */
export function transformHorseFeedingsToMap(
  feedings: HorseFeeding[],
): Map<string, FeedingInfoForCard> {
  const result = new Map<string, FeedingInfoForCard>();

  // Group feedings by horse ID
  const feedingsByHorse = new Map<string, HorseFeeding[]>();
  for (const feeding of feedings) {
    const existing = feedingsByHorse.get(feeding.horseId) || [];
    existing.push(feeding);
    feedingsByHorse.set(feeding.horseId, existing);
  }

  // Process each horse's feedings
  for (const [horseId, horseFeedings] of feedingsByHorse) {
    // Sort by category priority to find primary feed
    const sorted = [...horseFeedings].sort((a, b) => {
      const priorityA = CATEGORY_PRIORITY.indexOf(a.feedTypeCategory);
      const priorityB = CATEGORY_PRIORITY.indexOf(b.feedTypeCategory);
      return priorityA - priorityB;
    });

    // First item becomes primary feed (roughage or concentrate preferred)
    const primary = sorted[0];
    if (!primary) continue;

    // Collect supplements (everything except primary and medicine)
    const supplements = sorted
      .slice(1)
      .filter((f) => f.feedTypeCategory === "supplement")
      .map((f) => {
        const qty = formatQuantity(f.quantity, f.quantityMeasure);
        return `${f.feedTypeName} (${qty})`;
      });

    result.set(horseId, {
      feedType: primary.feedTypeName,
      quantity: formatQuantity(primary.quantity, primary.quantityMeasure),
      supplements: supplements.length > 0 ? supplements : undefined,
    });
  }

  return result;
}
