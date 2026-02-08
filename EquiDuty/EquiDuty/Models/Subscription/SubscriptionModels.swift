//
//  SubscriptionModels.swift
//  EquiDuty
//
//  Created by Claude on 2026-02-06.
//  Dynamic subscription system supporting any tier value.
//

import Foundation

// MARK: - Dynamic Subscription Tier

/// Flexible subscription tier supporting any value (no hardcoded enum)
/// Replaces old hardcoded enum that caused crashes on "standard" tier
struct SubscriptionTier: Codable, Equatable, Hashable {
    let value: String

    // Known tiers as static properties
    static let free = SubscriptionTier(value: "free")
    static let standard = SubscriptionTier(value: "standard")
    static let pro = SubscriptionTier(value: "pro")
    static let enterprise = SubscriptionTier(value: "enterprise")

    // Codable conformance
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        value = try container.decode(String.self)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(value)
    }

    init(value: String) {
        self.value = value
    }
}

// MARK: - Module Flags

/// 13 module flags controlling feature access
struct ModuleFlags: Codable, Equatable {
    let analytics: Bool
    let selectionProcess: Bool
    let locationHistory: Bool
    let photoEvidence: Bool
    let leaveManagement: Bool
    let inventory: Bool
    let lessons: Bool
    let staffMatrix: Bool
    let advancedPermissions: Bool  // Gates custom permission matrix UI
    let integrations: Bool
    let manure: Bool
    let aiAssistant: Bool
    let supportAccess: Bool

    // Default initializer for testing
    init(
        analytics: Bool = false,
        selectionProcess: Bool = false,
        locationHistory: Bool = false,
        photoEvidence: Bool = false,
        leaveManagement: Bool = false,
        inventory: Bool = false,
        lessons: Bool = false,
        staffMatrix: Bool = false,
        advancedPermissions: Bool = false,
        integrations: Bool = false,
        manure: Bool = false,
        aiAssistant: Bool = false,
        supportAccess: Bool = false
    ) {
        self.analytics = analytics
        self.selectionProcess = selectionProcess
        self.locationHistory = locationHistory
        self.photoEvidence = photoEvidence
        self.leaveManagement = leaveManagement
        self.inventory = inventory
        self.lessons = lessons
        self.staffMatrix = staffMatrix
        self.advancedPermissions = advancedPermissions
        self.integrations = integrations
        self.manure = manure
        self.aiAssistant = aiAssistant
        self.supportAccess = supportAccess
    }
}

// MARK: - Subscription Limits

/// Subscription limits (-1 = unlimited)
struct SubscriptionLimits: Codable, Equatable {
    let members: Int
    let stables: Int
    let horses: Int
    let routineTemplates: Int
    let routineSchedules: Int
    let feedingPlans: Int
    let facilities: Int
    let contacts: Int
    let supportContacts: Int

    /// Check if current count is within limit
    /// - Parameters:
    ///   - key: KeyPath to limit property
    ///   - currentCount: Current number of items
    /// - Returns: true if within limit (or unlimited), false if exceeded
    func isWithinLimit(key: KeyPath<SubscriptionLimits, Int>, currentCount: Int) -> Bool {
        let limit = self[keyPath: key]
        return limit == -1 || currentCount < limit
    }

    // Default initializer for testing
    init(
        members: Int = -1,
        stables: Int = -1,
        horses: Int = -1,
        routineTemplates: Int = -1,
        routineSchedules: Int = -1,
        feedingPlans: Int = -1,
        facilities: Int = -1,
        contacts: Int = -1,
        supportContacts: Int = -1
    ) {
        self.members = members
        self.stables = stables
        self.horses = horses
        self.routineTemplates = routineTemplates
        self.routineSchedules = routineSchedules
        self.feedingPlans = feedingPlans
        self.facilities = facilities
        self.contacts = contacts
        self.supportContacts = supportContacts
    }
}

// MARK: - Subscription Add-ons

/// Add-ons (portal, invoicing)
struct SubscriptionAddons: Codable, Equatable {
    let portal: Bool
    let invoicing: Bool

    init(portal: Bool = false, invoicing: Bool = false) {
        self.portal = portal
        self.invoicing = invoicing
    }
}

// MARK: - Stripe Subscription Info

/// Stripe subscription details
struct StripeSubscriptionInfo: Codable, Equatable {
    let status: String
    let billingInterval: String?
    let currentPeriodStart: Date?
    let currentPeriodEnd: Date?
    let cancelAtPeriodEnd: Bool
    let hasHadTrial: Bool?

    // Optional fields that may be present in some responses
    let subscriptionId: String?
    let customerId: String?

    enum CodingKeys: String, CodingKey {
        case status
        case billingInterval
        case currentPeriodStart
        case currentPeriodEnd
        case cancelAtPeriodEnd
        case hasHadTrial
        case subscriptionId
        case customerId
    }
}

// MARK: - Tier Definition

/// Complete tier definition (from /tiers endpoint)
struct TierDefinition: Codable, Identifiable, Equatable {
    let tier: SubscriptionTier
    let name: String
    let description: String
    let price: Int  // Monthly price in SEK
    let limits: SubscriptionLimits
    let modules: ModuleFlags
    let addons: SubscriptionAddons
    let sortOrder: Int?  // Optional: display order
    let isBillable: Bool

    var id: String { tier.value }

    // Note: 'enabled' field was removed from backend, using existence in list as "enabled"
}

// MARK: - Organization Subscription

/// Organization's active subscription
struct OrganizationSubscription: Codable, Equatable {
    let tier: SubscriptionTier
    let limits: SubscriptionLimits
    let modules: ModuleFlags
    let addons: SubscriptionAddons
    let stripeSubscription: StripeSubscriptionInfo?
}

// MARK: - API Response Types

struct TierDefinitionsResponse: Codable {
    let tiers: [TierDefinition]
}

