//
//  SelectionProcessModels.swift
//  EquiDuty
//
//  Models for the selection process (Rutinval) feature
//

import Foundation

// MARK: - Enums

enum SelectionAlgorithm: String, Codable, CaseIterable, Identifiable {
    case manual
    case quotaBased = "quota_based"
    case pointsBalance = "points_balance"
    case fairRotation = "fair_rotation"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .manual:
            return String(localized: "selectionProcess.algorithm.manual.name")
        case .quotaBased:
            return String(localized: "selectionProcess.algorithm.quotaBased.name")
        case .pointsBalance:
            return String(localized: "selectionProcess.algorithm.pointsBalance.name")
        case .fairRotation:
            return String(localized: "selectionProcess.algorithm.fairRotation.name")
        }
    }

    var description: String {
        switch self {
        case .manual:
            return String(localized: "selectionProcess.algorithm.manual.description")
        case .quotaBased:
            return String(localized: "selectionProcess.algorithm.quotaBased.description")
        case .pointsBalance:
            return String(localized: "selectionProcess.algorithm.pointsBalance.description")
        case .fairRotation:
            return String(localized: "selectionProcess.algorithm.fairRotation.description")
        }
    }

    var icon: String {
        switch self {
        case .manual: return "hand.draw"
        case .quotaBased: return "chart.pie"
        case .pointsBalance: return "scale.3d"
        case .fairRotation: return "arrow.triangle.2.circlepath"
        }
    }
}

enum SelectionProcessStatus: String, Codable, CaseIterable, Identifiable {
    case draft
    case active
    case completed
    case cancelled

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .draft: return String(localized: "selectionProcess.status.draft")
        case .active: return String(localized: "selectionProcess.status.active")
        case .completed: return String(localized: "selectionProcess.status.completed")
        case .cancelled: return String(localized: "selectionProcess.status.cancelled")
        }
    }

    var color: String {
        switch self {
        case .draft: return "gray"
        case .active: return "green"
        case .completed: return "blue"
        case .cancelled: return "red"
        }
    }

    var icon: String {
        switch self {
        case .draft: return "doc.text"
        case .active: return "play.circle.fill"
        case .completed: return "checkmark.circle.fill"
        case .cancelled: return "xmark.circle.fill"
        }
    }
}

enum SelectionTurnStatus: String, Codable {
    case pending
    case active
    case completed
}

// MARK: - List Response

struct SelectionProcessListResponse: Codable {
    let selectionProcesses: [SelectionProcessSummary]
}

// MARK: - Summary (List Item)

struct SelectionProcessSummary: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let status: SelectionProcessStatus
    let selectionStartDate: String
    let selectionEndDate: String
    let totalMembers: Int
    let completedTurns: Int
    let currentTurnUserName: String?
    let isCurrentTurn: Bool
    let createdAt: String

    var formattedDateRange: String {
        let start = Self.parseDate(selectionStartDate)
        let end = Self.parseDate(selectionEndDate)
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        if let start, let end {
            return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
        }
        return "\(selectionStartDate) - \(selectionEndDate)"
    }

    private static func parseDate(_ str: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: str) { return d }
        iso.formatOptions = [.withInternetDateTime]
        if let d = iso.date(from: str) { return d }
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        return df.date(from: str)
    }
}

// MARK: - Detail (with User Context)

struct SelectionProcessWithContext: Codable, Identifiable {
    let id: String
    let organizationId: String
    let stableId: String
    let name: String
    let processDescription: String?
    let selectionStartDate: String
    let selectionEndDate: String
    let turns: [SelectionProcessTurn]
    let currentTurnIndex: Int
    let currentTurnUserId: String?
    let algorithm: SelectionAlgorithm?
    let quotaPerMember: Int?
    let totalAvailablePoints: Int?
    let status: SelectionProcessStatus
    let createdAt: String
    let createdBy: String
    let updatedAt: String
    let startedAt: String?
    let completedAt: String?

    // User context
    let isCurrentTurn: Bool
    let userTurnOrder: Int?
    let userTurnStatus: SelectionTurnStatus?
    let turnsAhead: Int
    let availableRoutinesCount: Int?
    let canManage: Bool

    enum CodingKeys: String, CodingKey {
        case id, organizationId, stableId, name
        case processDescription = "description"
        case selectionStartDate, selectionEndDate
        case turns, currentTurnIndex, currentTurnUserId
        case algorithm, quotaPerMember, totalAvailablePoints
        case status, createdAt, createdBy, updatedAt
        case startedAt, completedAt
        case isCurrentTurn, userTurnOrder, userTurnStatus
        case turnsAhead, availableRoutinesCount, canManage
    }

    var formattedDateRange: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        let start = Self.parseDate(selectionStartDate)
        let end = Self.parseDate(selectionEndDate)
        if let start, let end {
            return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
        }
        return "\(selectionStartDate) - \(selectionEndDate)"
    }

    var completedTurnsCount: Int {
        turns.filter { $0.status == .completed }.count
    }

    private static func parseDate(_ str: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: str) { return d }
        iso.formatOptions = [.withInternetDateTime]
        if let d = iso.date(from: str) { return d }
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        return df.date(from: str)
    }
}

// MARK: - Turn

struct SelectionProcessTurn: Codable, Identifiable, Hashable {
    let userId: String
    let userName: String
    let userEmail: String?
    let order: Int
    let status: SelectionTurnStatus
    let completedAt: String?
    let selectionsCount: Int

    var id: String { "\(userId)-\(order)" }
}

// MARK: - Complete Turn Result

struct CompleteTurnResult: Codable {
    let success: Bool
    let nextTurnUserId: String?
    let nextTurnUserName: String?
    let processCompleted: Bool
}

// MARK: - Computed Turn Order

struct ComputedTurnOrder: Codable {
    let turns: [ComputedTurnMember]
    let algorithm: SelectionAlgorithm
    let metadata: ComputedTurnMetadata?
}

struct ComputedTurnMember: Codable, Identifiable, Hashable {
    let userId: String
    let userName: String
    let userEmail: String

    var id: String { userId }
}

struct ComputedTurnMetadata: Codable {
    let quotaPerMember: Int?
    let totalAvailablePoints: Int?
    let previousProcessId: String?
    let previousProcessName: String?
    let memberPointsMap: [String: Double]?
}

// MARK: - Create Input

struct CreateSelectionProcessInput: Codable {
    let organizationId: String
    let stableId: String
    let name: String
    let description: String?
    let selectionStartDate: String
    let selectionEndDate: String
    let algorithm: SelectionAlgorithm?
    let memberOrder: [CreateSelectionProcessMember]?
}

struct CreateSelectionProcessMember: Codable, Identifiable, Hashable {
    let userId: String
    let userName: String
    let userEmail: String

    var id: String { userId }
}

// MARK: - Compute Order Input

struct ComputeTurnOrderInput: Codable {
    let stableId: String
    let algorithm: SelectionAlgorithm
    let memberIds: [String]
    let selectionStartDate: String
    let selectionEndDate: String
}

// MARK: - Update Dates Input

struct UpdateSelectionDatesInput: Codable {
    let selectionStartDate: String?
    let selectionEndDate: String?
}

// MARK: - Cancel Input

struct CancelSelectionProcessInput: Codable {
    let reason: String?
}

// MARK: - Selection Process Response (for create/update/start/cancel)

struct SelectionProcessResponse: Codable, Identifiable {
    let id: String
    let name: String
    let status: SelectionProcessStatus
    let createdAt: String
}

// MARK: - Stable Member (for member selection)

struct StableMemberForSelection: Codable, Identifiable, Hashable {
    let userId: String
    let displayName: String
    let email: String
    let role: String?

    var id: String { userId }
}

struct StableMembersResponse: Codable {
    let members: [StableMemberInfo]
}

struct StableMemberInfo: Codable, Identifiable, Hashable {
    let userId: String
    let displayName: String?
    let email: String?
    let role: String?

    var id: String { userId }

    var effectiveDisplayName: String {
        displayName ?? email ?? userId
    }
}
