//
//  FacilityReservationServiceProtocol.swift
//  EquiDuty
//
//  Protocol for facility reservation operations
//

import Foundation

/// Protocol defining facility reservation operations
protocol FacilityReservationServiceProtocol {
    func getReservations(facilityId: String, startDate: Date?, endDate: Date?) async throws -> [FacilityReservation]
    func getMyReservations(userId: String) async throws -> [FacilityReservation]
    func getStableReservations(stableId: String, startDate: Date?, endDate: Date?) async throws -> [FacilityReservation]
    func createReservation(_ request: CreateReservationRequest) async throws -> FacilityReservation
    func updateReservation(id: String, updates: UpdateReservationRequest) async throws -> FacilityReservation
    func cancelReservation(id: String) async throws
    func approveReservation(id: String) async throws
    func rejectReservation(id: String) async throws
    func checkConflicts(_ request: CheckConflictsRequest) async throws -> ConflictCheckResponse
    func getAnalytics(stableId: String, startDate: Date?, endDate: Date?) async throws -> FacilityAnalytics
}
