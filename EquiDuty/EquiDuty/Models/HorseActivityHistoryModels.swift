//
//  HorseActivityHistoryModels.swift
//  EquiDuty
//
//  Domain models for horse activity history (routine completion records)
//

import Foundation

// MARK: - Horse Activity History Entry

/// Status of activity execution
enum ExecutionStatus: String, Codable {
    case completed
    case skipped
}

/// Feeding snapshot captured at execution time
struct FeedingSnapshot: Codable, Equatable {
    var instructions: HorseFeedingContext
    var confirmed: Bool
}

/// Medication snapshot captured at execution time
struct MedicationSnapshot: Codable, Equatable {
    var instructions: HorseMedicationContext
    var given: Bool
    var skipped: Bool
    var skipReason: String?
}

/// Blanket snapshot captured at execution time
struct BlanketSnapshot: Codable, Equatable {
    var instructions: HorseBlanketContext
    var action: String  // "on", "off", "unchanged"
}

/// Horse context snapshot captured at execution time
struct HorseContextSnapshot: Codable, Equatable {
    var specialInstructions: String?
    var categoryInstructions: String?
    var horseGroupName: String?
}

/// Horse Activity History Entry
/// Captures a snapshot of routine activity completion for a specific horse.
struct HorseActivityHistoryEntry: Codable, Identifiable, Equatable {
    let id: String

    // Query keys
    let horseId: String
    let routineInstanceId: String
    let routineStepId: String?  // Optional - may not be present for all activity types
    let organizationId: String?  // Optional - may not be present in all responses
    let stableId: String?  // Optional - may not be present in all responses

    // Denormalized (snapshot at execution time)
    var horseName: String?
    var stableName: String?

    // Routine context
    var routineTemplateName: String?
    var routineType: RoutineType?
    var stepName: String?
    var category: RoutineCategory
    var stepOrder: Int?

    // Execution
    var executionStatus: ExecutionStatus?
    var executedAt: Date?
    var executedBy: String?
    var executedByName: String?
    var scheduledDate: Date?

    // Skip details
    var skipReason: String?
    var notes: String?
    var photoUrls: [String]?

    // Category-specific snapshots
    var feedingSnapshot: FeedingSnapshot?
    var medicationSnapshot: MedicationSnapshot?
    var blanketSnapshot: BlanketSnapshot?
    var horseContextSnapshot: HorseContextSnapshot?

    // Metadata
    let createdAt: Date?
    let updatedAt: Date?
    var version: Int?
}

// MARK: - API Response Types

/// Response from horse activity history API
struct HorseActivityHistoryResponse: Codable {
    let activities: [HorseActivityHistoryEntry]
    let nextCursor: String?
    let hasMore: Bool
    let horseName: String?
}

// MARK: - Date Range Filter

/// Predefined date ranges for filtering activity history
enum ActivityDateRange: String, CaseIterable, Identifiable {
    case last7Days = "last7days"
    case last30Days = "last30days"
    case allTime = "alltime"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .last7Days: return String(localized: "horse.history.filter.last7Days")
        case .last30Days: return String(localized: "horse.history.filter.last30Days")
        case .allTime: return String(localized: "horse.history.filter.allTime")
        }
    }

    /// Calculate the start date based on this range (nil for all time)
    func startDate() -> Date? {
        switch self {
        case .last7Days:
            return Calendar.current.date(byAdding: .day, value: -7, to: Date())
        case .last30Days:
            return Calendar.current.date(byAdding: .day, value: -30, to: Date())
        case .allTime:
            return nil
        }
    }
}
