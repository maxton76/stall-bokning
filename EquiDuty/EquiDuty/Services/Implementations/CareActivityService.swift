//
//  CareActivityService.swift
//  EquiDuty
//
//  Service for care activity operations, wrapping ActivityService
//

import Foundation

/// Service for care-specific activity operations
@MainActor
final class CareActivityService {
    static let shared = CareActivityService()

    private let activityService = ActivityService.shared
    private let dateFormatter: DateFormatter

    private init() {
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
    }

    // MARK: - Query Operations

    /// Get aggregated care activity statuses for a horse
    /// Groups activities by care type and finds last completed + next scheduled
    func getCareActivityStatuses(horseId: String) async throws -> [CareActivityStatus] {
        // Fetch all activities for this horse
        let activities = try await activityService.getActivitiesForHorse(horseId: horseId, limit: nil)

        // Filter to only care activity types
        let careActivities = activities.filter { activity in
            CareActivityType.from(activityTypeName: activity.activityTypeName.lowercased()) != nil ||
            CareActivityType.allTypeNames.contains(activity.activityTypeName.lowercased())
        }

        // Group by care type
        var statusesByType: [CareActivityType: (completed: [ActivityInstance], scheduled: [ActivityInstance])] = [:]

        // Initialize all types
        for type in CareActivityType.allCases {
            statusesByType[type] = (completed: [], scheduled: [])
        }

        // Sort activities into completed vs scheduled
        let now = Date()
        for activity in careActivities {
            guard let type = CareActivityType.from(activityTypeName: activity.activityTypeName.lowercased()) else {
                continue
            }

            if activity.status == .completed {
                statusesByType[type]?.completed.append(activity)
            } else if activity.status == .pending || activity.status == .inProgress {
                statusesByType[type]?.scheduled.append(activity)
            }
        }

        // Build status objects
        var statuses: [CareActivityStatus] = []

        for type in CareActivityType.allCases {
            guard let activities = statusesByType[type] else { continue }

            // Find most recent completed activity
            let lastCompleted = activities.completed
                .sorted { $0.scheduledDate > $1.scheduledDate }
                .first

            // Find next scheduled activity (closest future date)
            let nextScheduled = activities.scheduled
                .sorted { $0.scheduledDate < $1.scheduledDate }
                .first

            let status = CareActivityStatus(
                type: type,
                lastCompletedDate: lastCompleted?.scheduledDate,
                lastCompletedActivity: lastCompleted,
                nextScheduledDate: nextScheduled?.scheduledDate,
                nextScheduledActivity: nextScheduled
            )

            statuses.append(status)
        }

        return statuses
    }

    // MARK: - Mutation Operations

    /// Create a new care activity
    func createCareActivity(
        horseId: String,
        horseName: String,
        stableId: String,
        stableName: String?,
        type: CareActivityType,
        date: Date,
        note: String?
    ) async throws -> String {
        let request = CreateActivityRequest(
            type: "activity",
            stableId: stableId,
            stableName: stableName,
            horseId: horseId,
            horseName: horseName,
            date: dateFormatter.string(from: date),
            activityType: type.rawValue,
            activityTypeConfigId: nil,
            note: note,
            assignedTo: nil,
            assignedToName: nil
        )

        return try await activityService.createActivity(request)
    }

    /// Complete a care activity
    func completeCareActivity(activityId: String, notes: String? = nil) async throws {
        try await activityService.completeActivity(activityId: activityId, notes: notes)
    }

    /// Cancel a care activity
    func cancelCareActivity(activityId: String) async throws {
        try await activityService.cancelActivity(activityId: activityId)
    }

    /// Update a care activity
    func updateCareActivity(
        activityId: String,
        date: Date? = nil,
        note: String? = nil
    ) async throws {
        var updates = UpdateActivityRequest()

        if let date = date {
            updates.date = dateFormatter.string(from: date)
        }

        if let note = note {
            updates.note = note
        }

        try await activityService.updateActivity(activityId: activityId, updates: updates)
    }
}
