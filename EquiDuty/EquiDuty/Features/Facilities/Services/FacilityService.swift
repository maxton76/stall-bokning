//
//  FacilityService.swift
//  EquiDuty
//
//  Implementation of facility operations using API client
//

import Foundation

/// Facility service implementation
@MainActor
final class FacilityService: FacilityServiceProtocol {
    static let shared = FacilityService()

    private let apiClient = APIClient.shared
    private let dateFormatter: DateFormatter

    private init() {
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
    }

    func getFacilities(stableId: String, reservableOnly: Bool = false) async throws -> [Facility] {
        var params = ["stableId": stableId]

        if reservableOnly {
            params["reservableOnly"] = "true"
        }

        let response: FacilitiesResponse = try await apiClient.get(
            APIEndpoints.facilities,
            params: params
        )
        return response.facilities
    }

    func getFacility(id: String) async throws -> Facility {
        let response: Facility = try await apiClient.get(
            APIEndpoints.facility(id)
        )
        return response
    }

    func getAvailableSlots(facilityId: String, date: Date) async throws -> AvailableSlotsResponse {
        let dateString = dateFormatter.string(from: date)
        let params = ["date": dateString]
        let response: AvailableSlotsResponse = try await apiClient.get(
            APIEndpoints.facilityAvailableSlots(facilityId),
            params: params
        )
        return response
    }

    func createFacility(_ request: CreateFacilityRequest) async throws -> String {
        let response: CreateFacilityResponse = try await apiClient.post(
            APIEndpoints.facilities,
            body: request
        )
        return response.id
    }

    func updateFacility(id: String, updates: UpdateFacilityRequest) async throws -> Facility {
        let response: Facility = try await apiClient.patch(
            APIEndpoints.facility(id),
            body: updates
        )
        return response
    }

    func deleteFacility(id: String) async throws {
        try await apiClient.delete(APIEndpoints.facility(id))
    }

    func addScheduleException(facilityId: String, exception: CreateScheduleExceptionRequest) async throws -> ScheduleException {
        let response: ScheduleExceptionResponse = try await apiClient.post(
            APIEndpoints.facilityExceptions(facilityId),
            body: exception
        )
        return response.exception
    }

    func removeScheduleException(facilityId: String, date: String) async throws {
        try await apiClient.delete(APIEndpoints.facilityException(facilityId, date: date))
    }
}
