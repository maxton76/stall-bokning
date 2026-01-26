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
    case vaccination = "vaccination"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .dentist: return String(localized: "care.type.dentist")
        case .farrier: return String(localized: "care.type.farrier")
        case .vet: return String(localized: "care.type.vet")
        case .vaccination: return String(localized: "care.type.vaccination")
        }
    }

    var icon: String {
        switch self {
        case .dentist: return "mouth.fill"
        case .farrier: return "hammer.fill"
        case .vet: return "cross.case.fill"
        case .vaccination: return "syringe.fill"
        }
    }

    var color: Color {
        switch self {
        case .dentist: return .cyan
        case .farrier: return .orange
        case .vet: return .red
        case .vaccination: return .green
        }
    }

    /// Match activity type name from API to CareActivityType
    static func from(activityTypeName: String?) -> CareActivityType? {
        guard let name = activityTypeName?.lowercased() else { return nil }
        switch name {
        case "dentist", "dental", "tandvård": return .dentist
        case "farrier", "hovslagare": return .farrier
        case "vet", "veterinary", "veterinär": return .vet
        case "vaccination": return .vaccination
        default: return nil
        }
    }

    /// All care activity type names for API filtering
    static var allTypeNames: [String] {
        ["dentist", "farrier", "vet", "vaccination"]
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
