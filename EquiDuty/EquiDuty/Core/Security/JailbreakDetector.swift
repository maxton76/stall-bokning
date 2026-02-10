//
//  JailbreakDetector.swift
//  EquiDuty
//
//  Detects jailbroken iOS devices for security compliance (CIS 10.1)
//  Reference: https://www.cisecurity.org/benchmark/apple_ios
//

import Foundation
import UIKit

/// Jailbreak detection result
enum JailbreakStatus {
    case notJailbroken
    case jailbroken(reasons: [String])

    var isJailbroken: Bool {
        if case .jailbroken = self {
            return true
        }
        return false
    }
}

/// Service for detecting jailbroken iOS devices
/// Note: Determined attackers can bypass these checks, but they provide baseline security
final class JailbreakDetector {
    static let shared = JailbreakDetector()

    private init() {}

    // MARK: - Public API

    /// Check if device is jailbroken
    /// - Returns: JailbreakStatus with detection reasons if jailbroken
    func checkJailbreakStatus() -> JailbreakStatus {
        #if targetEnvironment(simulator)
        // Skip checks in simulator (always returns not jailbroken)
        return .notJailbroken
        #else

        var detectionReasons: [String] = []

        // Check 1: Cydia app presence (most common jailbreak package manager)
        if canOpenCydiaURL() {
            detectionReasons.append("Cydia app detected")
        }

        // Check 2: Suspicious file paths
        if hasSuspiciousFiles() {
            detectionReasons.append("Jailbreak files detected")
        }

        // Check 3: Fork system call (should fail on non-jailbroken devices)
        if canFork() {
            detectionReasons.append("Fork system call succeeded")
        }

        // Check 4: Write to system directories (should fail on non-jailbroken devices)
        if canWriteToSystemDirectories() {
            detectionReasons.append("System directory write access")
        }

        // Check 5: Suspicious dyld libraries (runtime injection detection)
        if hasSuspiciousDylibs() {
            detectionReasons.append("Suspicious runtime libraries detected")
        }

        return detectionReasons.isEmpty ? .notJailbroken : .jailbroken(reasons: detectionReasons)
        #endif
    }

    // MARK: - Detection Methods

    /// Check if Cydia URL scheme can be opened
    private func canOpenCydiaURL() -> Bool {
        guard let cydiaURL = URL(string: "cydia://package/com.example.package") else {
            return false
        }
        return UIApplication.shared.canOpenURL(cydiaURL)
    }

    /// Check for suspicious jailbreak-related files and directories
    private func hasSuspiciousFiles() -> Bool {
        let suspiciousPaths = [
            // Cydia (most common jailbreak)
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/usr/sbin/sshd",
            "/usr/bin/sshd",

            // Other jailbreak tools
            "/Applications/blackra1n.app",
            "/Applications/FakeCarrier.app",
            "/Applications/Icy.app",
            "/Applications/IntelliScreen.app",
            "/Applications/SBSettings.app",

            // Jailbreak binaries
            "/usr/libexec/sftp-server",
            "/usr/bin/ssh",
            "/private/var/lib/apt",
            "/private/var/lib/cydia",
            "/private/var/stash",
            "/private/var/tmp/cydia.log",

            // Sileo (newer jailbreak package manager)
            "/Applications/Sileo.app",
            "/usr/bin/sileo",

            // Checkra1n/unc0ver specific
            "/var/binpack",
            "/Library/PreferenceBundles/LibertyPref.bundle",
            "/Library/PreferenceBundles/ShadowPreferences.bundle",

            // Common jailbreak files
            "/etc/apt",
            "/bin/bash",
            "/bin/sh",
            "/usr/libexec/cydia"
        ]

        for path in suspiciousPaths {
            if FileManager.default.fileExists(atPath: path) {
                return true
            }

            // Also check if file can be read (sometimes fileExists returns false but file is accessible)
            if let _ = try? String(contentsOfFile: path, encoding: .utf8) {
                return true
            }
        }

        return false
    }

    /// Check if fork() system call succeeds (should fail on non-jailbroken devices due to sandbox)
    private func canFork() -> Bool {
        let result = fork()
        if result >= 0 {
            // Fork succeeded - this is a jailbreak indicator
            if result > 0 {
                // Parent process - kill child immediately
                kill(result, SIGTERM)
            }
            return true
        }
        return false
    }

    /// Check if we can write to system directories (should fail on non-jailbroken devices)
    private func canWriteToSystemDirectories() -> Bool {
        let testPaths = [
            "/private/jailbreak_test.txt",
            "/root/jailbreak_test.txt"
        ]

        for path in testPaths {
            do {
                try "Jailbreak test".write(toFile: path, atomically: true, encoding: .utf8)
                // If write succeeded, try to delete the test file
                try? FileManager.default.removeItem(atPath: path)
                return true
            } catch {
                // Write failed (expected on non-jailbroken device)
                continue
            }
        }

        return false
    }

    /// Check for suspicious dylibs loaded into process (runtime injection detection)
    private func hasSuspiciousDylibs() -> Bool {
        let suspiciousDylibs = [
            "MobileSubstrate",
            "SubstrateInserter",
            "SubstrateLoader",
            "CydiaSubstrate",
            "FridaGadget",
            "frida",
            "cycript"
        ]

        // Get count of loaded dylibs
        let imageCount = _dyld_image_count()

        for i in 0..<imageCount {
            if let imageName = _dyld_get_image_name(i) {
                let nameString = String(cString: imageName).lowercased()

                for suspiciousDylib in suspiciousDylibs {
                    if nameString.contains(suspiciousDylib.lowercased()) {
                        return true
                    }
                }
            }
        }

        return false
    }

    // MARK: - User Warnings

    /// Generate user-friendly warning message for jailbroken device
    func getWarningMessage(for status: JailbreakStatus) -> String? {
        guard case .jailbroken(let reasons) = status else {
            return nil
        }

        let reasonsText = reasons.joined(separator: "\n• ")

        return """
        ⚠️ Security Warning

        This device appears to be jailbroken, which may compromise the security of your data.

        Detected issues:
        • \(reasonsText)

        For your security, some features may be restricted.
        """
    }
}
