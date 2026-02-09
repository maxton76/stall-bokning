//
//  PhotoEvidenceView.swift
//  EquiDuty
//
//  Photo evidence capture component for routine steps
//

import SwiftUI

struct PhotoEvidenceView: View {
    let instanceId: String
    let stepId: String
    let horseId: String?
    let maxPhotos: Int = 3

    @Binding var pendingPhotos: [UIImage]
    @Binding var uploadedPhotoUrls: [String]
    @Binding var isUploading: Bool

    @State private var showPhotoSourceSheet = false
    @State private var showCamera = false
    @State private var showPhotoLibrary = false
    @State private var uploadError: String?

    private var totalPhotos: Int {
        pendingPhotos.count + uploadedPhotoUrls.count
    }

    private var canAddMore: Bool {
        totalPhotos < maxPhotos
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            // Header
            HStack {
                Label {
                    Text(String(localized: "routine.photo.title"))
                        .font(.caption)
                        .fontWeight(.semibold)
                } icon: {
                    Image(systemName: "camera.fill")
                        .font(.caption)
                }
                .foregroundStyle(.blue)

                Spacer()

                Text(String(localized: "routine.photo.count \(totalPhotos) \(maxPhotos)"))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Photo strip
            if !pendingPhotos.isEmpty || !uploadedPhotoUrls.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: EquiDutyDesign.Spacing.sm) {
                        // Uploaded photos
                        ForEach(Array(uploadedPhotoUrls.enumerated()), id: \.offset) { index, url in
                            uploadedPhotoThumbnail(url: url, index: index)
                        }

                        // Pending photos
                        ForEach(Array(pendingPhotos.enumerated()), id: \.offset) { index, image in
                            pendingPhotoThumbnail(image: image, index: index)
                        }

                        // Add button
                        if canAddMore {
                            addPhotoButton
                        }
                    }
                }
            } else {
                // Empty state - just the add button
                addPhotoButton
            }

            // Upload error
            if let uploadError {
                Text(uploadError)
                    .font(.caption2)
                    .foregroundStyle(.red)
            }

            // Uploading indicator
            if isUploading {
                HStack(spacing: EquiDutyDesign.Spacing.xs) {
                    ProgressView()
                        .controlSize(.small)
                    Text(String(localized: "routine.photo.uploading"))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .confirmationDialog(
            String(localized: "routine.photo.add"),
            isPresented: $showPhotoSourceSheet,
            titleVisibility: .visible
        ) {
            Button(String(localized: "routine.photo.take")) {
                showCamera = true
            }
            Button(String(localized: "routine.photo.choose")) {
                showPhotoLibrary = true
            }
            Button(String(localized: "common.cancel"), role: .cancel) {}
        }
        .sheet(isPresented: $showCamera) {
            ImagePickerView(sourceType: .camera) { image in
                if let image {
                    addPhoto(image)
                }
            }
        }
        .sheet(isPresented: $showPhotoLibrary) {
            ImagePickerView(sourceType: .photoLibrary) { image in
                if let image {
                    addPhoto(image)
                }
            }
        }
    }

    // MARK: - Thumbnails

    private func uploadedPhotoThumbnail(url: String, index: Int) -> some View {
        ZStack(alignment: .topTrailing) {
            AsyncImage(url: URL(string: url)) { image in
                image
                    .resizable()
                    .scaledToFill()
            } placeholder: {
                Rectangle()
                    .fill(.quaternary)
                    .overlay { ProgressView() }
            }
            .frame(width: 72, height: 72)
            .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))

            if !isUploading {
                removeButton {
                    uploadedPhotoUrls.remove(at: index)
                }
            }
        }
    }

    private func pendingPhotoThumbnail(image: UIImage, index: Int) -> some View {
        ZStack(alignment: .topTrailing) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous))
                .overlay {
                    if isUploading {
                        RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous)
                            .fill(.black.opacity(0.4))
                            .overlay { ProgressView().tint(.white) }
                    }
                }

            if !isUploading {
                removeButton {
                    pendingPhotos.remove(at: index)
                }
            }
        }
    }

    private func removeButton(action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 18))
                .symbolRenderingMode(.palette)
                .foregroundStyle(.white, .red)
        }
        .offset(x: 4, y: -4)
        .accessibilityLabel(String(localized: "routine.photo.remove"))
    }

    private var addPhotoButton: some View {
        Button {
            showPhotoSourceSheet = true
        } label: {
            RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous)
                .stroke(.secondary.opacity(0.4), style: StrokeStyle(lineWidth: 1.5, dash: [5]))
                .frame(width: 72, height: 72)
                .overlay {
                    VStack(spacing: 2) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                        Text(String(localized: "routine.photo.add"))
                            .font(.system(size: 9))
                    }
                    .foregroundStyle(.secondary)
                }
        }
        .disabled(!canAddMore)
    }

    // MARK: - Actions

    private func addPhoto(_ image: UIImage) {
        guard canAddMore else { return }
        pendingPhotos.append(image)
        uploadError = nil
    }

    /// Upload all pending photos and return URLs
    func uploadPendingPhotos() async -> [String] {
        guard !pendingPhotos.isEmpty else { return uploadedPhotoUrls }

        isUploading = true
        uploadError = nil

        var newUrls: [String] = []

        await withTaskGroup(of: (Int, String?).self) { group in
            for (index, image) in pendingPhotos.enumerated() {
                group.addTask {
                    do {
                        let url = try await ImageUploadService.shared.uploadRoutineEvidencePhoto(
                            image: image,
                            horseId: horseId,
                            instanceId: instanceId,
                            stepId: stepId
                        )
                        return (index, url)
                    } catch {
                        #if DEBUG
                        print("❌ Failed to upload photo \(index): \(error)")
                        #endif
                        return (index, nil)
                    }
                }
            }

            for await (_, url) in group {
                if let url {
                    newUrls.append(url)
                }
            }
        }

        await MainActor.run {
            if newUrls.count < pendingPhotos.count {
                uploadError = String(localized: "routine.photo.upload_failed")
            }
            uploadedPhotoUrls.append(contentsOf: newUrls)
            pendingPhotos.removeAll()
            isUploading = false
        }

        return uploadedPhotoUrls
    }
}

// MARK: - Image Picker

struct ImagePickerView: UIViewControllerRepresentable {
    let sourceType: UIImagePickerController.SourceType
    let onImagePicked: (UIImage?) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.delegate = context.coordinator
        picker.allowsEditing = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onImagePicked: onImagePicked)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onImagePicked: (UIImage?) -> Void

        init(onImagePicked: @escaping (UIImage?) -> Void) {
            self.onImagePicked = onImagePicked
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            let image = info[.originalImage] as? UIImage
            onImagePicked(image)
            picker.dismiss(animated: true)
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onImagePicked(nil)
            picker.dismiss(animated: true)
        }
    }
}
