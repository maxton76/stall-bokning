//
//  PermissionModels.swift
//  EquiDuty
//
//  Created by Claude on 2026-02-06.
//  Permission system with 60 actions and 14 organization roles.
//

import Foundation

// MARK: - Organization Roles

/// 14 organization roles (matches backend exactly)
enum OrganizationRole: String, Codable, CaseIterable {
    case administrator
    case stableManager = "stable_manager"
    case schedulePlanner = "schedule_planner"
    case bookkeeper
    case veterinarian
    case dentist
    case farrier
    case customer
    case groom
    case saddleMaker = "saddle_maker"
    case horseOwner = "horse_owner"
    case rider
    case inseminator
    case trainer
    case trainingAdmin = "training_admin"
    case supportContact = "support_contact"

    var displayName: String {
        // Use localized string from i18n
        String(localized: "members.roles.\(rawValue).label")
    }

    var description: String {
        String(localized: "members.roles.\(rawValue).description")
    }
}

// MARK: - Permission Actions

/// 60 permission actions across 10 categories
enum PermissionAction: String, Codable, CaseIterable {
    // MARK: Organization Management (4)
    case manageOrgSettings = "manage_org_settings"
    case manageMembers = "manage_members"
    case viewMembers = "view_members"
    case manageBilling = "manage_billing"

    // MARK: Billing Operations (8) - requires 'invoicing' addon
    case viewInvoices = "view_invoices"
    case manageInvoices = "manage_invoices"
    case viewPayments = "view_payments"
    case managePayments = "manage_payments"
    case manageBillingSettings = "manage_billing_settings"
    case viewFinancialReports = "view_financial_reports"
    case managePrices = "manage_prices"
    case manageBillingGroups = "manage_billing_groups"

    // MARK: Stables (3)
    case createStables = "create_stables"
    case manageStableSettings = "manage_stable_settings"
    case viewStables = "view_stables"

    // MARK: Horses (3)
    case viewHorses = "view_horses"
    case manageOwnHorses = "manage_own_horses"
    case manageAnyHorse = "manage_any_horse"

    // MARK: Scheduling (5)
    case viewSchedules = "view_schedules"
    case manageSchedules = "manage_schedules"
    case bookShifts = "book_shifts"
    case cancelOthersBookings = "cancel_others_bookings"
    case markShiftsMissed = "mark_shifts_missed"

    // MARK: Activities (3)
    case manageActivities = "manage_activities"
    case manageRoutines = "manage_routines"
    case manageSelectionProcesses = "manage_selection_processes"

    // MARK: Lessons (1) - requires 'lessons' module
    case manageLessons = "manage_lessons"

    // MARK: Facilities (1)
    case manageFacilities = "manage_facilities"

    // MARK: Records (2)
    case manageRecords = "manage_records"
    case viewRecords = "view_records"

    // MARK: Integrations (3)
    case manageIntegrations = "manage_integrations"
    case sendCommunications = "send_communications"
    case exportData = "export_data"

    /// Returns module name if this action requires a feature flag
    var requiredModule: String? {
        switch self {
        case .viewInvoices, .manageInvoices, .viewPayments, .managePayments,
             .manageBillingSettings, .viewFinancialReports, .managePrices, .manageBillingGroups:
            return "invoicing"
        case .manageLessons:
            return "lessons"
        case .manageSelectionProcesses:
            return "selectionProcess"
        default:
            return nil
        }
    }

    var category: PermissionCategory {
        switch self {
        case .manageOrgSettings, .manageMembers, .viewMembers, .manageBilling:
            return .organization
        case .viewInvoices, .manageInvoices, .viewPayments, .managePayments,
             .manageBillingSettings, .viewFinancialReports, .managePrices, .manageBillingGroups:
            return .billing
        case .createStables, .manageStableSettings, .viewStables:
            return .stables
        case .viewHorses, .manageOwnHorses, .manageAnyHorse:
            return .horses
        case .viewSchedules, .manageSchedules, .bookShifts, .cancelOthersBookings, .markShiftsMissed:
            return .scheduling
        case .manageActivities, .manageRoutines, .manageSelectionProcesses:
            return .activities
        case .manageLessons:
            return .lessons
        case .manageFacilities:
            return .facilities
        case .manageRecords, .viewRecords:
            return .records
        case .manageIntegrations, .sendCommunications, .exportData:
            return .integrations
        }
    }

    var displayName: String {
        String(localized: "permissions.actions.\(rawValue).label")
    }

    var description: String {
        String(localized: "permissions.actions.\(rawValue).description")
    }
}

// MARK: - Permission Category

enum PermissionCategory: String, CaseIterable {
    case organization
    case billing
    case stables
    case horses
    case scheduling
    case activities
    case lessons
    case facilities
    case records
    case integrations

    var displayName: String {
        String(localized: "permissions.categories.\(rawValue)")
    }

    var actions: [PermissionAction] {
        PermissionAction.allCases.filter { $0.category == self }
    }
}

// MARK: - User Permissions

/// User's resolved permissions (from API)
struct UserPermissions: Codable, Equatable {
    let permissions: [String: Bool]  // action.rawValue -> allowed
    let roles: [OrganizationRole]
    let isOrgOwner: Bool
    let isSystemAdmin: Bool

    /// Check if user has specific permission
    func hasPermission(_ action: PermissionAction) -> Bool {
        // System admin bypass
        if isSystemAdmin { return true }

        // Organization owner bypass
        if isOrgOwner { return true }

        // Check permission matrix
        return permissions[action.rawValue] == true
    }

    /// Check if user has any of specified roles
    func hasAnyRole(_ roles: [OrganizationRole]) -> Bool {
        !Set(self.roles).intersection(roles).isEmpty
    }

    /// Check if user has specific role
    func hasRole(_ role: OrganizationRole) -> Bool {
        roles.contains(role)
    }

    /// Get all granted permissions
    var grantedPermissions: [PermissionAction] {
        PermissionAction.allCases.filter { hasPermission($0) }
    }

    /// Get permissions by category
    func permissions(for category: PermissionCategory) -> [PermissionAction: Bool] {
        let categoryActions = category.actions
        return Dictionary(uniqueKeysWithValues: categoryActions.map { ($0, hasPermission($0)) })
    }
}

// MARK: - API Response Types

/// API returns flat structure, not nested
struct UserPermissionsResponse: Codable {
    let permissions: [String: Bool]  // action.rawValue -> allowed
    let roles: [String]  // role raw values
    let isOrgOwner: Bool
    let isSystemAdmin: Bool

    /// Convert to UserPermissions model
    func toUserPermissions() -> UserPermissions {
        // Convert role strings to OrganizationRole enums
        let roleEnums = roles.compactMap { OrganizationRole(rawValue: $0) }

        return UserPermissions(
            permissions: permissions,
            roles: roleEnums,
            isOrgOwner: isOrgOwner,
            isSystemAdmin: isSystemAdmin
        )
    }
}

struct PermissionMatrixResponse: Codable {
    let matrix: [String: [String: Bool]]  // role -> [action -> allowed]
}
