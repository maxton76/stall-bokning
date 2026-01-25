//
//  OwnershipServiceProtocol.swift
//  EquiDuty
//
//  Protocol for horse ownership management operations
//

import Foundation

/// Protocol defining horse ownership management operations
protocol OwnershipServiceProtocol {
    /// Get all ownership records for a horse
    func getOwnership(horseId: String) async throws -> [HorseOwnership]

    /// Add a new ownership record
    func addOwnership(ownership: CreateOwnershipRequest) async throws -> HorseOwnership

    /// Update an existing ownership record
    func updateOwnership(ownershipId: String, updates: UpdateOwnershipRequest) async throws

    /// Delete an ownership record
    func deleteOwnership(ownershipId: String) async throws
}

// MARK: - Request Types

struct CreateOwnershipRequest: Encodable {
    let horseId: String
    let ownerId: String?
    let ownerName: String
    let role: OwnershipRole
    let percentage: Double
    let startDate: Date
    let endDate: Date?
    let email: String?
    let phone: String?
    let notes: String?
}

struct UpdateOwnershipRequest: Encodable {
    var ownerName: String?
    var role: OwnershipRole?
    var percentage: Double?
    var startDate: Date?
    var endDate: Date?
    var email: String?
    var phone: String?
    var notes: String?
}
