//
//  CachedImage.swift
//  EquiDuty
//
//  Reusable cached image views using Kingfisher
//

import SwiftUI
import Kingfisher

// MARK: - Generic Cached Image

/// Generic cached image view with Blurhash placeholder support
struct CachedImage<Placeholder: View, ErrorView: View>: View {
    let url: URL?
    let blurhash: String?
    let contentMode: SwiftUI.ContentMode
    let placeholder: () -> Placeholder
    let errorView: () -> ErrorView

    init(
        url: URL?,
        blurhash: String? = nil,
        contentMode: SwiftUI.ContentMode = .fill,
        @ViewBuilder placeholder: @escaping () -> Placeholder = { ProgressView() },
        @ViewBuilder errorView: @escaping () -> ErrorView = { Color.gray }
    ) {
        self.url = url
        self.blurhash = blurhash
        self.contentMode = contentMode
        self.placeholder = placeholder
        self.errorView = errorView
    }

    @State private var hasError = false
    
    var body: some View {
        if let url = url, !hasError {
            KFImage(url)
                .placeholder {
                    if let blurhash = blurhash {
                        BlurhashView(blurhash: blurhash, size: CGSize(width: 32, height: 32))
                    } else {
                        placeholder()
                    }
                }
                .onFailure { _ in
                    hasError = true
                }
                .resizable()
                .aspectRatio(contentMode: contentMode == .fill ? .fill : .fit)
                .transition(.opacity)
                // Kingfisher 8.x: .fade() removed, use .transition(.opacity) instead
        } else {
            errorView()
        }
    }
}

// MARK: - Horse-Specific Components

/// Horse avatar with caching, blurhash, and initials fallback
struct HorseCachedAvatar: View {
    let horse: Horse
    let size: CGFloat

    var body: some View {
        CachedImage(
            url: horse.bestAvatarThumbURL,
            blurhash: horse.avatarPhotoBlurhash,
            contentMode: .fill
        ) {
            // Placeholder: blurhash or progress spinner
            if let blurhash = horse.avatarPhotoBlurhash {
                BlurhashView(blurhash: blurhash, size: CGSize(width: 32, height: 32))
            } else {
                ProgressView()
            }
        } errorView: {
            // Fallback: initials with color
            HorseInitialsView(horse: horse)
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}

/// Horse cover photo with caching and blurhash placeholder
struct HorseCachedCover: View {
    let horse: Horse
    let height: CGFloat

    var body: some View {
        CachedImage(
            url: horse.bestCoverLargeURL,
            blurhash: horse.coverPhotoBlurhash,
            contentMode: .fill
        ) {
            // Placeholder: blurhash or progress
            if let blurhash = horse.coverPhotoBlurhash {
                BlurhashView(blurhash: blurhash, size: CGSize(width: 32, height: 32))
            } else {
                ProgressView()
            }
        } errorView: {
            // Fallback: gray rectangle
            Rectangle()
                .fill(.quaternary)
        }
        .frame(height: height)
        .clipped()
    }
}

/// Horse initials view (fallback when no photo available)
struct HorseInitialsView: View {
    let horse: Horse

    var body: some View {
        ZStack {
            Circle()
                .fill(colorForHorse.opacity(0.2))

            Text(horse.initials)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(colorForHorse)
        }
    }

    private var colorForHorse: Color {
        // Generate consistent color based on horse color
        switch horse.color {
        case .black: return .gray
        case .brown, .bayBrown, .darkBrown: return .brown
        case .chestnut: return .orange
        case .grey: return .gray
        case .palomino, .cream: return .yellow
        default: return .accentColor
        }
    }
}

// MARK: - Previews

#Preview("Cached Avatar") {
    VStack(spacing: 20) {
        HorseCachedAvatar(
            horse: Horse(
                id: "1",
                name: "Thunder",
                color: .black,
                ownerId: "owner1",
                status: .active,
                avatarPhotoThumbURL: "https://picsum.photos/200",
                avatarPhotoBlurhash: "LGF5]+Yk^6#M@-5c,1J5@[or[Q6.",
                createdAt: Date(),
                updatedAt: Date()
            ),
            size: 80
        )

        HorseCachedAvatar(
            horse: Horse(
                id: "2",
                name: "Storm Cloud",
                color: .grey,
                ownerId: "owner1",
                status: .active,
                createdAt: Date(),
                updatedAt: Date()
            ),
            size: 80
        )
    }
    .padding()
}

#Preview("Cached Cover") {
    HorseCachedCover(
        horse: Horse(
            id: "1",
            name: "Thunder",
            color: .black,
            ownerId: "owner1",
            status: .active,
            coverPhotoLargeURL: "https://picsum.photos/800/400",
            coverPhotoBlurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
            createdAt: Date(),
            updatedAt: Date()
        ),
        height: 220
    )
}
