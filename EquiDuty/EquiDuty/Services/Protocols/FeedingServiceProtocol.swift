//
//  FeedingServiceProtocol.swift
//  EquiDuty
//
//  Protocol for feeding management operations
//

import Foundation

/// Protocol defining feeding management operations
protocol FeedingServiceProtocol {
    /// Get feed types for an organization
    func getFeedTypes(organizationId: String) async throws -> [FeedType]

    /// Get feeding times for a stable
    func getFeedingTimes(stableId: String) async throws -> [FeedingTime]

    /// Get horse feedings for a stable, optionally filtered by feeding time and date
    ///
    /// - Parameters:
    ///   - stableId: The stable ID
    ///   - feedingTimeId: Optional feeding time ID to filter by (e.g., for routine steps)
    ///   - forDate: Optional date to filter feedings by their valid date range (startDate/endDate)
    /// - Returns: Array of active HorseFeeding objects that are valid for the specified date
    func getHorseFeedings(stableId: String, feedingTimeId: String?, forDate: Date?) async throws -> [HorseFeeding]

    /// Get daily feeding data organized by feeding time
    func getDailyFeedingData(
        stableId: String,
        date: Date,
        horses: [Horse]
    ) async throws -> [DailyFeedingData]

    /// Mark a horse feeding as complete
    func markFeedingComplete(
        stableId: String,
        horseId: String,
        feedingTimeId: String,
        date: Date,
        notes: String?
    ) async throws

    /// Mark a horse feeding as incomplete
    func markFeedingIncomplete(
        stableId: String,
        horseId: String,
        feedingTimeId: String,
        date: Date
    ) async throws
}
