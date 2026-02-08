//
//  ImageCacheService.swift
//  EquiDuty
//
//  Centralized image caching service using Kingfisher
//  Manages memory and disk cache with automatic cleanup
//

import Foundation
import UIKit
import Kingfisher

/// Protocol defining image cache management operations
protocol ImageCacheServiceProtocol {
    /// Clear all cached images (memory + disk)
    func clearCache()

    /// Clear memory cache only (preserves disk cache)
    func clearMemoryCache()

    /// Get current cache statistics
    func cacheStatistics() -> (memorySize: Int, diskSize: UInt)

    /// Prefetch images for given URLs
    func prefetchImages(urls: [URL])

    /// Cancel ongoing prefetch operations
    func cancelPrefetching()
}

/// Service managing image loading, caching, and optimization
class ImageCacheService: ImageCacheServiceProtocol {
    static let shared = ImageCacheService()

    private var prefetcher: ImagePrefetcher?

    private init() {
        configureCache()
        setupMemoryWarningObserver()
    }

    // MARK: - Cache Configuration

    /// Configure Kingfisher cache policies
    /// Note: Kingfisher 8.x simplified cache configuration - memory cache uses default limits
    private func configureCache() {
        let cache = ImageCache.default

        // Disk cache: 200MB limit, 30 day expiration
        // Kingfisher 8.x: Disk storage config still works as before
        cache.diskStorage.config.sizeLimit = 200 * 1024 * 1024
        cache.diskStorage.config.expiration = .days(30)

        // Memory cache: Uses Kingfisher 8.x defaults (auto-managed based on system memory)
        // The new memory storage backend handles limits automatically

        #if DEBUG
        print("📦 ImageCache configured: Disk 200MB (30 day expiration), Memory auto-managed")
        #endif
    }

    // MARK: - Memory Management

    /// Setup observer for memory warnings to clear cache
    private func setupMemoryWarningObserver() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            #if DEBUG
            print("⚠️ Memory warning received - clearing memory cache")
            #endif
            self?.clearMemoryCache()
        }
    }

    // MARK: - Cache Management

    /// Clear all cached images (memory + disk)
    func clearCache() {
        ImageCache.default.clearCache()

        #if DEBUG
        print("🗑️ All image cache cleared (memory + disk)")
        #endif
    }

    /// Clear memory cache only (preserves disk cache for faster reload)
    func clearMemoryCache() {
        ImageCache.default.clearMemoryCache()

        #if DEBUG
        print("🗑️ Memory cache cleared (disk cache preserved)")
        #endif
    }

    /// Get current cache size statistics
    /// - Returns: Tuple of (memory item count, disk size in bytes)
    /// - Note: Kingfisher 8.x doesn't expose memory count or async disk size, returns 0 for both
    func cacheStatistics() -> (memorySize: Int, diskSize: UInt) {
        // Kingfisher 8.x: Both memory and disk stats not easily accessible
        // Memory storage count: Backend<Image> wrapper doesn't expose totalCount
        // Disk storage: totalSize API changed and is now async-only
        let memorySize = 0
        let diskSize: UInt = 0

        #if DEBUG
        print("📊 Cache stats: Memory and disk size not available in sync API (Kingfisher 8.x limitation)")
        #endif

        return (memorySize, diskSize)
    }

    // MARK: - Prefetching

    /// Prefetch images for given URLs to populate cache
    /// - Parameter urls: Array of image URLs to prefetch
    /// - Note: Kingfisher 8.x simplified prefetcher - no completion handler access
    func prefetchImages(urls: [URL]) {
        guard !urls.isEmpty else { return }

        // Cancel any existing prefetch operation
        prefetcher?.stop()

        // Kingfisher 8.x: Simple prefetcher without completion tracking
        // The completionHandler property is now private
        prefetcher = ImagePrefetcher(urls: urls)
        prefetcher?.start()

        #if DEBUG
        print("🔄 Prefetching \(urls.count) images...")
        #endif
    }

    /// Cancel ongoing prefetch operations
    func cancelPrefetching() {
        prefetcher?.stop()
        prefetcher = nil

        #if DEBUG
        print("⏹️ Prefetch cancelled")
        #endif
    }

    // MARK: - Cleanup

    deinit {
        NotificationCenter.default.removeObserver(self)
        prefetcher?.stop()
    }
}
