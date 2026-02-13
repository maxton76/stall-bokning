//
//  SignUpView.swift
//  EquiDuty
//
//  Sign up screen for creating new accounts with organization type selection
//

import SwiftUI

struct SignUpView: View {
    @Binding var showSignUp: Bool

    @State private var currentStep = 1
    @State private var organizationType: OrganizationType? = nil

    // Step 2 fields
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""

    // Business fields
    @State private var organizationName = ""
    @State private var contactEmail = ""
    @State private var phoneNumber = ""

    @State private var isLoading = false
    @State private var errorMessage: String?

    @FocusState private var focusedField: Field?

    private enum OrganizationType: String {
        case personal
        case business
    }

    private enum Field: Int, CaseIterable {
        case firstName, lastName, email, password, confirmPassword
        case organizationName, contactEmail, phoneNumber
    }

    var body: some View {
        ZStack {
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

                    // Step indicator
                    Text(String(localized: "signup.step_indicator \(currentStep) \(2)"))
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.8))

                    if currentStep == 1 {
                        step1View
                    } else {
                        step2View
                    }
                }
                .padding(.horizontal, EquiDutyDesign.Spacing.xl)
                .padding(.bottom, EquiDutyDesign.Spacing.section)
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
        .animation(.easeInOut(duration: 0.3), value: currentStep)
    }

    // MARK: - Step 1: Organization Type Selection

    private var step1View: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            VStack(spacing: EquiDutyDesign.Spacing.xs) {
                Text(String(localized: "signup.choose_type.title"))
                    .font(.title2)
                    .fontWeight(.bold)

                Text(String(localized: "signup.choose_type.subtitle"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Personal card
            organizationTypeCard(
                type: .personal,
                icon: "person.fill",
                title: String(localized: "signup.type.personal"),
                description: String(localized: "signup.type.personal.description")
            )

            // Business card
            organizationTypeCard(
                type: .business,
                icon: "building.2.fill",
                title: String(localized: "signup.type.business"),
                description: String(localized: "signup.type.business.description")
            )

            // Continue button
            Button {
                withAnimation { currentStep = 2 }
            } label: {
                Text(String(localized: "common.continue"))
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.equiDutyGreen)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous))
            .buttonStyle(.scale)
            .disabled(organizationType == nil)
            .opacity(organizationType != nil ? 1 : 0.6)

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
        .padding(EquiDutyDesign.Spacing.xl)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card, style: .continuous))
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
    }

    private func organizationTypeCard(type: OrganizationType, icon: String, title: String, description: String) -> some View {
        Button {
            organizationType = type
        } label: {
            HStack(spacing: EquiDutyDesign.Spacing.md) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(organizationType == type ? Color.equiDutyGreen : .secondary)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(organizationType == type ? Color.equiDutyGreen.opacity(0.15) : Color.secondary.opacity(0.1))
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.leading)
                }

                Spacer()

                Image(systemName: organizationType == type ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(organizationType == type ? Color.equiDutyGreen : .secondary)
                    .font(.title3)
            }
            .padding(EquiDutyDesign.Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous)
                    .stroke(organizationType == type ? Color.equiDutyGreen : Color.secondary.opacity(0.3), lineWidth: organizationType == type ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Step 2: Registration Form

    private var step2View: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            // Header inside card
            VStack(spacing: EquiDutyDesign.Spacing.xs) {
                Text(String(localized: "signup.title"))
                    .font(.title2)
                    .fontWeight(.bold)

                Text(String(localized: "signup.subtitle"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Name row
            HStack(spacing: EquiDutyDesign.Spacing.md) {
                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
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

                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
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
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
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
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
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
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                Text(String(localized: "signup.confirm_password"))
                    .font(.subheadline)
                    .fontWeight(.medium)

                SecureField(String(localized: "signup.confirm_password.placeholder"), text: $confirmPassword)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.newPassword)
                    .focused($focusedField, equals: .confirmPassword)
                    .submitLabel(organizationType == .business ? .next : .done)
                    .onSubmit {
                        if organizationType == .business {
                            focusedField = .organizationName
                        } else {
                            Task { await signUp() }
                        }
                    }

                if !confirmPassword.isEmpty && password != confirmPassword {
                    Text(String(localized: "signup.passwords_mismatch"))
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            // Business fields (conditional)
            if organizationType == .business {
                businessFieldsSection
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
            .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous))
            .buttonStyle(.scale)
            .disabled(isLoading || !isFormValid)
            .opacity(isFormValid ? 1 : 0.6)

            // Terms
            Text("signup.terms.markdown")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .tint(.accentColor)

            // Back button
            Button {
                withAnimation { currentStep = 1 }
            } label: {
                HStack {
                    Image(systemName: "chevron.left")
                    Text(String(localized: "signup.back"))
                }
                .font(.subheadline)
                .foregroundStyle(Color.equiDutyGreen)
            }

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
        .padding(EquiDutyDesign.Spacing.xl)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card, style: .continuous))
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
    }

    // MARK: - Business Fields Section

    private var businessFieldsSection: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Divider()

            Text(String(localized: "signup.business_details.title"))
                .font(.subheadline)
                .fontWeight(.semibold)

            // Organization name (required)
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                Text(String(localized: "signup.organization_name"))
                    .font(.subheadline)
                    .fontWeight(.medium)

                TextField(String(localized: "signup.organization_name.placeholder"), text: $organizationName)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.organizationName)
                    .focused($focusedField, equals: .organizationName)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .contactEmail }
            }

            // Contact email (optional)
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                Text(String(localized: "signup.contact_email"))
                    .font(.subheadline)
                    .fontWeight(.medium)

                TextField(String(localized: "signup.contact_email.placeholder"), text: $contactEmail)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .contactEmail)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .phoneNumber }

                Text(String(localized: "signup.contact_email.hint"))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Phone number (optional)
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                Text(String(localized: "signup.phone_number"))
                    .font(.subheadline)
                    .fontWeight(.medium)

                TextField(String(localized: "signup.phone_number.placeholder"), text: $phoneNumber)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.telephoneNumber)
                    .keyboardType(.phonePad)
                    .focused($focusedField, equals: .phoneNumber)
            }
        }
    }

    // MARK: - Computed Properties

    private var isFormValid: Bool {
        let baseValid = !firstName.isEmpty &&
            !lastName.isEmpty &&
            !email.isEmpty &&
            email.wholeMatch(of: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/) != nil &&
            password.count >= 8 &&
            password == confirmPassword

        if organizationType == .business {
            return baseValid && !organizationName.isEmpty
        }
        return baseValid
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
                lastName: lastName,
                organizationType: organizationType?.rawValue,
                organizationName: organizationType == .business ? organizationName : nil,
                contactEmail: organizationType == .business && !contactEmail.isEmpty ? contactEmail : nil,
                phoneNumber: !phoneNumber.isEmpty ? phoneNumber : nil
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
        HStack(spacing: EquiDutyDesign.Spacing.xs) {
            ForEach(0..<4, id: \.self) { index in
                Capsule()
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
