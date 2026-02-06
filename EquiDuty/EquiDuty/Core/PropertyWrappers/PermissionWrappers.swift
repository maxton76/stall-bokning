//
//  PermissionWrappers.swift
//  EquiDuty
//
//  Created by Claude on 2026-02-06.
//  Convenient property-level checks for ViewModels.
//

import SwiftUI

/// Property wrapper for permission checking
///
/// Example:
/// ```swift
/// @Observable
/// class ScheduleViewModel {
///     @Permission(.manageSchedules) var canManageSchedules
///     @Permission(.bookShifts) var canBookShifts
///
///     func createSchedule() {
///         guard canManageSchedules else {
///             showError("Permission denied")
///             return
///         }
///         // ... create logic
///     }
/// }
/// ```
@propertyWrapper
struct Permission {
    private let action: PermissionAction

    var wrappedValue: Bool {
        PermissionService.shared.hasPermission(action)
    }

    init(_ action: PermissionAction) {
        self.action = action
    }
}

/// Property wrapper for feature flag checking
///
/// Example:
/// ```swift
/// @Observable
/// class AnalyticsViewModel {
///     @FeatureFlag("analytics") var hasAnalytics
///     @FeatureFlag("invoicing") var hasInvoicing
///
///     func loadData() {
///         guard hasAnalytics else {
///             showUpgradePrompt()
///             return
///         }
///         // ... load analytics
///     }
/// }
/// ```
@propertyWrapper
struct FeatureFlag {
    private let module: String

    var wrappedValue: Bool {
        SubscriptionService.shared.isFeatureAvailable(module)
    }

    init(_ module: String) {
        self.module = module
    }
}

/// Property wrapper for role checking
///
/// Example:
/// ```swift
/// @Observable
/// class MemberViewModel {
///     @HasRole(.administrator) var isAdmin
///     @HasRole(.bookkeeper) var isBookkeeper
///
///     var canAccessBilling: Bool {
///         isAdmin || isBookkeeper
///     }
/// }
/// ```
@propertyWrapper
struct HasRole {
    private let role: OrganizationRole

    var wrappedValue: Bool {
        PermissionService.shared.hasRole(role)
    }

    init(_ role: OrganizationRole) {
        self.role = role
    }
}

/// Property wrapper for checking any of multiple roles
///
/// Example:
/// ```swift
/// @Observable
/// class VetViewModel {
///     @HasAnyRole([.veterinarian, .dentist, .farrier]) var isProfessional
///
///     func viewMedicalRecords() {
///         guard isProfessional else {
///             showError("Professional role required")
///             return
///         }
///         // ... view records
///     }
/// }
/// ```
@propertyWrapper
struct HasAnyRole {
    private let roles: [OrganizationRole]

    var wrappedValue: Bool {
        PermissionService.shared.hasAnyRole(roles)
    }

    init(_ roles: [OrganizationRole]) {
        self.roles = roles
    }
}

/// Property wrapper for checking all of multiple permissions (AND logic)
///
/// Example:
/// ```swift
/// @Observable
/// class InvoiceViewModel {
///     @AllPermissions([.viewInvoices, .manageInvoices]) var canManageInvoices
///
///     func editInvoice() {
///         guard canManageInvoices else {
///             showError("Insufficient permissions")
///             return
///         }
///         // ... edit invoice
///     }
/// }
/// ```
@propertyWrapper
struct AllPermissions {
    private let actions: [PermissionAction]

    var wrappedValue: Bool {
        actions.allSatisfy { PermissionService.shared.hasPermission($0) }
    }

    init(_ actions: [PermissionAction]) {
        self.actions = actions
    }
}

/// Property wrapper for checking any of multiple permissions (OR logic)
///
/// Example:
/// ```swift
/// @Observable
/// class HorseViewModel {
///     @AnyPermission([.manageOwnHorses, .manageAnyHorse]) var canManageHorses
///
///     func editHorse() {
///         guard canManageHorses else {
///             showError("Cannot edit horses")
///             return
///         }
///         // ... edit horse
///     }
/// }
/// ```
@propertyWrapper
struct AnyPermission {
    private let actions: [PermissionAction]

    var wrappedValue: Bool {
        actions.contains(where: { PermissionService.shared.hasPermission($0) })
    }

    init(_ actions: [PermissionAction]) {
        self.actions = actions
    }
}

/// Property wrapper for organization owner check
///
/// Example:
/// ```swift
/// @Observable
/// class OrganizationViewModel {
///     @IsOrgOwner var isOwner
///
///     func deleteOrganization() {
///         guard isOwner else {
///             showError("Only owner can delete organization")
///             return
///         }
///         // ... delete logic
///     }
/// }
/// ```
@propertyWrapper
struct IsOrgOwner {
    var wrappedValue: Bool {
        PermissionService.shared.isOrgOwner
    }

    init() {}
}

/// Property wrapper for system admin check
///
/// Example:
/// ```swift
/// @Observable
/// class SystemViewModel {
///     @IsSystemAdmin var isAdmin
///
///     var canAccessSystemSettings: Bool {
///         isAdmin
///     }
/// }
/// ```
@propertyWrapper
struct IsSystemAdmin {
    var wrappedValue: Bool {
        PermissionService.shared.isSystemAdmin
    }

    init() {}
}
