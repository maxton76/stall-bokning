//
//  EmailVerificationView.swift
//  EquiDuty
//
//  Email verification screen shown after signup for password users
//

import SwiftUI
import FirebaseAuth

struct EmailVerificationView: View {
    @State private var authService = AuthService.shared
    @State private var resendCooldown: Int = 0
    @State private var showResendSuccess = false
    @State private var showResendError = false
    @State private var isChecking = false
    @State private var isVerified = false

    // Timers managed via .task blocks for proper lifecycle (no Timer.publish leaks)

    private var userEmail: String {
        Auth.auth().currentUser?.email ?? ""
    }

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Mail icon
            Image(systemName: "envelope.badge")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)

            // Title
            Text("verify_email.title")
                .font(.title2)
                .fontWeight(.bold)

            // Subtitle with email
            VStack(spacing: 4) {
                Text("verify_email.subtitle \(userEmail)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Instructions
            VStack(spacing: 8) {
                Text("verify_email.check_inbox")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Text("verify_email.check_spam")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal)

            // Success/error messages
            if showResendSuccess {
                Label("verify_email.resent", systemImage: "checkmark.circle.fill")
                    .font(.subheadline)
                    .foregroundStyle(.green)
            }

            if showResendError {
                Label("verify_email.resend_failed", systemImage: "exclamationmark.triangle.fill")
                    .font(.subheadline)
                    .foregroundStyle(.red)
            }

            if isVerified {
                Label("verify_email.verified", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .foregroundStyle(.green)
            }

            // Resend button
            Button {
                Task { await handleResend() }
            } label: {
                if resendCooldown > 0 {
                    Text("verify_email.resend_cooldown \(resendCooldown)")
                } else {
                    Text("verify_email.resend")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(resendCooldown > 0)

            // Checking indicator
            HStack(spacing: 6) {
                ProgressView()
                    .scaleEffect(0.8)
                Text("verify_email.checking")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Sign out button
            Button {
                try? authService.signOut()
            } label: {
                Text("verify_email.sign_out")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.bottom, 32)
        }
        .padding(.horizontal, 32)
        .task {
            // Fix 8: Use .task for poll timer — auto-cancelled when view is removed
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 5_000_000_000)
                guard !Task.isCancelled, !isVerified else { break }
                await checkVerification()
            }
        }
        .task(id: resendCooldown > 0) {
            // Fix 8: Use .task(id:) for cooldown — auto-cancelled when view is removed
            guard resendCooldown > 0 else { return }
            while !Task.isCancelled && resendCooldown > 0 {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard !Task.isCancelled else { return }
                if resendCooldown > 0 {
                    resendCooldown -= 1
                }
            }
        }
    }

    private func handleResend() async {
        showResendSuccess = false
        showResendError = false
        do {
            try await authService.sendEmailVerification()
            showResendSuccess = true
            resendCooldown = 60
        } catch {
            showResendError = true
        }
    }

    private func checkVerification() async {
        guard !isChecking else { return }
        isChecking = true
        defer { isChecking = false }

        do {
            let verified = try await authService.checkEmailVerification()
            guard !Task.isCancelled else { return }  // Fix 9: Prevent stale update after sign-out
            if verified {
                isVerified = true
                // Small delay for UI feedback before transitioning
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                // AuthService.isEmailVerified is now true, RootView will switch to MainTabView
            }
        } catch {
            #if DEBUG
            print("Email verification check failed: \(error)")
            #endif
        }
    }
}

#Preview {
    EmailVerificationView()
}
