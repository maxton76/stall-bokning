//
//  KeychainManager.swift
//  EquiDuty
//
//  Secure token storage using iOS Keychain
//

import Foundation
import Security

/// Keychain access wrapper for secure token storage
final class KeychainManager {
    static let shared = KeychainManager()

    private let service = "com.equiduty.app"

    private enum Keys {
        static let firebaseToken = "firebase_id_token"
        static let refreshToken = "firebase_refresh_token"
        static let userId = "firebase_user_id"
        static let selectedOrganizationId = "selected_organization_id"
        static let selectedStableId = "selected_stable_id"
    }

    private init() {}

    // MARK: - Token Management

    /// Save Firebase ID token
    func saveToken(_ token: String) throws {
        try save(token, forKey: Keys.firebaseToken)
    }

    /// Get Firebase ID token
    func getToken() -> String? {
        return get(forKey: Keys.firebaseToken)
    }

    /// Save refresh token
    func saveRefreshToken(_ token: String) throws {
        try save(token, forKey: Keys.refreshToken)
    }

    /// Get refresh token
    func getRefreshToken() -> String? {
        return get(forKey: Keys.refreshToken)
    }

    /// Save user ID
    func saveUserId(_ userId: String) throws {
        try save(userId, forKey: Keys.userId)
    }

    /// Get user ID
    func getUserId() -> String? {
        return get(forKey: Keys.userId)
    }

    // MARK: - Selected Context

    /// Save selected organization ID
    func saveSelectedOrganizationId(_ id: String) throws {
        try save(id, forKey: Keys.selectedOrganizationId)
    }

    /// Get selected organization ID
    func getSelectedOrganizationId() -> String? {
        return get(forKey: Keys.selectedOrganizationId)
    }

    /// Save selected stable ID
    func saveSelectedStableId(_ id: String) throws {
        try save(id, forKey: Keys.selectedStableId)
    }

    /// Get selected stable ID
    func getSelectedStableId() -> String? {
        return get(forKey: Keys.selectedStableId)
    }

    /// Clear all stored credentials
    func clearAll() {
        delete(forKey: Keys.firebaseToken)
        delete(forKey: Keys.refreshToken)
        delete(forKey: Keys.userId)
        delete(forKey: Keys.selectedOrganizationId)
        delete(forKey: Keys.selectedStableId)
    }

    // MARK: - Private Methods

    private func save(_ value: String, forKey key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingError
        }

        // Delete existing item first
        delete(forKey: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    private func get(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    @discardableResult
    private func delete(forKey key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}

/// Keychain errors
enum KeychainError: Error, LocalizedError {
    case encodingError
    case saveFailed(OSStatus)
    case readFailed(OSStatus)
    case deleteFailed(OSStatus)

    var errorDescription: String? {
        switch self {
        case .encodingError:
            return "Failed to encode value for keychain"
        case .saveFailed(let status):
            return "Failed to save to keychain: \(status)"
        case .readFailed(let status):
            return "Failed to read from keychain: \(status)"
        case .deleteFailed(let status):
            return "Failed to delete from keychain: \(status)"
        }
    }
}
