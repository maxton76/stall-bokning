//
//  ActivityModels.swift
//  EquiDuty
//
//  Domain models for activity management
//

import Foundation
import SwiftUI

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

    var color: Color {
        switch self {
        case .pending: return .blue
        case .inProgress: return .orange
        case .completed: return .green
        case .cancelled: return .gray
        case .overdue: return .red
        }
    }

    var icon: String {
        switch self {
        case .pending: return "clock.fill"
        case .inProgress: return "play.fill"
        case .completed: return "checkmark"
        case .cancelled: return "xmark"
        case .overdue: return "exclamationmark.circle.fill"
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
struct ActivityInstance: Codable, Identifiable, Equatable, Hashable {
    let id: String
    let organizationId: String?
    let stableId: String?
    let stableName: String?

    // Activity type info - API uses different field names
    private let activityTypeConfigId: String?
    private let activityType: String?  // API field name for type name (e.g., "dentist")
    private let _activityTypeName: String?  // Some API responses may include this
    private let activityTypeColor: String?
    private let type: String?  // Activity type: "activity", "task", "message"

    // Scheduling - API uses "date" instead of "scheduledDate"
    private let date: Date?
    private let _scheduledDate: Date?
    var scheduledTime: String?  // "HH:MM"
    var duration: Int?  // Minutes

    // Horse assignment - API can send single or array
    private let horseId: String?
    private let horseName: String?
    private let _horseIds: [String]?
    private let _horseNames: [String]?

    // Assignment
    var assignedTo: String?
    var assignedToName: String?

    // Status
    var status: ActivityInstanceStatus
    var startedAt: Date?
    var completedAt: Date?
    var completedBy: String?
    var completedByName: String?

    // Notes - API uses "note" (singular)
    private let note: String?
    private let _notes: String?
    var photoUrls: [String]?

    // Contact (for external appointments)
    var contactId: String?
    var contactName: String?

    // Metadata - API uses lastModifiedAt instead of updatedAt
    let createdAt: Date
    private let lastModifiedAt: Date?
    private let _updatedAt: Date?
    let createdBy: String

    // MARK: - Coding Keys

    enum CodingKeys: String, CodingKey {
        case id, organizationId, stableId, stableName
        case activityTypeConfigId, activityType, activityTypeColor, type
        case _activityTypeName = "activityTypeName"
        case date
        case _scheduledDate = "scheduledDate"
        case scheduledTime, duration
        case horseId, horseName
        case _horseIds = "horseIds"
        case _horseNames = "horseNames"
        case assignedTo, assignedToName
        case status, startedAt, completedAt, completedBy, completedByName
        case note
        case _notes = "notes"
        case photoUrls
        case contactId, contactName
        case createdAt, lastModifiedAt
        case _updatedAt = "updatedAt"
        case createdBy
    }

    // MARK: - Computed Properties

    /// Activity type ID (from activityTypeConfigId)
    var activityTypeId: String {
        activityTypeConfigId ?? ""
    }

    /// Activity type name (from activityTypeName or activityType field)
    var activityTypeName: String {
        // Try explicit activityTypeName first, then activityType
        if let name = _activityTypeName, !name.isEmpty {
            return name
        }
        if let name = activityType, !name.isEmpty {
            // Capitalize first letter for display
            return name.prefix(1).uppercased() + name.dropFirst()
        }
        return String(localized: "activity.type.unknown")
    }

    /// Activity type category (derived from activityType name)
    var activityTypeCategory: ActivityTypeCategory {
        guard let typeName = activityType?.lowercased() else { return .other }
        switch typeName {
        case "dentist", "dental": return .dental
        case "farrier", "hovslagare": return .farrier
        case "veterinary", "vet", "veterinär": return .veterinary
        case "training", "träning": return .training
        case "health", "hälsa": return .health
        default: return .other
        }
    }

    /// Scheduled date (from either date or scheduledDate field)
    var scheduledDate: Date {
        date ?? _scheduledDate ?? Date()
    }

    /// Horse IDs (handles both single and array)
    var horseIds: [String] {
        if let ids = _horseIds, !ids.isEmpty {
            return ids
        }
        if let id = horseId {
            return [id]
        }
        return []
    }

    /// Horse names (handles both single and array)
    var horseNames: [String] {
        if let names = _horseNames, !names.isEmpty {
            return names
        }
        if let name = horseName {
            return [name]
        }
        return []
    }

    /// Notes (from either note or notes field)
    var notes: String? {
        _notes ?? note
    }

    /// Updated at date (from either updatedAt or lastModifiedAt field)
    var updatedAt: Date {
        _updatedAt ?? lastModifiedAt ?? createdAt
    }
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

    var color: Color {
        switch self {
        case .low: return .gray
        case .medium: return .blue
        case .high: return .orange
        case .urgent: return .red
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
