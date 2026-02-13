//
//  APIClient.swift
//  EquiDuty
//
//  Centralized HTTP client for API communication
//  Mirrors the pattern from packages/frontend/src/lib/apiClient.ts
//

import Foundation
import os

/// API configuration
enum APIConfig {
    /// Base URL from environment configuration
    static let baseURL: String = {
        // First, try to get from Info.plist (allows override for testing)
        if let plistURL = Bundle.main.infoDictionary?["API_BASE_URL"] as? String, !plistURL.isEmpty {
            return plistURL
        }
        
        // Use environment-specific configuration
        // Note: AppEnvironment.current.apiBaseURL already includes /api/v1
        let envBaseURL = AppEnvironment.current.apiBaseURL
        
        // Remove /api/v1 suffix if present, since we add it back in apiV1()
        if envBaseURL.hasSuffix("/api/v1") {
            return String(envBaseURL.dropLast(7))
        }
        
        return envBaseURL
    }()

    static let apiVersion = "v1"

    /// Construct API v1 URL from path
    static func apiV1(_ path: String) -> URL? {
        let cleanPath = path.hasPrefix("/") ? path : "/\(path)"
        return URL(string: "\(baseURL)/api/\(apiVersion)\(cleanPath)")
    }

    /// Construct URL with query parameters
    static func apiV1WithParams(_ path: String, params: [String: String]) -> URL? {
        guard var components = URLComponents(string: "\(baseURL)/api/\(apiVersion)\(path.hasPrefix("/") ? path : "/\(path)")") else {
            return nil
        }

        if !params.isEmpty {
            components.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        }

        return components.url
    }
}

/// HTTP methods
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

/// API error types
enum APIError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case networkError(Error)
    case httpError(statusCode: Int, message: String?)
    case badRequest(String)
    case unauthorized
    case forbidden
    case insufficientPermissions(action: String?)
    case featureNotAvailable(module: String?)
    case notFound
    case serverError
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return String(localized: "error.api.invalid_url")
        case .noData:
            return String(localized: "error.api.no_data")
        case .decodingError(let error):
            return String(localized: "error.api.decoding \(error.localizedDescription)")
        case .networkError(let error):
            return String(localized: "error.api.network \(error.localizedDescription)")
        case .httpError(let statusCode, let message):
            return message ?? String(localized: "error.api.http \(statusCode)")
        case .badRequest(let message):
            return message
        case .unauthorized:
            return String(localized: "error.api.unauthorized You need to sign in to access this resource.")
        case .forbidden:
            return String(localized: "error.api.forbidden You don't have access to this resource.")
        case .insufficientPermissions(let action):
            if let action = action {
                return String(localized: "error.permission.\(action) You don't have permission to perform this action.")
            }
            return String(localized: "error.permission.generic You don't have permission to perform this action.")
        case .featureNotAvailable(let module):
            if let module = module {
                return String(localized: "error.feature.\(module) This feature is not available in your subscription plan.")
            }
            return String(localized: "error.feature.upgrade_required Upgrade your subscription to access this feature.")
        case .notFound:
            return String(localized: "error.api.not_found")
        case .serverError:
            return String(localized: "error.api.server_error")
        case .unknown:
            return String(localized: "error.api.unknown")
        }
    }
}

/// API error response structure
struct APIErrorResponse: Codable {
    let message: String?
    let error: String?
    let statusCode: Int?
}

/// Main API client for authenticated requests
@MainActor
final class APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    /// Token provider closure - set by AuthService
    var tokenProvider: (() async -> String?)?

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15  // Reduced from 30s (CIS 12.1 - prevent DoS via hanging connections)
        config.timeoutIntervalForResource = 30  // Reduced from 60s
        self.session = URLSession(configuration: config)
        
        // Log API configuration on startup (uses OSLog - persists in production)
        AppLogger.network.info("🌐 APIClient initialized - \(AppEnvironment.current.name)")
        AppLogger.network.debug("Base URL: \(APIConfig.baseURL)")
        AppLogger.network.debug("Full API URL: \(APIConfig.baseURL)/api/\(APIConfig.apiVersion)")

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()

            // Try Firestore Timestamp object format: {"_seconds": 123, "_nanoseconds": 456}
            if let firestoreTimestamp = try? container.decode(FirestoreTimestamp.self) {
                let seconds = TimeInterval(firestoreTimestamp._seconds)
                let nanoseconds = TimeInterval(firestoreTimestamp._nanoseconds) / 1_000_000_000
                return Date(timeIntervalSince1970: seconds + nanoseconds)
            }

            // Try Firestore Timestamp with type field: {"type": "firestore/timestamp/1.0", "seconds": 123, "nanoseconds": 456}
            if let typedTimestamp = try? container.decode(FirestoreTimestampTyped.self) {
                let seconds = TimeInterval(typedTimestamp.seconds)
                let nanoseconds = TimeInterval(typedTimestamp.nanoseconds) / 1_000_000_000
                return Date(timeIntervalSince1970: seconds + nanoseconds)
            }

            // Try ISO8601 with fractional seconds first
            if let dateString = try? container.decode(String.self) {
                let formatters: [ISO8601DateFormatter] = [
                    {
                        let f = ISO8601DateFormatter()
                        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                        return f
                    }(),
                    {
                        let f = ISO8601DateFormatter()
                        f.formatOptions = [.withInternetDateTime]
                        return f
                    }()
                ]

                for formatter in formatters {
                    if let date = formatter.date(from: dateString) {
                        return date
                    }
                }

                // Try other date formats
                let dateFormatter = DateFormatter()
                dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
                if let date = dateFormatter.date(from: dateString) {
                    return date
                }
            }

            // Try Unix timestamp (seconds)
            if let timestamp = try? container.decode(Double.self) {
                return Date(timeIntervalSince1970: timestamp)
            }

            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date format")
        }

        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - Public Methods

    /// GET request with automatic JSON parsing
    func get<T: Decodable>(_ path: String, params: [String: String]? = nil) async throws -> T {
        let url: URL?
        if let params = params {
            url = APIConfig.apiV1WithParams(path, params: params)
        } else {
            url = APIConfig.apiV1(path)
        }

        return try await request(url: url, method: .get)
    }

    /// POST request with automatic JSON parsing
    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        return try await request(url: APIConfig.apiV1(path), method: .post, body: body)
    }

    /// POST request without body
    func post<T: Decodable>(_ path: String) async throws -> T {
        return try await request(url: APIConfig.apiV1(path), method: .post)
    }

    /// PUT request with automatic JSON parsing
    func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        return try await request(url: APIConfig.apiV1(path), method: .put, body: body)
    }

    /// PATCH request with automatic JSON parsing
    func patch<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        return try await request(url: APIConfig.apiV1(path), method: .patch, body: body)
    }

    /// DELETE request
    func delete(_ path: String, params: [String: String]? = nil) async throws {
        let url: URL?
        if let params = params {
            url = APIConfig.apiV1WithParams(path, params: params)
        } else {
            url = APIConfig.apiV1(path)
        }

        let _: EmptyResponse = try await request(url: url, method: .delete)
    }

    /// DELETE request with response
    func delete<T: Decodable>(_ path: String, params: [String: String]? = nil) async throws -> T {
        let url: URL?
        if let params = params {
            url = APIConfig.apiV1WithParams(path, params: params)
        } else {
            url = APIConfig.apiV1(path)
        }

        return try await request(url: url, method: .delete)
    }

    // MARK: - Private Methods

    private func request<T: Decodable>(
        url: URL?,
        method: HTTPMethod,
        body: (any Encodable)? = nil
    ) async throws -> T {
        guard let url = url else {
            throw APIError.invalidURL
        }

        // Log request (OSLog - works in production)
        AppLogger.network.logRequest(method.rawValue, url: url.absoluteString, hasToken: await tokenProvider?() != nil)

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Only set Content-Type when there's a body to send
        if body != nil {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        // Add authorization header
        if let token = await tokenProvider?() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            #if DEBUG
            AppLogger.auth.debug("🔑 Token present: \(token.count) chars")
            #endif
        } else {
            AppLogger.auth.warning("⚠️ No token available from tokenProvider")
        }

        // Add body if present
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        // Reset session timeout on user activity
        AuthService.shared.resetSessionTimeout()

        // Perform request
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        // Check HTTP response
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        // Log response (OSLog - works in production)
        AppLogger.network.logResponse(statusCode: httpResponse.statusCode, url: url.absoluteString)

        if httpResponse.statusCode >= 400 {
            let errorResponse = try? JSONDecoder().decode(APIErrorResponse.self, from: data)
            let errorMsg = errorResponse?.message ?? errorResponse?.error ?? "Unknown error"
            AppLogger.error.error("API Error: \(errorMsg, privacy: .public) (status: \(httpResponse.statusCode))")
        }

        // Handle error status codes
        switch httpResponse.statusCode {
        case 200...299:
            break
        case 400:
            // Bad request - parse error message
            let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)
            let errorMsg = errorResponse?.message ?? errorResponse?.error ?? "Bad request"
            throw APIError.badRequest(errorMsg)
        case 401:
            throw APIError.unauthorized
        case 403:
            // Parse error response to determine type
            let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)

            // Check for permission-related errors
            if let message = errorResponse?.message?.lowercased() {
                if message.contains("permission") {
                    // Invalidate permission cache - user's permissions may have changed
                    Task { @MainActor in
                        if let orgId = AuthService.shared.selectedOrganization?.id {
                            PermissionService.shared.invalidateCache(organizationId: orgId)
                        }
                    }
                    throw APIError.insufficientPermissions(action: errorResponse?.error)
                } else if message.contains("feature") || message.contains("subscription") {
                    // Invalidate subscription cache
                    Task { @MainActor in
                        if let orgId = AuthService.shared.selectedOrganization?.id {
                            SubscriptionService.shared.invalidateCache(organizationId: orgId)
                        }
                    }
                    throw APIError.featureNotAvailable(module: errorResponse?.error)
                }
            }

            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 500...599:
            throw APIError.serverError
        default:
            let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.httpError(
                statusCode: httpResponse.statusCode,
                message: errorResponse?.message ?? errorResponse?.error
            )
        }

        // Handle empty response
        if data.isEmpty {
            if T.self == EmptyResponse.self {
                return EmptyResponse() as! T
            }
            throw APIError.noData
        }

        // Decode response
        do {
            let decoded = try decoder.decode(T.self, from: data)
            AppLogger.network.debug("📦 Decoded \(String(describing: T.self), privacy: .public) (\(data.count) bytes) from \(url.path, privacy: .public)")
            return decoded
        } catch {
            AppLogger.error.error("❌ Decoding \(String(describing: T.self), privacy: .public) FAILED: \(error.localizedDescription, privacy: .public)")
            AppLogger.error.error("❌ Decode detail: \(String(describing: error), privacy: .public)")
            if let jsonString = String(data: data, encoding: .utf8) {
                // Log first 500 chars publicly so we can see the structure
                let preview = String(jsonString.prefix(500))
                AppLogger.error.error("❌ Response preview: \(preview, privacy: .public)")
            }
            throw APIError.decodingError(error)
        }
    }
}

/// Empty response type for requests that don't return data
struct EmptyResponse: Codable {}

/// Firestore Timestamp format for decoding dates (underscore variant)
/// Explicit nonisolated Codable conformance for Swift 6 concurrency
struct FirestoreTimestamp: Sendable {
    let _seconds: Int
    let _nanoseconds: Int
}

extension FirestoreTimestamp: Codable {
    private enum CodingKeys: String, CodingKey {
        case _seconds, _nanoseconds
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        _seconds = try container.decode(Int.self, forKey: ._seconds)
        _nanoseconds = try container.decode(Int.self, forKey: ._nanoseconds)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(_seconds, forKey: ._seconds)
        try container.encode(_nanoseconds, forKey: ._nanoseconds)
    }
}

/// Firestore Timestamp format with type field (no underscore variant)
/// Explicit nonisolated Codable conformance for Swift 6 concurrency
struct FirestoreTimestampTyped: Sendable {
    let type: String?
    let seconds: Int
    let nanoseconds: Int
}

extension FirestoreTimestampTyped: Codable {
    private enum CodingKeys: String, CodingKey {
        case type, seconds, nanoseconds
    }

    nonisolated init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        type = try container.decodeIfPresent(String.self, forKey: .type)
        seconds = try container.decode(Int.self, forKey: .seconds)
        nanoseconds = try container.decode(Int.self, forKey: .nanoseconds)
    }

    nonisolated func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(type, forKey: .type)
        try container.encode(seconds, forKey: .seconds)
        try container.encode(nanoseconds, forKey: .nanoseconds)
    }
}

// MARK: - Public API Client (Unauthenticated)

/// API client for public/unauthenticated endpoints
final class PublicAPIClient {
    static let shared = PublicAPIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601

        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
    }

    /// GET request without authentication
    func get<T: Decodable>(_ path: String, params: [String: String]? = nil) async throws -> T {
        let url: URL?
        if let params = params {
            url = APIConfig.apiV1WithParams(path, params: params)
        } else {
            url = APIConfig.apiV1(path)
        }

        guard let url = url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = HTTPMethod.get.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        guard httpResponse.statusCode == 200 else {
            let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.httpError(
                statusCode: httpResponse.statusCode,
                message: errorResponse?.message
            )
        }

        return try decoder.decode(T.self, from: data)
    }

    /// POST request without authentication
    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        guard let url = APIConfig.apiV1(path) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = HTTPMethod.post.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data)
            throw APIError.httpError(
                statusCode: httpResponse.statusCode,
                message: errorResponse?.message
            )
        }

        return try decoder.decode(T.self, from: data)
    }
}
