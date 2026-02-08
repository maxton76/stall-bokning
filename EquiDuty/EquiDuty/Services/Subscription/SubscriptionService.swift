//
//  SubscriptionService.swift
//  EquiDuty
//
//  Created by Claude on 2026-02-06.
//  Centralized subscription management matching frontend's useSubscription() hook.
//

import Foundation
import Observation

@MainActor
@Observable
final class SubscriptionService {
    static let shared = SubscriptionService()

    // MARK: - Observable State (auto-updates SwiftUI)

    private(set) var currentSubscription: OrganizationSubscription?
    private(set) var tierDefinitions: [TierDefinition] = []
    private(set) var isLoading = false
    private(set) var error: Error?

    // MARK: - Cache (5-minute TTL)

    private var tierCache: [String: TierDefinition] = [:]
    private var cacheTimestamps: [String: Date] = [:]
    private let cacheLifetime: TimeInterval = 300  // 5 minutes

    // MARK: - Dependencies

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Public API

    /// Fetch tier definitions (cached)
    func fetchTierDefinitions() async throws {
        guard shouldRefreshTierCache() else { return }

        isLoading = true
        defer { isLoading = false }

        do {
            // API returns array directly, not wrapped in object
            let tiers: [TierDefinition] = try await apiClient.get("/tiers")
            tierDefinitions = tiers
            tierCache = Dictionary(uniqueKeysWithValues: tiers.map { ($0.tier.value, $0) })
            cacheTimestamps["tierDefinitions"] = Date()
            error = nil
        } catch {
            self.error = error
            throw error
        }
    }

    /// Load subscription from organization's tier value + cached tier definitions.
    /// Mirrors the frontend pattern: derive subscription from org.subscriptionTier + /tiers.
    func loadSubscription(tier tierValue: String?) async throws {
        // Ensure tier definitions are loaded
        if tierCache.isEmpty {
            try await fetchTierDefinitions()
        }

        let effectiveTier = tierValue ?? "free"

        guard let tierDef = tierCache[effectiveTier] else {
            // Fallback to free tier if the tier value is unknown
            if let freeDef = tierCache["free"] {
                currentSubscription = OrganizationSubscription(
                    tier: .free,
                    limits: freeDef.limits,
                    modules: freeDef.modules,
                    addons: freeDef.addons,
                    stripeSubscription: nil
                )
                error = nil
                return
            }
            throw NSError(domain: "SubscriptionService", code: -1,
                        userInfo: [NSLocalizedDescriptionKey: "Tier '\(effectiveTier)' not found in tier definitions"])
        }

        currentSubscription = OrganizationSubscription(
            tier: SubscriptionTier(value: effectiveTier),
            limits: tierDef.limits,
            modules: tierDef.modules,
            addons: tierDef.addons,
            stripeSubscription: nil
        )
        error = nil
    }

    /// Check if feature module is available (like frontend's isFeatureAvailable)
    func isFeatureAvailable(_ module: String) -> Bool {
        guard let subscription = currentSubscription else { return false }

        switch module {
        case "analytics": return subscription.modules.analytics
        case "selectionProcess": return subscription.modules.selectionProcess
        case "locationHistory": return subscription.modules.locationHistory
        case "photoEvidence": return subscription.modules.photoEvidence
        case "leaveManagement": return subscription.modules.leaveManagement
        case "inventory": return subscription.modules.inventory
        case "lessons": return subscription.modules.lessons
        case "staffMatrix": return subscription.modules.staffMatrix
        case "advancedPermissions": return subscription.modules.advancedPermissions
        case "integrations": return subscription.modules.integrations
        case "manure": return subscription.modules.manure
        case "aiAssistant": return subscription.modules.aiAssistant
        case "supportAccess": return subscription.modules.supportAccess
        case "portal": return subscription.addons.portal
        case "invoicing": return subscription.addons.invoicing
        default: return false
        }
    }

    /// Check if within subscription limits
    func isWithinLimit(_ keyPath: KeyPath<SubscriptionLimits, Int>, currentCount: Int) -> Bool {
        currentSubscription?.limits.isWithinLimit(key: keyPath, currentCount: currentCount) ?? false
    }

    /// Get tier definition for current subscription
    var currentTierDefinition: TierDefinition? {
        guard let tier = currentSubscription?.tier else { return nil }
        return tierCache[tier.value]
    }

    /// Get tier definition by tier value
    func tierDefinition(for tier: SubscriptionTier) -> TierDefinition? {
        tierCache[tier.value]
    }

    // MARK: - Cache Management

    /// Invalidate subscription so it gets re-derived on next load
    func invalidateCache(organizationId: String) {
        currentSubscription = nil
    }

    /// Clear all caches
    func clearCache() {
        tierCache.removeAll()
        cacheTimestamps.removeAll()
        currentSubscription = nil
        tierDefinitions = []
    }

    // MARK: - Private Helpers

    private func isCacheValid(key: String) -> Bool {
        guard let timestamp = cacheTimestamps[key] else { return false }
        return Date().timeIntervalSince(timestamp) < cacheLifetime
    }

    private func shouldRefreshTierCache() -> Bool {
        !isCacheValid(key: "tierDefinitions")
    }
}

// MARK: - Convenience Methods

extension SubscriptionService {
    /// Check if organization has invoicing addon
    var hasInvoicing: Bool {
        currentSubscription?.addons.invoicing ?? false
    }

    /// Check if organization has portal addon
    var hasPortal: Bool {
        currentSubscription?.addons.portal ?? false
    }

    /// Get current tier name
    var currentTierName: String {
        currentTierDefinition?.name ?? currentSubscription?.tier.value.capitalized ?? "Unknown"
    }

    /// Check if billing features are available
    var hasBillingFeatures: Bool {
        hasInvoicing
    }
}
