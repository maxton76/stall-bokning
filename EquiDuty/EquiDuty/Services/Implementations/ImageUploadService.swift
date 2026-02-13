//
//  ImageUploadService.swift
//  EquiDuty
//
//  Service for uploading and managing horse profile photos
//  Handles image compression, signed URL upload, and metadata creation
//

import Foundation
import UIKit

/// Photo upload purpose
enum PhotoPurpose: String, Codable {
    case cover
    case avatar
}

/// Background upload queue item
struct QueuedUpload: Codable {
    let id: UUID
    let imageData: Data
    let endpoint: String
    let bodyJSON: Data
    let createdAt: Date
    let retryCount: Int
    let maxRetries: Int

    init(id: UUID = UUID(), imageData: Data, endpoint: String, bodyJSON: Data, retryCount: Int = 0, maxRetries: Int = 3) {
        self.id = id
        self.imageData = imageData
        self.endpoint = endpoint
        self.bodyJSON = bodyJSON
        self.createdAt = Date()
        self.retryCount = retryCount
        self.maxRetries = maxRetries
    }
}

/// Image upload service errors
enum ImageUploadError: Error, LocalizedError {
    case compressionFailed
    case invalidImage
    case imageTooLarge
    case uploadFailed(Error)
    case metadataCreationFailed(Error)
    case horseUpdateFailed(Error)
    case noUploadUrl
    case noReadUrl
    case noStoragePath

    var errorDescription: String? {
        switch self {
        case .compressionFailed:
            return String(localized: "error.image.compression_failed Failed to compress image")
        case .invalidImage:
            return String(localized: "error.image.invalid Invalid image data")
        case .imageTooLarge:
            return String(localized: "error.image.too_large Image exceeds maximum size of 5MB")
        case .uploadFailed(let error):
            return String(localized: "error.image.upload_failed \(error.localizedDescription)")
        case .metadataCreationFailed(let error):
            return String(localized: "error.image.metadata_failed \(error.localizedDescription)")
        case .horseUpdateFailed(let error):
            return String(localized: "error.image.horse_update_failed \(error.localizedDescription)")
        case .noUploadUrl:
            return String(localized: "error.image.no_upload_url Missing upload URL from server")
        case .noReadUrl:
            return String(localized: "error.image.no_read_url Missing read URL from server")
        case .noStoragePath:
            return String(localized: "error.image.no_storage_path Missing storage path from server")
        }
    }
}

/// Image upload service implementation
@MainActor
@Observable
final class ImageUploadService {
    static let shared = ImageUploadService()

    private let apiClient = APIClient.shared
    private let session: URLSession

    // Background upload queue
    private var uploadQueue: [QueuedUpload] = []
    private let queueKey = "com.equiduty.upload.queue"
    private var isProcessingQueue = false

    private init() {
        // Phase 1: Increased timeouts for poor network conditions
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 90   // Up from 60s
        config.timeoutIntervalForResource = 180  // Up from 120s
        self.session = URLSession(configuration: config)

        // Load persisted queue
        loadQueue()

        // Start network monitoring
        NetworkMonitor.shared.startMonitoring()

        // Process queue when network improves
        Task { @MainActor in
            await processQueueOnNetworkImprovement()
        }
    }

    // MARK: - Image Compression

    /// Compress image to target dimensions while preserving aspect ratio
    /// - Parameters:
    ///   - image: Source UIImage
    ///   - maxDimension: Maximum width or height in pixels
    ///   - quality: JPEG compression quality (0.0 - 1.0)
    /// - Returns: Compressed JPEG data or nil if compression fails
    func compressImage(_ image: UIImage, maxDimension: CGFloat, quality: CGFloat) -> Data? {
        #if DEBUG
        print("📸 Compressing image: original size \(image.size), maxDimension: \(maxDimension), quality: \(quality)")
        #endif

        // Calculate new size preserving aspect ratio
        let size = image.size
        var newSize: CGSize

        if size.width > size.height {
            // Landscape or square
            let ratio = maxDimension / size.width
            newSize = CGSize(width: maxDimension, height: size.height * ratio)
        } else {
            // Portrait
            let ratio = maxDimension / size.height
            newSize = CGSize(width: size.width * ratio, height: maxDimension)
        }

        // Only resize if image is larger than target
        if size.width <= maxDimension && size.height <= maxDimension {
            newSize = size
            #if DEBUG
            print("📸 Image already smaller than maxDimension, skipping resize")
            #endif
        }

        // Create resized image
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        defer { UIGraphicsEndImageContext() }

        image.draw(in: CGRect(origin: .zero, size: newSize))

        guard let resizedImage = UIGraphicsGetImageFromCurrentImageContext() else {
            #if DEBUG
            print("❌ Failed to create resized image")
            #endif
            return nil
        }

        // Compress to JPEG
        guard let jpegData = resizedImage.jpegData(compressionQuality: quality) else {
            #if DEBUG
            print("❌ Failed to convert to JPEG")
            #endif
            return nil
        }

        #if DEBUG
        let sizeKB = Double(jpegData.count) / 1024.0
        print("✅ Compressed image: \(newSize.width)x\(newSize.height), \(String(format: "%.1f", sizeKB)) KB")
        #endif

        return jpegData
    }

    // MARK: - Photo Upload

    /// Compress an image and upload it to GCS via a signed URL.
    /// Shared workflow used by both horse photo and routine evidence uploads.
    private func compressAndUpload<Body: Encodable>(
        image: UIImage,
        maxDimension: CGFloat = 1200,
        quality: CGFloat = 0.75,
        endpoint: String,
        body: Body
    ) async throws -> (readUrl: String, storagePath: String) {
        // Step 1: Compress
        guard let compressedData = compressImage(image, maxDimension: maxDimension, quality: quality) else {
            throw ImageUploadError.compressionFailed
        }

        let maxSize = 5 * 1024 * 1024
        guard compressedData.count <= maxSize else {
            #if DEBUG
            print("❌ Compressed image too large: \(compressedData.count) bytes (max: \(maxSize))")
            #endif
            throw ImageUploadError.imageTooLarge
        }

        // Step 2: Get signed upload URL from API
        let uploadResponse: UploadUrlResponse
        do {
            uploadResponse = try await apiClient.post(endpoint, body: body)
        } catch {
            #if DEBUG
            print("❌ Failed to get upload URL: \(error)")
            #endif
            throw ImageUploadError.uploadFailed(error)
        }

        guard let uploadUrlString = uploadResponse.uploadUrl,
              let uploadUrl = URL(string: uploadUrlString) else {
            throw ImageUploadError.noUploadUrl
        }

        guard let readUrl = uploadResponse.readUrl else {
            throw ImageUploadError.noReadUrl
        }

        guard let storagePath = uploadResponse.storagePath else {
            throw ImageUploadError.noStoragePath
        }

        // Step 3: Upload to signed URL
        do {
            try await uploadToSignedUrl(uploadUrl, data: compressedData)
            #if DEBUG
            print("✅ Successfully uploaded to GCS: \(storagePath)")
            #endif
        } catch {
            #if DEBUG
            print("❌ Failed to upload to GCS: \(error)")
            #endif
            throw ImageUploadError.uploadFailed(error)
        }

        return (readUrl, storagePath)
    }

    /// Upload horse photo with full workflow
    func uploadHorsePhoto(horseId: String, image: UIImage, purpose: PhotoPurpose) async throws -> String {
        #if DEBUG
        print("📤 Starting upload for horse \(horseId), purpose: \(purpose.rawValue)")
        #endif

        let maxDimension: CGFloat = purpose == .cover ? 1200 : 600
        let fileName = "\(purpose.rawValue)_\(UUID().uuidString).jpg"
        let uploadUrlRequest = GetUploadUrlRequest(
            horseId: horseId,
            fileName: fileName,
            mimeType: "image/jpeg",
            type: "photo",
            purpose: purpose.rawValue
        )

        // Compress image first to get actual file size
        guard let compressedData = compressImage(image, maxDimension: maxDimension, quality: 0.75) else {
            throw ImageUploadError.compressionFailed
        }

        let (readUrl, storagePath) = try await compressAndUpload(
            image: image,
            maxDimension: maxDimension,
            endpoint: APIEndpoints.horseMediaUploadUrl,
            body: uploadUrlRequest
        )

        // Step 4: Create media metadata record
        let mediaRequest = CreateMediaRecordRequest(
            horseId: horseId,
            type: "photo",
            category: "conformation",
            title: "\(purpose.rawValue.capitalized) Photo",
            fileUrl: readUrl,
            storagePath: storagePath,
            fileName: fileName,
            fileSize: compressedData.count, // Use actual compressed size (API rejects 0)
            mimeType: "image/jpeg"
        )

        do {
            let _: EmptyResponse = try await apiClient.post(
                APIEndpoints.horseMedia,
                body: mediaRequest
            )
            #if DEBUG
            print("✅ Created media metadata record")
            #endif
        } catch {
            #if DEBUG
            print("❌ Failed to create media record: \(error)")
            #endif
            throw ImageUploadError.metadataCreationFailed(error)
        }

        // Step 5: Update horse with photo path
        let horseUpdate: UpdateHorsePhotoRequest
        if purpose == .cover {
            horseUpdate = UpdateHorsePhotoRequest(coverPhotoPath: storagePath)
        } else {
            horseUpdate = UpdateHorsePhotoRequest(avatarPhotoPath: storagePath)
        }

        do {
            let _: EmptyResponse = try await apiClient.patch(
                APIEndpoints.horse(horseId),
                body: horseUpdate
            )
            #if DEBUG
            print("✅ Updated horse with \(purpose.rawValue) photo path")
            #endif
        } catch {
            #if DEBUG
            print("❌ Failed to update horse: \(error)")
            #endif
            throw ImageUploadError.horseUpdateFailed(error)
        }

        return storagePath
    }

    /// Upload data to signed URL using raw URLSession
    /// Phase 2: Added retry logic with exponential backoff
    private func uploadToSignedUrl(_ url: URL, data: Data, retryCount: Int = 0) async throws {
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        request.setValue("\(data.count)", forHTTPHeaderField: "Content-Length")

        // Phase 2: Adjust timeout based on network quality
        let networkMultiplier = NetworkMonitor.shared.timeoutMultiplier
        request.timeoutInterval = 90 * networkMultiplier

        #if DEBUG
        print("📤 Uploading \(data.count) bytes to signed URL (attempt \(retryCount + 1)/4, timeout: \(Int(request.timeoutInterval))s)")
        #endif

        do {
            let (_, response) = try await session.upload(for: request, from: data)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw ImageUploadError.uploadFailed(NSError(domain: "ImageUpload", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response"]))
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                #if DEBUG
                print("❌ GCS upload failed with status: \(httpResponse.statusCode)")
                #endif
                throw ImageUploadError.uploadFailed(NSError(domain: "ImageUpload", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode)"]))
            }

            #if DEBUG
            print("✅ GCS upload successful (status: \(httpResponse.statusCode))")
            #endif
        } catch let error as URLError where error.code == .timedOut && retryCount < 3 {
            // Phase 2: Retry on timeout with exponential backoff
            let delay = pow(2.0, Double(retryCount))  // 1s, 2s, 4s
            #if DEBUG
            print("⏱️ Upload timed out, retrying in \(Int(delay))s...")
            #endif

            try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            try await uploadToSignedUrl(url, data: data, retryCount: retryCount + 1)
        } catch let error as NSError where (error.code == NSURLErrorNetworkConnectionLost ||
                                              error.code == NSURLErrorNotConnectedToInternet) && retryCount < 3 {
            // Phase 2: Retry on network errors with exponential backoff
            let delay = pow(2.0, Double(retryCount))
            #if DEBUG
            print("🌐 Network error (\(error.localizedDescription)), retrying in \(Int(delay))s...")
            #endif

            try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            try await uploadToSignedUrl(url, data: data, retryCount: retryCount + 1)
        } catch {
            #if DEBUG
            print("❌ Upload failed permanently: \(error)")
            #endif
            throw ImageUploadError.uploadFailed(error)
        }
    }

    // MARK: - Photo Removal

    /// Remove horse photo by setting path to nil
    /// - Parameters:
    ///   - horseId: Horse identifier
    ///   - purpose: Photo purpose (cover or avatar)
    /// - Throws: ImageUploadError if update fails
    func removeHorsePhoto(horseId: String, purpose: PhotoPurpose) async throws {
        #if DEBUG
        print("🗑️ Removing \(purpose.rawValue) photo for horse \(horseId)")
        #endif

        let horseUpdate: UpdateHorsePhotoRequest
        if purpose == .cover {
            horseUpdate = UpdateHorsePhotoRequest(setCoverPhotoPathNull: true)
        } else {
            horseUpdate = UpdateHorsePhotoRequest(setAvatarPhotoPathNull: true)
        }

        do {
            let _: EmptyResponse = try await apiClient.patch(
                APIEndpoints.horse(horseId),
                body: horseUpdate
            )
            #if DEBUG
            print("✅ Removed \(purpose.rawValue) photo")
            #endif
        } catch {
            #if DEBUG
            print("❌ Failed to remove photo: \(error)")
            #endif
            throw ImageUploadError.horseUpdateFailed(error)
        }
    }

    // MARK: - Routine Evidence Upload

    /// Upload a single routine evidence photo
    /// Phase 1: Evidence-specific compression (800px @ 0.65 quality)
    func uploadRoutineEvidencePhoto(
        image: UIImage,
        horseId: String?,
        instanceId: String,
        stepId: String
    ) async throws -> String {
        #if DEBUG
        print("📤 Starting routine evidence upload for instance \(instanceId), step \(stepId)")
        #endif

        let fileName = "evidence_\(UUID().uuidString).jpg"
        let body = RoutineEvidenceUploadRequest(
            horseId: horseId,
            instanceId: instanceId,
            stepId: stepId,
            fileName: fileName,
            mimeType: "image/jpeg"
        )

        // Phase 1: Evidence-specific compression settings
        // - 800px maxDimension (down from 1200px)
        // - 0.65 quality (down from 0.75)
        // - Target: <200KB for typical evidence photos
        let (readUrl, _) = try await compressAndUpload(
            image: image,
            maxDimension: 800,    // Evidence-specific
            quality: 0.65,         // Evidence-specific
            endpoint: APIEndpoints.routineStepUploadUrl(instanceId, stepId: stepId),
            body: body
        )

        return readUrl
    }

    /// Upload a batch of routine evidence photos concurrently.
    /// Returns successful URLs and the count of failures so callers can show user feedback.
    /// Phase 3: Failed uploads are queued for background retry
    func uploadRoutineEvidenceBatch(
        images: [UIImage],
        horseId: String?,
        instanceId: String,
        stepId: String
    ) async -> (urls: [String], failedCount: Int) {
        var urls: [String] = []
        var failedCount = 0
        var failedUploads: [(Int, UIImage, Error)] = []

        await withTaskGroup(of: (Int, Result<String, Error>).self) { group in
            for (index, image) in images.enumerated() {
                group.addTask {
                    do {
                        let url = try await self.uploadRoutineEvidencePhoto(
                            image: image,
                            horseId: horseId,
                            instanceId: instanceId,
                            stepId: stepId
                        )
                        return (index, .success(url))
                    } catch {
                        return (index, .failure(error))
                    }
                }
            }
            for await (index, result) in group {
                switch result {
                case .success(let url):
                    urls.append(url)
                case .failure(let error):
                    failedCount += 1
                    failedUploads.append((index, images[index], error))
                    #if DEBUG
                    print("❌ Evidence photo upload failed: \(error.localizedDescription)")
                    #endif
                }
            }
        }

        // Phase 3: Queue failed uploads for background retry
        for (_, image, error) in failedUploads {
            await queueFailedUpload(
                image: image,
                horseId: horseId,
                instanceId: instanceId,
                stepId: stepId,
                error: error
            )
        }

        return (urls, failedCount)
    }

    // MARK: - Background Upload Queue (Phase 3)

    /// Queue a failed upload for background retry
    private func queueFailedUpload(
        image: UIImage,
        horseId: String?,
        instanceId: String,
        stepId: String,
        error: Error
    ) async {
        #if DEBUG
        print("📋 Queueing failed upload for background retry: \(error.localizedDescription)")
        #endif

        // Compress image for storage
        guard let imageData = compressImage(image, maxDimension: 800, quality: 0.65) else {
            #if DEBUG
            print("❌ Failed to compress image for queue")
            #endif
            return
        }

        // Create request body
        let fileName = "evidence_\(UUID().uuidString).jpg"
        let body = RoutineEvidenceUploadRequest(
            horseId: horseId,
            instanceId: instanceId,
            stepId: stepId,
            fileName: fileName,
            mimeType: "image/jpeg"
        )

        guard let bodyJSON = try? JSONEncoder().encode(body) else {
            #if DEBUG
            print("❌ Failed to encode request body for queue")
            #endif
            return
        }

        let queuedUpload = QueuedUpload(
            imageData: imageData,
            endpoint: APIEndpoints.routineStepUploadUrl(instanceId, stepId: stepId),
            bodyJSON: bodyJSON
        )

        uploadQueue.append(queuedUpload)
        saveQueue()

        #if DEBUG
        print("✅ Queued upload (queue size: \(uploadQueue.count))")
        #endif
    }

    /// Save upload queue to UserDefaults
    private func saveQueue() {
        guard let data = try? JSONEncoder().encode(uploadQueue) else {
            return
        }
        UserDefaults.standard.set(data, forKey: queueKey)
    }

    /// Load upload queue from UserDefaults
    private func loadQueue() {
        guard let data = UserDefaults.standard.data(forKey: queueKey),
              let queue = try? JSONDecoder().decode([QueuedUpload].self, from: data) else {
            return
        }
        uploadQueue = queue

        #if DEBUG
        print("📋 Loaded \(uploadQueue.count) queued uploads")
        #endif
    }

    /// Process queued uploads when network conditions improve
    private func processQueueOnNetworkImprovement() async {
        // Monitor network quality and process queue when conditions are good
        while true {
            try? await Task.sleep(nanoseconds: 30_000_000_000)  // Check every 30s

            if NetworkMonitor.shared.isUploadRecommended && !uploadQueue.isEmpty && !isProcessingQueue {
                await processQueue()
            }
        }
    }

    /// Process all queued uploads
    private func processQueue() async {
        guard !uploadQueue.isEmpty, !isProcessingQueue else { return }

        isProcessingQueue = true
        defer { isProcessingQueue = false }

        #if DEBUG
        print("🔄 Processing \(uploadQueue.count) queued uploads")
        #endif

        var successfulUploads: [UUID] = []
        var failedUploads: [(QueuedUpload, Error)] = []

        for upload in uploadQueue {
            do {
                // Recreate UIImage from data
                guard let image = UIImage(data: upload.imageData) else {
                    throw ImageUploadError.invalidImage
                }

                // Decode request body
                guard let body = try? JSONDecoder().decode(RoutineEvidenceUploadRequest.self, from: upload.bodyJSON) else {
                    throw ImageUploadError.compressionFailed
                }

                // Attempt upload
                let (_, _) = try await compressAndUpload(
                    image: image,
                    maxDimension: 800,
                    quality: 0.65,
                    endpoint: upload.endpoint,
                    body: body
                )

                successfulUploads.append(upload.id)

                #if DEBUG
                print("✅ Background upload succeeded: \(upload.id)")
                #endif
            } catch {
                #if DEBUG
                print("❌ Background upload failed: \(error.localizedDescription)")
                #endif

                if upload.retryCount < upload.maxRetries {
                    // Re-queue with incremented retry count
                    let updatedUpload = upload
                    failedUploads.append((updatedUpload, error))
                } else {
                    #if DEBUG
                    print("⚠️ Upload exhausted retries, removing from queue")
                    #endif
                    successfulUploads.append(upload.id)  // Remove from queue
                }
            }

            // Small delay between uploads to avoid overwhelming the server
            try? await Task.sleep(nanoseconds: 1_000_000_000)  // 1s
        }

        // Remove successful uploads from queue
        uploadQueue.removeAll { successfulUploads.contains($0.id) }

        // Re-add failed uploads with incremented retry count
        for (upload, _) in failedUploads {
            let updatedUpload = upload
            uploadQueue.append(QueuedUpload(
                id: updatedUpload.id,
                imageData: updatedUpload.imageData,
                endpoint: updatedUpload.endpoint,
                bodyJSON: updatedUpload.bodyJSON,
                retryCount: updatedUpload.retryCount + 1,
                maxRetries: updatedUpload.maxRetries
            ))
        }

        saveQueue()

        #if DEBUG
        print("✅ Queue processing complete. Remaining: \(uploadQueue.count)")
        #endif
    }

    /// Public method to manually retry queued uploads
    func retryQueuedUploads() async {
        await processQueue()
    }

    /// Get count of queued uploads
    var queuedUploadCount: Int {
        uploadQueue.count
    }
}

// MARK: - Request/Response Types

private struct GetUploadUrlRequest: Codable {
    let horseId: String
    let fileName: String
    let mimeType: String
    let type: String
    let purpose: String
}

private struct UploadUrlResponse: Codable {
    let uploadUrl: String?
    let readUrl: String?
    let storagePath: String?
}

private struct RoutineEvidenceUploadRequest: Codable {
    let horseId: String?
    let instanceId: String
    let stepId: String
    let fileName: String
    let mimeType: String
}

/// Note on orphaned GCS files (accepted trade-off):
/// The upload flow is: GCS upload → metadata creation → horse PATCH.
/// If metadata creation or horse PATCH fails, the uploaded file becomes orphaned in GCS.
/// This is acceptable because: (1) storage is cheap, (2) GCS lifecycle policies can clean up,
/// (3) the alternative (upload last) creates a worse failure mode where metadata/horse point
/// to a non-existent file, resulting in broken UI.
private struct CreateMediaRecordRequest: Codable {
    let horseId: String
    let type: String
    let category: String
    let title: String
    let fileUrl: String
    let storagePath: String
    let fileName: String
    let fileSize: Int
    let mimeType: String
}

/// Photo update request that can explicitly encode null values.
/// Swift's default JSONEncoder skips nil optionals, but we need to send
/// `"coverPhotoPath": null` to clear a photo path in the API.
private struct UpdateHorsePhotoRequest: Encodable {
    var coverPhotoPath: String?
    var avatarPhotoPath: String?
    var setCoverPhotoPathNull: Bool = false
    var setAvatarPhotoPathNull: Bool = false

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let path = coverPhotoPath {
            try container.encode(path, forKey: .coverPhotoPath)
        } else if setCoverPhotoPathNull {
            try container.encodeNil(forKey: .coverPhotoPath)
        }
        if let path = avatarPhotoPath {
            try container.encode(path, forKey: .avatarPhotoPath)
        } else if setAvatarPhotoPathNull {
            try container.encodeNil(forKey: .avatarPhotoPath)
        }
    }

    enum CodingKeys: String, CodingKey {
        case coverPhotoPath, avatarPhotoPath
    }
}
