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

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 120
        self.session = URLSession(configuration: config)
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
            fileSize: 0, // Size not tracked after compression
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
    private func uploadToSignedUrl(_ url: URL, data: Data) async throws {
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        request.setValue("\(data.count)", forHTTPHeaderField: "Content-Length")

        #if DEBUG
        print("📤 Uploading \(data.count) bytes to signed URL")
        #endif

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

        let (readUrl, _) = try await compressAndUpload(
            image: image,
            endpoint: APIEndpoints.routineStepUploadUrl(instanceId, stepId: stepId),
            body: body
        )

        return readUrl
    }

    /// Upload a batch of routine evidence photos concurrently.
    /// Returns successful URLs and the count of failures so callers can show user feedback.
    func uploadRoutineEvidenceBatch(
        images: [UIImage],
        horseId: String?,
        instanceId: String,
        stepId: String
    ) async -> (urls: [String], failedCount: Int) {
        var urls: [String] = []
        var failedCount = 0

        await withTaskGroup(of: Result<String, Error>.self) { group in
            for image in images {
                group.addTask {
                    do {
                        let url = try await self.uploadRoutineEvidencePhoto(
                            image: image,
                            horseId: horseId,
                            instanceId: instanceId,
                            stepId: stepId
                        )
                        return .success(url)
                    } catch {
                        return .failure(error)
                    }
                }
            }
            for await result in group {
                switch result {
                case .success(let url):
                    urls.append(url)
                case .failure(let error):
                    failedCount += 1
                    #if DEBUG
                    print("❌ Evidence photo upload failed: \(error.localizedDescription)")
                    #endif
                }
            }
        }

        return (urls, failedCount)
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
