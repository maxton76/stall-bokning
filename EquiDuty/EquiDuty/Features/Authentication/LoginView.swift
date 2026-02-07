//
//  LoginView.swift
//  EquiDuty
//
//  Login screen for email/password authentication
//

import SwiftUI

/// Brand color from the logo - RGB(48, 87, 59)
extension Color {
    static let equiDutyGreen = Color(red: 48/255, green: 87/255, blue: 59/255)
}

struct LoginView: View {
    @Binding var showSignUp: Bool

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showForgotPassword = false

    @FocusState private var focusedField: Field?

    private enum Field {
        case email, password
    }

    var body: some View {
        ZStack {
            // Background color
            Color.equiDutyGreen
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    // Logo at top
                    Image("LoginLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: 280)
                        .padding(.top, 60)

                // Login form card
                VStack(spacing: EquiDutyDesign.Spacing.standard) {
                    // Email field
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                        Text(String(localized: "login.email"))
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.primary)

                        TextField(String(localized: "login.email.placeholder"), text: $email)
                            .textFieldStyle(.roundedBorder)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .email)
                            .submitLabel(.next)
                            .onSubmit {
                                focusedField = .password
                            }
                    }

                    // Password field
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                        Text(String(localized: "login.password"))
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.primary)

                        SecureField(String(localized: "login.password.placeholder"), text: $password)
                            .textFieldStyle(.roundedBorder)
                            .textContentType(.password)
                            .focused($focusedField, equals: .password)
                            .submitLabel(.go)
                            .onSubmit {
                                Task { await signIn() }
                            }
                    }

                    // Forgot password
                    HStack {
                        Spacer()
                        Button(String(localized: "login.forgot_password")) {
                            showForgotPassword = true
                        }
                        .font(.subheadline)
                        .foregroundStyle(Color.equiDutyGreen)
                    }

                    // Error message
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                    }

                    // Sign in button
                    Button {
                        Task { await signIn() }
                    } label: {
                        if isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text(String(localized: "login.sign_in"))
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.equiDutyGreen)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous))
                    .disabled(isLoading || !isFormValid)
                    .opacity(isFormValid ? 1 : 0.6)
                    .buttonStyle(.scale)

                    // Divider
                    HStack {
                        Rectangle()
                            .fill(Color.secondary.opacity(0.3))
                            .frame(height: 1)
                        Text(String(localized: "login.or"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Rectangle()
                            .fill(Color.secondary.opacity(0.3))
                            .frame(height: 1)
                    }

                    // Sign in with Google
                    Button {
                        Task { await signInWithGoogle() }
                    } label: {
                        HStack {
                            Image(systemName: "g.circle.fill")
                            Text(String(localized: "login.sign_in_google"))
                        }
                        .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.white)
                    .foregroundStyle(.primary)
                    .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous))
                    .buttonStyle(.scale)

                    // Sign up link
                    HStack {
                        Text(String(localized: "login.no_account"))
                            .foregroundStyle(.secondary)
                        Button(String(localized: "login.sign_up")) {
                            showSignUp = true
                        }
                        .fontWeight(.medium)
                        .foregroundStyle(Color.equiDutyGreen)
                    }
                    .font(.subheadline)
                }
                .padding(EquiDutyDesign.Spacing.xl)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card, style: .continuous))
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
            }
            .padding(.horizontal, EquiDutyDesign.Spacing.xl)
            .padding(.bottom, EquiDutyDesign.Spacing.section)
        }
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordView()
        }
    }

    // MARK: - Computed Properties

    private static let emailRegex = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/

    private var isFormValid: Bool {
        !email.isEmpty && email.wholeMatch(of: Self.emailRegex) != nil && password.count >= 6
    }

    // MARK: - Actions

    private func signIn() async {
        guard isFormValid else { return }

        isLoading = true
        errorMessage = nil

        do {
            try await AuthService.shared.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func signInWithGoogle() async {
        isLoading = true
        errorMessage = nil

        do {
            try await AuthService.shared.signInWithGoogle()
        } catch {
            // Don't show error for user cancellation
            if case AuthError.cancelled = error {
                // User cancelled, no error message
            } else {
                errorMessage = error.localizedDescription
            }
        }

        isLoading = false
    }
}

// MARK: - Forgot Password View

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: EquiDutyDesign.Spacing.xl) {
                Text(String(localized: "forgot_password.description"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                TextField(String(localized: "login.email.placeholder"), text: $email)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                if let successMessage {
                    Text(successMessage)
                        .font(.caption)
                        .foregroundStyle(.green)
                }

                Button {
                    Task { await sendReset() }
                } label: {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(String(localized: "forgot_password.send"))
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.accentColor)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous))
                .buttonStyle(.scale)
                .disabled(isLoading || email.isEmpty)

                Spacer()
            }
            .padding(EquiDutyDesign.Spacing.xl)
            .navigationTitle(String(localized: "forgot_password.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }
            }
        }
    }

    private func sendReset() async {
        isLoading = true
        errorMessage = nil
        successMessage = nil

        do {
            try await AuthService.shared.sendPasswordReset(email: email)
            successMessage = String(localized: "forgot_password.success")
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview("Login") {
    NavigationStack {
        LoginView(showSignUp: .constant(false))
    }
}

#Preview("Forgot Password") {
    ForgotPasswordView()
}
