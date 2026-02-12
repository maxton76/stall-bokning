//
//  HealthRecordService.swift
//  EquiDuty
//
//  Service for health record CRUD operations
//  API: /api/v1/health-records

import Foundation

@MainActor
final class HealthRecordService {
    static let shared = HealthRecordService()

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Query

    func getHealthRecords(
        horseId: String,
        recordType: HealthRecordType? = nil,
        limit: Int = 50,
        offset: Int = 0
    ) async throws -> [HealthRecord] {
        var params: [String: String] = [
            "limit": String(limit),
            "offset": String(offset),
        ]
        if let recordType {
            params["recordType"] = recordType.rawValue
        }

        let response: HealthRecordsResponse = try await apiClient.get(
            APIEndpoints.healthRecords(horseId),
            params: params
        )
        return response.records
    }

    func getHealthRecord(id: String, horseId: String) async throws -> HealthRecord {
        try await apiClient.get(
            APIEndpoints.healthRecord(id),
            params: ["horseId": horseId]
        )
    }

    func getStats(horseId: String) async throws -> HealthRecordStats {
        try await apiClient.get(APIEndpoints.healthRecordStats(horseId))
    }

    func getUpcomingFollowUps(horseId: String, days: Int = 30) async throws -> [HealthRecord] {
        let response: HealthRecordsResponse = try await apiClient.get(
            APIEndpoints.healthRecordFollowUps(horseId),
            params: ["days": String(days)]
        )
        return response.records
    }

    // MARK: - CRUD

    func createHealthRecord(_ request: CreateHealthRecordRequest) async throws -> HealthRecord {
        try await apiClient.post(APIEndpoints.healthRecordsCreate, body: request)
    }

    func updateHealthRecord(id: String, updates: UpdateHealthRecordRequest) async throws -> HealthRecord {
        try await apiClient.patch(APIEndpoints.healthRecord(id), body: updates)
    }

    func deleteHealthRecord(id: String, horseId: String) async throws {
        try await apiClient.delete(
            APIEndpoints.healthRecord(id),
            params: ["horseId": horseId]
        )
    }
}
