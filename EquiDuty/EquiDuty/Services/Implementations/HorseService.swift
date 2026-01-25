//
//  HorseService.swift
//  EquiDuty
//
//  Implementation of horse management operations
//  Mirrors pattern from packages/frontend/src/services/horseService.ts
//

import Foundation

/// Horse service implementation using API client
@MainActor
final class HorseService: HorseServiceProtocol {
    static let shared = HorseService()

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Query Operations

    func getHorses(
        scope: HorseScope = .my,
        stableId: String? = nil,
        status: HorseStatus = .active
    ) async throws -> [Horse] {
        var params: [String: String] = [
            "scope": scope.rawValue,
            "status": status.rawValue
        ]

        if let stableId = stableId {
            params["stableId"] = stableId
        }

        let response: HorsesResponse = try await apiClient.get(
            APIEndpoints.horses,
            params: params
        )

        return response.horses
    }

    func getMyHorses(stableId: String? = nil, status: HorseStatus = .active) async throws -> [Horse] {
        return try await getHorses(scope: .my, stableId: stableId, status: status)
    }

    func getStableHorses(stableId: String, status: HorseStatus = .active) async throws -> [Horse] {
        return try await getHorses(scope: .stable, stableId: stableId, status: status)
    }

    func getAllAccessibleHorses(status: HorseStatus = .active) async throws -> [Horse] {
        return try await getHorses(scope: .all, stableId: nil, status: status)
    }

    func getHorse(id: String) async throws -> Horse? {
        do {
            // API returns horse directly, not wrapped
            let horse: Horse = try await apiClient.get(APIEndpoints.horse(id))
            return horse
        } catch APIError.notFound {
            return nil
        } catch APIError.forbidden {
            return nil
        }
    }

    // MARK: - CRUD Operations

    func createHorse(_ horse: CreateHorseRequest) async throws -> String {
        let response: CreateHorseResponse = try await apiClient.post(
            APIEndpoints.horses,
            body: horse
        )
        return response.id
    }

    func updateHorse(id: String, updates: UpdateHorseRequest) async throws {
        let _: EmptyResponse = try await apiClient.patch(
            APIEndpoints.horse(id),
            body: updates
        )
    }

    func deleteHorse(id: String) async throws {
        try await apiClient.delete(APIEndpoints.horse(id))
    }

    // MARK: - Team Members

    func getTeamMembers(horseId: String) async throws -> [HorseTeamMember] {
        let members: [HorseTeamMember] = try await apiClient.get(
            APIEndpoints.horseTeam(horseId)
        )
        return members
    }

    func addTeamMember(horseId: String, member: HorseTeamMember) async throws {
        let _: EmptyResponse = try await apiClient.post(
            APIEndpoints.horseTeam(horseId),
            body: member
        )
    }

    func updateTeamMember(horseId: String, index: Int, member: HorseTeamMember) async throws {
        let _: EmptyResponse = try await apiClient.put(
            APIEndpoints.horseTeamMember(horseId, index: index),
            body: member
        )
    }

    func deleteTeamMember(horseId: String, index: Int) async throws {
        try await apiClient.delete(APIEndpoints.horseTeamMember(horseId, index: index))
    }
}

// MARK: - Response Types

private struct CreateHorseResponse: Codable {
    let id: String
}
