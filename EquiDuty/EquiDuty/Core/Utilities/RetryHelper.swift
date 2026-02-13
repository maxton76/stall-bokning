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

    /// Execute an async operation with retry logic and result validation.
    /// Retries when the result fails validation (e.g., empty data from cold start).
    /// - Parameters:
    ///   - maxAttempts: Maximum number of attempts (default: 3)
    ///   - delay: Initial delay in seconds between retries (doubles each time)
    ///   - shouldRetryResult: Returns true if the result should trigger a retry
    ///   - operation: The async operation to retry
    /// - Returns: Result of the operation
    static func retryWithValidation<T>(
        maxAttempts: Int = 3,
        delay: TimeInterval = 0.5,
        shouldRetryResult: @escaping (T) -> Bool,
        operation: @escaping () async throws -> T
    ) async throws -> T {
        var lastResult: T?
        var lastError: Error?

        for attempt in 0..<maxAttempts {
            do {
                let result = try await operation()

                // If result passes validation, return immediately
                if !shouldRetryResult(result) {
                    return result
                }

                // Result failed validation — retry unless final attempt
                lastResult = result
                if attempt == maxAttempts - 1 {
                    return result
                }

                let backoff = delay * pow(2.0, Double(attempt))
                try? await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
            } catch {
                lastError = error

                if attempt == maxAttempts - 1 || !isRetryableError(error) {
                    throw error
                }

                let backoff = delay * pow(2.0, Double(attempt))
                try? await Task.sleep(nanoseconds: UInt64(backoff * 1_000_000_000))
            }
        }

        if let lastResult {
            return lastResult
        }
        throw lastError ?? NetworkError.unknown
    }

    /// Check if error is worth retrying
    static func isRetryableError(_ error: Error) -> Bool {
        // Retry on network errors
        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut, .cannotConnectToHost, .networkConnectionLost, .notConnectedToInternet:
                return true
            default:
                return false
            }
        }

        // Check for APIError (what APIClient actually throws)
        if let apiError = error as? APIError {
            switch apiError {
            case .serverError, .networkError:
                return true
            default:
                return false
            }
        }

        // Check for HTTP 5xx errors (legacy ResponseError)
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
