//
//  FeedingTransformUtils.swift
//  EquiDuty
//
//  Utility functions for transforming feeding data for routine step display.
//

import Foundation

/// Feeding information formatted for display in routine step horse cards
struct FeedingInfoForCard: Equatable {
    /// Primary feed type name (e.g., "Hö", "Müsli")
    let feedType: String
    /// Formatted quantity (e.g., "2 skopor", "1.5 kg")
    let quantity: String
    /// List of supplement names (if any)
    let supplements: [String]?
    /// Category of the primary feed
    let category: FeedCategory
}

/// Transforms an array of HorseFeeding objects into a dictionary keyed by horseId.
///
/// Groups feedings by horse, separating primary feeds (roughage/concentrate)
/// from supplements for cleaner display in routine steps.
///
/// - Parameter feedings: Array of HorseFeeding objects for the current step
/// - Returns: Dictionary mapping horseId to FeedingInfoForCard
///
/// - Example:
///   ```swift
///   let feedings = try await FeedingService.shared.getHorseFeedings(stableId: stableId, feedingTimeId: step.feedingTimeId)
///   let feedingMap = transformHorseFeedingsToMap(feedings)
///   let horseFeeding = feedingMap["horse123"]
///   // horseFeeding?.feedType = "Hö"
///   // horseFeeding?.quantity = "2 skopor"
///   // horseFeeding?.supplements = ["Mineraler", "Vitaminer"]
///   ```
func transformHorseFeedingsToMap(_ feedings: [HorseFeeding]) -> [String: FeedingInfoForCard] {
    // Group feedings by horseId
    let groupedByHorse = Dictionary(grouping: feedings, by: { $0.horseId })

    var result: [String: FeedingInfoForCard] = [:]

    for (horseId, horseFeedings) in groupedByHorse {
        // Separate primary feeds from supplements
        let primaryFeeds = horseFeedings.filter {
            $0.feedTypeCategory == .roughage || $0.feedTypeCategory == .concentrate
        }
        let supplementFeeds = horseFeedings.filter {
            $0.feedTypeCategory == .supplement || $0.feedTypeCategory == .medicine
        }

        // Use the first primary feed as the main display item
        // If no primary feed, use the first feeding overall
        let primaryFeed = primaryFeeds.first ?? horseFeedings.first

        guard let primary = primaryFeed else { continue }

        // Format supplements as a list of names
        let supplementNames: [String]? = supplementFeeds.isEmpty ? nil : supplementFeeds.map {
            // Include quantity for supplements if it differs from 1
            if $0.quantity != 1 {
                return "\($0.feedTypeName) (\($0.formattedQuantity))"
            }
            return $0.feedTypeName
        }

        result[horseId] = FeedingInfoForCard(
            feedType: primary.feedTypeName,
            quantity: primary.formattedQuantity,
            supplements: supplementNames,
            category: primary.feedTypeCategory
        )
    }

    return result
}

/// Creates feeding info for a single horse from an array of feedings
///
/// - Parameters:
///   - horseId: The horse ID to extract feeding info for
///   - feedings: Array of all feedings for the current context
/// - Returns: FeedingInfoForCard if feedings exist for the horse, nil otherwise
func feedingInfoForHorse(_ horseId: String, from feedings: [HorseFeeding]) -> FeedingInfoForCard? {
    let horseFeedings = feedings.filter { $0.horseId == horseId }
    guard !horseFeedings.isEmpty else { return nil }

    let map = transformHorseFeedingsToMap(horseFeedings)
    return map[horseId]
}
