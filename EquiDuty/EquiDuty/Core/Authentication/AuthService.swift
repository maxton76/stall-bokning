//
//  AuthService.swift
//  EquiDuty
//
//  Firebase authentication service
//  Note: Requires Firebase SDK integration via Swift Package Manager
//

import Foundation
import FirebaseAuth
import FirebaseCore
import GoogleSignIn
import os

/// Authentication state
enum AuthState: Equatable {
    case unknown
    case signedOut
    case signedIn(User)

    static func == (lhs: AuthState, rhs: AuthState) -> Bool {
        switch (lhs, rhs) {
        case (.unknown, .unknown):
            return true
        case (.signedOut, .signedOut):
            return true
        case (.signedIn(let user1), .signedIn(let user2)):
            return user1.uid == user2.uid
        default:
            return false
        }
    }
}

/// Authentication service handling Firebase Auth
@MainActor
@Observable
final class AuthService {
    static let shared = AuthService()

    // MARK: - Published State

    private(set) var authState: AuthState = .unknown
    private(set) var currentUser: User?

    /// Firebase Auth UID — the canonical user identifier used across Firestore
    var firebaseUid: String? {
        Auth.auth().currentUser?.uid
    }
    private(set) var organizations: [Organization] = []
    private(set) var isLoading = false
    private(set) var error: Error?

    // MARK: - Selected Context

    var selectedOrganization: Organization? {
        didSet {
            if let org = selectedOrganization {
                try? keychain.saveSelectedOrganizationId(org.id)
            }
        }
    }

    var selectedStable: Stable? {
        didSet {
            if let stable = selectedStable {
                try? keychain.saveSelectedStableId(stable.id)
            }
        }
    }

    // MARK: - Private

    private let keychain = KeychainManager.shared
    /// Store listener handle - kept for reference but cleanup not needed
    /// Note: As a singleton, AuthService lives for the app's lifetime, so deinit is never called.
    /// Firebase Auth automatically handles listener cleanup when the app terminates.
    private var authStateListener: AuthStateDidChangeListenerHandle?

    // MARK: - Session Timeout (CIS 5.1)

    /// Session timeout interval (120 minutes / 2 hours)
    /// Long timeout appropriate for stable management where users may be working with horses
    private let sessionTimeoutInterval: TimeInterval = 120 * 60 // 120 minutes

    /// Timer for session timeout
    private var sessionTimeoutTimer: Timer?

    /// Last activity timestamp
    private var lastActivityTimestamp: Date = Date()

    /// Background timestamp (when app entered background)
    private var backgroundTimestamp: Date?

    private init() {
        // Delay setup until Firebase is configured
        Task { @MainActor [self] in
            setupAuthStateListener()
            setupTokenProvider()
            setupSessionTimeout()
            setupAppLifecycleObservers()

            // Fallback: If auth state is still unknown after 3 seconds, check manually
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if authState == .unknown {
                if Auth.auth().currentUser == nil {
                    authState = .signedOut
                }
            }
        }
    }

    // MARK: - Setup

    private func setupAuthStateListener() {
        authStateListener = Auth.auth().addStateDidChangeListener { [weak self] (_, firebaseUser) in
            Task {
                await self?.onAuthStateChanged(firebaseUser: firebaseUser)
            }
        }
    }

    private func onAuthStateChanged(firebaseUser: FirebaseAuth.User?) async {
        if let firebaseUser = firebaseUser {
            await handleSignedIn(firebaseUser)
        } else {
            handleSignedOut()
        }
    }

    private func setupTokenProvider() {
        APIClient.shared.tokenProvider = { [weak self] in
            await self?.getIdToken()
        }
    }

    // MARK: - Session Timeout Setup

    /// Setup session timeout timer (CIS 5.1 - Session Management)
    private func setupSessionTimeout() {
        // Start timer that checks for inactivity every 60 seconds
        sessionTimeoutTimer = Timer.scheduledTimer(
            withTimeInterval: 60.0,
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor in
                self?.checkSessionTimeout()
            }
        }
    }

    /// Setup app lifecycle observers for background/foreground transitions
    private func setupAppLifecycleObservers() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleAppDidEnterBackground()
            }
        }

        NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleAppWillEnterForeground()
            }
        }
    }

    /// Reset session timeout (call on user activity)
    func resetSessionTimeout() {
        lastActivityTimestamp = Date()
        #if DEBUG
        print("⏱️ Session timeout reset - activity detected")
        #endif
    }

    /// Check if session has timed out and auto-logout if needed
    private func checkSessionTimeout() {
        guard case .signedIn = authState else { return }

        let timeSinceLastActivity = Date().timeIntervalSince(lastActivityTimestamp)

        #if DEBUG
        print("⏱️ Session timeout check: \(Int(timeSinceLastActivity))s since last activity (threshold: \(Int(sessionTimeoutInterval))s)")
        #endif

        if timeSinceLastActivity >= sessionTimeoutInterval {
            #if DEBUG
            print("⏱️ Session timeout triggered: \(Int(timeSinceLastActivity))s since last activity")
            #endif

            AppLogger.auth.warning("🔒 Session timeout after \(Int(sessionTimeoutInterval/60)) minutes of inactivity - auto-logout")

            // Auto-logout due to inactivity
            do {
                try signOut()
            } catch {
                AppLogger.error.error("❌ Failed to sign out on session timeout: \(error)")
            }
        }
    }

    /// Handle app entering background (CIS 5.1 - Auto-logout on app background)
    private func handleAppDidEnterBackground() {
        guard authState != .signedOut else { return }

        backgroundTimestamp = Date()

        #if DEBUG
        print("📱 App entered background")
        #endif

        AppLogger.app.info("📱 App entered background - session timeout active")
    }

    /// Handle app entering foreground (check if session expired during background)
    private func handleAppWillEnterForeground() {
        guard authState != .signedOut else { return }
        guard let backgroundTime = backgroundTimestamp else { return }

        let backgroundDuration = Date().timeIntervalSince(backgroundTime)
        backgroundTimestamp = nil

        #if DEBUG
        print("📱 App entered foreground (was in background for \(backgroundDuration)s)")
        #endif

        #if DEBUG
        print("📱 Background duration: \(Int(backgroundDuration))s (threshold: \(Int(sessionTimeoutInterval))s)")
        #endif

        // If app was in background longer than session timeout, auto-logout
        if backgroundDuration >= sessionTimeoutInterval {
            #if DEBUG
            print("🔒 Background timeout triggered: \(Int(backgroundDuration))s in background")
            #endif

            AppLogger.auth.warning("🔒 Session expired during background (\(Int(backgroundDuration))s) - auto-logout")

            do {
                try signOut()
            } catch {
                AppLogger.error.error("❌ Failed to sign out after background timeout: \(error)")
            }
        } else {
            // Reset activity timestamp (user returned to app)
            resetSessionTimeout()
        }
    }

    // MARK: - Token Management

    /// Get current ID token (refreshes if needed)
    func getIdToken() async -> String? {
        guard let firebaseUser = Auth.auth().currentUser else {
            return nil
        }

        do {
            let token = try await firebaseUser.getIDToken()
            try? keychain.saveToken(token)
            return token
        } catch {
            #if DEBUG
            print("Failed to get ID token: \(error)")
            #endif
            // Only return cached token if it hasn't expired
            if let cachedToken = keychain.getToken(),
               !isJWTExpired(cachedToken) {
                return cachedToken
            }
            return nil
        }
    }

    /// Check if a JWT token has expired by decoding its payload
    private func isJWTExpired(_ token: String) -> Bool {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return true }

        var base64 = String(parts[1])
        // Pad base64 string
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else {
            return true
        }

        return Date().timeIntervalSince1970 >= exp
    }

    // MARK: - Auth State Handling

    private func handleSignedIn(_ firebaseUser: FirebaseAuth.User) async {
        do {
            isLoading = true
            error = nil

            // Save user ID to keychain
            try? keychain.saveUserId(firebaseUser.uid)

            // Fetch user profile from /auth/me
            let user: User = try await APIClient.shared.get(APIEndpoints.authMe)
            self.currentUser = user
            self.authState = .signedIn(user)

            // Fetch organizations from /organizations
            do {
                let orgsResponse: OrganizationsResponse = try await APIClient.shared.get(APIEndpoints.organizations)
                self.organizations = orgsResponse.organizations
                #if DEBUG
                print("✅ Fetched \(orgsResponse.organizations.count) organizations")
                for org in orgsResponse.organizations {
                    print("   - \(org.name) (id: \(org.id))")
                }
                #endif
            } catch {
                #if DEBUG
                print("❌ Failed to fetch organizations: \(error)")
                #endif
                self.organizations = []
            }

            // Restore selected organization
            restoreSelectedContext()

            // Load subscription tier definitions (cached globally)
            Task {
                do {
                    try await SubscriptionService.shared.fetchTierDefinitions()
                    #if DEBUG
                    print("✅ Loaded \(SubscriptionService.shared.tierDefinitions.count) subscription tiers")
                    #endif
                } catch {
                    #if DEBUG
                    print("⚠️ Failed to load tier definitions: \(error)")
                    #endif
                }
            }

            // Load user preferences (language, timezone, notifications, defaults)
            Task {
                await UserSettingsService.shared.fetchPreferences()
                // Apply synced language if different from current device language
                if let prefs = UserSettingsService.shared.preferences {
                    applyLanguageFromPreferences(prefs.language)
                }
            }

            // Load subscription and permissions for selected organization
            if let orgId = selectedOrganization?.id {
                Task {
                    await loadOrganizationContext(organizationId: orgId)
                }
            }

            isLoading = false
        } catch {
            #if DEBUG
            print("Failed to fetch user profile: \(error)")
            #endif
            self.error = error
            isLoading = false

            // Still set as signed in with basic info
            let basicUser = User(
                uid: firebaseUser.uid,
                email: firebaseUser.email ?? "",
                firstName: firebaseUser.displayName?.components(separatedBy: " ").first ?? "",
                lastName: firebaseUser.displayName?.components(separatedBy: " ").last ?? "",
                systemRole: .member,
                createdAt: Date(),
                updatedAt: Date()
            )
            self.currentUser = basicUser
            self.authState = .signedIn(basicUser)
        }
    }

    private func handleSignedOut() {
        currentUser = nil
        organizations = []
        selectedOrganization = nil
        selectedStable = nil
        authState = .signedOut
        keychain.clearAll()

        // Clear permission, subscription, and settings caches
        PermissionService.shared.clearCache()
        SubscriptionService.shared.clearCache()
        UserSettingsService.shared.clearCache()

        #if DEBUG
        print("✅ Cleared all auth state, permissions, subscription, and settings data")
        #endif
    }

    private func restoreSelectedContext() {
        // Restore selected organization
        if let savedOrgId = keychain.getSelectedOrganizationId(),
           let org = organizations.first(where: { $0.id == savedOrgId }) {
            selectedOrganization = org
        } else {
            selectedOrganization = organizations.first
        }

        // Load organization context (stables, permissions, subscription)
        if let orgId = selectedOrganization?.id {
            Task {
                await loadOrganizationContext(organizationId: orgId)
            }
        }
    }

    /// Load complete organization context (stables, permissions, subscription)
    private func loadOrganizationContext(organizationId: String) async {
        // Load in parallel: stables, permissions, subscription
        async let stablesTask: Void = fetchAndRestoreStable(organizationId: organizationId)
        async let permissionsTask: Void = loadPermissions(organizationId: organizationId)
        async let subscriptionTask: Void = loadSubscription(organizationId: organizationId)

        // Wait for all to complete
        _ = await (stablesTask, permissionsTask, subscriptionTask)
    }

    /// Load user permissions for organization
    private func loadPermissions(organizationId: String) async {
        do {
            try await PermissionService.shared.fetchPermissions(organizationId: organizationId)
            #if DEBUG
            print("✅ Loaded permissions for organization: \(organizationId)")
            if let permissions = PermissionService.shared.userPermissions {
                print("   - Roles: \(permissions.roles.map { $0.rawValue }.joined(separator: ", "))")
                print("   - Is Owner: \(permissions.isOrgOwner)")
                print("   - Is System Admin: \(permissions.isSystemAdmin)")
                print("   - Granted Permissions: \(permissions.grantedPermissions.count)")
            }
            #endif
        } catch {
            #if DEBUG
            print("⚠️ Failed to load permissions: \(error)")
            #endif
        }
    }

    /// Load organization subscription from org's tier + cached tier definitions (no API call)
    private func loadSubscription(organizationId: String) async {
        do {
            let tierValue = selectedOrganization?.subscriptionTier?.value
            try await SubscriptionService.shared.loadSubscription(tier: tierValue)
            #if DEBUG
            print("✅ Loaded subscription for organization: \(organizationId)")
            if let subscription = SubscriptionService.shared.currentSubscription {
                print("   - Tier: \(subscription.tier.value)")
                print("   - Has Invoicing: \(subscription.addons.invoicing)")
                print("   - Has Portal: \(subscription.addons.portal)")
                print("   - Analytics: \(subscription.modules.analytics)")
            }
            #endif
        } catch {
            #if DEBUG
            print("⚠️ Failed to load subscription: \(error)")
            #endif
        }
    }

    /// Apply language from synced preferences to iOS locale if different
    private func applyLanguageFromPreferences(_ language: String) {
        let storedLanguages = UserDefaults.standard.stringArray(forKey: "AppleLanguages")
        let currentLang = storedLanguages?.first
        if currentLang != language {
            UserDefaults.standard.set([language], forKey: "AppleLanguages")
            UserDefaults.standard.synchronize()
            #if DEBUG
            print("✅ Applied synced language preference: \(language) (was: \(currentLang ?? "nil"))")
            #endif
        }
    }

    /// Fetch stables for an organization and restore/select one
    private func fetchAndRestoreStable(organizationId: String) async {
        #if DEBUG
        print("🔍 Fetching stables for organization: \(organizationId)")
        #endif
        do {
            let response: StablesResponse = try await APIClient.shared.get(
                APIEndpoints.stables(organizationId: organizationId)
            )
            #if DEBUG
            print("✅ Fetched \(response.stables.count) stables")
            for stable in response.stables {
                print("   - \(stable.name) (id: \(stable.id))")
            }
            #endif

            // Restore saved stable or select first
            if let savedStableId = keychain.getSelectedStableId(),
               let stable = response.stables.first(where: { $0.id == savedStableId }) {
                selectedStable = stable
                #if DEBUG
                print("✅ Restored selected stable: \(stable.name)")
                #endif
            } else if let firstStable = response.stables.first {
                selectedStable = firstStable
                #if DEBUG
                print("✅ Auto-selected first stable: \(firstStable.name)")
                #endif
            } else {
                #if DEBUG
                print("⚠️ No stables found for organization")
                #endif
            }
        } catch {
            #if DEBUG
            print("❌ Failed to fetch stables: \(error)")
            #endif
        }
    }

    // MARK: - Sign In Methods

    /// Sign in with email and password
    func signIn(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            await handleSignedIn(result.user)
        } catch {
            self.error = error
            isLoading = false
            throw AuthError.signInFailed(error)
        }
    }

    /// Sign in with Google
    func signInWithGoogle() async throws {
        isLoading = true
        error = nil

        do {
            // Get the client ID from Firebase config
            guard let clientID = FirebaseApp.app()?.options.clientID else {
                throw AuthError.configurationError("Missing Firebase client ID")
            }

            // Create Google Sign In configuration
            let config = GIDConfiguration(clientID: clientID)
            GIDSignIn.sharedInstance.configuration = config

            // Get the presenting view controller
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootViewController = windowScene.windows.first?.rootViewController else {
                throw AuthError.configurationError("No root view controller found")
            }

            // Perform Google Sign-In
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)

            guard let idToken = result.user.idToken?.tokenString else {
                throw AuthError.signInFailed(NSError(domain: "GoogleSignIn", code: -1, userInfo: [NSLocalizedDescriptionKey: "No ID token"]))
            }

            // Create Firebase credential
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: result.user.accessToken.tokenString
            )

            // Sign in to Firebase with Google credential
            let authResult = try await Auth.auth().signIn(with: credential)
            await handleSignedIn(authResult.user)

        } catch {
            self.error = error
            isLoading = false

            // Check if user cancelled
            if (error as NSError).code == GIDSignInError.canceled.rawValue {
                throw AuthError.cancelled
            }
            throw AuthError.signInFailed(error)
        }
    }

    // MARK: - Sign Up

    /// Create new account with email and password
    func signUp(email: String, password: String, firstName: String, lastName: String) async throws {
        isLoading = true
        error = nil

        do {
            // Create Firebase Auth user
            let result = try await Auth.auth().createUser(withEmail: email, password: password)

            // Update display name
            let changeRequest = result.user.createProfileChangeRequest()
            changeRequest.displayName = "\(firstName) \(lastName)"
            try await changeRequest.commitChanges()

            // The auth state listener will handle the rest
        } catch {
            self.error = error
            isLoading = false
            throw AuthError.signUpFailed(error)
        }
    }

    // MARK: - Password Reset

    /// Send password reset email
    func sendPasswordReset(email: String) async throws {
        do {
            try await Auth.auth().sendPasswordReset(withEmail: email)
        } catch {
            throw AuthError.passwordResetFailed(error)
        }
    }

    // MARK: - Sign Out

    /// Sign out current user
    func signOut() throws {
        do {
            try Auth.auth().signOut()
            handleSignedOut()

            // Clear image cache for security and privacy
            ImageCacheService.shared.clearCache()
        } catch {
            throw AuthError.signOutFailed(error)
        }
    }

    // MARK: - Organization Selection

    /// Select a different organization and load its context
    func selectOrganization(_ organization: Organization) {
        selectedOrganization = organization
        selectedStable = nil  // Clear stable selection

        // Clear memory cache when switching organizations (keep disk cache for faster reload)
        ImageCacheService.shared.clearMemoryCache()

        // Load organization context (stables, permissions, subscription)
        Task {
            await loadOrganizationContext(organizationId: organization.id)
        }

        #if DEBUG
        print("✅ Switched to organization: \(organization.name) (id: \(organization.id))")
        #endif
    }

    /// Select a stable within the current organization
    func selectStable(_ stable: Stable) {
        selectedStable = stable
        #if DEBUG
        print("✅ Switched to stable: \(stable.name) (id: \(stable.id))")
        #endif
    }

    // MARK: - Refresh User Data

    /// Refresh user data from API
    func refreshUserData() async throws {
        guard case .signedIn = authState else { return }

        // Fetch user profile from /auth/me
        let user: User = try await APIClient.shared.get(APIEndpoints.authMe)
        self.currentUser = user

        // Fetch organizations from /organizations
        do {
            let orgsResponse: OrganizationsResponse = try await APIClient.shared.get(APIEndpoints.organizations)
            self.organizations = orgsResponse.organizations
        } catch {
            #if DEBUG
            print("Failed to refresh organizations: \(error)")
            #endif
        }

        restoreSelectedContext()

        // Refresh tier definitions
        Task {
            try? await SubscriptionService.shared.fetchTierDefinitions()
        }

        // Refresh permissions and subscription for selected organization
        if let orgId = selectedOrganization?.id {
            // Invalidate caches to force refresh
            PermissionService.shared.invalidateCache(organizationId: orgId)
            SubscriptionService.shared.invalidateCache(organizationId: orgId)

            Task {
                await loadOrganizationContext(organizationId: orgId)
            }
        }
    }
}

/// Authentication errors
enum AuthError: Error, LocalizedError {
    case signInFailed(Error)
    case signUpFailed(Error)
    case signOutFailed(Error)
    case passwordResetFailed(Error)
    case configurationError(String)
    case cancelled
    case userNotFound
    case invalidCredentials

    var errorDescription: String? {
        switch self {
        case .signInFailed(let error):
            return String(localized: "error.auth.sign_in_failed \(error.localizedDescription)")
        case .signUpFailed(let error):
            return String(localized: "error.auth.sign_up_failed \(error.localizedDescription)")
        case .signOutFailed(let error):
            return String(localized: "error.auth.sign_out_failed \(error.localizedDescription)")
        case .passwordResetFailed(let error):
            return String(localized: "error.auth.password_reset_failed \(error.localizedDescription)")
        case .configurationError(let message):
            return String(localized: "error.auth.configuration \(message)")
        case .cancelled:
            return nil  // User cancelled, no error message needed
        case .userNotFound:
            return String(localized: "error.auth.user_not_found")
        case .invalidCredentials:
            return String(localized: "error.auth.invalid_credentials")
        }
    }
}
