//
//  StableService.swift
//  EquiDuty
//
//  Service for stable CRUD operations
//

import Foundation

/// Response from create stable endpoint
struct CreateStableResponse: Codable {
    let id: String
}

/// Stable service implementation
@MainActor
final class StableService {
    static let shared = StableService()

    private let apiClient = APIClient.shared

    private init() {}

    func getStables(organizationId: String) async throws -> [Stable] {
        let response: StablesResponse = try await apiClient.get(
            APIEndpoints.stables(organizationId: organizationId)
        )
        return response.stables
    }

    func getStable(id: String) async throws -> Stable {
        let response: Stable = try await apiClient.get(
            APIEndpoints.stableById(id)
        )
        return response
    }

    func createStable(_ request: CreateStableRequest) async throws -> String {
        let response: CreateStableResponse = try await apiClient.post(
            APIEndpoints.stablesCreate,
            body: request
        )
        return response.id
    }

    func updateStable(id: String, updates: UpdateStableRequest) async throws -> Stable {
        let response: Stable = try await apiClient.patch(
            APIEndpoints.stableById(id),
            body: updates
        )
        return response
    }

    func deleteStable(id: String) async throws {
        try await apiClient.delete(APIEndpoints.stableById(id))
    }
}
