//
//  PermissionViewModifiers.swift
//  EquiDuty
//
//  Created by Claude on 2026-02-06.
//  Declarative permission checking (like frontend's permission wrappers).
//

import SwiftUI

// MARK: - Permission Checking

/// Hide view if permission not granted
struct PermissionRequired: ViewModifier {
    let action: PermissionAction
    @State private var permissionService = PermissionService.shared

    func body(content: Content) -> some View {
        if permissionService.hasPermission(action) {
            content
        } else {
            EmptyView()
        }
    }
}

extension View {
    /// Show this view only if user has required permission
    /// - Parameter action: The permission action required
    /// - Returns: View visible only if permission granted, hidden otherwise
    ///
    /// Example:
    /// ```swift
    /// Button("Create Invoice") { }
    ///     .requiresPermission(.manageInvoices)
    /// ```
    func requiresPermission(_ action: PermissionAction) -> some View {
        modifier(PermissionRequired(action: action))
    }
}

// MARK: - Multiple Permissions (AND logic)

/// Hide view if any of the permissions are not granted
struct AllPermissionsRequired: ViewModifier {
    let actions: [PermissionAction]
    @State private var permissionService = PermissionService.shared

    func body(content: Content) -> some View {
        if actions.allSatisfy({ permissionService.hasPermission($0) }) {
            content
        } else {
            EmptyView()
        }
    }
}

extension View {
    /// Show this view only if user has ALL required permissions
    /// - Parameter actions: Array of permission actions (AND logic)
    /// - Returns: View visible only if all permissions granted
    ///
    /// Example:
    /// ```swift
    /// Button("Advanced Settings") { }
    ///     .requiresAllPermissions([.manageOrgSettings, .manageBilling])
    /// ```
    func requiresAllPermissions(_ actions: [PermissionAction]) -> some View {
        modifier(AllPermissionsRequired(actions: actions))
    }
}

// MARK: - Any Permission (OR logic)

/// Hide view if none of the permissions are granted
struct AnyPermissionRequired: ViewModifier {
    let actions: [PermissionAction]
    @State private var permissionService = PermissionService.shared

    func body(content: Content) -> some View {
        if actions.contains(where: { permissionService.hasPermission($0) }) {
            content
        } else {
            EmptyView()
        }
    }
}

extension View {
    /// Show this view only if user has ANY of the required permissions
    /// - Parameter actions: Array of permission actions (OR logic)
    /// - Returns: View visible if at least one permission granted
    ///
    /// Example:
    /// ```swift
    /// Button("Manage Horses") { }
    ///     .requiresAnyPermission([.manageOwnHorses, .manageAnyHorse])
    /// ```
    func requiresAnyPermission(_ actions: [PermissionAction]) -> some View {
        modifier(AnyPermissionRequired(actions: actions))
    }
}

// MARK: - Feature Gating

/// Hide view if subscription module not available
struct FeatureGated: ViewModifier {
    let module: String
    @State private var subscriptionService = SubscriptionService.shared

    func body(content: Content) -> some View {
        if subscriptionService.isFeatureAvailable(module) {
            content
        } else {
            EmptyView()
        }
    }
}

extension View {
    /// Show this view only if subscription includes module
    /// - Parameter module: The feature module name
    /// - Returns: View visible only if subscription includes module
    ///
    /// Example:
    /// ```swift
    /// NavigationLink("Analytics") { AnalyticsView() }
    ///     .requiresFeature("analytics")
    /// ```
    func requiresFeature(_ module: String) -> some View {
        modifier(FeatureGated(module: module))
    }
}

// MARK: - Role Checking

/// Hide view if user doesn't have required role
struct RoleRequired: ViewModifier {
    let roles: [OrganizationRole]
    @State private var permissionService = PermissionService.shared

    func body(content: Content) -> some View {
        if permissionService.hasAnyRole(roles) {
            content
        } else {
            EmptyView()
        }
    }
}

extension View {
    /// Show this view only if user has any of specified roles
    /// - Parameter roles: Organization roles (variadic)
    /// - Returns: View visible only if user has any of the roles
    ///
    /// Example:
    /// ```swift
    /// NavigationLink("Admin Settings") { SettingsView() }
    ///     .requiresRole(.administrator)
    /// ```
    func requiresRole(_ roles: OrganizationRole...) -> some View {
        modifier(RoleRequired(roles: roles))
    }

    /// Show this view only if user has any of specified roles
    /// - Parameter roles: Array of organization roles
    /// - Returns: View visible only if user has any of the roles
    func requiresRoles(_ roles: [OrganizationRole]) -> some View {
        modifier(RoleRequired(roles: roles))
    }
}

// MARK: - Combined Permission + Feature

/// Hide view if both permission and feature module are not available
struct PermissionAndFeatureRequired: ViewModifier {
    let action: PermissionAction
    let module: String
    @State private var permissionService = PermissionService.shared
    @State private var subscriptionService = SubscriptionService.shared

    func body(content: Content) -> some View {
        if subscriptionService.isFeatureAvailable(module) && permissionService.hasPermission(action) {
            content
        } else {
            EmptyView()
        }
    }
}

extension View {
    /// Show this view only if both subscription includes module AND user has permission
    /// - Parameters:
    ///   - module: Feature module name
    ///   - action: Permission action
    /// - Returns: View visible only if both conditions met
    ///
    /// Example:
    /// ```swift
    /// Button("Manage Lessons") { }
    ///     .requiresFeatureAndPermission("lessons", .manageLessons)
    /// ```
    func requiresFeatureAndPermission(_ module: String, _ action: PermissionAction) -> some View {
        modifier(PermissionAndFeatureRequired(action: action, module: module))
    }
}

// MARK: - Organization Owner Only

/// Hide view if user is not organization owner
struct OrganizationOwnerRequired: ViewModifier {
    @State private var permissionService = PermissionService.shared

    func body(content: Content) -> some View {
        if permissionService.isOrgOwner {
            content
        } else {
            EmptyView()
        }
    }
}

extension View {
    /// Show this view only if user is organization owner
    /// - Returns: View visible only for organization owner
    ///
    /// Example:
    /// ```swift
    /// Button("Delete Organization") { }
    ///     .requiresOrgOwner()
    /// ```
    func requiresOrgOwner() -> some View {
        modifier(OrganizationOwnerRequired())
    }
}

// MARK: - System Admin Only

/// Hide view if user is not system admin
struct SystemAdminRequired: ViewModifier {
    @State private var permissionService = PermissionService.shared

    func body(content: Content) -> some View {
        if permissionService.isSystemAdmin {
            content
        } else {
            EmptyView()
        }
    }
}

extension View {
    /// Show this view only if user is system admin
    /// - Returns: View visible only for system admins
    ///
    /// Example:
    /// ```swift
    /// Button("System Settings") { }
    ///     .requiresSystemAdmin()
    /// ```
    func requiresSystemAdmin() -> some View {
        modifier(SystemAdminRequired())
    }
}
