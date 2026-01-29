//
//  RoutineService.swift
//  EquiDuty
//
//  Implementation of routine management operations
//

import Foundation

/// Routine service implementation using API client
@MainActor
final class RoutineService: RoutineServiceProtocol {
    static let shared = RoutineService()

    private let apiClient = APIClient.shared
    private let dateFormatter: DateFormatter

    private init() {
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
    }

    // MARK: - Query Operations

    func getRoutineInstances(stableId: String, date: Date) async throws -> [RoutineInstance] {
        let dateString = dateFormatter.string(from: date)
        let params: [String: String] = [
            "startDate": dateString,
            "endDate": dateString
        ]

        let response: RoutineInstancesResponse = try await apiClient.get(
            APIEndpoints.routineInstances(stableId),
            params: params
        )

        return response.routineInstances
    }

    func getRoutineInstancesForDateRange(
        stableId: String,
        startDate: Date,
        endDate: Date
    ) async throws -> [RoutineInstance] {
        let params: [String: String] = [
            "startDate": dateFormatter.string(from: startDate),
            "endDate": dateFormatter.string(from: endDate)
        ]

        let response: RoutineInstancesResponse = try await apiClient.get(
            APIEndpoints.routineInstances(stableId),
            params: params
        )

        return response.routineInstances
    }

    func getRoutineTemplates(organizationId: String) async throws -> [RoutineTemplate] {
        let response: RoutineTemplatesResponse = try await apiClient.get(
            APIEndpoints.routineTemplates(organizationId)
        )

        return response.routineTemplates
    }

    func getRoutineInstance(instanceId: String) async throws -> RoutineInstance? {
        do {
            let response: RoutineInstance = try await apiClient.get(
                APIEndpoints.routineInstance(instanceId)
            )
            return response
        } catch APIError.notFound {
            return nil
        } catch APIError.forbidden {
            return nil
        }
    }

    // MARK: - Mutation Operations

    func startRoutineInstance(instanceId: String, dailyNotesAcknowledged: Bool = true) async throws {
        let body = StartRoutineRequest(dailyNotesAcknowledged: dailyNotesAcknowledged)
        let _: StartRoutineResponse = try await apiClient.post(
            APIEndpoints.routineInstanceStart(instanceId),
            body: body
        )
    }

    func updateRoutineProgress(
        instanceId: String,
        stepId: String,
        status: String? = nil,
        generalNotes: String? = nil,
        photoUrls: [String]? = nil,
        horseUpdates: [HorseProgressUpdate]? = nil
    ) async throws {
        let body = UpdateProgressRequest(
            stepId: stepId,
            status: status,
            generalNotes: generalNotes,
            photoUrls: photoUrls,
            horseUpdates: horseUpdates
        )
        #if DEBUG
        // Debug: Log the request body
        if let updates = horseUpdates {
            for update in updates {
                print("📤 RoutineService - Sending horse update: horseId=\(update.horseId), notes=\(update.notes ?? "nil"), completed=\(update.completed ?? false)")
            }
        }
        #endif
        // Use EmptyResponse to avoid decoding issues - we don't need the response data
        let _: EmptyResponse = try await apiClient.put(
            APIEndpoints.routineInstanceProgress(instanceId),
            body: body
        )
    }

    func completeRoutineInstance(instanceId: String, notes: String? = nil) async throws {
        let body = CompleteRoutineRequest(notes: notes)
        // Use EmptyResponse to avoid decoding issues - we don't need the response data
        let _: EmptyResponse = try await apiClient.post(
            APIEndpoints.routineInstanceComplete(instanceId),
            body: body
        )
    }

    func getDailyNotes(stableId: String, date: Date) async throws -> DailyNotes? {
        let dateString = dateFormatter.string(from: date)

        do {
            let response: DailyNotesResponse = try await apiClient.get(
                APIEndpoints.dailyNotes(stableId, date: dateString)
            )
            return response.dailyNotes
        } catch APIError.notFound {
            return nil
        }
    }
}

// MARK: - Request Types

private struct StartRoutineRequest: Encodable {
    let dailyNotesAcknowledged: Bool
}

private struct UpdateProgressRequest: Encodable {
    let stepId: String
    let status: String?
    let generalNotes: String?
    let photoUrls: [String]?
    let horseUpdates: [HorseProgressUpdate]?
}

private struct CompleteRoutineRequest: Encodable {
    let notes: String?
}

// MARK: - Response Types

private struct StartRoutineResponse: Decodable {
    let instance: RoutineInstance
}

// MARK: - Progress Update Types

struct HorseProgressUpdate: Encodable {
    let horseId: String
    let horseName: String?
    let completed: Bool?
    let skipped: Bool?
    let skipReason: String?
    let notes: String?
    let feedingConfirmed: Bool?
    let medicationGiven: Bool?
    let medicationSkipped: Bool?
    let blanketAction: String?
    let photoUrls: [String]?
}
