//
//  VaccinationServiceProtocol.swift
//  EquiDuty
//
//  Protocol for vaccination management operations
//

import Foundation

/// Protocol defining vaccination management operations
protocol VaccinationServiceProtocol {
    /// Get all vaccination records for a horse
    func getVaccinationRecords(horseId: String) async throws -> [VaccinationRecord]

    /// Add a new vaccination record
    func addVaccinationRecord(horseId: String, record: CreateVaccinationRequest) async throws -> VaccinationRecord

    /// Update an existing vaccination record
    func updateVaccinationRecord(horseId: String, recordId: String, updates: UpdateVaccinationRequest) async throws

    /// Delete a vaccination record
    func deleteVaccinationRecord(horseId: String, recordId: String) async throws

    /// Get vaccination rules for an organization
    func getVaccinationRules(organizationId: String) async throws -> [VaccinationRule]
}

// MARK: - Request Types

struct CreateVaccinationRequest: Encodable {
    let date: Date
    let vaccineName: String
    let vetName: String?
    let notes: String?
    let ruleId: String?
}

struct UpdateVaccinationRequest: Encodable {
    var date: Date?
    var vaccineName: String?
    var vetName: String?
    var notes: String?
    var ruleId: String?
}
