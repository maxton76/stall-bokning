//
//  EquiDutyApp.swift
//  EquiDuty
//
//  Main app entry point
//

import SwiftUI
import SwiftData
import FirebaseCore
import FirebaseMessaging
import GoogleSignIn
import UserNotifications
import os

// MARK: - App Delegate for Firebase

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()

        // Security: Prevent debugger attachment in production builds (CIS 10.2)
        DebuggerDetector.shared.denyDebuggerAttachment()

        // Security: Check for jailbroken device (CIS 10.1)
        let jailbreakStatus = JailbreakDetector.shared.checkJailbreakStatus()
        if jailbreakStatus.isJailbroken {
            AppLogger.app.warning("⚠️ Jailbreak detected on device")
        }

        // Security: Start continuous debugger monitoring in production
        DebuggerDetector.shared.startMonitoring {
            DebuggerDetector.shared.handleDebuggerDetection()
        }

        // Set up push notification delegates
        UNUserNotificationCenter.current().delegate = PushNotificationService.shared
        Messaging.messaging().delegate = PushNotificationService.shared

        // Register for remote notifications
        application.registerForRemoteNotifications()

        return true
    }

    /// Forward APNs device token to Firebase Messaging
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        #if DEBUG
        print("Failed to register for remote notifications: \(error.localizedDescription)")
        #endif
    }
}

// MARK: - Main App

@main
struct EquiDutyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            // Add SwiftData models here for offline caching
        ])
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false
        )

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .onOpenURL { url in
                    // Handle Google Sign-In URL callback
                    if GIDSignIn.sharedInstance.handle(url) {
                        return
                    }

                    // Handle deep links
                    handleDeepLink(url)
                }
        }
        .modelContainer(sharedModelContainer)
    }

    /// Handle deep link URLs
    /// Supported schemes:
    /// - equiduty://schedule/templates
    /// - equiduty://schedule/templates/:id
    /// - equiduty://schedule/schedules
    /// - equiduty://schedule/schedules/:id
    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "equiduty" else { return }

        let pathComponents = url.pathComponents.filter { $0 != "/" }

        guard pathComponents.count >= 2 else { return }

        let section = pathComponents[0]
        let subsection = pathComponents[1]

        // Get the router from environment (if available)
        // Note: In production, you'd inject NavigationRouter into environment

        switch (section, subsection) {
        case ("schedule", "templates"):
            if pathComponents.count == 3 {
                let templateId = pathComponents[2]
                // Navigate to specific template
                NotificationCenter.default.post(
                    name: NSNotification.Name("DeepLinkNavigate"),
                    object: AppDestination.routineTemplate(id: templateId)
                )
            } else {
                // Navigate to templates list
                NotificationCenter.default.post(
                    name: NSNotification.Name("DeepLinkNavigate"),
                    object: AppDestination.routineTemplates
                )
            }

        case ("schedule", "schedules"):
            if pathComponents.count == 3 {
                let scheduleId = pathComponents[2]
                // Navigate to specific schedule
                NotificationCenter.default.post(
                    name: NSNotification.Name("DeepLinkNavigate"),
                    object: AppDestination.routineSchedule(id: scheduleId)
                )
            } else {
                // Navigate to schedules list
                NotificationCenter.default.post(
                    name: NSNotification.Name("DeepLinkNavigate"),
                    object: AppDestination.routineSchedules
                )
            }

        default:
            break
        }
    }
}
