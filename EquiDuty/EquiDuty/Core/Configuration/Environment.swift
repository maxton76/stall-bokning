//
//  Environment.swift
//  EquiDuty
//
//  Manages environment-specific configuration
//

import Foundation

enum AppEnvironment {
    case development
    case staging
    case production

    static var current: AppEnvironment {
        #if DEV
        return .development
        #elseif STAGING
        return .staging
        #elseif PRODUCTION
        return .production
        #else
        return .development // Default fallback
        #endif
    }

    var name: String {
        switch self {
        case .development: return "Development"
        case .staging: return "Staging"
        case .production: return "Production"
        }
    }

    var shortName: String {
        switch self {
        case .development: return "Dev"
        case .staging: return "Staging"
        case .production: return "Prod"
        }
    }

    var apiBaseURL: String {
        switch self {
        case .development:
            return "https://api-service-773558333623.europe-west1.run.app/api/v1"
        case .staging:
            return "https://api-staging-service.europe-west1.run.app/api/v1"
        case .production:
            return "https://api.equiduty.com/api/v1"
        }
    }

    var webAppURL: String {
        switch self {
        case .development:
            return "https://equiduty-dev.web.app"
        case .staging:
            return "https://equiduty-staging.web.app"
        case .production:
            return "https://app.equiduty.com"
        }
    }

    var firebaseProjectId: String {
        switch self {
        case .development:
            return "equiduty-dev"
        case .staging:
            return "equiduty-staging"
        case .production:
            return "equiduty-prod"
        }
    }

    var isDebug: Bool {
        return self == .development
    }

    var enableLogging: Bool {
        return self != .production
    }
}

// MARK: - Environment Info for Debugging

extension AppEnvironment {
    static func printEnvironmentInfo() {
        print("""

        ╔════════════════════════════════════════╗
        ║     EquiDuty Environment Info          ║
        ╠════════════════════════════════════════╣
        ║ Environment: \(current.name.padding(toLength: 26, withPad: " ", startingAt: 0)) ║
        ║ Firebase Project: \(current.firebaseProjectId.padding(toLength: 20, withPad: " ", startingAt: 0)) ║
        ║ API Base URL: \(current.apiBaseURL.padding(toLength: 23, withPad: " ", startingAt: 0)) ║
        ║ Web App URL: \(current.webAppURL.padding(toLength: 24, withPad: " ", startingAt: 0)) ║
        ╚════════════════════════════════════════╝

        """)
    }
}
