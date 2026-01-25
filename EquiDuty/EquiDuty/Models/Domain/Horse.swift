//
//  Horse.swift
//  EquiDuty
//
//  Domain models for horse management
//

import Foundation

/// Horse color options
enum HorseColor: String, Codable, CaseIterable {
    case black = "black"
    case brown = "brown"
    case bayBrown = "bay_brown"
    case darkBrown = "dark_brown"
    case chestnut = "chestnut"
    case grey = "grey"
    case strawberry = "strawberry"
    case piebald = "piebald"
    case skewbald = "skewbald"
    case dun = "dun"
    case cream = "cream"
    case palomino = "palomino"
    case appaloosa = "appaloosa"

    var displayName: String {
        switch self {
        case .black: return String(localized: "horse.color.black")
        case .brown: return String(localized: "horse.color.brown")
        case .bayBrown: return String(localized: "horse.color.bay_brown")
        case .darkBrown: return String(localized: "horse.color.dark_brown")
        case .chestnut: return String(localized: "horse.color.chestnut")
        case .grey: return String(localized: "horse.color.grey")
        case .strawberry: return String(localized: "horse.color.strawberry")
        case .piebald: return String(localized: "horse.color.piebald")
        case .skewbald: return String(localized: "horse.color.skewbald")
        case .dun: return String(localized: "horse.color.dun")
        case .cream: return String(localized: "horse.color.cream")
        case .palomino: return String(localized: "horse.color.palomino")
        case .appaloosa: return String(localized: "horse.color.appaloosa")
        }
    }
}

/// Horse gender options
enum HorseGender: String, Codable, CaseIterable {
    case stallion = "stallion"
    case mare = "mare"
    case gelding = "gelding"

    var displayName: String {
        switch self {
        case .stallion: return String(localized: "horse.gender.stallion")
        case .mare: return String(localized: "horse.gender.mare")
        case .gelding: return String(localized: "horse.gender.gelding")
        }
    }
}

/// Horse usage types
enum HorseUsage: String, Codable, CaseIterable {
    case care = "care"
    case sport = "sport"
    case breeding = "breeding"

    var displayName: String {
        switch self {
        case .care: return String(localized: "horse.usage.care")
        case .sport: return String(localized: "horse.usage.sport")
        case .breeding: return String(localized: "horse.usage.breeding")
        }
    }
}

/// Horse status
enum HorseStatus: String, Codable, CaseIterable {
    case active = "active"
    case inactive = "inactive"

    var displayName: String {
        switch self {
        case .active: return String(localized: "horse.status.active")
        case .inactive: return String(localized: "horse.status.inactive")
        }
    }
}

/// Vaccination status - matches backend VaccinationStatus type
enum VaccinationStatus: String, Codable, CaseIterable {
    case current = "current"
    case expiringSoon = "expiring_soon"
    case expired = "expired"
    case noRule = "no_rule"
    case noRecords = "no_records"

    var displayName: String {
        switch self {
        case .current: return String(localized: "horse.vaccination.current")
        case .expiringSoon: return String(localized: "horse.vaccination.expiring_soon")
        case .expired: return String(localized: "horse.vaccination.expired")
        case .noRule: return String(localized: "horse.vaccination.no_rule")
        case .noRecords: return String(localized: "horse.vaccination.no_records")
        }
    }
}

/// Equipment item for horse special instructions
struct EquipmentItem: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var location: String?
    var notes: String?
}

/// Horse document structure (simplified for mobile)
struct Horse: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var breed: String?
    var age: Int?
    var color: HorseColor
    var gender: HorseGender?

    // Ownership
    let ownerId: String
    var ownerName: String?
    var ownerEmail: String?

    // Stable assignment
    var currentStableId: String?
    var currentStableName: String?
    var assignedAt: Date?

    // Status
    var status: HorseStatus
    var notes: String?
    var specialInstructions: String?
    var equipment: [EquipmentItem]?
    var hasSpecialInstructions: Bool?

    // Group assignment
    var horseGroupId: String?
    var horseGroupName: String?

    // Vaccination tracking
    var lastVaccinationDate: Date?
    var nextVaccinationDue: Date?
    var vaccinationStatus: VaccinationStatus?

    // Identification
    var ueln: String?
    var chipNumber: String?

    // Additional details
    var dateOfBirth: Date?
    var withersHeight: Int?

    // Metadata
    let createdAt: Date
    let updatedAt: Date

    // RBAC metadata (from API response)
    // Access levels: "public", "basic_care", "professional", "management", "owner"
    var _accessLevel: String?
    var _isOwner: Bool?
}

/// Horse group for organizing horses
struct HorseGroup: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String
    var name: String
    var description: String?
    var color: String?
    let createdAt: Date
    let updatedAt: Date
    let createdBy: String
}

// MARK: - API Response Types

/// Response from /horses endpoint
struct HorsesResponse: Codable {
    let horses: [Horse]
}

/// Response from /horses/{id} endpoint
struct HorseResponse: Codable {
    let horse: Horse
}
