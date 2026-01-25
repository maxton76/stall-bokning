//
//  HorseServiceProtocol.swift
//  EquiDuty
//
//  Protocol for horse management operations
//

import Foundation

/// Protocol defining horse management operations
protocol HorseServiceProtocol {
    /// Get horses based on scope with field-level RBAC
    /// - Parameters:
    ///   - scope: 'my' (owned), 'stable' (specific stable), 'all' (all accessible)
    ///   - stableId: Required if scope='stable'
    ///   - status: Filter by status (default: 'active')
    /// - Returns: Array of horses with access level metadata
    func getHorses(
        scope: HorseScope,
        stableId: String?,
        status: HorseStatus
    ) async throws -> [Horse]

    /// Get horses owned by the current user (full data access)
    func getMyHorses(stableId: String?, status: HorseStatus) async throws -> [Horse]

    /// Get all horses in a specific stable (role-filtered)
    func getStableHorses(stableId: String, status: HorseStatus) async throws -> [Horse]

    /// Get all accessible horses across all stables
    func getAllAccessibleHorses(status: HorseStatus) async throws -> [Horse]

    /// Get a single horse by ID
    func getHorse(id: String) async throws -> Horse?

    /// Create a new horse
    func createHorse(_ horse: CreateHorseRequest) async throws -> String

    /// Update an existing horse
    func updateHorse(id: String, updates: UpdateHorseRequest) async throws

    /// Delete a horse
    func deleteHorse(id: String) async throws

    // MARK: - Team Members

    /// Get team members for a horse
    func getTeamMembers(horseId: String) async throws -> [HorseTeamMember]

    /// Add a team member to a horse
    func addTeamMember(horseId: String, member: HorseTeamMember) async throws

    /// Update a team member
    func updateTeamMember(horseId: String, index: Int, member: HorseTeamMember) async throws

    /// Delete a team member
    func deleteTeamMember(horseId: String, index: Int) async throws
}

// MARK: - Request Types

enum HorseScope: String {
    case my = "my"
    case stable = "stable"
    case all = "all"
}

struct CreateHorseRequest: Encodable {
    let name: String
    let color: HorseColor
    let gender: HorseGender?
    let breed: String?
    let age: Int?
    let status: HorseStatus
    let currentStableId: String?
    let notes: String?
    let specialInstructions: String?
    let equipment: [EquipmentItem]?
    let horseGroupId: String?
    let dateOfBirth: Date?
    let withersHeight: Int?
    let ueln: String?
    let chipNumber: String?
    let isExternal: Bool?
}

struct UpdateHorseRequest: Encodable {
    var name: String?
    var color: HorseColor?
    var gender: HorseGender?
    var breed: String?
    var age: Int?
    var status: HorseStatus?
    var currentStableId: String?
    var notes: String?
    var specialInstructions: String?
    var equipment: [EquipmentItem]?
    var horseGroupId: String?
    var dateOfBirth: Date?
    var withersHeight: Int?
    var ueln: String?
    var chipNumber: String?
}
