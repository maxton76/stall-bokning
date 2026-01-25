//
//  User.swift
//  EquiDuty
//
//  Domain models for user authentication and profile
//

import Foundation

/// System-level roles (platform-wide)
enum SystemRole: String, Codable, CaseIterable {
    case systemAdmin = "system_admin"
    case stableOwner = "stable_owner"
    case stableUser = "stable_user"  // Legacy role, maps to member
    case member = "member"

    var displayName: String {
        switch self {
        case .systemAdmin: return String(localized: "role.system_admin")
        case .stableOwner: return String(localized: "role.stable_owner")
        case .stableUser, .member: return String(localized: "role.member")
        }
    }
}

/// Stable-level roles (per-stable basis for members)
enum StableMemberRole: String, Codable, CaseIterable {
    case manager = "manager"
    case member = "member"

    var displayName: String {
        switch self {
        case .manager: return String(localized: "role.manager")
        case .member: return String(localized: "role.member")
        }
    }
}

/// Membership status for stable members
enum MembershipStatus: String, Codable, CaseIterable {
    case pending = "pending"
    case active = "active"
    case suspended = "suspended"
    case removed = "removed"
}

/// User document structure
struct User: Codable, Identifiable, Equatable {
    // API can return either `id` or `uid`
    private let _id: String?
    private let _uid: String?
    let email: String
    let firstName: String
    let lastName: String
    let systemRole: SystemRole
    let createdAt: Date
    let updatedAt: Date

    var uid: String { _uid ?? _id ?? "" }
    var id: String { uid }

    enum CodingKeys: String, CodingKey {
        case _id = "id"
        case _uid = "uid"
        case email, firstName, lastName, systemRole, createdAt, updatedAt
    }

    init(uid: String, email: String, firstName: String, lastName: String, systemRole: SystemRole, createdAt: Date, updatedAt: Date) {
        self._id = uid
        self._uid = uid
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        self.systemRole = systemRole
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var fullName: String {
        "\(firstName) \(lastName)"
    }

    var initials: String {
        let firstInitial = firstName.first.map(String.init) ?? ""
        let lastInitial = lastName.first.map(String.init) ?? ""
        return "\(firstInitial)\(lastInitial)"
    }
}

/// Member statistics for fairness tracking
struct MemberStats: Codable, Equatable {
    var totalPoints: Int
    var totalShifts: Int
    var currentPeriodPoints: Int
    var lastShiftDate: Date?
    var lastPointsReset: Date?
}

/// Stable member document structure
struct StableMember: Codable, Identifiable, Equatable {
    let id: String  // Format: {userId}_{stableId}
    let stableId: String
    let userId: String
    var userEmail: String?
    var firstName: String?
    var lastName: String?
    var role: StableMemberRole
    var status: MembershipStatus
    let joinedAt: Date
    var invitedBy: String?
    var inviteAcceptedAt: Date?
    var stats: MemberStats?

    var fullName: String? {
        guard let first = firstName, let last = lastName else { return nil }
        return "\(first) \(last)"
    }
}

