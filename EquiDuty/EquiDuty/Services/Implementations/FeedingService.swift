//
//  FeedingService.swift
//  EquiDuty
//
//  Implementation of feeding management operations
//

import Foundation

/// Feeding service implementation using API client
@MainActor
final class FeedingService: FeedingServiceProtocol {
    static let shared = FeedingService()

    private let apiClient = APIClient.shared
    private let dateFormatter: DateFormatter

    private init() {
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
    }

    // MARK: - Query Operations

    func getFeedTypes(organizationId: String) async throws -> [FeedType] {
        let response: FeedTypesResponse = try await apiClient.get(
            APIEndpoints.feedTypes(organizationId)
        )
        return response.feedTypes
    }

    func getFeedingTimes(stableId: String) async throws -> [FeedingTime] {
        let response: FeedingTimesResponse = try await apiClient.get(
            APIEndpoints.feedingTimes(stableId)
        )
        return response.feedingTimes.sorted { $0.sortOrder < $1.sortOrder }
    }

    /// Get horse feedings for a stable, optionally filtered by feeding time and date
    ///
    /// - Parameters:
    ///   - stableId: The stable ID
    ///   - feedingTimeId: Optional feeding time ID to filter by (e.g., for routine steps)
    ///   - forDate: Optional date to filter feedings by their valid date range (startDate/endDate)
    /// - Returns: Array of active HorseFeeding objects that are valid for the specified date
    func getHorseFeedings(stableId: String, feedingTimeId: String? = nil, forDate: Date? = nil) async throws -> [HorseFeeding] {
        let response: HorseFeedingsResponse = try await apiClient.get(
            APIEndpoints.horseFeedings(stableId)
        )
        var feedings = response.horseFeedings.filter { $0.isActive }

        // Filter by date if provided (validates startDate/endDate range)
        if let date = forDate {
            feedings = feedings.filter { $0.isValidFor(date: date) }
        }

        // Filter by feeding time if specified
        if let feedingTimeId = feedingTimeId {
            feedings = feedings.filter { $0.feedingTimeId == feedingTimeId }
        }

        return feedings
    }

    func getDailyFeedingData(
        stableId: String,
        date: Date,
        horses: [Horse]
    ) async throws -> [DailyFeedingData] {
        // Fetch feeding times and horse feedings in parallel
        async let feedingTimesTask = getFeedingTimes(stableId: stableId)
        async let horseFeedingsTask = getHorseFeedings(stableId: stableId)

        let feedingTimes = try await feedingTimesTask
        let horseFeedings = try await horseFeedingsTask

        // Group feedings by feeding time
        var result: [DailyFeedingData] = []

        for feedingTime in feedingTimes where feedingTime.isActive {
            // Get all feedings for this time slot
            let feedingsForTime = horseFeedings.filter { $0.feedingTimeId == feedingTime.id }

            // Group by horse
            var horseStatusList: [HorseFeedingStatus] = []

            // Get unique horse IDs for this feeding time
            let uniqueHorseIds = Set(feedingsForTime.map { $0.horseId })

            for horseId in uniqueHorseIds {
                let feedingsForHorse = feedingsForTime.filter { $0.horseId == horseId }
                guard !feedingsForHorse.isEmpty else { continue }

                // Find the horse in the provided list
                guard let horse = horses.first(where: { $0.id == horseId }) else { continue }

                let status = HorseFeedingStatus(
                    id: "\(horseId)_\(feedingTime.id)",
                    horse: horse,
                    feedings: feedingsForHorse,
                    isCompleted: false, // TODO: Fetch from feeding log
                    completedBy: nil,
                    completedAt: nil,
                    notes: nil
                )

                horseStatusList.append(status)
            }

            // Sort by horse name
            horseStatusList.sort { $0.horse.name < $1.horse.name }

            if !horseStatusList.isEmpty {
                let data = DailyFeedingData(
                    id: feedingTime.id,
                    feedingTime: feedingTime,
                    horses: horseStatusList
                )
                result.append(data)
            }
        }

        return result
    }

    // MARK: - Mutation Operations

    func markFeedingComplete(
        stableId: String,
        horseId: String,
        feedingTimeId: String,
        date: Date,
        notes: String?
    ) async throws {
        let body = FeedingLogRequest(
            horseId: horseId,
            feedingTimeId: feedingTimeId,
            date: dateFormatter.string(from: date),
            completed: true,
            notes: notes
        )

        let _: EmptyResponse = try await apiClient.post(
            "\(APIEndpoints.horseFeedings(stableId))/log",
            body: body
        )
    }

    func markFeedingIncomplete(
        stableId: String,
        horseId: String,
        feedingTimeId: String,
        date: Date
    ) async throws {
        let body = FeedingLogRequest(
            horseId: horseId,
            feedingTimeId: feedingTimeId,
            date: dateFormatter.string(from: date),
            completed: false,
            notes: nil
        )

        let _: EmptyResponse = try await apiClient.post(
            "\(APIEndpoints.horseFeedings(stableId))/log",
            body: body
        )
    }
}

// MARK: - Request Types

private struct FeedingLogRequest: Encodable {
    let horseId: String
    let feedingTimeId: String
    let date: String
    let completed: Bool
    let notes: String?
}
