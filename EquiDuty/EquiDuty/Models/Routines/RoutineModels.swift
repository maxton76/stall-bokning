//
//  RoutineModels.swift
//  EquiDuty
//
//  Domain models for routine management (step-by-step stable routines)
//

import Foundation

// MARK: - Routine Categories

/// Category for routine steps (aligned with Swedish stable terminology)
enum RoutineCategory: String, Codable, CaseIterable {
    case preparation = "preparation"      // Förberedelse
    case feeding = "feeding"              // Utfodring
    case medication = "medication"        // Medicinering
    case blanket = "blanket"              // Täckehantering
    case turnout = "turnout"              // Utsläpp
    case bringIn = "bring_in"             // Insläpp
    case mucking = "mucking"              // Mockning
    case water = "water"                  // Vatten
    case healthCheck = "health_check"     // Visitering
    case safety = "safety"                // Säkerhetskontroll
    case cleaning = "cleaning"            // Städning
    case other = "other"                  // Övrigt

    var displayName: String {
        switch self {
        case .preparation: return String(localized: "routine.category.preparation")
        case .feeding: return String(localized: "routine.category.feeding")
        case .medication: return String(localized: "routine.category.medication")
        case .blanket: return String(localized: "routine.category.blanket")
        case .turnout: return String(localized: "routine.category.turnout")
        case .bringIn: return String(localized: "routine.category.bring_in")
        case .mucking: return String(localized: "routine.category.mucking")
        case .water: return String(localized: "routine.category.water")
        case .healthCheck: return String(localized: "routine.category.health_check")
        case .safety: return String(localized: "routine.category.safety")
        case .cleaning: return String(localized: "routine.category.cleaning")
        case .other: return String(localized: "routine.category.other")
        }
    }

    var icon: String {
        switch self {
        case .preparation: return "clipboard"
        case .feeding: return "leaf.fill"
        case .medication: return "pills.fill"
        case .blanket: return "cloud.snow.fill"
        case .turnout: return "sun.max.fill"
        case .bringIn: return "house.fill"
        case .mucking: return "trash.fill"
        case .water: return "drop.fill"
        case .healthCheck: return "heart.text.square.fill"
        case .safety: return "shield.checkered"
        case .cleaning: return "sparkles"
        case .other: return "ellipsis.circle.fill"
        }
    }
}

/// Standard routine types
enum RoutineType: String, Codable, CaseIterable {
    case morning = "morning"
    case midday = "midday"
    case evening = "evening"
    case custom = "custom"

    var displayName: String {
        switch self {
        case .morning: return String(localized: "routine.type.morning")
        case .midday: return String(localized: "routine.type.midday")
        case .evening: return String(localized: "routine.type.evening")
        case .custom: return String(localized: "routine.type.custom")
        }
    }

    var icon: String {
        switch self {
        case .morning: return "sunrise.fill"
        case .midday: return "sun.max.fill"
        case .evening: return "sunset.fill"
        case .custom: return "gearshape.fill"
        }
    }
}

// MARK: - Routine Template

/// Horse context mode for a step
enum RoutineStepHorseContext: String, Codable {
    case all = "all"           // Show all horses in stable
    case specific = "specific" // Show specific horses
    case groups = "groups"     // Show horses from specific groups
    case none = "none"         // No horse context
}

/// Filter for which horses to include in a step
struct RoutineStepHorseFilter: Codable, Equatable, Hashable {
    var horseIds: [String]?
    var groupIds: [String]?
    var locationIds: [String]?
    var excludeHorseIds: [String]?
}

/// Individual step within a routine template
struct RoutineStep: Codable, Identifiable, Equatable, Hashable {
    let id: String
    var order: Int
    var name: String
    var description: String?
    var category: RoutineCategory
    var icon: String?

    // Horse context configuration
    var horseContext: RoutineStepHorseContext
    var horseFilter: RoutineStepHorseFilter?

    // What to show per horse
    var showFeeding: Bool?
    var showMedication: Bool?
    var showSpecialInstructions: Bool?
    var showBlanketStatus: Bool?

    // Completion requirements
    var requiresConfirmation: Bool
    var allowPartialCompletion: Bool
    var allowPhotoEvidence: Bool?

    // Time tracking
    var estimatedMinutes: Int?

    // Link to FeedingTime for feeding steps
    var feedingTimeId: String?

    var displayIcon: String {
        icon ?? category.icon
    }
}

/// Routine Template - Reusable routine pattern definition
struct RoutineTemplate: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String
    var stableId: String?

    // Identity
    var name: String
    var description: String?
    var type: RoutineType
    var icon: String?
    var color: String?

    // Timing
    var defaultStartTime: String  // "HH:MM" format
    var estimatedDuration: Int    // Minutes

    // Steps
    var steps: [RoutineStep]

    // Settings
    var requiresNotesRead: Bool
    var allowSkipSteps: Bool
    var pointsValue: Int

    // Audit
    let createdAt: Date
    let createdBy: String
    let updatedAt: Date
    var updatedBy: String?
    var isActive: Bool

    var displayIcon: String {
        icon ?? type.icon
    }
}

// MARK: - Routine Instance

/// Assignment type for routine instances
enum RoutineAssignmentType: String, Codable {
    case auto = "auto"
    case manual = "manual"
    case selfBooked = "selfBooked"
}

/// Status of a routine instance
enum RoutineInstanceStatus: String, Codable, CaseIterable {
    case scheduled = "scheduled"      // Upcoming, not started
    case started = "started"          // In progress (notes acknowledged)
    case inProgress = "in_progress"   // Actively working on steps
    case completed = "completed"      // All steps completed
    case missed = "missed"            // Overdue and not completed
    case cancelled = "cancelled"      // Explicitly cancelled

    var displayName: String {
        switch self {
        case .scheduled: return String(localized: "routine.status.scheduled")
        case .started: return String(localized: "routine.status.started")
        case .inProgress: return String(localized: "routine.status.in_progress")
        case .completed: return String(localized: "routine.status.completed")
        case .missed: return String(localized: "routine.status.missed")
        case .cancelled: return String(localized: "routine.status.cancelled")
        }
    }

    var color: String {
        switch self {
        case .scheduled: return "blue"
        case .started, .inProgress: return "orange"
        case .completed: return "green"
        case .missed: return "red"
        case .cancelled: return "gray"
        }
    }
}

/// Step completion status
enum StepStatus: String, Codable {
    case pending = "pending"
    case inProgress = "in_progress"
    case completed = "completed"
    case skipped = "skipped"
}

/// Per-horse progress within a step
struct HorseStepProgress: Codable, Equatable, Hashable {
    var horseId: String
    var horseName: String
    var completed: Bool
    var skipped: Bool
    var skipReason: String?
    var notes: String?
    var photoUrls: [String]?

    // Category-specific data
    var feedingConfirmed: Bool?
    var medicationGiven: Bool?
    var medicationSkipped: Bool?
    var blanketAction: String?  // "on", "off", "unchanged"

    // Timestamps
    var completedAt: Date?
    var completedBy: String?
}

/// Progress tracking for an individual step
struct StepProgress: Codable, Equatable, Hashable {
    var stepId: String
    var status: StepStatus
    var startedAt: Date?
    var completedAt: Date?

    // For steps without horse context
    var generalNotes: String?
    var photoUrls: [String]?

    // Per-horse completion
    var horseProgress: [String: HorseStepProgress]?
    var horsesCompleted: Int?
    var horsesTotal: Int?

    var progressPercent: Double {
        guard let total = horsesTotal, total > 0,
              let completed = horsesCompleted else {
            return status == .completed ? 1.0 : 0.0
        }
        return Double(completed) / Double(total)
    }
}

/// Overall progress tracking for a routine instance
struct RoutineProgress: Codable, Equatable, Hashable {
    var stepsCompleted: Int
    var stepsTotal: Int
    var percentComplete: Double  // 0-100
    var stepProgress: [String: StepProgress]

    var isComplete: Bool {
        stepsCompleted == stepsTotal
    }
}

/// Embedded template data returned with routine instances
struct EmbeddedRoutineTemplate: Codable, Equatable, Hashable {
    var name: String
    var description: String?
    var type: RoutineType
    var icon: String?
    var color: String?
    var estimatedDuration: Int
    var requiresNotesRead: Bool
    var allowSkipSteps: Bool
    var steps: [RoutineStep]
}

/// Routine Instance - Materialized routine for a specific date
struct RoutineInstance: Codable, Identifiable, Equatable, Hashable {
    let id: String
    let templateId: String
    var templateName: String
    let organizationId: String
    let stableId: String
    var stableName: String?

    // Embedded template (returned by API for convenience)
    var template: EmbeddedRoutineTemplate?

    // Scheduling
    var scheduledDate: Date
    var scheduledStartTime: String  // "HH:MM"
    var estimatedDuration: Int

    // Assignment
    var assignedTo: String?
    var assignedToName: String?
    var assignmentType: RoutineAssignmentType
    var assignedAt: Date?
    var assignedBy: String?

    // Status
    var status: RoutineInstanceStatus
    var startedAt: Date?
    var completedAt: Date?
    var completedBy: String?
    var completedByName: String?
    var cancelledAt: Date?
    var cancelledBy: String?
    var cancellationReason: String?

    // Progress
    var currentStepId: String?
    var currentStepOrder: Int?
    var progress: RoutineProgress

    // Fairness
    var pointsValue: Int
    var pointsAwarded: Int?
    var isHolidayShift: Bool?

    // Daily notes acknowledgment
    var dailyNotesAcknowledged: Bool
    var dailyNotesAcknowledgedAt: Date?

    // Notes
    var notes: String?

    // Metadata
    let createdAt: Date
    let createdBy: String
    let updatedAt: Date
    var updatedBy: String?
}

// MARK: - Daily Notes

/// Priority level for notes and alerts
enum NotePriority: String, Codable, CaseIterable {
    case info = "info"
    case warning = "warning"
    case critical = "critical"

    var displayName: String {
        switch self {
        case .info: return String(localized: "priority.info")
        case .warning: return String(localized: "priority.warning")
        case .critical: return String(localized: "priority.critical")
        }
    }

    var color: String {
        switch self {
        case .info: return "blue"
        case .warning: return "orange"
        case .critical: return "red"
        }
    }

    var icon: String {
        switch self {
        case .info: return "info.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .critical: return "exclamationmark.octagon.fill"
        }
    }
}

/// Horse-specific note for the day
struct HorseDailyNote: Codable, Identifiable, Equatable {
    let id: String
    let horseId: String
    var horseName: String
    var note: String
    var priority: NotePriority
    var category: String?
    let createdAt: Date
    let createdBy: String
    var createdByName: String?
}

/// Priority alert for the day
struct DailyAlert: Codable, Identifiable, Equatable {
    let id: String
    var title: String
    var message: String
    var priority: NotePriority
    var affectedHorseIds: [String]?
    var affectedHorseNames: [String]?
    var expiresAt: Date?
    let createdAt: Date
    let createdBy: String
    var createdByName: String?
}

/// Daily Notes - Organization-wide notes for the day
struct DailyNotes: Codable, Identifiable, Equatable {
    let id: String  // Same as date: "YYYY-MM-DD"
    let organizationId: String
    let stableId: String
    let date: String

    var generalNotes: String?
    var weatherNotes: String?
    var horseNotes: [HorseDailyNote]
    var alerts: [DailyAlert]

    let createdAt: Date
    let updatedAt: Date
    let lastUpdatedBy: String
    var lastUpdatedByName: String?
}

// MARK: - API Response Types

struct RoutineTemplatesResponse: Codable {
    let routineTemplates: [RoutineTemplate]
}

struct RoutineInstancesResponse: Codable {
    let routineInstances: [RoutineInstance]
}

struct DailyNotesResponse: Codable {
    let dailyNotes: DailyNotes?
}

// MARK: - Feeding Context (for routine steps)

/// Horse feeding context displayed during routine step
struct HorseFeedingContext: Codable, Equatable {
    var feedTypeName: String
    var quantity: Double
    var quantityMeasure: String
    var specialInstructions: String?
}

/// Horse medication context displayed during routine step
struct HorseMedicationContext: Codable, Equatable {
    var medicationName: String
    var dosage: String
    var administrationMethod: String
    var notes: String?
    var isRequired: Bool
}

/// Horse blanket context displayed during routine step
struct HorseBlanketContext: Codable, Equatable {
    var currentBlanket: String?
    var recommendedAction: String  // "on", "off", "change", "none"
    var targetBlanket: String?
    var reason: String?
}
