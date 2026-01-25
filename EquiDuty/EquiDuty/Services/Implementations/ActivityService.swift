//
//  ActivityService.swift
//  EquiDuty
//
//  Implementation of activity management operations
//

import Foundation

/// Activity service implementation using API client
@MainActor
final class ActivityService: ActivityServiceProtocol {
    static let shared = ActivityService()

    private let apiClient = APIClient.shared
    private let dateFormatter: DateFormatter

    private init() {
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
    }

    // MARK: - Query Operations

    func getActivitiesForStable(
        stableId: String,
        startDate: Date? = nil,
        endDate: Date? = nil,
        types: [String]? = nil
    ) async throws -> [ActivityInstance] {
        var params: [String: String] = [:]

        if let startDate = startDate {
            params["startDate"] = dateFormatter.string(from: startDate)
        }

        if let endDate = endDate {
            params["endDate"] = dateFormatter.string(from: endDate)
        }

        if let types = types, !types.isEmpty {
            params["types"] = types.joined(separator: ",")
        }

        let response: ActivityInstancesResponse = try await apiClient.get(
            APIEndpoints.activitiesForStable(stableId),
            params: params.isEmpty ? nil : params
        )

        return response.activities
    }

    func getActivitiesForHorse(
        horseId: String,
        limit: Int? = nil
    ) async throws -> [ActivityInstance] {
        var params: [String: String] = [:]

        if let limit = limit {
            params["limit"] = String(limit)
        }

        let response: ActivityInstancesResponse = try await apiClient.get(
            APIEndpoints.activitiesForHorse(horseId),
            params: params.isEmpty ? nil : params
        )

        return response.activities
    }

    func getMyActivities(
        userId: String,
        stableId: String? = nil
    ) async throws -> [ActivityInstance] {
        var params: [String: String] = [:]

        if let stableId = stableId {
            params["stableId"] = stableId
        }

        let response: ActivityInstancesResponse = try await apiClient.get(
            APIEndpoints.activitiesForUser(userId),
            params: params.isEmpty ? nil : params
        )

        return response.activities
    }

    // Legacy method for backwards compatibility with views
    func getActivityInstances(
        organizationId: String,
        date: Date? = nil,
        status: ActivityInstanceStatus? = nil
    ) async throws -> [ActivityInstance] {
        // This method is deprecated - views should use getActivitiesForStable instead
        // For now, return empty array since we need stableId
        print("⚠️ getActivityInstances(organizationId:) is deprecated. Use getActivitiesForStable(stableId:) instead")
        return []
    }

    func getActivityInstance(activityId: String) async throws -> ActivityInstance? {
        do {
            let response: ActivityInstance = try await apiClient.get(
                APIEndpoints.activity(activityId)
            )
            return response
        } catch APIError.notFound {
            return nil
        } catch APIError.forbidden {
            return nil
        }
    }

    // MARK: - Mutation Operations

    func createActivity(_ request: CreateActivityRequest) async throws -> String {
        let response: CreateActivityResponse = try await apiClient.post(
            APIEndpoints.activities,
            body: request
        )
        return response.id
    }

    func updateActivity(
        activityId: String,
        updates: UpdateActivityRequest
    ) async throws {
        let _: EmptyResponse = try await apiClient.put(
            APIEndpoints.activity(activityId),
            body: updates
        )
    }

    func completeActivity(
        activityId: String,
        notes: String? = nil
    ) async throws {
        let body = CompleteActivityRequest(notes: notes)
        let _: EmptyResponse = try await apiClient.patch(
            APIEndpoints.activityComplete(activityId),
            body: body
        )
    }

    func cancelActivity(activityId: String) async throws {
        var updates = UpdateActivityRequest()
        updates.status = .cancelled

        try await updateActivity(
            activityId: activityId,
            updates: updates
        )
    }
}

// MARK: - Request Types

private struct CompleteActivityRequest: Encodable {
    let notes: String?
}

// MARK: - Response Types

private struct CreateActivityResponse: Codable {
    let id: String
}
