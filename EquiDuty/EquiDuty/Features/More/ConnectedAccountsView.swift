//
//  ConnectedAccountsView.swift
//  EquiDuty
//
//  Connected accounts management - link/unlink Google and Apple providers
//

import SwiftUI
import FirebaseAuth

struct ConnectedAccountsView: View {
    @State private var authService = AuthService.shared
    @State private var isLinkingGoogle = false
    @State private var isUnlinking: String?
    @State private var confirmUnlinkProvider: String?
    @State private var alertMessage: String?
    @State private var showAlert = false

    private var linkedIds: Set<String> {
        Set(authService.linkedProviderIds)
    }

    private var canUnlink: Bool {
        authService.linkedProviders.count > 1
    }

    var body: some View {
        List {
            Section {
                Text(String(localized: "connected_accounts.description"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 8, trailing: 16))
            }

            Section {
                providerRow(
                    providerId: "password",
                    icon: "envelope.fill",
                    iconColor: .gray,
                    name: String(localized: "connected_accounts.provider.email")
                )

                providerRow(
                    providerId: "google.com",
                    icon: "g.circle.fill",
                    iconColor: .red,
                    name: "Google"
                )

                providerRow(
                    providerId: "apple.com",
                    icon: "apple.logo",
                    iconColor: .primary,
                    name: "Apple"
                )
            }
        }
        .navigationTitle(String(localized: "connected_accounts.title"))
        .alert(String(localized: "common.error"), isPresented: $showAlert) {
            Button(String(localized: "common.ok")) {}
        } message: {
            if let message = alertMessage {
                Text(message)
            }
        }
        .confirmationDialog(
            String(localized: "connected_accounts.disconnect_confirm.title"),
            isPresented: .init(
                get: { confirmUnlinkProvider != nil },
                set: { if !$0 { confirmUnlinkProvider = nil } }
            ),
            titleVisibility: .visible
        ) {
            if let providerId = confirmUnlinkProvider {
                Button(String(localized: "connected_accounts.disconnect"), role: .destructive) {
                    Task {
                        await handleUnlink(providerId)
                    }
                }
                Button(String(localized: "common.cancel"), role: .cancel) {
                    confirmUnlinkProvider = nil
                }
            }
        } message: {
            Text(String(localized: "connected_accounts.disconnect_confirm.message"))
        }
    }

    @ViewBuilder
    private func providerRow(providerId: String, icon: String, iconColor: Color, name: String) -> some View {
        let isLinked = linkedIds.contains(providerId)
        let providerInfo = authService.linkedProviders.first { $0.providerId == providerId }
        let emailMismatch = isLinked && providerInfo?.email != nil && providerInfo?.email?.lowercased() != authService.currentUser?.email.lowercased()

        HStack {
            Image(systemName: icon)
                .foregroundStyle(iconColor)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.body)

                if isLinked, let email = providerInfo?.email {
                    Text(email)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if emailMismatch {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption2)
                            .foregroundStyle(.yellow)
                        Text(String(localized: "connected_accounts.email_mismatch"))
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                }
            }

            Spacer()

            if providerId == "password" && isLinked {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else if providerId == "password" {
                // No "Connect" flow for password — show nothing
                EmptyView()
            } else if isLinked {
                Button {
                    confirmUnlinkProvider = providerId
                } label: {
                    Text(String(localized: "connected_accounts.disconnect"))
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .disabled(!canUnlink || isUnlinking == providerId)
            } else {
                Button {
                    Task {
                        await handleLink(providerId)
                    }
                } label: {
                    Text(String(localized: "connected_accounts.connect"))
                        .font(.subheadline)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .disabled(isLinkingGoogle)
            }
        }
        .padding(.vertical, 4)
    }

    private func handleLink(_ providerId: String) async {
        guard providerId == "google.com" else { return }

        isLinkingGoogle = true
        defer { isLinkingGoogle = false }

        do {
            try await authService.linkGoogleAccount()
        } catch {
            let nsError = error as NSError
            if nsError.code == GIDSignInError.canceled.rawValue {
                return // User cancelled, no error
            }

            if nsError.domain == AuthErrorDomain {
                switch AuthErrorCode(rawValue: nsError.code) {
                case .providerAlreadyLinked:
                    return // Already linked, no-op
                case .credentialAlreadyInUse:
                    alertMessage = String(localized: "connected_accounts.error.already_in_use")
                case .requiresRecentLogin:
                    alertMessage = String(localized: "connected_accounts.error.recent_login")
                default:
                    alertMessage = String(localized: "connected_accounts.error.link_failed")
                }
            } else {
                alertMessage = String(localized: "connected_accounts.error.link_failed")
            }
            showAlert = true
        }
    }

    private func handleUnlink(_ providerId: String) async {
        isUnlinking = providerId
        defer { isUnlinking = nil }

        do {
            try await authService.unlinkProvider(providerId)
        } catch {
            let nsError = error as NSError
            if nsError.domain == AuthErrorDomain,
               AuthErrorCode(rawValue: nsError.code) == .requiresRecentLogin {
                alertMessage = String(localized: "connected_accounts.error.recent_login")
            } else {
                alertMessage = String(localized: "connected_accounts.error.unlink_failed")
            }
            showAlert = true
        }
    }
}

// Import for GIDSignInError
import GoogleSignIn

#Preview {
    NavigationStack {
        ConnectedAccountsView()
    }
}
