//
//  SelectionProcessService.swift
//  EquiDuty
//
//  Service for selection process (Rutinval) API operations
//

import Foundation

@MainActor
final class SelectionProcessService {
    static let shared = SelectionProcessService()

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Query Operations

    func listProcesses(stableId: String, status: SelectionProcessStatus? = nil) async throws -> [SelectionProcessSummary] {
        var params: [String: String] = ["stableId": stableId]
        if let status {
            params["status"] = status.rawValue
        }

        let response: SelectionProcessListResponse = try await apiClient.get(
            APIEndpoints.selectionProcesses,
            params: params
        )
        return response.selectionProcesses
    }

    func getProcess(processId: String) async throws -> SelectionProcessWithContext {
        try await apiClient.get(APIEndpoints.selectionProcess(processId))
    }

    func getStableMembers(stableId: String) async throws -> [StableMemberInfo] {
        let response: StableMembersResponse = try await apiClient.get(
            APIEndpoints.stableMembers(stableId)
        )
        return response.members
    }

    // MARK: - Mutation Operations

    func createProcess(input: CreateSelectionProcessInput) async throws -> SelectionProcessResponse {
        try await apiClient.post(APIEndpoints.selectionProcesses, body: input)
    }

    func startProcess(processId: String) async throws -> SelectionProcessResponse {
        try await apiClient.post(APIEndpoints.selectionProcessStart(processId), body: EmptyBody())
    }

    func completeTurn(processId: String) async throws -> CompleteTurnResult {
        try await apiClient.post(APIEndpoints.selectionProcessCompleteTurn(processId), body: EmptyBody())
    }

    func cancelProcess(processId: String, reason: String? = nil) async throws -> SelectionProcessResponse {
        try await apiClient.post(
            APIEndpoints.selectionProcessCancel(processId),
            body: CancelSelectionProcessInput(reason: reason)
        )
    }

    func updateDates(processId: String, startDate: String? = nil, endDate: String? = nil) async throws -> SelectionProcessResponse {
        try await apiClient.patch(
            APIEndpoints.selectionProcessDates(processId),
            body: UpdateSelectionDatesInput(selectionStartDate: startDate, selectionEndDate: endDate)
        )
    }

    func computeTurnOrder(input: ComputeTurnOrderInput) async throws -> ComputedTurnOrder {
        try await apiClient.post(APIEndpoints.selectionProcessComputeOrder, body: input)
    }

    func deleteProcess(processId: String) async throws {
        try await apiClient.delete(APIEndpoints.selectionProcess(processId))
    }
}

// MARK: - Helpers

private struct EmptyBody: Codable {}
