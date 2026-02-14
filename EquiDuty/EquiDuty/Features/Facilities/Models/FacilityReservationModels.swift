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
    let horseIds: [String]?
    let horseNames: [String]?
    let externalHorseCount: Int?
    let startTime: Date
    let endTime: Date
    let purpose: String?
    let notes: String?
    let status: ReservationStatus
    let createdAt: Date?
    let updatedAt: Date?
    let createdBy: String?
    let lastModifiedBy: String?

    /// Returns all horse IDs, normalizing both legacy and new formats
    var allHorseIds: [String] {
        if let ids = horseIds, !ids.isEmpty {
            return ids
        }
        if let id = horseId, !id.isEmpty {
            return [id]
        }
        return []
    }

    /// Returns all horse names, normalizing both legacy and new formats
    var allHorseNames: [String] {
        if let names = horseNames, !names.isEmpty {
            return names
        }
        if let name = horseName, !name.isEmpty {
            return [name]
        }
        return []
    }

    /// Number of horses in this reservation (stable horses + external horses)
    var horseCount: Int {
        let stableHorses = allHorseIds.count
        let externalHorses = externalHorseCount ?? 0
        return stableHorses + externalHorses
    }

    /// Display string for horses (single name or count, including external)
    var horseDisplayText: String {
        let names = allHorseNames
        let externalCount = externalHorseCount ?? 0

        if names.isEmpty && externalCount > 0 {
            // Only external horses
            return String(localized: "reservation.externalHorses \(externalCount)")
        } else if names.count == 1 && externalCount == 0 {
            // Single stable horse, no external
            return names[0]
        } else if names.count > 1 && externalCount == 0 {
            // Multiple stable horses, no external
            return String(localized: "reservation.horseCount \(names.count)")
        } else if names.count > 0 && externalCount > 0 {
            // Both stable and external horses
            return String(localized: "reservation.mixedHorses \(names.count) \(externalCount)")
        } else {
            return ""
        }
    }
}

/// Response from GET /facility-reservations
struct ReservationsResponse: Codable {
    let reservations: [FacilityReservation]
}

/// Response from POST /facility-reservations/check-conflicts
struct ConflictCheckResponse: Codable {
    let conflicts: [FacilityReservation]
    let hasConflicts: Bool
    let maxHorsesPerReservation: Int?
    let peakConcurrentHorses: Int?
    let remainingCapacity: Int?
}

/// Request body for creating a reservation
struct CreateReservationRequest: Encodable {
    let facilityId: String
    let stableId: String
    let startTime: String
    let endTime: String
    let horseId: String?
    let horseName: String?
    let horseIds: [String]?
    let horseNames: [String]?
    let externalHorseCount: Int?
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
    let horseIds: [String]?
    let horseNames: [String]?
    let externalHorseCount: Int?
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
