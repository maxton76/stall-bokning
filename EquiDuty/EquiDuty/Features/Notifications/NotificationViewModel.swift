//
//  NotificationViewModel.swift
//  EquiDuty
//
//  ViewModel for the notification center
//

import Foundation

/// ViewModel managing notification list state and API operations
@MainActor
@Observable
final class NotificationViewModel {
    // MARK: - State

    private(set) var notifications: [AppNotification] = []
    private(set) var unreadCount: Int = 0
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    // MARK: - Services

    private let apiClient = APIClient.shared

    // MARK: - Fetch Notifications

    func fetchNotifications(limit: Int = 50, unreadOnly: Bool = false) async {
        isLoading = true
        errorMessage = nil

        do {
            var params: [String: String] = ["limit": String(limit)]
            if unreadOnly {
                params["unreadOnly"] = "true"
            }

            let response: NotificationsResponse = try await apiClient.get(
                APIEndpoints.notifications,
                params: params
            )

            notifications = response.notifications
            unreadCount = response.unreadCount ?? response.notifications.filter { !$0.read }.count
        } catch {
            errorMessage = error.localizedDescription
            #if DEBUG
            print("Failed to fetch notifications: \(error)")
            #endif
        }

        isLoading = false
    }

    // MARK: - Mark as Read

    func markAsRead(_ id: String) async {
        // Optimistic update
        if let index = notifications.firstIndex(where: { $0.id == id }) {
            notifications[index].read = true
            unreadCount = max(0, unreadCount - 1)
        }

        do {
            let _: NotificationReadResponse = try await apiClient.patch(
                APIEndpoints.notificationRead(id),
                body: EmptyBody()
            )
        } catch {
            // Revert on failure
            if let index = notifications.firstIndex(where: { $0.id == id }) {
                notifications[index].read = false
                unreadCount += 1
            }
            #if DEBUG
            print("Failed to mark notification as read: \(error)")
            #endif
        }
    }

    func markAllAsRead() async {
        let previousNotifications = notifications
        let previousUnreadCount = unreadCount

        // Optimistic update
        for i in notifications.indices {
            notifications[i].read = true
        }
        unreadCount = 0

        do {
            let _: NotificationReadResponse = try await apiClient.patch(
                APIEndpoints.notificationsReadAll,
                body: EmptyBody()
            )
        } catch {
            // Revert on failure
            notifications = previousNotifications
            unreadCount = previousUnreadCount
            #if DEBUG
            print("Failed to mark all notifications as read: \(error)")
            #endif
        }
    }

    // MARK: - Delete

    func deleteNotification(_ id: String) async {
        let previousNotifications = notifications

        // Optimistic removal
        notifications.removeAll { $0.id == id }

        do {
            try await apiClient.delete(APIEndpoints.notification(id))
        } catch {
            // Revert on failure
            notifications = previousNotifications
            #if DEBUG
            print("Failed to delete notification: \(error)")
            #endif
        }
    }

    func clearRead() async {
        let previousNotifications = notifications

        // Optimistic removal of read notifications
        notifications.removeAll { $0.read }

        do {
            try await apiClient.delete(APIEndpoints.notificationsClearRead)
        } catch {
            // Revert on failure
            notifications = previousNotifications
            #if DEBUG
            print("Failed to clear read notifications: \(error)")
            #endif
        }
    }

    // MARK: - Refresh unread count only (for badge)

    func refreshUnreadCount() async {
        do {
            let response: NotificationsResponse = try await apiClient.get(
                APIEndpoints.notifications,
                params: ["limit": "1", "unreadOnly": "false"]
            )
            unreadCount = response.unreadCount ?? 0
        } catch {
            #if DEBUG
            print("Failed to refresh unread count: \(error)")
            #endif
        }
    }
}

// MARK: - Helpers

private struct EmptyBody: Encodable {}
