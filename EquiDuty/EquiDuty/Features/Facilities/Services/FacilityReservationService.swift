//
//  FacilityReservationService.swift
//  EquiDuty
//
//  Implementation of facility reservation operations using API client
//

import Foundation

/// Facility reservation service implementation
@MainActor
final class FacilityReservationService: FacilityReservationServiceProtocol {
    static let shared = FacilityReservationService()

    private let apiClient = APIClient.shared
    private let dateFormatter: DateFormatter

    private init() {
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
    }

    // MARK: - Query Operations

    func getReservations(facilityId: String, startDate: Date?, endDate: Date?) async throws -> [FacilityReservation] {
        var params = ["facilityId": facilityId]
        if let startDate {
            params["startDate"] = dateFormatter.string(from: startDate)
        }
        if let endDate {
            params["endDate"] = dateFormatter.string(from: endDate)
        }
        let response: ReservationsResponse = try await apiClient.get(
            APIEndpoints.facilityReservations,
            params: params
        )
        return response.reservations
    }

    func getMyReservations(userId: String) async throws -> [FacilityReservation] {
        let params = ["userId": userId]
        let response: ReservationsResponse = try await apiClient.get(
            APIEndpoints.facilityReservations,
            params: params
        )
        return response.reservations
    }

    func getStableReservations(stableId: String, startDate: Date?, endDate: Date?) async throws -> [FacilityReservation] {
        var params = ["stableId": stableId]
        if let startDate {
            params["startDate"] = dateFormatter.string(from: startDate)
        }
        if let endDate {
            params["endDate"] = dateFormatter.string(from: endDate)
        }
        let response: ReservationsResponse = try await apiClient.get(
            APIEndpoints.facilityReservations,
            params: params
        )
        return response.reservations
    }

    // MARK: - Mutation Operations

    func createReservation(_ request: CreateReservationRequest) async throws -> FacilityReservation {
        let response: FacilityReservation = try await apiClient.post(
            APIEndpoints.facilityReservations,
            body: request
        )
        return response
    }

    func updateReservation(id: String, updates: UpdateReservationRequest) async throws -> FacilityReservation {
        let response: FacilityReservation = try await apiClient.patch(
            APIEndpoints.facilityReservation(id),
            body: updates
        )
        return response
    }

    func cancelReservation(id: String) async throws {
        let _: SimpleSuccessResponse = try await apiClient.post(
            APIEndpoints.facilityReservationCancel(id),
            body: EmptyBody()
        )
    }

    func approveReservation(id: String) async throws {
        let _: SimpleSuccessResponse = try await apiClient.post(
            APIEndpoints.facilityReservationApprove(id),
            body: EmptyBody()
        )
    }

    func rejectReservation(id: String) async throws {
        let _: SimpleSuccessResponse = try await apiClient.post(
            APIEndpoints.facilityReservationReject(id),
            body: EmptyBody()
        )
    }

    func checkConflicts(_ request: CheckConflictsRequest) async throws -> ConflictCheckResponse {
        let response: ConflictCheckResponse = try await apiClient.post(
            APIEndpoints.facilityReservationCheckConflicts,
            body: request
        )
        return response
    }

    // MARK: - Analytics

    func getAnalytics(stableId: String, startDate: Date?, endDate: Date?) async throws -> FacilityAnalytics {
        var params = ["stableId": stableId]
        if let startDate {
            params["startDate"] = dateFormatter.string(from: startDate)
        }
        if let endDate {
            params["endDate"] = dateFormatter.string(from: endDate)
        }
        let response: FacilityAnalytics = try await apiClient.get(
            APIEndpoints.facilityReservationAnalytics,
            params: params
        )
        return response
    }
}

// MARK: - Request Types

private struct EmptyBody: Encodable {}
