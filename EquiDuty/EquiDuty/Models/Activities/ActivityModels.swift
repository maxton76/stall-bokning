//
//  ActivityModels.swift
//  EquiDuty
//
//  Domain models for activity management
//

import Foundation

/// Activity instance status
enum ActivityInstanceStatus: String, Codable, CaseIterable {
    case pending = "pending"
    case inProgress = "in_progress"
    case completed = "completed"
    case cancelled = "cancelled"
    case overdue = "overdue"

    var displayName: String {
        switch self {
        case .pending: return String(localized: "activity.status.pending")
        case .inProgress: return String(localized: "activity.status.in_progress")
        case .completed: return String(localized: "activity.status.completed")
        case .cancelled: return String(localized: "activity.status.cancelled")
        case .overdue: return String(localized: "activity.status.overdue")
        }
    }

    var color: String {
        switch self {
        case .pending: return "blue"
        case .inProgress: return "orange"
        case .completed: return "green"
        case .cancelled: return "gray"
        case .overdue: return "red"
        }
    }
}

/// Activity type category
enum ActivityTypeCategory: String, Codable, CaseIterable {
    case health = "health"
    case training = "training"
    case farrier = "farrier"
    case veterinary = "veterinary"
    case dental = "dental"
    case other = "other"

    var displayName: String {
        switch self {
        case .health: return String(localized: "activity.category.health")
        case .training: return String(localized: "activity.category.training")
        case .farrier: return String(localized: "activity.category.farrier")
        case .veterinary: return String(localized: "activity.category.veterinary")
        case .dental: return String(localized: "activity.category.dental")
        case .other: return String(localized: "activity.category.other")
        }
    }

    var icon: String {
        switch self {
        case .health: return "heart.fill"
        case .training: return "figure.equestrian.sports"
        case .farrier: return "hammer.fill"
        case .veterinary: return "cross.case.fill"
        case .dental: return "mouth.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }
}

/// Activity type definition
struct ActivityType: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String
    var name: String
    var description: String?
    var category: ActivityTypeCategory
    var icon: String?
    var color: String?
    var defaultDuration: Int?  // Minutes
    var isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    let createdBy: String

    var displayIcon: String {
        icon ?? category.icon
    }
}

/// Activity instance (scheduled or logged activity)
struct ActivityInstance: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String
    let stableId: String?
    let activityTypeId: String
    var activityTypeName: String
    var activityTypeCategory: ActivityTypeCategory

    // Scheduling
    var scheduledDate: Date
    var scheduledTime: String?  // "HH:MM"
    var duration: Int?  // Minutes

    // Horse assignment
    var horseIds: [String]
    var horseNames: [String]

    // Assignment
    var assignedTo: String?
    var assignedToName: String?

    // Status
    var status: ActivityInstanceStatus
    var startedAt: Date?
    var completedAt: Date?
    var completedBy: String?
    var completedByName: String?

    // Notes
    var notes: String?
    var photoUrls: [String]?

    // Contact (for external appointments)
    var contactId: String?
    var contactName: String?

    // Metadata
    let createdAt: Date
    let updatedAt: Date
    let createdBy: String
}

// MARK: - Task Models

/// Task priority
enum TaskPriority: String, Codable, CaseIterable {
    case low = "low"
    case medium = "medium"
    case high = "high"
    case urgent = "urgent"

    var displayName: String {
        switch self {
        case .low: return String(localized: "task.priority.low")
        case .medium: return String(localized: "task.priority.medium")
        case .high: return String(localized: "task.priority.high")
        case .urgent: return String(localized: "task.priority.urgent")
        }
    }

    var color: String {
        switch self {
        case .low: return "gray"
        case .medium: return "blue"
        case .high: return "orange"
        case .urgent: return "red"
        }
    }
}

/// Task status
enum TaskStatus: String, Codable, CaseIterable {
    case open = "open"
    case inProgress = "in_progress"
    case completed = "completed"
    case cancelled = "cancelled"

    var displayName: String {
        switch self {
        case .open: return String(localized: "task.status.open")
        case .inProgress: return String(localized: "task.status.in_progress")
        case .completed: return String(localized: "task.status.completed")
        case .cancelled: return String(localized: "task.status.cancelled")
        }
    }
}

/// Task model (renamed to avoid collision with Swift.Task)
struct StableTask: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String
    let stableId: String?
    var title: String
    var description: String?
    var priority: TaskPriority
    var status: TaskStatus
    var dueDate: Date?
    var assignedTo: String?
    var assignedToName: String?
    var horseId: String?
    var horseName: String?
    var completedAt: Date?
    var completedBy: String?
    let createdAt: Date
    let updatedAt: Date
    let createdBy: String
}

// MARK: - Message Models

/// Message model for stable communication
struct Message: Codable, Identifiable, Equatable {
    let id: String
    let organizationId: String
    let stableId: String?
    var content: String
    var authorId: String
    var authorName: String
    var isPinned: Bool
    var expiresAt: Date?
    var horseIds: [String]?
    var horseNames: [String]?
    let createdAt: Date
    let updatedAt: Date
}

// MARK: - API Response Types

struct ActivityTypesResponse: Codable {
    let activityTypes: [ActivityType]
}

struct ActivityInstancesResponse: Codable {
    let activities: [ActivityInstance]
}

struct TasksResponse: Codable {
    let tasks: [StableTask]
}

struct MessagesResponse: Codable {
    let messages: [Message]
}
