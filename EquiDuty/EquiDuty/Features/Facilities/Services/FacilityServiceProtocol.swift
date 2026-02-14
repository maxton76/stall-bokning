//
//  FacilityServiceProtocol.swift
//  EquiDuty
//
//  Protocol for facility operations
//

import Foundation

/// Protocol defining facility-related operations
protocol FacilityServiceProtocol {
    func getFacilities(stableId: String, reservableOnly: Bool) async throws -> [Facility]
    func getFacility(id: String) async throws -> Facility
    func getAvailableSlots(facilityId: String, date: Date) async throws -> AvailableSlotsResponse
    func createFacility(_ request: CreateFacilityRequest) async throws -> String
    func updateFacility(id: String, updates: UpdateFacilityRequest) async throws -> Facility
    func deleteFacility(id: String) async throws
    func addScheduleException(facilityId: String, exception: CreateScheduleExceptionRequest) async throws -> ScheduleException
    func removeScheduleException(facilityId: String, date: String) async throws
}
