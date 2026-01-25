//
//  SignUpView.swift
//  EquiDuty
//
//  Sign up screen for creating new accounts
//

import SwiftUI

struct SignUpView: View {
    @Binding var showSignUp: Bool

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    @FocusState private var focusedField: Field?

    private enum Field: Int, CaseIterable {
        case firstName, lastName, email, password, confirmPassword
    }

    var body: some View {
        ZStack {
            // Background color
            Color.equiDutyGreen
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Logo at top
                    Image("LoginLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: 200)
                        .padding(.top, 40)

                    // Form card
                    VStack(spacing: 16) {
                        // Header inside card
                        VStack(spacing: 4) {
                            Text(String(localized: "signup.title"))
                                .font(.title2)
                                .fontWeight(.bold)

                            Text(String(localized: "signup.subtitle"))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                    // Name row
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(String(localized: "signup.first_name"))
                                .font(.subheadline)
                                .fontWeight(.medium)

                            TextField(String(localized: "signup.first_name.placeholder"), text: $firstName)
                                .textFieldStyle(.roundedBorder)
                                .textContentType(.givenName)
                                .focused($focusedField, equals: .firstName)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .lastName }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text(String(localized: "signup.last_name"))
                                .font(.subheadline)
                                .fontWeight(.medium)

                            TextField(String(localized: "signup.last_name.placeholder"), text: $lastName)
                                .textFieldStyle(.roundedBorder)
                                .textContentType(.familyName)
                                .focused($focusedField, equals: .lastName)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .email }
                        }
                    }

                    // Email
                    VStack(alignment: .leading, spacing: 8) {
                        Text(String(localized: "login.email"))
                            .font(.subheadline)
                            .fontWeight(.medium)

                        TextField(String(localized: "login.email.placeholder"), text: $email)
                            .textFieldStyle(.roundedBorder)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .password }
                    }

                    // Password
                    VStack(alignment: .leading, spacing: 8) {
                        Text(String(localized: "login.password"))
                            .font(.subheadline)
                            .fontWeight(.medium)

                        SecureField(String(localized: "signup.password.placeholder"), text: $password)
                            .textFieldStyle(.roundedBorder)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .password)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .confirmPassword }

                        if !password.isEmpty {
                            PasswordStrengthView(password: password)
                        }
                    }

                    // Confirm password
                    VStack(alignment: .leading, spacing: 8) {
                        Text(String(localized: "signup.confirm_password"))
                            .font(.subheadline)
                            .fontWeight(.medium)

                        SecureField(String(localized: "signup.confirm_password.placeholder"), text: $confirmPassword)
                            .textFieldStyle(.roundedBorder)
                            .textContentType(.newPassword)
                            .focused($focusedField, equals: .confirmPassword)
                            .submitLabel(.done)
                            .onSubmit {
                                Task { await signUp() }
                            }

                        if !confirmPassword.isEmpty && password != confirmPassword {
                            Text(String(localized: "signup.passwords_mismatch"))
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                    }

                        // Error message
                        if let errorMessage {
                            Text(errorMessage)
                                .font(.subheadline)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        // Sign up button
                        Button {
                            Task { await signUp() }
                        } label: {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text(String(localized: "signup.create_account"))
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.equiDutyGreen)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .disabled(isLoading || !isFormValid)
                        .opacity(isFormValid ? 1 : 0.6)

                        // Terms
                        Text(String(localized: "signup.terms"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)

                        // Sign in link
                        HStack {
                            Text(String(localized: "signup.have_account"))
                                .foregroundStyle(.secondary)
                            Button(String(localized: "login.sign_in")) {
                                showSignUp = false
                            }
                            .fontWeight(.medium)
                            .foregroundStyle(Color.equiDutyGreen)
                        }
                        .font(.subheadline)
                    }
                    .padding(24)
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(String(localized: "common.cancel")) {
                    showSignUp = false
                }
                .foregroundStyle(.white)
            }
        }
    }

    // MARK: - Computed Properties

    private var isFormValid: Bool {
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !email.isEmpty &&
        email.contains("@") &&
        password.count >= 8 &&
        password == confirmPassword
    }

    // MARK: - Actions

    private func signUp() async {
        guard isFormValid else { return }

        isLoading = true
        errorMessage = nil

        do {
            try await AuthService.shared.signUp(
                email: email,
                password: password,
                firstName: firstName,
                lastName: lastName
            )
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Password Strength Indicator

struct PasswordStrengthView: View {
    let password: String

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<4, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(index < strength.level ? strength.color : Color.secondary.opacity(0.3))
                    .frame(height: 4)
            }

            Text(strength.label)
                .font(.caption)
                .foregroundStyle(strength.color)
        }
    }

    private var strength: (level: Int, label: String, color: Color) {
        var score = 0

        if password.count >= 8 { score += 1 }
        if password.count >= 12 { score += 1 }
        if password.contains(where: { $0.isNumber }) { score += 1 }
        if password.contains(where: { $0.isUppercase }) { score += 1 }
        if password.contains(where: { !$0.isLetter && !$0.isNumber }) { score += 1 }

        switch score {
        case 0...1:
            return (1, String(localized: "password.weak"), .red)
        case 2:
            return (2, String(localized: "password.fair"), .orange)
        case 3:
            return (3, String(localized: "password.good"), .yellow)
        default:
            return (4, String(localized: "password.strong"), .green)
        }
    }
}

#Preview {
    NavigationStack {
        SignUpView(showSignUp: .constant(true))
    }
}
