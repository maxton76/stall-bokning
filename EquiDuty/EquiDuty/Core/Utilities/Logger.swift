//
//  Logger.swift
//  EquiDuty
//
//  Centralized logging system using OSLog (Apple's recommended approach)
//  Logs persist even in production builds and can be retrieved via Console.app
//

import Foundation
import os

/// Centralized logger for EquiDuty app
/// Uses OSLog for production-safe logging with different log levels
enum AppLogger {
    /// Subsystem identifier for filtering logs in Console.app
    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.equiduty.app"

    // MARK: - Log Categories

    /// Network/API requests and responses
    static let network = Logger(subsystem: subsystem, category: "network")

    /// Authentication and user session
    static let auth = Logger(subsystem: subsystem, category: "auth")

    /// General app lifecycle and UI events
    static let app = Logger(subsystem: subsystem, category: "app")

    /// Data persistence (Firestore, local storage)
    static let data = Logger(subsystem: subsystem, category: "data")

    /// Errors and exceptions
    static let error = Logger(subsystem: subsystem, category: "error")
}

// MARK: - Convenience Extensions

extension Logger {
    /// Log network request
    func logRequest(_ method: String, url: String, hasToken: Bool) {
        self.info("📡 \(method) \(url) | Token: \(hasToken)")
    }

    /// Log network response
    func logResponse(statusCode: Int, url: String) {
        if statusCode >= 200 && statusCode < 300 {
            self.info("✅ \(statusCode) \(url)")
        } else if statusCode >= 400 {
            self.error("❌ \(statusCode) \(url)")
        } else {
            self.warning("⚠️ \(statusCode) \(url)")
        }
    }

    /// Log authentication event
    func logAuth(_ event: String, details: String? = nil) {
        if let details = details {
            self.info("🔐 \(event): \(details)")
        } else {
            self.info("🔐 \(event)")
        }
    }

    /// Log data operation
    func logData(_ operation: String, collection: String) {
        self.debug("💾 \(operation) - \(collection)")
    }
}
