//
//  Horse.swift
//  EquiDuty
//
//  Domain models for horse management
//

import Foundation
import SwiftUI

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

/// Internal structure to decode team from API (object format)
private struct HorseTeamObject: Codable {
    var defaultRider: HorseTeamMember?
    var defaultGroom: HorseTeamMember?
    var defaultFarrier: HorseTeamMember?
    var defaultVet: HorseTeamMember?
    var defaultTrainer: HorseTeamMember?
    var defaultDentist: HorseTeamMember?
    var additionalContacts: [HorseTeamMember]?

    /// Flatten the team object into an array of team members
    func toArray() -> [HorseTeamMember] {
        var members: [HorseTeamMember] = []

        // Add default role members (mark as primary)
        if var rider = defaultRider {
            rider.isPrimary = true
            members.append(rider)
        }
        if var groom = defaultGroom {
            groom.isPrimary = true
            members.append(groom)
        }
        if var farrier = defaultFarrier {
            farrier.isPrimary = true
            members.append(farrier)
        }
        if var vet = defaultVet {
            vet.isPrimary = true
            members.append(vet)
        }
        if var trainer = defaultTrainer {
            trainer.isPrimary = true
            members.append(trainer)
        }
        if var dentist = defaultDentist {
            dentist.isPrimary = true
            members.append(dentist)
        }

        // Add additional contacts
        if let additional = additionalContacts {
            members.append(contentsOf: additional)
        }

        return members
    }
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
    var boxName: String?           // Box/stall name or number
    var paddockName: String?       // Paddock/pasture name

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

    // Profile Photos (signed URLs from API)
    var coverPhotoURL: String?
    var avatarPhotoURL: String?

    // Image variant signed URLs (optimized sizes from API)
    var coverPhotoThumbURL: String?
    var coverPhotoSmallURL: String?
    var coverPhotoMediumURL: String?
    var coverPhotoLargeURL: String?
    var avatarPhotoThumbURL: String?
    var avatarPhotoSmallURL: String?
    var avatarPhotoMediumURL: String?
    var avatarPhotoLargeURL: String?

    // Blurhash strings for instant placeholders
    var coverPhotoBlurhash: String?
    var avatarPhotoBlurhash: String?

    // Team members (stored as array on horse document)
    var team: [HorseTeamMember]?

    // Metadata
    let createdAt: Date
    let updatedAt: Date

    // RBAC metadata (from API response)
    // Access levels: "public", "basic_care", "professional", "management", "owner"
    var _accessLevel: String?
    var _isOwner: Bool?

    // MARK: - Codable

    enum CodingKeys: String, CodingKey {
        case id, name, breed, age, color, gender
        case ownerId, ownerName, ownerEmail
        case currentStableId, currentStableName, assignedAt
        case boxName, paddockName
        case status, notes, specialInstructions, equipment, hasSpecialInstructions
        case usage
        case horseGroupId, horseGroupName
        case lastVaccinationDate, nextVaccinationDue, vaccinationStatus
        case ueln, chipNumber, federationNumber, feiPassNumber, feiExpiryDate
        case sire, dam, damsire, breeder, studbook
        case dateOfBirth, withersHeight
        case coverPhotoURL, avatarPhotoURL
        case coverPhotoThumbURL, coverPhotoSmallURL, coverPhotoMediumURL, coverPhotoLargeURL
        case avatarPhotoThumbURL, avatarPhotoSmallURL, avatarPhotoMediumURL, avatarPhotoLargeURL
        case coverPhotoBlurhash, avatarPhotoBlurhash
        case externalLocation, externalMoveType, externalDepartureDate
        case team
        case createdAt, updatedAt
        case _accessLevel, _isOwner
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Decode all standard fields
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        breed = try container.decodeIfPresent(String.self, forKey: .breed)
        age = try container.decodeIfPresent(Int.self, forKey: .age)
        color = try container.decode(HorseColor.self, forKey: .color)
        gender = try container.decodeIfPresent(HorseGender.self, forKey: .gender)

        ownerId = try container.decode(String.self, forKey: .ownerId)
        ownerName = try container.decodeIfPresent(String.self, forKey: .ownerName)
        ownerEmail = try container.decodeIfPresent(String.self, forKey: .ownerEmail)

        currentStableId = try container.decodeIfPresent(String.self, forKey: .currentStableId)
        currentStableName = try container.decodeIfPresent(String.self, forKey: .currentStableName)
        assignedAt = try container.decodeIfPresent(Date.self, forKey: .assignedAt)
        boxName = try container.decodeIfPresent(String.self, forKey: .boxName)
        paddockName = try container.decodeIfPresent(String.self, forKey: .paddockName)

        status = try container.decode(HorseStatus.self, forKey: .status)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        specialInstructions = try container.decodeIfPresent(String.self, forKey: .specialInstructions)
        equipment = try container.decodeIfPresent([EquipmentItem].self, forKey: .equipment)
        hasSpecialInstructions = try container.decodeIfPresent(Bool.self, forKey: .hasSpecialInstructions)

        usage = try container.decodeIfPresent([HorseUsage].self, forKey: .usage)

        horseGroupId = try container.decodeIfPresent(String.self, forKey: .horseGroupId)
        horseGroupName = try container.decodeIfPresent(String.self, forKey: .horseGroupName)

        lastVaccinationDate = try container.decodeIfPresent(Date.self, forKey: .lastVaccinationDate)
        nextVaccinationDue = try container.decodeIfPresent(Date.self, forKey: .nextVaccinationDue)
        vaccinationStatus = try container.decodeIfPresent(VaccinationStatus.self, forKey: .vaccinationStatus)

        ueln = try container.decodeIfPresent(String.self, forKey: .ueln)
        chipNumber = try container.decodeIfPresent(String.self, forKey: .chipNumber)
        federationNumber = try container.decodeIfPresent(String.self, forKey: .federationNumber)
        feiPassNumber = try container.decodeIfPresent(String.self, forKey: .feiPassNumber)
        feiExpiryDate = try container.decodeIfPresent(Date.self, forKey: .feiExpiryDate)

        sire = try container.decodeIfPresent(String.self, forKey: .sire)
        dam = try container.decodeIfPresent(String.self, forKey: .dam)
        damsire = try container.decodeIfPresent(String.self, forKey: .damsire)
        breeder = try container.decodeIfPresent(String.self, forKey: .breeder)
        studbook = try container.decodeIfPresent(String.self, forKey: .studbook)

        dateOfBirth = try container.decodeIfPresent(Date.self, forKey: .dateOfBirth)
        withersHeight = try container.decodeIfPresent(Int.self, forKey: .withersHeight)

        coverPhotoURL = try container.decodeIfPresent(String.self, forKey: .coverPhotoURL)
        avatarPhotoURL = try container.decodeIfPresent(String.self, forKey: .avatarPhotoURL)

        coverPhotoThumbURL = try container.decodeIfPresent(String.self, forKey: .coverPhotoThumbURL)
        coverPhotoSmallURL = try container.decodeIfPresent(String.self, forKey: .coverPhotoSmallURL)
        coverPhotoMediumURL = try container.decodeIfPresent(String.self, forKey: .coverPhotoMediumURL)
        coverPhotoLargeURL = try container.decodeIfPresent(String.self, forKey: .coverPhotoLargeURL)
        avatarPhotoThumbURL = try container.decodeIfPresent(String.self, forKey: .avatarPhotoThumbURL)
        avatarPhotoSmallURL = try container.decodeIfPresent(String.self, forKey: .avatarPhotoSmallURL)
        avatarPhotoMediumURL = try container.decodeIfPresent(String.self, forKey: .avatarPhotoMediumURL)
        avatarPhotoLargeURL = try container.decodeIfPresent(String.self, forKey: .avatarPhotoLargeURL)

        coverPhotoBlurhash = try container.decodeIfPresent(String.self, forKey: .coverPhotoBlurhash)
        avatarPhotoBlurhash = try container.decodeIfPresent(String.self, forKey: .avatarPhotoBlurhash)

        externalLocation = try container.decodeIfPresent(String.self, forKey: .externalLocation)
        externalMoveType = try container.decodeIfPresent(String.self, forKey: .externalMoveType)
        externalDepartureDate = try container.decodeIfPresent(Date.self, forKey: .externalDepartureDate)

        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)

        _accessLevel = try container.decodeIfPresent(String.self, forKey: ._accessLevel)
        _isOwner = try container.decodeIfPresent(Bool.self, forKey: ._isOwner)

        // Handle team field specially - can be array or object
        if let teamArray = try? container.decodeIfPresent([HorseTeamMember].self, forKey: .team) {
            team = teamArray
        } else if let teamObject = try? container.decodeIfPresent(HorseTeamObject.self, forKey: .team) {
            team = teamObject.toArray()
        } else {
            #if DEBUG
            // Log if team field exists but failed to decode in either format
            if container.contains(.team) {
                print("⚠️ Horse '\(name)': team field present but failed to decode as array or object")
            }
            #endif
            team = nil
        }
    }

    // Manual init for local creation and previews
    init(
        id: String,
        name: String,
        breed: String? = nil,
        age: Int? = nil,
        color: HorseColor,
        gender: HorseGender? = nil,
        ownerId: String,
        ownerName: String? = nil,
        ownerEmail: String? = nil,
        currentStableId: String? = nil,
        currentStableName: String? = nil,
        assignedAt: Date? = nil,
        boxName: String? = nil,
        paddockName: String? = nil,
        status: HorseStatus,
        notes: String? = nil,
        specialInstructions: String? = nil,
        equipment: [EquipmentItem]? = nil,
        hasSpecialInstructions: Bool? = nil,
        usage: [HorseUsage]? = nil,
        horseGroupId: String? = nil,
        horseGroupName: String? = nil,
        lastVaccinationDate: Date? = nil,
        nextVaccinationDue: Date? = nil,
        vaccinationStatus: VaccinationStatus? = nil,
        ueln: String? = nil,
        chipNumber: String? = nil,
        federationNumber: String? = nil,
        feiPassNumber: String? = nil,
        feiExpiryDate: Date? = nil,
        sire: String? = nil,
        dam: String? = nil,
        damsire: String? = nil,
        breeder: String? = nil,
        studbook: String? = nil,
        dateOfBirth: Date? = nil,
        withersHeight: Int? = nil,
        coverPhotoURL: String? = nil,
        avatarPhotoURL: String? = nil,
        coverPhotoThumbURL: String? = nil,
        coverPhotoSmallURL: String? = nil,
        coverPhotoMediumURL: String? = nil,
        coverPhotoLargeURL: String? = nil,
        avatarPhotoThumbURL: String? = nil,
        avatarPhotoSmallURL: String? = nil,
        avatarPhotoMediumURL: String? = nil,
        avatarPhotoLargeURL: String? = nil,
        coverPhotoBlurhash: String? = nil,
        avatarPhotoBlurhash: String? = nil,
        externalLocation: String? = nil,
        externalMoveType: String? = nil,
        externalDepartureDate: Date? = nil,
        team: [HorseTeamMember]? = nil,
        createdAt: Date,
        updatedAt: Date,
        _accessLevel: String? = nil,
        _isOwner: Bool? = nil
    ) {
        self.id = id
        self.name = name
        self.breed = breed
        self.age = age
        self.color = color
        self.gender = gender
        self.ownerId = ownerId
        self.ownerName = ownerName
        self.ownerEmail = ownerEmail
        self.currentStableId = currentStableId
        self.currentStableName = currentStableName
        self.assignedAt = assignedAt
        self.boxName = boxName
        self.paddockName = paddockName
        self.status = status
        self.notes = notes
        self.specialInstructions = specialInstructions
        self.equipment = equipment
        self.hasSpecialInstructions = hasSpecialInstructions
        self.usage = usage
        self.horseGroupId = horseGroupId
        self.horseGroupName = horseGroupName
        self.lastVaccinationDate = lastVaccinationDate
        self.nextVaccinationDue = nextVaccinationDue
        self.vaccinationStatus = vaccinationStatus
        self.ueln = ueln
        self.chipNumber = chipNumber
        self.federationNumber = federationNumber
        self.feiPassNumber = feiPassNumber
        self.feiExpiryDate = feiExpiryDate
        self.sire = sire
        self.dam = dam
        self.damsire = damsire
        self.breeder = breeder
        self.studbook = studbook
        self.dateOfBirth = dateOfBirth
        self.withersHeight = withersHeight
        self.coverPhotoURL = coverPhotoURL
        self.avatarPhotoURL = avatarPhotoURL
        self.coverPhotoThumbURL = coverPhotoThumbURL
        self.coverPhotoSmallURL = coverPhotoSmallURL
        self.coverPhotoMediumURL = coverPhotoMediumURL
        self.coverPhotoLargeURL = coverPhotoLargeURL
        self.avatarPhotoThumbURL = avatarPhotoThumbURL
        self.avatarPhotoSmallURL = avatarPhotoSmallURL
        self.avatarPhotoMediumURL = avatarPhotoMediumURL
        self.avatarPhotoLargeURL = avatarPhotoLargeURL
        self.coverPhotoBlurhash = coverPhotoBlurhash
        self.avatarPhotoBlurhash = avatarPhotoBlurhash
        self.externalLocation = externalLocation
        self.externalMoveType = externalMoveType
        self.externalDepartureDate = externalDepartureDate
        self.team = team
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self._accessLevel = _accessLevel
        self._isOwner = _isOwner
    }
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

    var color: Color {
        switch self {
        case .rider: return .blue
        case .groom: return .green
        case .farrier: return .orange
        case .veterinarian: return .red
        case .trainer: return .purple
        case .dentist: return .cyan
        case .physiotherapist: return .pink
        case .saddler: return .yellow
        case .other: return .gray
        }
    }
}

/// Team member for a horse
struct HorseTeamMember: Codable, Identifiable, Equatable {
    var id: String { "\(name)_\(role.rawValue)_\(email ?? "")" }  // Computed ID for list iteration
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

    var color: Color {
        switch self {
        case .primary: return .blue
        case .coOwner: return .purple
        case .syndicate: return .orange
        case .leaseholder: return .green
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

// MARK: - RBAC Extension

/// Field-level access control extension for Horse
extension Horse {
    /// 5 access levels matching backend horseProjection.ts
    enum AccessLevel: String, Codable, CaseIterable {
        case publicLevel = "public"         // Level 1: Basic info
        case basicCare = "basic_care"       // Level 2: Care instructions
        case professional                    // Level 3: Medical/ID data
        case management                      // Level 4: Owner info
        case owner                           // Level 5: Full access

        var numericLevel: Int {
            switch self {
            case .publicLevel: return 1
            case .basicCare: return 2
            case .professional: return 3
            case .management: return 4
            case .owner: return 5
            }
        }

        var displayName: String {
            switch self {
            case .publicLevel: return String(localized: "horse.access_level.public")
            case .basicCare: return String(localized: "horse.access_level.basic_care")
            case .professional: return String(localized: "horse.access_level.professional")
            case .management: return String(localized: "horse.access_level.management")
            case .owner: return String(localized: "horse.access_level.owner")
            }
        }
    }

    /// Parsed access level from API response metadata
    var accessLevel: AccessLevel? {
        guard let levelString = _accessLevel else { return nil }
        return AccessLevel(rawValue: levelString)
    }

    /// Whether current user owns this horse
    var isOwner: Bool { _isOwner ?? false }

    /// Best avatar URL for list views (thumb → original fallback)
    var bestAvatarThumbURL: URL? {
        if let urlStr = avatarPhotoThumbURL ?? avatarPhotoURL {
            return URL(string: urlStr)
        }
        return nil
    }

    /// Best cover URL for detail views (large → original fallback)
    var bestCoverLargeURL: URL? {
        if let urlStr = coverPhotoLargeURL ?? coverPhotoURL {
            return URL(string: urlStr)
        }
        return nil
    }

    /// Best avatar URL for detail views (medium → original fallback)
    var bestAvatarMediumURL: URL? {
        if let urlStr = avatarPhotoMediumURL ?? avatarPhotoURL {
            return URL(string: urlStr)
        }
        return nil
    }
}

/// Field-level access requirements for horse data
enum HorseField {
    // Level 1: Public (all members)
    case name, breed, age, color, gender, currentStableName, status

    // Level 2: Basic Care (grooms, riders)
    case notes, specialInstructions, equipment, usage, hasSpecialInstructions

    // Level 3: Professional (vets, farriers, dentists)
    case ueln, chipNumber, dateOfBirth, withersHeight
    case sire, dam, damsire, breeder, studbook

    // Level 4: Management (administrators, managers)
    case ownerName, ownerEmail, horseGroupName
    case federationNumber, feiPassNumber, feiExpiryDate

    // Level 5: Owner (full access) - no specific fields, just the ownership flag

    var requiredLevel: Horse.AccessLevel {
        switch self {
        case .name, .breed, .age, .color, .gender, .currentStableName, .status:
            return .publicLevel
        case .notes, .specialInstructions, .equipment, .usage, .hasSpecialInstructions:
            return .basicCare
        case .ueln, .chipNumber, .dateOfBirth, .withersHeight, .sire, .dam, .damsire, .breeder, .studbook:
            return .professional
        case .ownerName, .ownerEmail, .horseGroupName, .federationNumber, .feiPassNumber, .feiExpiryDate:
            return .management
        }
    }

    var displayName: String {
        switch self {
        case .name: return String(localized: "horse.field.name")
        case .breed: return String(localized: "horse.field.breed")
        case .age: return String(localized: "horse.field.age")
        case .color: return String(localized: "horse.field.color")
        case .gender: return String(localized: "horse.field.gender")
        case .currentStableName: return String(localized: "horse.field.current_stable")
        case .status: return String(localized: "horse.field.status")
        case .notes: return String(localized: "horse.field.notes")
        case .specialInstructions: return String(localized: "horse.field.special_instructions")
        case .equipment: return String(localized: "horse.field.equipment")
        case .usage: return String(localized: "horse.field.usage")
        case .hasSpecialInstructions: return String(localized: "horse.field.has_special_instructions")
        case .ueln: return String(localized: "horse.field.ueln")
        case .chipNumber: return String(localized: "horse.field.chip_number")
        case .dateOfBirth: return String(localized: "horse.field.date_of_birth")
        case .withersHeight: return String(localized: "horse.field.withers_height")
        case .sire: return String(localized: "horse.field.sire")
        case .dam: return String(localized: "horse.field.dam")
        case .damsire: return String(localized: "horse.field.damsire")
        case .breeder: return String(localized: "horse.field.breeder")
        case .studbook: return String(localized: "horse.field.studbook")
        case .ownerName: return String(localized: "horse.field.owner_name")
        case .ownerEmail: return String(localized: "horse.field.owner_email")
        case .horseGroupName: return String(localized: "horse.field.horse_group")
        case .federationNumber: return String(localized: "horse.field.federation_number")
        case .feiPassNumber: return String(localized: "horse.field.fei_pass_number")
        case .feiExpiryDate: return String(localized: "horse.field.fei_expiry_date")
        }
    }
}
