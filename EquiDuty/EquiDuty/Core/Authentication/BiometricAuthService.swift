//
//  BiometricAuthService.swift
//  EquiDuty
//
//  Face ID / Touch ID biometric authentication service (CIS 5.2)
//  Provides passwordless authentication for returning users
//

import Foundation
import LocalAuthentication
import os

/// Biometric authentication type
enum BiometricType {
    case faceID
    case touchID
    case none

    var displayName: String {
        switch self {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .none: return "Biometrics"
        }
    }
}

/// Biometric authentication error
enum BiometricError: LocalizedError {
    case notAvailable
    case notEnrolled
    case lockout
    case userCancel
    case userFallback
    case systemCancel
    case passcodeNotSet
    case biometryNotAvailable
    case biometryNotEnrolled
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "Biometric authentication is not available on this device."
        case .notEnrolled:
            return "No biometric credentials are enrolled. Please set up Face ID or Touch ID in Settings."
        case .lockout:
            return "Biometric authentication is locked. Please unlock with your passcode."
        case .userCancel:
            return "Authentication was cancelled."
        case .userFallback:
            return "User chose to enter password instead."
        case .systemCancel:
            return "Authentication was cancelled by the system."
        case .passcodeNotSet:
            return "Device passcode is not set. Please set a passcode in Settings."
        case .biometryNotAvailable:
            return "Biometric authentication is not available."
        case .biometryNotEnrolled:
            return "No biometric credentials are enrolled."
        case .unknown(let error):
            return "Biometric authentication failed: \(error.localizedDescription)"
        }
    }
}

/// Service managing biometric authentication (Face ID / Touch ID)
@MainActor
final class BiometricAuthService {
    static let shared = BiometricAuthService()

    private let context = LAContext()
    private let logger = Logger(subsystem: "com.equiduty.app", category: "biometrics")

    // MARK: - User Preferences

    private let biometricsEnabledKey = "biometrics_enabled"

    var isBiometricsEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: biometricsEnabledKey) }
        set { UserDefaults.standard.set(newValue, forKey: biometricsEnabledKey) }
    }

    private init() {}

    // MARK: - Biometric Type Detection

    /// Get the type of biometric authentication available on device
    func availableBiometricType() -> BiometricType {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .faceID:
            return .faceID
        case .touchID:
            return .touchID
        case .opticID:
            return .faceID  // Treat Optic ID same as Face ID for now
        case .none:
            return .none
        @unknown default:
            return .none
        }
    }

    /// Check if biometric authentication is available
    func isBiometricAuthenticationAvailable() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    // MARK: - Authentication

    /// Authenticate user with biometrics (Face ID / Touch ID)
    /// - Parameter reason: Reason displayed to user during authentication
    /// - Returns: true if authentication succeeded
    /// - Throws: BiometricError if authentication fails
    func authenticate(reason: String = "Authenticate to access EquiDuty") async throws -> Bool {
        let context = LAContext()
        context.localizedCancelTitle = "Use Password"
        context.localizedFallbackTitle = "Enter Password"

        // Pre-check if biometrics are available
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            logger.error("❌ Biometric authentication not available: \(error?.localizedDescription ?? "unknown")")

            if let nsError = error, let laError = nsError as? LAError {
                throw mapLAError(laError)
            }
            throw BiometricError.notAvailable
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )

            if success {
                logger.info("✅ Biometric authentication succeeded")
            }

            return success
        } catch let laError as LAError {
            logger.error("❌ Biometric authentication failed: \(laError.localizedDescription)")
            throw mapLAError(laError)
        } catch {
            logger.error("❌ Biometric authentication failed: \(error.localizedDescription)")
            throw BiometricError.unknown(error)
        }
    }

    /// Authenticate with device passcode as fallback
    /// - Parameter reason: Reason displayed to user
    /// - Returns: true if authentication succeeded
    func authenticateWithPasscode(reason: String = "Authenticate to access EquiDuty") async throws -> Bool {
        let context = LAContext()

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )

            if success {
                logger.info("✅ Passcode authentication succeeded")
            }

            return success
        } catch let laError as LAError {
            logger.error("❌ Passcode authentication failed: \(laError.localizedDescription)")
            throw mapLAError(laError)
        } catch {
            logger.error("❌ Passcode authentication failed: \(error.localizedDescription)")
            throw BiometricError.unknown(error)
        }
    }

    // MARK: - Error Mapping

    /// Map LAError to BiometricError
    private func mapLAError(_ error: LAError) -> BiometricError {
        switch error.code {
        case .biometryNotAvailable:
            return .biometryNotAvailable
        case .biometryNotEnrolled:
            return .biometryNotEnrolled
        case .biometryLockout:
            return .lockout
        case .userCancel:
            return .userCancel
        case .userFallback:
            return .userFallback
        case .systemCancel:
            return .systemCancel
        case .passcodeNotSet:
            return .passcodeNotSet
        default:
            return .unknown(error as Error)
        }
    }

    // MARK: - Convenience Methods

    /// Check if user should be prompted for biometric setup
    /// (biometrics available but user hasn't enabled them)
    func shouldPromptForBiometricSetup() -> Bool {
        return isBiometricAuthenticationAvailable() && !isBiometricsEnabled
    }

    /// Get localized prompt text for biometric authentication
    func getAuthenticationPrompt() -> String {
        let biometricType = availableBiometricType()
        switch biometricType {
        case .faceID:
            return "Use Face ID to sign in"
        case .touchID:
            return "Use Touch ID to sign in"
        case .none:
            return "Use biometric authentication to sign in"
        }
    }

    /// Get localized error message for biometric errors
    func getErrorMessage(for error: BiometricError) -> String {
        return error.errorDescription ?? "Biometric authentication failed."
    }
}
