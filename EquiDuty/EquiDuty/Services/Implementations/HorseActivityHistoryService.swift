//
//  HorseActivityHistoryService.swift
//  EquiDuty
//
//  Implementation of horse activity history operations
//

import Foundation

/// Horse activity history service implementation using API client
@MainActor
final class HorseActivityHistoryService {
    static let shared = HorseActivityHistoryService()

    private let apiClient = APIClient.shared

    private init() {
        // No longer need custom date formatter - using Date+ISO8601 extensions
    }

    // MARK: - Query Operations

    /// Get activity history for a specific horse
    /// - Parameters:
    ///   - horseId: The horse ID to fetch history for
    ///   - categories: Optional set of categories to filter by (nil = all categories)
    ///   - startDate: Optional start date for filtering
    ///   - endDate: Optional end date for filtering
    ///   - limit: Maximum number of entries to return (default: 50)
    ///   - cursor: Pagination cursor for next page
    /// - Returns: HorseActivityHistoryResponse with activities and pagination info
    func getActivityHistory(
        horseId: String,
        categories: Set<RoutineCategory>? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil,
        limit: Int = 50,
        cursor: String? = nil
    ) async throws -> HorseActivityHistoryResponse {
        var params: [String: String] = [
            "limit": String(limit)
        ]

        // Add date filters using ISO 8601 datetime format
        // API requires format: "2026-02-01T00:00:00Z" (not "2026-02-01")
        if let startDate = startDate {
            params["startDate"] = startDate.startOfDayISO8601()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.endOfDayISO8601()
        }

        // Add cursor for pagination
        if let cursor = cursor {
            params["cursor"] = cursor
        }

        // Note: The API supports single category filter only
        // For multi-category, we fetch all and filter client-side
        // If only one category is selected, pass it to the API
        if let categories = categories, categories.count == 1, let category = categories.first {
            params["category"] = category.rawValue
        }

        let response: HorseActivityHistoryResponse = try await apiClient.get(
            APIEndpoints.horseActivityHistory(horseId),
            params: params
        )

        // If we have multiple categories to filter, do it client-side
        if let categories = categories, categories.count > 1 {
            let filteredActivities = response.activities.filter { activity in
                categories.contains(activity.category)
            }
            return HorseActivityHistoryResponse(
                activities: filteredActivities,
                nextCursor: response.nextCursor,
                hasMore: response.hasMore,
                horseName: response.horseName
            )
        }

        return response
    }

    /// Get activity history with date range filter
    /// - Parameters:
    ///   - horseId: The horse ID to fetch history for
    ///   - dateRange: Predefined date range filter
    ///   - categories: Optional set of categories to filter by
    ///   - limit: Maximum number of entries to return
    ///   - cursor: Pagination cursor for next page
    /// - Returns: HorseActivityHistoryResponse with activities and pagination info
    func getActivityHistory(
        horseId: String,
        dateRange: ActivityDateRange,
        categories: Set<RoutineCategory>? = nil,
        limit: Int = 50,
        cursor: String? = nil
    ) async throws -> HorseActivityHistoryResponse {
        return try await getActivityHistory(
            horseId: horseId,
            categories: categories,
            startDate: dateRange.startDate(),
            endDate: Date(),
            limit: limit,
            cursor: cursor
        )
    }
}
