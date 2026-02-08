//
//  ImageCropView.swift
//  EquiDuty
//
//  Square image crop view with pan and pinch-to-zoom gestures.
//  Used for avatar photo selection to let users frame the desired area.
//

import SwiftUI

struct ImageCropView: View {
    let sourceImage: UIImage
    let onConfirm: (UIImage) -> Void
    let onCancel: () -> Void

    @State private var normalizedImage: UIImage?
    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero

    private let minScale: CGFloat = 1.0
    private let maxScale: CGFloat = 4.0
    private let maxOutputSize: CGFloat = 1200

    private var displayImage: UIImage {
        normalizedImage ?? sourceImage
    }

    var body: some View {
        ZStack {
            // Black background renders immediately, independent of GeometryReader
            Color.black.ignoresSafeArea()

            GeometryReader { geometry in
                let displayWidth = geometry.size.width
                let displayHeight = displayWidth * imageAspectRatio
                let adaptiveDiameter = min(displayWidth, displayHeight) * 0.85
                let cropDiameter = max(adaptiveDiameter, geometry.size.width * 0.4)

                ZStack {
                    // Source image with gestures
                    Image(uiImage: displayImage)
                        .resizable()
                        .scaledToFill()
                        .frame(
                            width: geometry.size.width,
                            height: geometry.size.width * imageAspectRatio
                        )
                        .scaleEffect(scale)
                        .offset(offset)
                        .simultaneousGesture(dragGesture(cropDiameter: cropDiameter, geometry: geometry))
                        .simultaneousGesture(magnificationGesture)
                        .onTapGesture(count: 2) {
                            withAnimation(.spring(duration: 0.3)) {
                                scale = 1.0
                                lastScale = 1.0
                                offset = .zero
                                lastOffset = .zero
                            }
                        }

                    // Dimming mask with circular cutout
                    cropMask(diameter: cropDiameter, in: geometry)
                        .allowsHitTesting(false)

                    // Circle border
                    Circle()
                        .strokeBorder(Color.white.opacity(0.8), lineWidth: 1.5)
                        .frame(width: cropDiameter, height: cropDiameter)
                        .allowsHitTesting(false)

                    // Controls overlay
                    VStack {
                        // Instructions
                        Text(String(localized: "horse.photo.crop_instructions"))
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.8))
                            .padding(.top, EquiDutyDesign.Spacing.xl + geometry.safeAreaInsets.top)

                        Spacer()

                        // Buttons
                        HStack(spacing: EquiDutyDesign.Spacing.xl) {
                            Button {
                                onCancel()
                            } label: {
                                Text(String(localized: "common.cancel"))
                                    .font(.body.weight(.medium))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, EquiDutyDesign.Spacing.md)
                                    .background(.ultraThinMaterial, in: Capsule())
                            }

                            Button {
                                let cropped = cropImage(
                                    cropDiameter: cropDiameter,
                                    viewSize: geometry.size
                                )
                                onConfirm(cropped)
                            } label: {
                                Text(String(localized: "horse.photo.crop_confirm"))
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, EquiDutyDesign.Spacing.md)
                                    .background(.blue, in: Capsule())
                            }
                        }
                        .padding(.horizontal, EquiDutyDesign.Spacing.xl)
                        .padding(.bottom, EquiDutyDesign.Spacing.xl + geometry.safeAreaInsets.bottom)
                    }
                }
            }
        }
        .ignoresSafeArea()
        .onAppear {
            normalizedImage = Self.normalizeOrientation(sourceImage)
        }
    }

    // MARK: - Image Orientation

    private static func normalizeOrientation(_ image: UIImage) -> UIImage {
        guard image.imageOrientation != .up else { return image }
        let renderer = UIGraphicsImageRenderer(size: image.size)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }
    }

    // MARK: - Computed Properties

    private var imageAspectRatio: CGFloat {
        displayImage.size.height / displayImage.size.width
    }

    // MARK: - Gestures

    private func dragGesture(cropDiameter: CGFloat, geometry: GeometryProxy) -> some Gesture {
        DragGesture()
            .onChanged { value in
                offset = CGSize(
                    width: lastOffset.width + value.translation.width,
                    height: lastOffset.height + value.translation.height
                )
            }
            .onEnded { _ in
                lastOffset = offset
                withAnimation(.spring(duration: 0.3)) {
                    clampOffset(cropDiameter: cropDiameter, viewSize: geometry.size)
                }
            }
    }

    private var magnificationGesture: some Gesture {
        MagnificationGesture()
            .onChanged { value in
                let newScale = lastScale * value
                scale = min(max(newScale, minScale), maxScale)
            }
            .onEnded { _ in
                lastScale = scale
            }
    }

    // MARK: - Offset Clamping

    private func clampOffset(cropDiameter: CGFloat, viewSize: CGSize) {
        let imageDisplayWidth = viewSize.width * scale
        let imageDisplayHeight = viewSize.width * imageAspectRatio * scale

        // How far the image can move before the crop circle edge goes past the image edge
        let maxOffsetX = max(0, (imageDisplayWidth - cropDiameter) / 2)
        let maxOffsetY = max(0, (imageDisplayHeight - cropDiameter) / 2)

        offset.width = min(max(offset.width, -maxOffsetX), maxOffsetX)
        offset.height = min(max(offset.height, -maxOffsetY), maxOffsetY)
        lastOffset = offset
    }

    // MARK: - Crop Mask

    private func cropMask(diameter: CGFloat, in geometry: GeometryProxy) -> some View {
        Canvas { context, size in
            // Fill entire view with semi-transparent black
            context.fill(
                Path(CGRect(origin: .zero, size: size)),
                with: .color(.black.opacity(0.6))
            )

            // Cut out the circle
            let circleRect = CGRect(
                x: (size.width - diameter) / 2,
                y: (size.height - diameter) / 2,
                width: diameter,
                height: diameter
            )
            context.blendMode = .destinationOut
            context.fill(Path(ellipseIn: circleRect), with: .color(.white))
        }
        .compositingGroup()
    }

    // MARK: - Image Cropping

    private func cropImage(cropDiameter: CGFloat, viewSize: CGSize) -> UIImage {
        let image = displayImage
        let imageSize = image.size

        // The image is displayed at scaledToFill within viewSize.width
        let displayWidth = viewSize.width
        let displayHeight = displayWidth * imageAspectRatio

        // Scale from display coordinates to image pixel coordinates
        let pixelScale = imageSize.width / displayWidth

        // The image's Y origin in view space (centered vertically)
        let imageOriginY = (viewSize.height - displayHeight) / 2

        // The crop circle center in display coordinates is the view center,
        // adjusted by the current pan offset and zoom.
        // Subtract imageOriginY BEFORE dividing by scale to correctly
        // convert from view space to image display space.
        let cropCenterInImageX = (viewSize.width / 2 - offset.width) / scale
        let cropCenterInImageY = (viewSize.height / 2 - offset.height - imageOriginY) / scale

        let cropSizeInDisplay = cropDiameter / scale
        let cropSizeInPixels = cropSizeInDisplay * pixelScale

        let originX = (cropCenterInImageX - cropSizeInDisplay / 2) * pixelScale
        let originY = cropCenterInImageY * pixelScale - cropSizeInPixels / 2

        // Clamp to image bounds
        let clampedX = max(0, min(originX, imageSize.width - cropSizeInPixels))
        let clampedY = max(0, min(originY, imageSize.height - cropSizeInPixels))
        let clampedSize = min(cropSizeInPixels, min(imageSize.width, imageSize.height))

        let cropRect = CGRect(
            x: clampedX,
            y: clampedY,
            width: clampedSize,
            height: clampedSize
        )

        // Crop the normalized image
        guard let cgImage = image.cgImage?.cropping(to: cropRect) else {
            return image
        }

        // Cap output size to avoid excessive memory usage for large photos
        let outputSize = min(clampedSize, maxOutputSize)
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: outputSize, height: outputSize))

        // Render as square — downstream PhotoSlotView applies .clipShape(Circle())
        return renderer.image { _ in
            let rect = CGRect(x: 0, y: 0, width: outputSize, height: outputSize)
            UIImage(cgImage: cgImage).draw(in: rect)
        }
    }
}

#Preview {
    ImageCropView(
        sourceImage: UIImage(systemName: "photo.fill")!,
        onConfirm: { _ in },
        onCancel: {}
    )
}
