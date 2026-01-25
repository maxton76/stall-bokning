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

    // Usage types
    var usage: [HorseUsage]?

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
    var federationNumber: String?
    var feiPassNumber: String?
    var feiExpiryDate: Date?

    // Pedigree
    var sire: String?
    var dam: String?
    var damsire: String?
    var breeder: String?
    var studbook: String?

    // Additional details
    var dateOfBirth: Date?
    var withersHeight: Int?

    // External location (when horse is temporarily away)
    var externalLocation: String?
    var externalMoveType: String?
    var externalDepartureDate: Date?

    // Team members (stored as array on horse document)
    var team: [HorseTeamMember]?

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

// MARK: - Team Member

/// Team member role types
enum TeamMemberRole: String, Codable, CaseIterable {
    case rider = "rider"
    case groom = "groom"
    case farrier = "farrier"
    case veterinarian = "veterinarian"
    case trainer = "trainer"
    case dentist = "dentist"
    case physiotherapist = "physiotherapist"
    case saddler = "saddler"
    case other = "other"

    var displayName: String {
        switch self {
        case .rider: return String(localized: "horse.team.role.rider")
        case .groom: return String(localized: "horse.team.role.groom")
        case .farrier: return String(localized: "horse.team.role.farrier")
        case .veterinarian: return String(localized: "horse.team.role.veterinarian")
        case .trainer: return String(localized: "horse.team.role.trainer")
        case .dentist: return String(localized: "horse.team.role.dentist")
        case .physiotherapist: return String(localized: "horse.team.role.physiotherapist")
        case .saddler: return String(localized: "horse.team.role.saddler")
        case .other: return String(localized: "horse.team.role.other")
        }
    }

    var icon: String {
        switch self {
        case .rider: return "figure.equestrian.sports"
        case .groom: return "hand.raised.fill"
        case .farrier: return "hammer.fill"
        case .veterinarian: return "cross.case.fill"
        case .trainer: return "figure.walk"
        case .dentist: return "mouth.fill"
        case .physiotherapist: return "hand.point.up.left.fill"
        case .saddler: return "bag.fill"
        case .other: return "person.fill"
        }
    }

    var color: String {
        switch self {
        case .rider: return "blue"
        case .groom: return "green"
        case .farrier: return "orange"
        case .veterinarian: return "red"
        case .trainer: return "purple"
        case .dentist: return "cyan"
        case .physiotherapist: return "pink"
        case .saddler: return "yellow"
        case .other: return "gray"
        }
    }
}

/// Team member for a horse
struct HorseTeamMember: Codable, Identifiable, Equatable {
    var id: String { name + role.rawValue }  // Computed ID for list iteration
    var name: String
    var role: TeamMemberRole
    var isPrimary: Bool?
    var email: String?
    var phone: String?
    var notes: String?

    enum CodingKeys: String, CodingKey {
        case name, role, isPrimary, email, phone, notes
        case displayName  // Alternative key used by backend
    }

    // Custom decoder to handle both "name" and "displayName"
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Try name first, fall back to displayName (backend format)
        if let nameValue = try? container.decode(String.self, forKey: .name) {
            self.name = nameValue
        } else if let displayName = try? container.decode(String.self, forKey: .displayName) {
            self.name = displayName
        } else {
            throw DecodingError.keyNotFound(
                CodingKeys.name,
                DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Neither 'name' nor 'displayName' found")
            )
        }

        self.role = try container.decode(TeamMemberRole.self, forKey: .role)
        self.isPrimary = try container.decodeIfPresent(Bool.self, forKey: .isPrimary)
        self.email = try container.decodeIfPresent(String.self, forKey: .email)
        self.phone = try container.decodeIfPresent(String.self, forKey: .phone)
        self.notes = try container.decodeIfPresent(String.self, forKey: .notes)
    }

    // Encoder uses "name" for consistency
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(role, forKey: .role)
        try container.encodeIfPresent(isPrimary, forKey: .isPrimary)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(phone, forKey: .phone)
        try container.encodeIfPresent(notes, forKey: .notes)
    }

    // Keep init for local creation
    init(name: String, role: TeamMemberRole, isPrimary: Bool? = nil,
         email: String? = nil, phone: String? = nil, notes: String? = nil) {
        self.name = name
        self.role = role
        self.isPrimary = isPrimary
        self.email = email
        self.phone = phone
        self.notes = notes
    }
}

// MARK: - Ownership

/// Ownership role types
enum OwnershipRole: String, Codable, CaseIterable {
    case primary = "primary"
    case coOwner = "co_owner"
    case syndicate = "syndicate"
    case leaseholder = "leaseholder"

    var displayName: String {
        switch self {
        case .primary: return String(localized: "horse.ownership.role.primary")
        case .coOwner: return String(localized: "horse.ownership.role.co_owner")
        case .syndicate: return String(localized: "horse.ownership.role.syndicate")
        case .leaseholder: return String(localized: "horse.ownership.role.leaseholder")
        }
    }

    var color: String {
        switch self {
        case .primary: return "blue"
        case .coOwner: return "purple"
        case .syndicate: return "orange"
        case .leaseholder: return "green"
        }
    }
}

/// Horse ownership record
struct HorseOwnership: Codable, Identifiable, Equatable {
    let id: String
    let horseId: String
    var ownerId: String
    var ownerName: String
    var role: OwnershipRole
    var percentage: Double
    var startDate: Date
    var endDate: Date?
    var email: String?
    var phone: String?
    var notes: String?
    let createdAt: Date
    let updatedAt: Date
}

/// Response from ownership endpoints
struct HorseOwnershipResponse: Codable {
    let ownerships: [HorseOwnership]
}

// MARK: - Vaccination

/// Vaccination record for a horse
struct VaccinationRecord: Codable, Identifiable, Equatable {
    let id: String
    let horseId: String
    var date: Date              // maps from "vaccinationDate"
    var vaccineName: String     // maps from "vaccinationRuleName"
    var vetName: String?        // maps from "veterinarianName"
    var notes: String?
    var ruleId: String?         // maps from "vaccinationRuleId"
    var ruleName: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, horseId, notes, createdAt, updatedAt, ruleName
        case date = "vaccinationDate"
        case vaccineName = "vaccinationRuleName"
        case vetName = "veterinarianName"
        case ruleId = "vaccinationRuleId"
    }
}

/// Vaccination rule defining vaccination requirements
struct VaccinationRule: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String
    var name: String
    var description: String?
    var intervalDays: Int
    var warningDays: Int
    var isDefault: Bool?
    let createdAt: Date
    let updatedAt: Date
}

/// Response from vaccination endpoints
struct VaccinationRecordsResponse: Codable {
    let records: [VaccinationRecord]
}

struct VaccinationRulesResponse: Codable {
    let rules: [VaccinationRule]
}
