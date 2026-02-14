//
//  RoutineScheduleModels.swift
//  EquiDuty
//
//  Data models for routine schedules - matches backend schema
//

import Foundation

// MARK: - Recurrence Pattern

enum RecurrencePattern: String, Codable, CaseIterable {
    case daily = "daily"
    case weekdays = "weekdays"
    case custom = "custom"

    var displayName: String {
        switch self {
        case .daily: return String(localized: "schedule.pattern.daily")
        case .weekdays: return String(localized: "schedule.pattern.weekdays")
        case .custom: return String(localized: "schedule.pattern.custom")
        }
    }
}

// MARK: - Assignment Mode

enum AssignmentMode: String, Codable {
    case auto = "auto"              // Fairness algorithm
    case manual = "manual"          // Admin assigns
    case fixed = "fixed"            // Fixed assignee
    case unassigned = "unassigned"  // No assignment

    var displayName: String {
        switch self {
        case .auto: return String(localized: "schedule.assignment.auto")
        case .manual: return String(localized: "schedule.assignment.manual")
        case .fixed: return String(localized: "schedule.assignment.fixed")
        case .unassigned: return String(localized: "schedule.assignment.unassigned")
        }
    }
}

// MARK: - Day of Week

enum DayOfWeek: Int, CaseIterable, Codable {
    case sunday = 0
    case monday = 1
    case tuesday = 2
    case wednesday = 3
    case thursday = 4
    case friday = 5
    case saturday = 6

    var displayName: String {
        switch self {
        case .sunday: return String(localized: "day.sunday")
        case .monday: return String(localized: "day.monday")
        case .tuesday: return String(localized: "day.tuesday")
        case .wednesday: return String(localized: "day.wednesday")
        case .thursday: return String(localized: "day.thursday")
        case .friday: return String(localized: "day.friday")
        case .saturday: return String(localized: "day.saturday")
        }
    }

    var shortName: String {
        switch self {
        case .sunday: return String(localized: "day.short.sunday")
        case .monday: return String(localized: "day.short.monday")
        case .tuesday: return String(localized: "day.short.tuesday")
        case .wednesday: return String(localized: "day.short.wednesday")
        case .thursday: return String(localized: "day.short.thursday")
        case .friday: return String(localized: "day.short.friday")
        case .saturday: return String(localized: "day.short.saturday")
        }
    }
}

// MARK: - Routine Schedule (Backend Schema)

struct RoutineSchedule: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String
    let stableId: String
    var templateId: String

    // Denormalized for display
    var templateName: String
    var templateType: String?
    var templateColor: String?
    var stableName: String?

    // Schedule identity
    var name: String?  // Optional custom name

    // Schedule configuration
    var startDate: Date
    var endDate: Date?
    var repeatPattern: RecurrencePattern
    var repeatDays: [Int]?  // [0-6] where 0=Sunday, 6=Saturday
    var includeHolidays: Bool?
    var scheduledStartTime: String  // "HH:MM"

    // Assignment configuration
    var assignmentMode: AssignmentMode
    var defaultAssignedTo: String?
    var defaultAssignedToName: String?
    var assignmentAlgorithm: String?  // "points_balance", "fair_rotation", "quota_based", "manual"
    var autoAssignmentMethod: String?  // "direct", "selection_process"
    var customAssignments: [String: String?]?

    // Status
    var isEnabled: Bool
    var lastGeneratedDate: Date?
    var nextGenerationDate: Date?

    // Audit
    let createdAt: Date
    let createdBy: String
    let createdByName: String?
    let updatedAt: Date
    let updatedBy: String?
    let updatedByName: String?

    // Helper computed properties for UI
    var isActive: Bool { isEnabled }
    var isPaused: Bool { !isEnabled }
}

// MARK: - Schedule Creation/Update Models

struct RoutineScheduleCreate: Codable {
    var organizationId: String
    var stableId: String
    var templateId: String
    var name: String?
    var startDate: String  // "YYYY-MM-DD"
    var endDate: String    // "YYYY-MM-DD" (required by backend)
    var repeatPattern: String  // RecurrencePattern rawValue
    var repeatDays: [Int]?
    var includeHolidays: Bool?
    var scheduledStartTime: String  // "HH:MM"
    var assignmentMode: String  // AssignmentMode rawValue
    var defaultAssignedTo: String?
    var customAssignments: [String: String?]?
}

struct RoutineScheduleUpdate: Codable {
    var name: String?
    var startDate: String?  // "YYYY-MM-DD"
    var endDate: String?    // "YYYY-MM-DD"
    var repeatPattern: String?
    var repeatDays: [Int]?
    var includeHolidays: Bool?
    var scheduledStartTime: String?
    var assignmentMode: String?
    var defaultAssignedTo: String?
    var isEnabled: Bool?
}

// MARK: - API Response Types

struct RoutineScheduleResponse: Codable {
    let schedule: RoutineSchedule
}

struct RoutineSchedulesResponse: Codable {
    let schedules: [RoutineSchedule]
}

// MARK: - Helper Extensions

extension RoutineSchedule {
    /// Get display text for days (e.g., "Mon, Tue, Wed")
    func daysDisplayText() -> String? {
        guard let repeatDays = repeatDays, !repeatDays.isEmpty else { return nil }

        let days = repeatDays.sorted().compactMap { DayOfWeek(rawValue: $0) }
        return days.map { $0.shortName }.joined(separator: ", ")
    }

    /// Check if a specific day is selected
    func isDaySelected(_ day: DayOfWeek) -> Bool {
        repeatDays?.contains(day.rawValue) ?? false
    }
}
