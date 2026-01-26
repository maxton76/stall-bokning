//
//  CareActivityModels.swift
//  EquiDuty
//
//  Domain models for care activities (dentist, farrier, vet, etc.)
//

import SwiftUI

/// Care activity types for horse health management
enum CareActivityType: String, CaseIterable, Codable, Identifiable {
    case dentist = "dentist"
    case farrier = "farrier"
    case vet = "vet"
    case deworm = "deworm"
    case vaccination = "vaccination"
    case chiropractic = "chiropractic"
    case massage = "massage"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .dentist: return String(localized: "care.type.dentist")
        case .farrier: return String(localized: "care.type.farrier")
        case .vet: return String(localized: "care.type.vet")
        case .deworm: return String(localized: "care.type.deworm")
        case .vaccination: return String(localized: "care.type.vaccination")
        case .chiropractic: return String(localized: "care.type.chiropractic")
        case .massage: return String(localized: "care.type.massage")
        }
    }

    var icon: String {
        switch self {
        case .dentist: return "mouth.fill"
        case .farrier: return "hammer.fill"
        case .vet: return "cross.case.fill"
        case .deworm: return "pill.fill"
        case .vaccination: return "syringe.fill"
        case .chiropractic: return "figure.walk"
        case .massage: return "hand.raised.fill"
        }
    }

    var color: Color {
        switch self {
        case .dentist: return .cyan
        case .farrier: return .orange
        case .vet: return .red
        case .deworm: return .purple
        case .vaccination: return .green
        case .chiropractic: return .blue
        case .massage: return .pink
        }
    }

    /// Match activity type name from API to CareActivityType
    static func from(activityTypeName: String?) -> CareActivityType? {
        guard let name = activityTypeName?.lowercased() else { return nil }
        switch name {
        case "dentist", "dental", "tandvård": return .dentist
        case "farrier", "hovslagare": return .farrier
        case "vet", "veterinary", "veterinär": return .vet
        case "deworm", "deworming", "avmaskning": return .deworm
        case "vaccination": return .vaccination
        case "chiropractic", "kiropraktik": return .chiropractic
        case "massage": return .massage
        default: return nil
        }
    }

    /// All care activity type names for API filtering
    static var allTypeNames: [String] {
        ["dentist", "farrier", "vet", "deworm", "vaccination", "chiropractic", "massage"]
    }
}

/// Aggregated care activity status for a single type
struct CareActivityStatus: Identifiable {
    let type: CareActivityType
    let lastCompletedDate: Date?
    let lastCompletedActivity: ActivityInstance?
    let nextScheduledDate: Date?
    let nextScheduledActivity: ActivityInstance?

    var id: String { type.rawValue }

    /// Check if there's a scheduled activity that is overdue
    var isOverdue: Bool {
        guard let nextDate = nextScheduledDate else { return false }
        return nextDate < Date()
    }

    /// Check if there's any activity data
    var hasData: Bool {
        lastCompletedDate != nil || nextScheduledDate != nil
    }
}
