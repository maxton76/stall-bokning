//
//  SettingsView.swift
//  EquiDuty
//
//  Settings and account management
//

import SwiftUI

struct SettingsView: View {
    @State private var authService = AuthService.shared

    var body: some View {
        NavigationStack {
            List {
                // Account section
                Section {
                    if let user = authService.currentUser {
                        NavigationLink(value: AppDestination.account) {
                            HStack(spacing: 12) {
                                // Avatar
                                ZStack {
                                    Circle()
                                        .fill(Color.accentColor.opacity(0.2))
                                        .frame(width: 50, height: 50)

                                    Text(user.initials)
                                        .font(.headline)
                                        .foregroundStyle(Color.accentColor)
                                }

                                VStack(alignment: .leading) {
                                    Text(user.fullName)
                                        .font(.headline)

                                    Text(user.email)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }

                // Organization section
                Section(String(localized: "settings.organization")) {
                    NavigationLink(value: AppDestination.organizationSelection) {
                        HStack {
                            Label(String(localized: "settings.organization.select"), systemImage: "building.2")
                            Spacer()
                            if let org = authService.selectedOrganization {
                                Text(org.name)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    NavigationLink(value: AppDestination.stableSelection) {
                        HStack {
                            Label(String(localized: "settings.stable.select"), systemImage: "house")
                            Spacer()
                            if let stable = authService.selectedStable {
                                Text(stable.name)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                // Preferences section
                Section(String(localized: "settings.preferences")) {
                    NavigationLink(value: AppDestination.notificationSettings) {
                        Label(String(localized: "settings.notifications"), systemImage: "bell")
                    }

                    NavigationLink(value: AppDestination.languageSettings) {
                        HStack {
                            Label(String(localized: "settings.language"), systemImage: "globe")
                            Spacer()
                            Text(currentLanguage)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Support section
                Section(String(localized: "settings.support")) {
                    Link(destination: URL(string: "https://equiduty.com/help")!) {
                        Label(String(localized: "settings.help"), systemImage: "questionmark.circle")
                    }

                    Link(destination: URL(string: "mailto:support@equiduty.com")!) {
                        Label(String(localized: "settings.contact"), systemImage: "envelope")
                    }

                    Link(destination: URL(string: "https://equiduty.com/privacy")!) {
                        Label(String(localized: "settings.privacy"), systemImage: "hand.raised")
                    }

                    Link(destination: URL(string: "https://equiduty.com/terms")!) {
                        Label(String(localized: "settings.terms"), systemImage: "doc.text")
                    }
                }

                // About section
                Section(String(localized: "settings.about")) {
                    HStack {
                        Text(String(localized: "settings.version"))
                        Spacer()
                        Text(appVersion)
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text(String(localized: "settings.build"))
                        Spacer()
                        Text(buildNumber)
                            .foregroundStyle(.secondary)
                    }
                }

                // Sign out
                Section {
                    Button(role: .destructive) {
                        signOut()
                    } label: {
                        Label(String(localized: "settings.sign_out"), systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle(String(localized: "settings.title"))
            .withAppNavigationDestinations()
        }
    }

    // MARK: - Computed Properties

    private var currentLanguage: String {
        let languageCode = Locale.current.language.languageCode?.identifier ?? "en"
        return Locale.current.localizedString(forLanguageCode: languageCode) ?? languageCode
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    private var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }

    // MARK: - Actions

    private func signOut() {
        try? authService.signOut()
    }
}

// MARK: - Account View

struct AccountView: View {
    @State private var authService = AuthService.shared

    var body: some View {
        List {
            if let user = authService.currentUser {
                Section(String(localized: "account.profile")) {
                    HStack {
                        Text(String(localized: "account.name"))
                        Spacer()
                        Text(user.fullName)
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text(String(localized: "account.email"))
                        Spacer()
                        Text(user.email)
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text(String(localized: "account.role"))
                        Spacer()
                        Text(user.systemRole.displayName)
                            .foregroundStyle(.secondary)
                    }
                }

                Section {
                    Button(String(localized: "account.change_password")) {
                        // TODO: Implement password change
                    }
                }

                Section {
                    Button(role: .destructive) {
                        // TODO: Implement account deletion
                    } label: {
                        Text(String(localized: "account.delete"))
                    }
                }
            }
        }
        .navigationTitle(String(localized: "account.title"))
    }
}

// MARK: - Notification Settings View

struct NotificationSettingsView: View {
    @State private var settingsService = UserSettingsService.shared
    @State private var isSaving = false

    private var notifications: NotificationPreferences {
        settingsService.preferences?.notifications ?? .defaults
    }

    var body: some View {
        List {
            // Channels section
            Section(String(localized: "notifications.channels")) {
                Toggle(String(localized: "notifications.email"), isOn: binding(for: \.email))
                    .disabled(isSaving)
                Toggle(String(localized: "notifications.push"), isOn: binding(for: \.push))
                    .disabled(isSaving)
            }

            // Categories section
            Section(String(localized: "notifications.categories")) {
                Toggle(String(localized: "notifications.routines"), isOn: binding(for: \.routines))
                    .disabled(isSaving)
                Toggle(String(localized: "notifications.feeding"), isOn: binding(for: \.feeding))
                    .disabled(isSaving)
                Toggle(String(localized: "notifications.activities"), isOn: binding(for: \.activities))
                    .disabled(isSaving)
            }

            // Quiet hours section (preview)
            Section {
                HStack {
                    Label(String(localized: "notifications.quietHours"), systemImage: "moon.fill")
                    Spacer()
                    Text("22:00 – 07:00")
                        .foregroundStyle(.secondary)
                }

                Text(String(localized: "notifications.quietHours.description"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } header: {
                Text(String(localized: "notifications.quietHours.title"))
            } footer: {
                Text(String(localized: "notifications.quietHours.comingSoon"))
                    .font(.caption)
            }
        }
        .navigationTitle(String(localized: "notifications.title"))
    }

    /// Create a binding that syncs the toggle to the API
    private func binding(for keyPath: WritableKeyPath<NotificationPreferences, Bool>) -> Binding<Bool> {
        Binding(
            get: { notifications[keyPath: keyPath] },
            set: { newValue in
                isSaving = true
                Task {
                    defer { isSaving = false }
                    var partial = UpdatePreferencesInput.PartialNotificationPreferences()
                    switch keyPath {
                    case \.email: partial.email = newValue
                    case \.push: partial.push = newValue
                    case \.routines: partial.routines = newValue
                    case \.feeding: partial.feeding = newValue
                    case \.activities: partial.activities = newValue
                    default: break
                    }
                    try? await settingsService.setNotifications(partial)
                }
            }
        )
    }
}

// MARK: - Language Settings View

private struct Language: Identifiable {
    let id: String
    let code: String
    let name: String
    let nativeName: String

    init(code: String, name: String, nativeName: String) {
        self.id = code
        self.code = code
        self.name = name
        self.nativeName = nativeName
    }
}

struct LanguageSettingsView: View {
    private let languages = [
        Language(code: "sv", name: "Swedish", nativeName: "Svenska"),
        Language(code: "en", name: "English", nativeName: "English")
    ]

    @State private var settingsService = UserSettingsService.shared
    @State private var selectedLanguage: String
    @State private var showRestartAlert = false
    @State private var pendingLanguage: String?

    init() {
        // Prefer synced preference, fall back to UserDefaults/system
        if let synced = UserSettingsService.shared.preferences?.language {
            _selectedLanguage = State(initialValue: synced)
        } else {
            let storedLanguages = UserDefaults.standard.stringArray(forKey: "AppleLanguages")
            let currentLang = storedLanguages?.first ?? Locale.current.language.languageCode?.identifier ?? "sv"
            _selectedLanguage = State(initialValue: currentLang)
        }
    }

    var body: some View {
        List {
            Section {
                ForEach(languages) { language in
                    Button {
                        if language.code != selectedLanguage {
                            pendingLanguage = language.code
                            showRestartAlert = true
                        }
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(language.nativeName)
                                    .foregroundStyle(.primary)
                                Text(language.name)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if selectedLanguage == language.code {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    }
                }
            } footer: {
                Text(String(localized: "language.restart_required"))
                    .font(.caption)
            }

            Section {
                Button {
                    openSystemSettings()
                } label: {
                    HStack {
                        Label(String(localized: "language.system_settings"), systemImage: "gear")
                        Spacer()
                        Image(systemName: "arrow.up.forward.app")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            } footer: {
                Text(String(localized: "language.system_settings_hint"))
                    .font(.caption)
            }
        }
        .navigationTitle(String(localized: "language.title"))
        .alert(String(localized: "language.change_title"), isPresented: $showRestartAlert) {
            Button(String(localized: "common.cancel"), role: .cancel) {
                pendingLanguage = nil
            }
            Button(String(localized: "language.restart_now")) {
                if let newLang = pendingLanguage {
                    changeLanguage(to: newLang)
                }
            }
        } message: {
            Text(String(localized: "language.change_message"))
        }
    }

    private func changeLanguage(to languageCode: String) {
        // Set iOS locale via UserDefaults
        UserDefaults.standard.set([languageCode], forKey: "AppleLanguages")
        UserDefaults.standard.synchronize()

        // Update local state
        selectedLanguage = languageCode

        // Sync to Firestore via API (cross-device persistence)
        Task {
            try? await settingsService.setLanguage(languageCode)
        }

        // Note: Language change takes effect on next app launch.
        // The restart alert already informed the user.
    }

    private func openSystemSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Stable Selection View

struct StableSelectionView: View {
    @State private var authService = AuthService.shared
    @State private var stables: [Stable] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else if let errorMessage {
                VStack(spacing: 8) {
                    Text(errorMessage)
                        .foregroundStyle(.secondary)
                    Button(String(localized: "common.retry")) {
                        loadStables()
                    }
                }
            } else if stables.isEmpty {
                Text(String(localized: "stable.selection.empty"))
                    .foregroundStyle(.secondary)
            } else {
                ForEach(stables) { stable in
                    Button {
                        authService.selectStable(stable)
                        // Sync default stable to Firestore for cross-device persistence
                        Task { try? await UserSettingsService.shared.setDefaultStable(stable.id) }
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(stable.name)
                                    .foregroundStyle(.primary)

                                if let address = stable.address {
                                    Text(address)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            if authService.selectedStable?.id == stable.id {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(String(localized: "stable.selection.title"))
        .onAppear {
            loadStables()
        }
    }

    private func loadStables() {
        guard let orgId = authService.selectedOrganization?.id else {
            stables = []
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                let response: StablesResponse = try await APIClient.shared.get(
                    APIEndpoints.stables(organizationId: orgId)
                )
                stables = response.stables
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
}

// MARK: - Organization Selection View

struct OrganizationSelectionView: View {
    @State private var authService = AuthService.shared

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            if authService.organizations.isEmpty {
                Text(String(localized: "organization.selection.empty"))
                    .foregroundStyle(.secondary)
            } else {
                ForEach(authService.organizations) { org in
                    Button {
                        authService.selectOrganization(org)
                        // Sync default organization to Firestore for cross-device persistence
                        Task { try? await UserSettingsService.shared.setDefaultOrganization(org.id) }
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(org.name)
                                    .foregroundStyle(.primary)

                                Text(org.type.rawValue.capitalized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if authService.selectedOrganization?.id == org.id {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(String(localized: "organization.selection.title"))
    }
}

#Preview {
    SettingsView()
}
