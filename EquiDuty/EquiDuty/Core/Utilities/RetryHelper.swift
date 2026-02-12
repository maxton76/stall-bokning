//
//  RetryHelper.swift
//  EquiDuty
//
//  Network retry logic with exponential backoff
//

import Foundation

enum RetryHelper {
    /// Execute an async operation with retry logic
    /// - Parameters:
    ///   - maxAttempts: Maximum number of retry attempts (default: 3)
    ///   - delay: Initial delay in seconds (doubles with each retry)
    ///   - operation: The async operation to retry
    /// - Returns: Result of the operation
    static func retry<T>(
        maxAttempts: Int = 3,
        delay: TimeInterval = 1.0,
        operation: @escaping () async throws -> T
    ) async throws -> T {
        var lastError: Error?

        for attempt in 0..<maxAttempts {
            do {
                return try await operation()
            } catch {
                lastError = error

                // Don't retry on client errors (4xx) or final attempt
                if attempt == maxAttempts - 1 || !isRetryableError(error) {
                    break
                }

                // Exponential backoff: 1s, 2s, 4s
                let backoff = delay * pow(2.0, Double(attempt))
                try? await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
            }
        }

        throw lastError ?? NetworkError.unknown
    }

    /// Check if error is worth retrying
    private static func isRetryableError(_ error: Error) -> Bool {
        // Retry on network errors and 5xx server errors
        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut, .cannotConnectToHost, .networkConnectionLost, .notConnectedToInternet:
                return true
            default:
                return false
            }
        }

        // Check for HTTP 5xx errors
        if let responseError = error as? ResponseError {
            return responseError.statusCode >= 500
        }

        return false
    }
}

enum NetworkError: LocalizedError {
    case unknown
    case conflict(String)
    case permissionDenied
    case networkUnavailable

    var errorDescription: String? {
        switch self {
        case .unknown:
            return String(localized: "errors.network.unknown")
        case .conflict(let message):
            return message
        case .permissionDenied:
            return String(localized: "errors.permission.denied")
        case .networkUnavailable:
            return String(localized: "errors.network.unavailable")
        }
    }
}

struct ResponseError: Error {
    let statusCode: Int
    let message: String?
}
