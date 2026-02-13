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

    func getFacilities(stableId: String) async throws -> [Facility] {
        let params = ["stableId": stableId]
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
}
