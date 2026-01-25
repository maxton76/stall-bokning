//
//  OwnershipService.swift
//  EquiDuty
//
//  Implementation of horse ownership management operations
//

import Foundation

/// Ownership service implementation using API client
@MainActor
final class OwnershipService: OwnershipServiceProtocol {
    static let shared = OwnershipService()

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Ownership Records

    func getOwnership(horseId: String) async throws -> [HorseOwnership] {
        let ownerships: [HorseOwnership] = try await apiClient.get(
            APIEndpoints.horseOwnershipByHorse(horseId)
        )
        return ownerships
    }

    func addOwnership(ownership: CreateOwnershipRequest) async throws -> HorseOwnership {
        let response: HorseOwnership = try await apiClient.post(
            APIEndpoints.horseOwnership,
            body: ownership
        )
        return response
    }

    func updateOwnership(ownershipId: String, updates: UpdateOwnershipRequest) async throws {
        let _: EmptyResponse = try await apiClient.patch(
            APIEndpoints.horseOwnershipById(ownershipId),
            body: updates
        )
    }

    func deleteOwnership(ownershipId: String) async throws {
        try await apiClient.delete(APIEndpoints.horseOwnershipById(ownershipId))
    }
}
