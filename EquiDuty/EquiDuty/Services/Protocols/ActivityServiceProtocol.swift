//
//  ActivityServiceProtocol.swift
//  EquiDuty
//
//  Protocol for activity management operations
//

import Foundation

/// Protocol defining activity management operations
protocol ActivityServiceProtocol {
    /// Get activities for a stable with optional filtering
    func getActivitiesForStable(
        stableId: String,
        startDate: Date?,
        endDate: Date?,
        types: [String]?
    ) async throws -> [ActivityInstance]

    /// Get activities for a specific horse
    func getActivitiesForHorse(
        horseId: String,
        limit: Int?
    ) async throws -> [ActivityInstance]

    /// Get activities assigned to a user
    func getMyActivities(
        userId: String,
        stableId: String?
    ) async throws -> [ActivityInstance]

    /// Get a single activity instance
    func getActivityInstance(activityId: String) async throws -> ActivityInstance?

    /// Create an activity instance
    func createActivity(_ request: CreateActivityRequest) async throws -> String

    /// Update an activity instance
    func updateActivity(
        activityId: String,
        updates: UpdateActivityRequest
    ) async throws

    /// Complete an activity
    func completeActivity(
        activityId: String,
        notes: String?
    ) async throws

    /// Cancel an activity
    func cancelActivity(activityId: String) async throws
}

// MARK: - Request Types

struct CreateActivityRequest: Encodable {
    let type: String  // "activity", "task", or "message"
    let stableId: String
    let stableName: String?
    let horseId: String?
    let horseName: String?
    let date: String  // ISO date string
    let activityType: String?
    let activityTypeConfigId: String?
    let note: String?
    let assignedTo: String?
    let assignedToName: String?
}

struct UpdateActivityRequest: Encodable {
    var date: String?
    var status: ActivityInstanceStatus?
    var note: String?
    var title: String?
    var description: String?
    var message: String?
    var assignedTo: String?
    var assignedToName: String?
    var activityTypeConfigId: String?
    var activityTypeColor: String?
}
