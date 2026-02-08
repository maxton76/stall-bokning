//
//  HorsePhotoPicker.swift
//  EquiDuty
//
//  Photo picker components for horse profile photos
//  Handles camera capture, photo library selection, and photo removal
//

import SwiftUI
import PhotosUI
import Kingfisher

// MARK: - Crop Item

/// Identifiable wrapper for UIImage, used with .fullScreenCover(item:)
/// to guarantee the image is non-nil when the crop view presents.
struct CropItem: Identifiable {
    let id = UUID()
    let image: UIImage
}

// MARK: - Camera Picker

/// UIImagePickerController wrapper for camera capture
struct CameraPickerView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    var onImageCaptured: ((UIImage) -> Void)?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        picker.allowsEditing = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {
        // No updates needed
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPickerView

        init(_ parent: CameraPickerView) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                if let callback = parent.onImageCaptured {
                    callback(image)
                } else {
                    parent.image = image
                }
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

// MARK: - Photo Source Sheet

/// Action sheet for selecting photo source (camera, library, or remove)
struct PhotoSourceSheet: View {
    let title: String
    let hasExistingPhoto: Bool
    @Binding var selectedImage: UIImage?
    let onRemove: () -> Void
    var requiresCrop: Bool = false

    @Environment(\.dismiss) private var dismiss

    @State private var showCamera = false
    @State private var photosPickerItem: PhotosPickerItem?
    @State private var showLoadError = false
    @State private var cropItem: CropItem?

    var body: some View {
        NavigationStack {
            List {
                // Camera option (only if available)
                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    Button {
                        showCamera = true
                    } label: {
                        Label(String(localized: "horse.photo.take_photo"), systemImage: "camera")
                    }
                }

                // Photo library option using PhotosPicker
                PhotosPicker(
                    selection: $photosPickerItem,
                    matching: .images
                ) {
                    Label(String(localized: "horse.photo.choose_from_library"), systemImage: "photo.on.rectangle")
                }
                .onChange(of: photosPickerItem) { _, newItem in
                    Task {
                        if let data = try? await newItem?.loadTransferable(type: Data.self),
                           let image = UIImage(data: data) {
                            if requiresCrop {
                                cropItem = CropItem(image: image)
                            } else {
                                selectedImage = image
                                dismiss()
                            }
                        } else if newItem != nil {
                            showLoadError = true
                        }
                    }
                }

                // Remove photo option (only if photo exists)
                if hasExistingPhoto {
                    Button(role: .destructive) {
                        onRemove()
                        dismiss()
                    } label: {
                        Label(String(localized: "horse.photo.remove_photo"), systemImage: "trash")
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraPickerView(
                    image: requiresCrop ? .constant(nil) : $selectedImage,
                    onImageCaptured: requiresCrop ? { capturedImage in
                        cropItem = CropItem(image: capturedImage)
                    } : nil
                )
                .ignoresSafeArea()
                .onDisappear {
                    if !requiresCrop && selectedImage != nil {
                        dismiss()
                    }
                }
            }
            .fullScreenCover(item: $cropItem) { item in
                ImageCropView(
                    sourceImage: item.image,
                    onConfirm: { croppedImage in
                        selectedImage = croppedImage
                        cropItem = nil
                        dismiss()
                    },
                    onCancel: {
                        cropItem = nil
                    }
                )
            }
            .alert(String(localized: "horse.photo.load_error_title"), isPresented: $showLoadError) {
                Button(String(localized: "common.ok"), role: .cancel) {}
            } message: {
                Text(String(localized: "horse.photo.load_error_message"))
            }
        }
    }
}

// MARK: - Photo Slot View

/// Reusable photo slot component with placeholder and remote image support
struct PhotoSlotView: View {
    let image: UIImage?          // Locally selected image (takes priority)
    let remoteURL: String?       // Existing photo URL from server
    let blurhash: String?        // Blurhash for placeholder
    let placeholder: String      // SF Symbol name for empty state
    let aspectRatio: CGFloat     // Width/height ratio (e.g., 16/9 for cover, 1 for avatar)
    let label: String            // Accessibility label

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background
                Color.gray.opacity(0.1)

                // Content
                if let image = image {
                    // Local image (newly selected) - keep unchanged for editing flow
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .clipped()
                } else if let urlString = remoteURL, let url = URL(string: urlString) {
                    // Remote image from server - use cached version
                    KFImage(url)
                        .placeholder {
                            if let blurhash = blurhash {
                                BlurhashView(blurhash: blurhash, size: CGSize(width: 32, height: 32))
                            } else {
                                ProgressView()
                            }
                        }
                        .onFailure { _ in
                            placeholderView
                        }
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .clipped()
                        .transition(.opacity)
                        // Kingfisher 8.x: .fade() removed, use .transition(.opacity) instead
                } else {
                    // Empty state placeholder
                    placeholderView
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            .cornerRadius(EquiDutyDesign.CornerRadius.medium)
            .overlay(
                RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium)
                    .stroke(Color.gray.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [5]))
            )
        }
        .aspectRatio(aspectRatio, contentMode: .fit)
        .accessibilityLabel(label)
    }

    private var placeholderView: some View {
        VStack(spacing: EquiDutyDesign.Spacing.sm) {
            Image(systemName: placeholder)
                .font(.system(size: 40))
                .foregroundColor(.gray.opacity(0.5))

            Text(String(localized: "horse.photo.tap_to_add"))
                .font(.caption)
                .foregroundColor(.gray.opacity(0.7))
        }
    }
}

// MARK: - Preview Support

#Preview("Photo Source Sheet - No Existing Photo") {
    PhotoSourceSheet(
        title: "Cover Photo",
        hasExistingPhoto: false,
        selectedImage: .constant(nil),
        onRemove: {}
    )
}

#Preview("Photo Source Sheet - With Existing Photo") {
    PhotoSourceSheet(
        title: "Avatar Photo",
        hasExistingPhoto: true,
        selectedImage: .constant(nil),
        onRemove: {}
    )
}

#Preview("Photo Slot - Empty") {
    PhotoSlotView(
        image: nil,
        remoteURL: nil,
        blurhash: nil,
        placeholder: "photo.fill",
        aspectRatio: 16/9,
        label: "Cover Photo"
    )
    .frame(height: 200)
    .padding()
}

#Preview("Photo Slot - With Image") {
    PhotoSlotView(
        image: UIImage(systemName: "photo"),
        remoteURL: nil,
        blurhash: nil,
        placeholder: "photo.fill",
        aspectRatio: 1,
        label: "Avatar Photo"
    )
    .frame(width: 120, height: 120)
    .padding()
}
