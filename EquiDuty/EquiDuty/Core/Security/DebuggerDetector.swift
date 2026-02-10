//
//  DebuggerDetector.swift
//  EquiDuty
//
//  Detects and prevents debugger attachment for runtime security (CIS 10.2)
//  Reference: https://www.cisecurity.org/benchmark/apple_ios
//

import Foundation
import Darwin
import os

/// Debugger detection and prevention service
final class DebuggerDetector {
    static let shared = DebuggerDetector()

    private init() {}

    // MARK: - Debugger Detection

    /// Check if debugger is currently attached
    /// - Returns: true if debugger is attached
    func isDebuggerAttached() -> Bool {
        #if targetEnvironment(simulator)
        // Always return false in simulator (allows Xcode debugging during development)
        return false
        #else

        var info = kinfo_proc()
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        var size = MemoryLayout<kinfo_proc>.stride

        let result = sysctl(&mib, UInt32(mib.count), &info, &size, nil, 0)

        guard result == 0 else {
            // sysctl failed - assume no debugger for safety
            return false
        }

        // Check the P_TRACED flag (0x00000800)
        return (info.kp_proc.p_flag & P_TRACED) != 0
        #endif
    }

    // MARK: - Debugger Prevention

    /// Prevent debugger attachment using ptrace
    /// Call this early in app lifecycle (e.g., AppDelegate.didFinishLaunching)
    /// Only applies to production builds - disabled in debug/simulator
    func denyDebuggerAttachment() {
        #if !DEBUG && !targetEnvironment(simulator)
        // PT_DENY_ATTACH (31) prevents debugger attachment
        // This will cause the app to exit if a debugger tries to attach
        let result = ptrace(PT_DENY_ATTACH, 0, nil, 0)

        if result != 0 {
            // ptrace failed - log but continue (might be running on jailbroken device)
            AppLogger.error.error("⚠️ Failed to deny debugger attachment: \(errno)")
        } else {
            AppLogger.app.info("🛡️ Debugger attachment prevention enabled")
        }
        #else
        // Debug mode or simulator - allow debugging
        AppLogger.app.debug("🔧 Debugger attachment allowed (Debug build or Simulator)")
        #endif
    }

    // MARK: - Runtime Checks

    /// Perform continuous debugger detection (call periodically in production)
    /// - Parameter onDetection: Callback executed if debugger is detected
    func startMonitoring(onDetection: @escaping () -> Void) {
        #if !DEBUG && !targetEnvironment(simulator)
        Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            if self?.isDebuggerAttached() == true {
                AppLogger.error.error("🚨 Debugger detected during runtime!")
                onDetection()
            }
        }
        #endif
    }

    /// Handle debugger detection (exit app securely)
    func handleDebuggerDetection() {
        #if !DEBUG && !targetEnvironment(simulator)
        AppLogger.error.error("🚨 Security violation: Debugger detected. Exiting app.")

        // Exit immediately (status 0 to avoid crash reports)
        exit(0)
        #endif
    }
}
