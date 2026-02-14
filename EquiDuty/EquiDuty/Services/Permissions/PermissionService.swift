//
//  PermissionService.swift
//  EquiDuty
//
//  Created by Claude on 2026-02-06.
//  Permission checking matching frontend's useOrgPermissions() hook.
//

import Foundation
import Observation

@MainActor
@Observable
final class PermissionService {
    static let shared = PermissionService()

    // MARK: - Observable State

    private(set) var userPermissions: UserPermissions?
    private(set) var currentOrganizationId: String?
    private(set) var isLoading = false
    private(set) var error: Error?

    // MARK: - Cache (5-minute TTL per organization)

    private var permissionsCache: [String: UserPermissions] = [:]
    private var cacheTimestamps: [String: Date] = [:]
    private let cacheLifetime: TimeInterval = 300  // 5 minutes

    // MARK: - Dependencies

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Public API

    /// Fetch user permissions for organization (cached)
    func fetchPermissions(organizationId: String) async throws {
        // Check cache first
        if let cached = permissionsCache[organizationId],
           isCacheValid(key: organizationId) {
            userPermissions = cached
            currentOrganizationId = organizationId
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let response: UserPermissionsResponse = try await apiClient.get(
                "/organizations/\(organizationId)/permissions/my"
            )

            let permissions = response.toUserPermissions()
            userPermissions = permissions
            currentOrganizationId = organizationId
            permissionsCache[organizationId] = permissions
            cacheTimestamps[organizationId] = Date()
            error = nil
        } catch {
            self.error = error
            throw error
        }
    }

    /// Check single permission (like frontend's hasPermission())
    func hasPermission(_ action: PermissionAction) -> Bool {
        guard let permissions = userPermissions else { return false }

        // System admin bypass
        if permissions.isSystemAdmin { return true }

        // Organization owner bypass
        if permissions.isOrgOwner { return true }

        // Check permission matrix
        return permissions.hasPermission(action)
    }

    /// Check multiple permissions at once
    func hasPermissions(_ actions: [PermissionAction]) -> [PermissionAction: Bool] {
        Dictionary(uniqueKeysWithValues: actions.map { ($0, hasPermission($0)) })
    }

    /// Check if user has any of specified roles
    func hasAnyRole(_ roles: [OrganizationRole]) -> Bool {
        userPermissions?.hasAnyRole(roles) ?? false
    }

    /// Check if user has specific role
    func hasRole(_ role: OrganizationRole) -> Bool {
        userPermissions?.hasRole(role) ?? false
    }

    /// Check if user is organization owner
    var isOrgOwner: Bool {
        userPermissions?.isOrgOwner ?? false
    }

    /// Check if user is system admin
    var isSystemAdmin: Bool {
        userPermissions?.isSystemAdmin ?? false
    }

    /// Get all user roles
    var roles: [OrganizationRole] {
        userPermissions?.roles ?? []
    }

    /// Get all granted permissions
    var grantedPermissions: [PermissionAction] {
        userPermissions?.grantedPermissions ?? []
    }

    // MARK: - Cache Management

    /// Invalidate cache for specific organization
    func invalidateCache(organizationId: String) {
        permissionsCache.removeValue(forKey: organizationId)
        cacheTimestamps.removeValue(forKey: organizationId)

        if currentOrganizationId == organizationId {
            userPermissions = nil
            currentOrganizationId = nil
        }
    }

    /// Clear all caches
    func clearCache() {
        permissionsCache.removeAll()
        cacheTimestamps.removeAll()
        userPermissions = nil
        currentOrganizationId = nil
    }

    // MARK: - Private Helpers

    private func isCacheValid(key: String) -> Bool {
        guard let timestamp = cacheTimestamps[key] else { return false }
        return Date().timeIntervalSince(timestamp) < cacheLifetime
    }
}

// MARK: - Convenience Methods

extension PermissionService {
    /// Check if user can manage organization settings
    var canManageOrg: Bool {
        hasPermission(.manageOrgSettings)
    }

    /// Check if user can manage members
    var canManageMembers: Bool {
        hasPermission(.manageMembers)
    }

    /// Check if user can view members
    var canViewMembers: Bool {
        hasPermission(.viewMembers)
    }

    /// Check if user can manage billing
    var canManageBilling: Bool {
        hasPermission(.manageBilling)
    }

    /// Check if user can manage schedules
    var canManageSchedules: Bool {
        hasPermission(.manageSchedules)
    }

    /// Check if user can book shifts
    var canBookShifts: Bool {
        hasPermission(.bookShifts)
    }

    /// Check if user can view horses
    var canViewHorses: Bool {
        hasPermission(.viewHorses)
    }

    /// Check if user can manage any horse
    var canManageAnyHorse: Bool {
        hasPermission(.manageAnyHorse)
    }

    /// Check if user can manage own horses
    var canManageOwnHorses: Bool {
        hasPermission(.manageOwnHorses)
    }

    /// Check if user can manage activities
    var canManageActivities: Bool {
        hasPermission(.manageActivities)
    }

    /// Check if user can create stables
    var canCreateStables: Bool {
        hasPermission(.createStables)
    }

    /// Check if user can manage stable settings
    var canManageStableSettings: Bool {
        hasPermission(.manageStableSettings)
    }

    /// Check if user can view stables (create or manage permissions)
    var canViewStables: Bool {
        hasPermission(.createStables) || hasPermission(.manageStableSettings)
    }
}
