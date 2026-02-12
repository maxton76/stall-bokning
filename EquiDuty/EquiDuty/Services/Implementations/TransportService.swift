//
//  TransportService.swift
//  EquiDuty
//
//  Service for horse transport instructions CRUD
//  API: /api/v1/horses/:horseId/transport

import Foundation

@MainActor
final class TransportService {
    static let shared = TransportService()

    private let apiClient = APIClient.shared

    private init() {}

    func getTransportInstructions(horseId: String) async throws -> TransportInstructions {
        let response: TransportInstructionsResponse = try await apiClient.get(
            APIEndpoints.horseTransport(horseId)
        )
        return response.toInstructions()
    }

    func updateTransportInstructions(horseId: String, instructions: TransportInstructions) async throws {
        let _: EmptyResponse = try await apiClient.put(
            APIEndpoints.horseTransport(horseId),
            body: instructions
        )
    }

    func deleteTransportInstructions(horseId: String) async throws {
        try await apiClient.delete(APIEndpoints.horseTransport(horseId))
    }
}
