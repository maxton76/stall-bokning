//
//  AppNotification.swift
//  EquiDuty
//
//  Notification model for push notification center
//

import Foundation
import SwiftUI

// MARK: - Notification Model

struct AppNotification: Identifiable, Codable, Sendable {
    let id: String
    let userId: String
    let type: String
    let priority: String
    let title: String
    let body: String
    var read: Bool
    let readAt: String?
    let actionUrl: String?
    let entityType: String?
    let entityId: String?
    let createdAt: String
    let updatedAt: String

    var notificationType: NotificationType {
        NotificationType(rawValue: type) ?? .systemAlert
    }

    var notificationPriority: NotificationPriority {
        NotificationPriority(rawValue: priority) ?? .normal
    }

    /// Parse createdAt string into a Date for display
    var createdDate: Date? {
        let formatters: [ISO8601DateFormatter] = [
            {
                let f = ISO8601DateFormatter()
                f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                return f
            }(),
            {
                let f = ISO8601DateFormatter()
                f.formatOptions = [.withInternetDateTime]
                return f
            }()
        ]

        for formatter in formatters {
            if let date = formatter.date(from: createdAt) {
                return date
            }
        }
        return nil
    }
}

// MARK: - Notification Type

enum NotificationType: String, Codable, CaseIterable, Sendable {
    case shiftReminder = "shift_reminder"
    case shiftAssigned = "shift_assigned"
    case shiftUnassigned = "shift_unassigned"
    case shiftCompleted = "shift_completed"
    case shiftMissed = "shift_missed"
    case healthReminder = "health_reminder"
    case healthOverdue = "health_overdue"
    case activityCreated = "activity_created"
    case activityUpdated = "activity_updated"
    case activityCancelled = "activity_cancelled"
    case dailySummary = "daily_summary"
    case weeklySummary = "weekly_summary"
    case systemAlert = "system_alert"
    case selectionTurnStarted = "selection_turn_started"
    case selectionProcessCompleted = "selection_process_completed"
    case membershipInvite = "membership_invite"
    case membershipInviteResponse = "membership_invite_response"
    case featureRequestStatusChange = "feature_request_status_change"
    case featureRequestAdminResponse = "feature_request_admin_response"
    case trialExpiring = "trial_expiring"
    case subscriptionExpiring = "subscription_expiring"
    case paymentFailed = "payment_failed"
    case paymentMethodRequired = "payment_method_required"

    var iconName: String {
        switch self {
        case .shiftReminder, .shiftAssigned, .shiftUnassigned:
            return "calendar.badge.clock"
        case .shiftCompleted:
            return "checkmark.circle.fill"
        case .shiftMissed:
            return "exclamationmark.triangle.fill"
        case .healthReminder, .healthOverdue:
            return "heart.text.square.fill"
        case .activityCreated, .activityUpdated, .activityCancelled:
            return "figure.equestrian.sports"
        case .dailySummary, .weeklySummary:
            return "list.bullet.clipboard"
        case .systemAlert:
            return "bell.fill"
        case .selectionTurnStarted, .selectionProcessCompleted:
            return "person.crop.circle.badge.checkmark"
        case .membershipInvite, .membershipInviteResponse:
            return "person.badge.plus"
        case .featureRequestStatusChange, .featureRequestAdminResponse:
            return "lightbulb.fill"
        case .trialExpiring, .subscriptionExpiring:
            return "clock.badge.exclamationmark"
        case .paymentFailed, .paymentMethodRequired:
            return "creditcard.trianglebadge.exclamationmark"
        }
    }

    var iconColor: Color {
        switch self {
        case .shiftCompleted:
            return .green
        case .shiftMissed, .healthOverdue, .paymentFailed, .paymentMethodRequired:
            return .red
        case .shiftReminder, .shiftAssigned, .shiftUnassigned:
            return .blue
        case .healthReminder:
            return .orange
        case .activityCreated, .activityUpdated, .activityCancelled:
            return .purple
        case .dailySummary, .weeklySummary:
            return .teal
        case .systemAlert:
            return .yellow
        case .selectionTurnStarted, .selectionProcessCompleted:
            return .indigo
        case .membershipInvite, .membershipInviteResponse:
            return .mint
        case .featureRequestStatusChange, .featureRequestAdminResponse:
            return .cyan
        case .trialExpiring, .subscriptionExpiring:
            return .orange
        }
    }
}

// MARK: - Notification Priority

enum NotificationPriority: String, Codable, Sendable {
    case low, normal, high, urgent

    var color: Color {
        switch self {
        case .urgent: return .red
        case .high: return .orange
        case .normal: return .blue
        case .low: return .gray
        }
    }
}

// MARK: - API Response Types

struct NotificationsResponse: Codable {
    let notifications: [AppNotification]
    let total: Int?
    let unreadCount: Int?
}

struct NotificationReadResponse: Codable {
    let success: Bool?
}

struct FCMTokenRequest: Codable {
    let token: String
    let deviceId: String
    let platform: String
}

struct FCMTokenResponse: Codable {
    let success: Bool?
}
