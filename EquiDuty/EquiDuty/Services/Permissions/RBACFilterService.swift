//
//  RBACFilterService.swift
//  EquiDuty
//
//  Created by Claude on 2026-02-06.
//  Filter sensitive data based on access levels (backend's horseProjection.ts logic).
//

import Foundation

@MainActor
final class RBACFilterService {
    static let shared = RBACFilterService()

    private init() {}

    // MARK: - Horse Filtering

    /// Filter horse based on user's access level
    /// Mirrors backend's horseProjection.ts field filtering logic
    func filterHorse(_ horse: Horse) -> Horse {
        guard let accessLevel = horse.accessLevel else {
            // No RBAC metadata - return as-is (backend didn't apply filtering)
            return horse
        }

        var filtered = horse
        let level = accessLevel.numericLevel

        // Level 1: Public (always visible)
        // name, breed, age, color, gender, currentStableName, status

        // Level 2: Basic Care
        if level < 2 {
            filtered.notes = nil
            filtered.specialInstructions = nil
            filtered.equipment = nil
            filtered.usage = nil
            filtered.hasSpecialInstructions = nil
        }

        // Level 3: Professional
        if level < 3 {
            filtered.ueln = nil
            filtered.chipNumber = nil
            filtered.dateOfBirth = nil
            filtered.withersHeight = nil
            filtered.sire = nil
            filtered.dam = nil
            filtered.damsire = nil
            filtered.breeder = nil
            filtered.studbook = nil
        }

        // Level 4: Management
        if level < 4 {
            filtered.ownerName = nil
            filtered.ownerEmail = nil
            filtered.horseGroupName = nil
            filtered.federationNumber = nil
            filtered.feiPassNumber = nil
            filtered.feiExpiryDate = nil
        }

        // Level 5: Owner (no filtering)
        return filtered
    }

    /// Batch filter horses
    func filterHorses(_ horses: [Horse]) -> [Horse] {
        horses.map { filterHorse($0) }
    }

    /// Check if user can view specific horse field
    func canViewField(_ field: HorseField, horse: Horse) -> Bool {
        guard let accessLevel = horse.accessLevel else {
            // No RBAC metadata - assume visible
            return true
        }
        return accessLevel.numericLevel >= field.requiredLevel.numericLevel
    }

    /// Check if user can edit horse
    func canEditHorse(_ horse: Horse) -> Bool {
        // Owner override (always can edit own horses)
        if horse.isOwner { return true }

        // Check manage_any_horse permission
        if PermissionService.shared.hasPermission(.manageAnyHorse) { return true }

        // Check manage_own_horses permission + ownership
        if horse.isOwner && PermissionService.shared.hasPermission(.manageOwnHorses) {
            return true
        }

        return false
    }

    /// Get display name for access level
    func accessLevelDisplayName(for horse: Horse) -> String? {
        horse.accessLevel?.displayName
    }

    /// Get numeric access level (1-5)
    func accessLevelNumeric(for horse: Horse) -> Int? {
        horse.accessLevel?.numericLevel
    }
}

// MARK: - Field Visibility Helpers

extension RBACFilterService {
    /// Check if public fields are visible (always true)
    func canViewPublicFields(_ horse: Horse) -> Bool {
        true
    }

    /// Check if basic care fields are visible
    func canViewBasicCareFields(_ horse: Horse) -> Bool {
        guard let level = horse.accessLevel?.numericLevel else { return true }
        return level >= 2
    }

    /// Check if professional fields are visible
    func canViewProfessionalFields(_ horse: Horse) -> Bool {
        guard let level = horse.accessLevel?.numericLevel else { return true }
        return level >= 3
    }

    /// Check if management fields are visible
    func canViewManagementFields(_ horse: Horse) -> Bool {
        guard let level = horse.accessLevel?.numericLevel else { return true }
        return level >= 4
    }

    /// Check if user has owner-level access
    func hasOwnerAccess(_ horse: Horse) -> Bool {
        horse.isOwner || horse.accessLevel?.numericLevel == 5
    }
}

// MARK: - Batch Operations

extension RBACFilterService {
    /// Filter horses and return only those with minimum access level
    func filterHorses(_ horses: [Horse], minimumLevel: Horse.AccessLevel) -> [Horse] {
        horses.filter { horse in
            guard let level = horse.accessLevel else { return true }
            return level.numericLevel >= minimumLevel.numericLevel
        }
    }

    /// Group horses by access level
    func groupByAccessLevel(_ horses: [Horse]) -> [Horse.AccessLevel: [Horse]] {
        Dictionary(grouping: horses) { horse in
            horse.accessLevel ?? .publicLevel
        }
    }

    /// Get horses user owns
    func ownedHorses(from horses: [Horse]) -> [Horse] {
        horses.filter { $0.isOwner }
    }

    /// Get horses user does not own
    func nonOwnedHorses(from horses: [Horse]) -> [Horse] {
        horses.filter { !$0.isOwner }
    }
}
