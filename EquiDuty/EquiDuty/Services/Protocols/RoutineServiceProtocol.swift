//
//  RoutineServiceProtocol.swift
//  EquiDuty
//
//  Protocol for routine management operations
//

import Foundation

/// Protocol defining routine management operations
protocol RoutineServiceProtocol {
    /// Get routine instances for a stable on a specific date
    func getRoutineInstances(
        stableId: String,
        date: Date
    ) async throws -> [RoutineInstance]

    /// Get routine instances for a stable within a date range
    func getRoutineInstancesForDateRange(
        stableId: String,
        startDate: Date,
        endDate: Date
    ) async throws -> [RoutineInstance]

    /// Get routine templates for an organization
    func getRoutineTemplates(
        organizationId: String
    ) async throws -> [RoutineTemplate]

    /// Get a single routine instance by ID
    func getRoutineInstance(instanceId: String) async throws -> RoutineInstance?

    /// Start a routine instance (acknowledge daily notes)
    func startRoutineInstance(
        instanceId: String,
        dailyNotesAcknowledged: Bool
    ) async throws

    /// Update routine progress for a step
    func updateRoutineProgress(
        instanceId: String,
        stepId: String,
        status: String?,
        generalNotes: String?,
        photoUrls: [String]?,
        horseUpdates: [HorseProgressUpdate]?
    ) async throws

    /// Complete a routine instance
    func completeRoutineInstance(
        instanceId: String,
        notes: String?
    ) async throws

    /// Get daily notes for a stable on a date
    func getDailyNotes(
        stableId: String,
        date: Date
    ) async throws -> DailyNotes?
}
