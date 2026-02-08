//
//  PushNotificationService.swift
//  EquiDuty
//
//  Push notification service for FCM token management and notification handling
//

import Foundation
import Combine
import UIKit
import UserNotifications
import FirebaseMessaging

/// Singleton service managing push notifications, FCM token lifecycle, and notification handling
@MainActor
final class PushNotificationService: NSObject, ObservableObject {
    static let shared = PushNotificationService()

    // MARK: - Published State

    @Published var permissionGranted = false
    @Published var fcmToken: String?

    // MARK: - Private Properties

    private let apiClient = APIClient.shared
    private let userDefaultsTokenKey = "equiduty_fcm_token"
    private let userDefaultsDeviceIdKey = "equiduty_device_id"

    /// Stable device identifier (persists across app reinstalls via UserDefaults)
    var deviceId: String {
        if let existing = UserDefaults.standard.string(forKey: userDefaultsDeviceIdKey) {
            return existing
        }
        let newId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        UserDefaults.standard.set(newId, forKey: userDefaultsDeviceIdKey)
        return newId
    }

    // MARK: - Init

    private override init() {
        super.init()
    }

    // MARK: - Permission Management

    /// Request notification permission from the user
    func requestPermission() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .badge, .sound]) { [weak self] granted, error in
            Task { @MainActor in
                self?.permissionGranted = granted
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                if let error = error {
                    print("Push notification permission error: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Check current notification authorization status
    func checkPermissionStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            Task { @MainActor in
                self?.permissionGranted = settings.authorizationStatus == .authorized
            }
        }
    }

    // MARK: - Token Management

    /// Register the current FCM token with the backend
    func registerToken() async {
        guard let token = fcmToken ?? UserDefaults.standard.string(forKey: userDefaultsTokenKey) else {
            #if DEBUG
            print("No FCM token available to register")
            #endif
            return
        }

        let request = FCMTokenRequest(
            token: token,
            deviceId: deviceId,
            platform: "ios"
        )

        do {
            let _: FCMTokenResponse = try await apiClient.post(
                APIEndpoints.notificationsFcmToken,
                body: request
            )
            #if DEBUG
            print("FCM token registered successfully")
            #endif
        } catch {
            #if DEBUG
            print("Failed to register FCM token: \(error.localizedDescription)")
            #endif
        }
    }

    /// Remove the FCM token from the backend (e.g., on sign out)
    func removeToken() async {
        do {
            try await apiClient.delete(
                APIEndpoints.notificationsFcmTokenDevice(deviceId)
            )
            UserDefaults.standard.removeObject(forKey: userDefaultsTokenKey)
            fcmToken = nil
            #if DEBUG
            print("FCM token removed successfully")
            #endif
        } catch {
            #if DEBUG
            print("Failed to remove FCM token: \(error.localizedDescription)")
            #endif
        }
    }
}

// MARK: - MessagingDelegate

extension PushNotificationService: MessagingDelegate {
    nonisolated func messaging(
        _ messaging: Messaging,
        didReceiveRegistrationToken fcmToken: String?
    ) {
        guard let token = fcmToken else { return }

        #if DEBUG
        print("FCM token received: \(token.prefix(20))...")
        #endif

        Task { @MainActor [weak self] in
            guard let self else { return }
            self.fcmToken = token
            UserDefaults.standard.set(token, forKey: self.userDefaultsTokenKey)
            await self.registerToken()
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationService: UNUserNotificationCenterDelegate {
    /// Handle notification received while app is in foreground - show banner
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .badge, .sound])
    }

    /// Handle notification tap - deep link to relevant content
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        // Extract actionUrl from the notification payload
        if let actionUrl = userInfo["actionUrl"] as? String,
           let url = URL(string: actionUrl) {
            Task { @MainActor in
                // No self capture needed here - using NavigationRouter.shared directly
                NavigationRouter.shared.handleDeepLink(url)
            }
        }

        completionHandler()
    }
}
