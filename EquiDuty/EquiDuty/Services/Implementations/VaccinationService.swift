//
//  VaccinationService.swift
//  EquiDuty
//
//  Implementation of vaccination management operations
//

import Foundation

/// Vaccination service implementation using API client
@MainActor
final class VaccinationService: VaccinationServiceProtocol {
    static let shared = VaccinationService()

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Vaccination Records

    func getVaccinationRecords(horseId: String) async throws -> [VaccinationRecord] {
        // API returns { records: [...] } wrapped response
        let response: VaccinationRecordsResponse = try await apiClient.get(
            APIEndpoints.horseVaccinations(horseId)
        )
        return response.records
    }

    func addVaccinationRecord(horseId: String, record: CreateVaccinationRequest) async throws -> VaccinationRecord {
        let response: VaccinationRecord = try await apiClient.post(
            APIEndpoints.horseVaccinations(horseId),
            body: record
        )
        return response
    }

    func updateVaccinationRecord(horseId: String, recordId: String, updates: UpdateVaccinationRequest) async throws {
        let _: EmptyResponse = try await apiClient.patch(
            APIEndpoints.horseVaccination(recordId),
            body: updates
        )
    }

    func deleteVaccinationRecord(horseId: String, recordId: String) async throws {
        try await apiClient.delete(APIEndpoints.horseVaccination(recordId))
    }

    // MARK: - Vaccination Rules

    func getVaccinationRules(organizationId: String) async throws -> [VaccinationRule] {
        // API returns { rules: [...] } wrapped response
        let response: VaccinationRulesResponse = try await apiClient.get(
            APIEndpoints.vaccinationRules(organizationId)
        )
        return response.rules
    }
}
