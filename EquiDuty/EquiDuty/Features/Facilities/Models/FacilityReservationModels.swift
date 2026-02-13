//
//  FacilityReservationModels.swift
//  EquiDuty
//
//  Facility reservation data models matching API responses
//

import Foundation

/// Reservation status values
enum ReservationStatus: String, Codable, CaseIterable {
    case pending
    case confirmed
    case cancelled
    case completed
    case noShow = "no_show"
    case rejected
}

/// A facility reservation
struct FacilityReservation: Codable, Identifiable {
    let id: String
    let facilityId: String
    let facilityName: String?
    let facilityType: String?
    let stableId: String
    let stableName: String?
    let userId: String
    let userEmail: String?
    let userFullName: String?
    let horseId: String?
    let horseName: String?
    let startTime: Date
    let endTime: Date
    let purpose: String?
    let notes: String?
    let status: ReservationStatus
    let createdAt: Date?
    let updatedAt: Date?
    let createdBy: String?
    let lastModifiedBy: String?
}

/// Response from GET /facility-reservations
struct ReservationsResponse: Codable {
    let reservations: [FacilityReservation]
}

/// Response from POST /facility-reservations/check-conflicts
struct ConflictCheckResponse: Codable {
    let conflicts: [FacilityReservation]
    let hasConflicts: Bool
}

/// Request body for creating a reservation
struct CreateReservationRequest: Encodable {
    let facilityId: String
    let stableId: String
    let startTime: String
    let endTime: String
    let horseId: String?
    let horseName: String?
    let purpose: String?
    let notes: String?
    let contactInfo: String?
}

/// Request body for updating a reservation
struct UpdateReservationRequest: Encodable {
    let startTime: String?
    let endTime: String?
    let horseId: String?
    let horseName: String?
    let purpose: String?
    let notes: String?
    let contactInfo: String?
}

/// Request body for conflict checking
struct CheckConflictsRequest: Encodable {
    let facilityId: String
    let startTime: String
    let endTime: String
    let excludeReservationId: String?
}

/// Simple success response
struct SimpleSuccessResponse: Codable {
    let success: Bool
    let id: String?
}
