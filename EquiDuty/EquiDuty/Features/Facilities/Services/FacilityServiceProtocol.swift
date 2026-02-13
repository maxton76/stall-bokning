//
//  FacilityServiceProtocol.swift
//  EquiDuty
//
//  Protocol for facility operations
//

import Foundation

/// Protocol defining facility-related operations
protocol FacilityServiceProtocol {
    func getFacilities(stableId: String) async throws -> [Facility]
    func getFacility(id: String) async throws -> Facility
    func getAvailableSlots(facilityId: String, date: Date) async throws -> AvailableSlotsResponse
}
