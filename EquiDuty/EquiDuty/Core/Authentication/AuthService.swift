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
    private(set) var organizations: [Organization] = []
    private(set) var isLoading = false
    private(set) var error: Error?

    // MARK: - Selected Context

    var selectedOrganization: Organization? {
        didSet {
            if let org = selectedOrganization {
                UserDefaults.standard.set(org.id, forKey: "selectedOrganizationId")
            }
        }
    }

    var selectedStable: Stable? {
        didSet {
            if let stable = selectedStable {
                UserDefaults.standard.set(stable.id, forKey: "selectedStableId")
            }
        }
    }

    // MARK: - Private

    private let keychain = KeychainManager.shared
    /// Store listener handle - kept for reference but cleanup not needed
    /// Note: As a singleton, AuthService lives for the app's lifetime, so deinit is never called.
    /// Firebase Auth automatically handles listener cleanup when the app terminates.
    private nonisolated(unsafe) var authStateListener: AuthStateDidChangeListenerHandle?

    private init() {
        // Delay setup until Firebase is configured
        Task { @MainActor in
            setupAuthStateListener()
            setupTokenProvider()

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
            return keychain.getToken()
        }
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

        // Clear permission and subscription caches
        PermissionService.shared.clearCache()
        SubscriptionService.shared.clearCache()

        #if DEBUG
        print("✅ Cleared all auth state, permissions, and subscription data")
        #endif
    }

    private func restoreSelectedContext() {
        // Restore selected organization
        if let savedOrgId = UserDefaults.standard.string(forKey: "selectedOrganizationId"),
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
        async let stablesTask = fetchAndRestoreStable(organizationId: organizationId)
        async let permissionsTask = loadPermissions(organizationId: organizationId)
        async let subscriptionTask = loadSubscription(organizationId: organizationId)

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

    /// Load organization subscription
    private func loadSubscription(organizationId: String) async {
        do {
            try await SubscriptionService.shared.fetchSubscription(organizationId: organizationId)
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
            if let savedStableId = UserDefaults.standard.string(forKey: "selectedStableId"),
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
        } catch {
            throw AuthError.signOutFailed(error)
        }
    }

    // MARK: - Organization Selection

    /// Select a different organization and load its context
    func selectOrganization(_ organization: Organization) {
        selectedOrganization = organization
        selectedStable = nil  // Clear stable selection

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
