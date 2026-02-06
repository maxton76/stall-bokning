//
//  Organization.swift
//  EquiDuty
//
//  Domain models for organizations and stables
//

import Foundation

/// Organization type
enum OrganizationType: String, Codable, CaseIterable {
    case personal = "personal"
    case business = "business"
}

// NOTE: SubscriptionTier moved to SubscriptionModels.swift
// Import that file for dynamic subscription tier support

/// Organization stats
struct OrganizationStats: Codable, Equatable {
    var stableCount: Int?
    var totalMemberCount: Int?
}

/// Organization document structure
struct Organization: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    var description: String?
    var organizationType: OrganizationType?
    let ownerId: String
    var ownerName: String?
    var ownerEmail: String?
    var subscriptionTier: SubscriptionTier?
    var implicitStableId: String?
    var stats: OrganizationStats?
    let createdAt: Date
    let updatedAt: Date

    // Computed property for backward compatibility
    var type: OrganizationType {
        organizationType ?? .personal
    }
}

/// Points system configuration for a stable
struct PointsSystemConfig: Codable, Equatable {
    enum ResetPeriod: String, Codable {
        case monthly = "monthly"
        case quarterly = "quarterly"
        case yearly = "yearly"
        case rolling = "rolling"
        case never = "never"
    }

    var resetPeriod: ResetPeriod
    var memoryHorizonDays: Int  // For rolling window (default 90)
    var holidayMultiplier: Double  // Default 1.5
}

/// Stable document structure
struct Stable: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var description: String?
    var address: String?
    var facilityNumber: String?  // Anläggningsnummer
    let ownerId: String
    var ownerEmail: String?
    var organizationId: String?
    var pointsSystem: PointsSystemConfig?
    let createdAt: Date
    let updatedAt: Date
}

/// Organization member document structure
struct OrganizationMember: Codable, Identifiable, Equatable {
    let id: String  // Format: {organizationId}_{userId}
    let organizationId: String
    let userId: String
    var userEmail: String?
    var firstName: String?
    var lastName: String?
    var role: StableMemberRole
    var status: MembershipStatus
    let joinedAt: Date
    var invitedBy: String?
    var inviteAcceptedAt: Date?

    var fullName: String? {
        guard let first = firstName, let last = lastName else { return nil }
        return "\(first) \(last)"
    }
}

// MARK: - API Response Types

/// Response from /organizations endpoint
struct OrganizationsResponse: Codable {
    let organizations: [Organization]
}

/// Response from /stables endpoint
struct StablesResponse: Codable {
    let stables: [Stable]
}
