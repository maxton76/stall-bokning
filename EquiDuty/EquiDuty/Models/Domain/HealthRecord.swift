//
//  HealthRecord.swift
//  EquiDuty
//
//  Health record domain models matching backend health-records.ts API

import Foundation
import SwiftUI

// MARK: - Record Type

enum HealthRecordType: String, Codable, CaseIterable, Identifiable {
    case veterinary
    case farrier
    case dental
    case medication
    case injury
    case deworming
    case other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .veterinary: return String(localized: "health.type.veterinary")
        case .farrier: return String(localized: "health.type.farrier")
        case .dental: return String(localized: "health.type.dental")
        case .medication: return String(localized: "health.type.medication")
        case .injury: return String(localized: "health.type.injury")
        case .deworming: return String(localized: "health.type.deworming")
        case .other: return String(localized: "health.type.other")
        }
    }

    var icon: String {
        switch self {
        case .veterinary: return "cross.case.fill"
        case .farrier: return "hammer.fill"
        case .dental: return "mouth.fill"
        case .medication: return "pills.fill"
        case .injury: return "bandage.fill"
        case .deworming: return "ant.fill"
        case .other: return "heart.text.square.fill"
        }
    }

    var color: Color {
        switch self {
        case .veterinary: return .red
        case .farrier: return .orange
        case .dental: return .cyan
        case .medication: return .purple
        case .injury: return .pink
        case .deworming: return .green
        case .other: return .gray
        }
    }
}

// MARK: - Health Record

struct HealthRecord: Codable, Identifiable, Equatable {
    let id: String
    let horseId: String
    var horseName: String?
    var recordType: HealthRecordType
    var title: String
    var date: Date
    var scheduledTime: String? // HH:MM format
    var duration: Int? // minutes
    var provider: String?
    var providerContactId: String?
    var clinic: String?
    var diagnosis: String?
    var treatment: String?
    var symptoms: String?
    var findings: String?
    var cost: Double?
    var currency: String?
    var requiresFollowUp: Bool?
    var followUpDate: Date?
    var followUpNotes: String?
    var notes: String?
    let createdAt: Date?
    let createdBy: String?
    let updatedAt: Date?
    let lastModifiedBy: String?

    static func == (lhs: HealthRecord, rhs: HealthRecord) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - API Request/Response

struct HealthRecordsResponse: Codable {
    let records: [HealthRecord]
}

struct CreateHealthRecordRequest: Encodable {
    let horseId: String
    let recordType: HealthRecordType
    let title: String
    let date: Date
    var scheduledTime: String?
    var duration: Int?
    var provider: String?
    var clinic: String?
    var diagnosis: String?
    var treatment: String?
    var symptoms: String?
    var findings: String?
    var cost: Double?
    var currency: String?
    var requiresFollowUp: Bool?
    var followUpDate: Date?
    var followUpNotes: String?
    var notes: String?
}

struct UpdateHealthRecordRequest: Encodable {
    let horseId: String
    var recordType: HealthRecordType?
    var title: String?
    var date: Date?
    var scheduledTime: String?
    var duration: Int?
    var provider: String?
    var clinic: String?
    var diagnosis: String?
    var treatment: String?
    var symptoms: String?
    var findings: String?
    var cost: Double?
    var currency: String?
    var requiresFollowUp: Bool?
    var followUpDate: Date?
    var followUpNotes: String?
    var notes: String?
}

// MARK: - Health Stats

struct HealthRecordStats: Codable {
    let totalRecords: Int
    let lastVeterinaryVisit: Date?
    let lastFarrierVisit: Date?
    let lastDentalVisit: Date?
    let lastDewormingDate: Date?
    let upcomingFollowUps: Int
    let totalCostThisYear: Double
}
