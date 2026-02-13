//
//  NetworkMonitor.swift
//  EquiDuty
//
//  Network condition monitoring for upload optimization
//

import Foundation
import Network

/// Network connection quality levels
enum NetworkQuality {
    case excellent  // WiFi with good signal
    case good       // WiFi or strong cellular (4G/5G)
    case fair       // Weak cellular (3G/LTE with poor signal)
    case poor       // Very weak signal or intermittent
    case offline    // No connection

    var localizedDescription: String {
        switch self {
        case .excellent:
            return String(localized: "network.quality.excellent")
        case .good:
            return String(localized: "network.quality.good")
        case .fair:
            return String(localized: "network.quality.fair")
        case .poor:
            return String(localized: "network.quality.poor")
        case .offline:
            return String(localized: "network.quality.offline")
        }
    }

    var shouldWarnUser: Bool {
        self == .poor || self == .fair
    }
}

/// Network connection type
enum NetworkConnectionType {
    case wifi
    case cellular
    case wired
    case unknown
    case offline

    var localizedDescription: String {
        switch self {
        case .wifi:
            return String(localized: "network.type.wifi")
        case .cellular:
            return String(localized: "network.type.cellular")
        case .wired:
            return String(localized: "network.type.wired")
        case .unknown:
            return String(localized: "network.type.unknown")
        case .offline:
            return String(localized: "network.type.offline")
        }
    }
}

/// Network monitoring service
@MainActor
@Observable
final class NetworkMonitor {
    static let shared = NetworkMonitor()

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.equiduty.networkmonitor")

    // Published state
    private(set) var isConnected = false
    private(set) var connectionType: NetworkConnectionType = .unknown
    private(set) var quality: NetworkQuality = .good

    // Internal state
    private var currentPath: NWPath?

    private init() {
        startMonitoring()
    }

    deinit {
        monitor.cancel()
    }

    // MARK: - Monitoring

    func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                self?.updateNetworkState(path)
            }
        }
        monitor.start(queue: queue)

        #if DEBUG
        print("🌐 NetworkMonitor started")
        #endif
    }

    func stopMonitoring() {
        monitor.cancel()

        #if DEBUG
        print("🌐 NetworkMonitor stopped")
        #endif
    }

    private func updateNetworkState(_ path: NWPath) {
        currentPath = path
        isConnected = path.status == .satisfied

        // Determine connection type
        if !isConnected {
            connectionType = .offline
            quality = .offline
            return
        }

        if path.usesInterfaceType(.wifi) {
            connectionType = .wifi
            // WiFi is generally excellent unless we detect issues
            quality = path.isExpensive ? .good : .excellent
        } else if path.usesInterfaceType(.cellular) {
            connectionType = .cellular
            // Cellular quality varies - use heuristics
            quality = estimateCellularQuality(path)
        } else if path.usesInterfaceType(.wiredEthernet) {
            connectionType = .wired
            quality = .excellent
        } else {
            connectionType = .unknown
            quality = .good
        }

        #if DEBUG
        print("🌐 Network updated: \(connectionType.localizedDescription), quality: \(quality.localizedDescription)")
        #endif
    }

    /// Estimate cellular quality based on path properties
    private func estimateCellularQuality(_ path: NWPath) -> NetworkQuality {
        // Use path.isExpensive and path.isConstrained as quality indicators
        if path.isConstrained {
            // Low Data Mode or weak signal
            return .poor
        } else if path.isExpensive {
            // Cellular without Low Data Mode - likely good connection
            return .good
        } else {
            // Unusual - cellular but not expensive/constrained (maybe unlimited plan)
            return .good
        }
    }

    // MARK: - Public API

    /// Check if upload is recommended given current network conditions
    var isUploadRecommended: Bool {
        quality != .poor && quality != .offline
    }

    /// Get warning message if network quality is concerning
    var uploadWarning: String? {
        switch quality {
        case .poor:
            return String(localized: "network.warning.poor")
        case .fair:
            return String(localized: "network.warning.fair")
        case .offline:
            return String(localized: "network.warning.offline")
        default:
            return nil
        }
    }

    /// Suggested timeout multiplier based on network quality
    var timeoutMultiplier: Double {
        switch quality {
        case .excellent:
            return 1.0
        case .good:
            return 1.2
        case .fair:
            return 1.5
        case .poor:
            return 2.0
        case .offline:
            return 1.0  // Will fail anyway
        }
    }
}
