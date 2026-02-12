//
//  TransportInstructions.swift
//  EquiDuty
//
//  Transport instructions model matching shared/types/transport.ts

import Foundation
import SwiftUI

// MARK: - Enums

enum LoadingBehavior: String, Codable, CaseIterable, Identifiable {
    case easyLoader = "easy_loader"
    case needsPatience = "needs_patience"
    case needsHandler = "needs_handler"
    case difficult
    case unknown

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .easyLoader: return String(localized: "transport.loading.easy_loader")
        case .needsPatience: return String(localized: "transport.loading.needs_patience")
        case .needsHandler: return String(localized: "transport.loading.needs_handler")
        case .difficult: return String(localized: "transport.loading.difficult")
        case .unknown: return String(localized: "transport.loading.unknown")
        }
    }

    var color: Color {
        switch self {
        case .easyLoader: return .green
        case .needsPatience: return .yellow
        case .needsHandler: return .orange
        case .difficult: return .red
        case .unknown: return .gray
        }
    }
}

enum TransportPosition: String, Codable, CaseIterable, Identifiable {
    case any
    case front
    case rear
    case left
    case right
    case facingForward = "facing_forward"
    case facingBackward = "facing_backward"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .any: return String(localized: "transport.position.any")
        case .front: return String(localized: "transport.position.front")
        case .rear: return String(localized: "transport.position.rear")
        case .left: return String(localized: "transport.position.left")
        case .right: return String(localized: "transport.position.right")
        case .facingForward: return String(localized: "transport.position.facing_forward")
        case .facingBackward: return String(localized: "transport.position.facing_backward")
        }
    }
}

enum TemperaturePreference: String, Codable, CaseIterable, Identifiable {
    case cool
    case warm
    case normal

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .cool: return String(localized: "transport.temp.cool")
        case .warm: return String(localized: "transport.temp.warm")
        case .normal: return String(localized: "transport.temp.normal")
        }
    }
}

// MARK: - Emergency Contact

struct TransportEmergencyContact: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var name: String
    var phone: String
    var relationship: String?
    var isPrimary: Bool?

    enum CodingKeys: String, CodingKey {
        case name, phone, relationship, isPrimary
    }

    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.name == rhs.name && lhs.phone == rhs.phone &&
        lhs.relationship == rhs.relationship && lhs.isPrimary == rhs.isPrimary
    }
}

// MARK: - Transport Instructions

struct TransportInstructions: Codable, Equatable {
    // Loading behavior
    var loadingBehavior: LoadingBehavior?
    var loadingNotes: String?

    // Position
    var positionPreference: TransportPosition?
    var needsCompanion: Bool?
    var preferredCompanion: String?

    // Travel requirements
    var travelAnxiety: Bool?
    var travelAnxietyNotes: String?
    var sedationRequired: Bool?
    var sedationNotes: String?

    // Feeding
    var feedDuringTransport: Bool?
    var feedingInstructions: String?
    var hayNetRequired: Bool?
    var waterInstructions: String?

    // Equipment
    var specialEquipment: [String]?
    var travelBoots: Bool?
    var travelBlanket: Bool?
    var headProtection: Bool?
    var tailGuard: Bool?
    var pollGuard: Bool?

    // Health
    var motionSickness: Bool?
    var ventilationNeeds: String?
    var temperaturePreference: TemperaturePreference?

    // Rest
    var maxTravelTime: Double?
    var restBreakFrequency: Double?
    var unloadForRest: Bool?

    // Emergency contacts
    var emergencyContacts: [TransportEmergencyContact]?

    // Insurance
    var transportInsurance: String?
    var insuranceProvider: String?
    var insurancePolicyNumber: String?

    // Notes
    var notes: String?

    /// Whether any transport data has been entered
    var isEmpty: Bool {
        loadingBehavior == nil &&
        positionPreference == nil &&
        needsCompanion != true &&
        travelAnxiety != true &&
        sedationRequired != true &&
        feedDuringTransport != true &&
        travelBoots != true &&
        travelBlanket != true &&
        headProtection != true &&
        tailGuard != true &&
        pollGuard != true &&
        motionSickness != true &&
        temperaturePreference == nil &&
        maxTravelTime == nil &&
        restBreakFrequency == nil &&
        (insuranceProvider ?? "").isEmpty &&
        (insurancePolicyNumber ?? "").isEmpty &&
        emergencyContacts == nil &&
        (notes ?? "").isEmpty
    }
}

// MARK: - API Response

struct TransportInstructionsResponse: Codable {
    let id: String
    let horseId: String
    // All transport fields are optional and come flattened
    var loadingBehavior: LoadingBehavior?
    var loadingNotes: String?
    var positionPreference: TransportPosition?
    var needsCompanion: Bool?
    var preferredCompanion: String?
    var travelAnxiety: Bool?
    var travelAnxietyNotes: String?
    var sedationRequired: Bool?
    var sedationNotes: String?
    var feedDuringTransport: Bool?
    var feedingInstructions: String?
    var hayNetRequired: Bool?
    var waterInstructions: String?
    var specialEquipment: [String]?
    var travelBoots: Bool?
    var travelBlanket: Bool?
    var headProtection: Bool?
    var tailGuard: Bool?
    var pollGuard: Bool?
    var motionSickness: Bool?
    var ventilationNeeds: String?
    var temperaturePreference: TemperaturePreference?
    var maxTravelTime: Double?
    var restBreakFrequency: Double?
    var unloadForRest: Bool?
    var emergencyContacts: [TransportEmergencyContact]?
    var transportInsurance: String?
    var insuranceProvider: String?
    var insurancePolicyNumber: String?
    var notes: String?

    func toInstructions() -> TransportInstructions {
        TransportInstructions(
            loadingBehavior: loadingBehavior,
            loadingNotes: loadingNotes,
            positionPreference: positionPreference,
            needsCompanion: needsCompanion,
            preferredCompanion: preferredCompanion,
            travelAnxiety: travelAnxiety,
            travelAnxietyNotes: travelAnxietyNotes,
            sedationRequired: sedationRequired,
            sedationNotes: sedationNotes,
            feedDuringTransport: feedDuringTransport,
            feedingInstructions: feedingInstructions,
            hayNetRequired: hayNetRequired,
            waterInstructions: waterInstructions,
            specialEquipment: specialEquipment,
            travelBoots: travelBoots,
            travelBlanket: travelBlanket,
            headProtection: headProtection,
            tailGuard: tailGuard,
            pollGuard: pollGuard,
            motionSickness: motionSickness,
            ventilationNeeds: ventilationNeeds,
            temperaturePreference: temperaturePreference,
            maxTravelTime: maxTravelTime,
            restBreakFrequency: restBreakFrequency,
            unloadForRest: unloadForRest,
            emergencyContacts: emergencyContacts,
            transportInsurance: transportInsurance,
            insuranceProvider: insuranceProvider,
            insurancePolicyNumber: insurancePolicyNumber,
            notes: notes
        )
    }
}
