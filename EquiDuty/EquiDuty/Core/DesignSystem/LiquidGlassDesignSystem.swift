//
//  LiquidGlassDesignSystem.swift
//  EquiDuty
//
//  iOS 26 Liquid Glass Design System foundation
//  Glass effects for navigation layer, materials for content layer
//

import SwiftUI

// MARK: - Design Tokens

/// EquiDuty Design System tokens for iOS 26 Liquid Glass
enum EquiDutyDesign {

    // MARK: Corner Radii
    enum CornerRadius {
        /// Small radius for badges and small elements (8pt)
        static let small: CGFloat = 8
        /// Medium radius for buttons and pills (12pt)
        static let medium: CGFloat = 12
        /// Standard radius for cards and containers (20pt)
        static let card: CGFloat = 20
        /// Large radius for navigation elements (24pt)
        static let navigation: CGFloat = 24
        /// Extra large for sheets and modals (32pt)
        static let sheet: CGFloat = 32
    }

    // MARK: Spacing
    enum Spacing {
        /// Extra small spacing (4pt)
        static let xs: CGFloat = 4
        /// Small spacing (8pt)
        static let sm: CGFloat = 8
        /// Medium spacing (12pt)
        static let md: CGFloat = 12
        /// Standard spacing (16pt)
        static let standard: CGFloat = 16
        /// Large spacing (20pt)
        static let lg: CGFloat = 20
        /// Extra large spacing (24pt)
        static let xl: CGFloat = 24
        /// Section spacing (32pt)
        static let section: CGFloat = 32
    }

    // MARK: Shadow Styles
    enum Shadow {
        /// Subtle shadow for elevated elements
        static let subtle = ShadowStyle(
            color: .black.opacity(0.06),
            radius: 4,
            y: 1
        )
        /// Standard shadow for cards
        static let standard = ShadowStyle(
            color: .black.opacity(0.08),
            radius: 8,
            y: 2
        )
        /// Elevated shadow for floating elements
        static let elevated = ShadowStyle(
            color: .black.opacity(0.12),
            radius: 16,
            y: 4
        )
    }

    // MARK: Icon Sizes
    enum IconSize {
        /// Small icon for inline use (16pt)
        static let small: CGFloat = 16
        /// Standard icon size (20pt)
        static let standard: CGFloat = 20
        /// Medium icon for cards (24pt)
        static let medium: CGFloat = 24
        /// Large icon for emphasis (32pt)
        static let large: CGFloat = 32
        /// Empty state icon (56pt)
        static let emptyState: CGFloat = 56
    }

    // MARK: Animation Durations
    enum Animation {
        /// Quick micro-interactions (0.15s)
        static let quick: Double = 0.15
        /// Standard transitions (0.25s)
        static let standard: Double = 0.25
        /// Smooth morphing animations (0.35s)
        static let smooth: Double = 0.35
    }
}

// MARK: - Shadow Style Helper

struct ShadowStyle {
    let color: Color
    let radius: CGFloat
    let y: CGFloat
}

// MARK: - Card Elevation Levels

enum CardElevation {
    case flat
    case subtle
    case standard
    case elevated

    var shadow: ShadowStyle {
        switch self {
        case .flat:
            return ShadowStyle(color: .clear, radius: 0, y: 0)
        case .subtle:
            return EquiDutyDesign.Shadow.subtle
        case .standard:
            return EquiDutyDesign.Shadow.standard
        case .elevated:
            return EquiDutyDesign.Shadow.elevated
        }
    }
}

// MARK: - View Modifiers

/// Content card modifier using material background (for content layer)
struct ContentCardModifier: ViewModifier {
    let elevation: CardElevation
    let cornerRadius: CGFloat
    let padding: CGFloat

    init(
        elevation: CardElevation = .standard,
        cornerRadius: CGFloat = EquiDutyDesign.CornerRadius.card,
        padding: CGFloat = EquiDutyDesign.Spacing.standard
    ) {
        self.elevation = elevation
        self.cornerRadius = cornerRadius
        self.padding = padding
    }

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .shadow(
                color: elevation.shadow.color,
                radius: elevation.shadow.radius,
                y: elevation.shadow.y
            )
    }
}

/// Glass navigation modifier for navigation layer elements
struct GlassNavigationModifier: ViewModifier {
    let cornerRadius: CGFloat

    init(cornerRadius: CGFloat = EquiDutyDesign.CornerRadius.navigation) {
        self.cornerRadius = cornerRadius
    }

    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .glassEffect(.regular.interactive())
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        } else {
            // Fallback for iOS 18-25
            content
                .background(.thinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        }
    }
}

/// Continuous corners helper modifier
struct ContinuousCornersModifier: ViewModifier {
    let radius: CGFloat

    func body(content: Content) -> some View {
        content
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
    }
}

// MARK: - View Extensions

extension View {
    /// Apply content card styling with material background and shadow
    /// Use for content-layer elements (cards, list items, etc.)
    func contentCard(
        elevation: CardElevation = .standard,
        cornerRadius: CGFloat = EquiDutyDesign.CornerRadius.card,
        padding: CGFloat = EquiDutyDesign.Spacing.standard
    ) -> some View {
        modifier(ContentCardModifier(
            elevation: elevation,
            cornerRadius: cornerRadius,
            padding: padding
        ))
    }

    /// Apply glass navigation styling
    /// Use ONLY for navigation-layer elements (headers, toolbars, floating controls)
    func glassNavigation(cornerRadius: CGFloat = EquiDutyDesign.CornerRadius.navigation) -> some View {
        modifier(GlassNavigationModifier(cornerRadius: cornerRadius))
    }

    /// Apply iOS 26 continuous corner style
    func continuousCorners(_ radius: CGFloat) -> some View {
        modifier(ContinuousCornersModifier(radius: radius))
    }
}

// MARK: - Scale Button Style

/// Button style with press feedback (0.97 scale)
struct ScaleButtonStyle: ButtonStyle {
    let pressedScale: CGFloat

    init(pressedScale: CGFloat = 0.97) {
        self.pressedScale = pressedScale
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? pressedScale : 1.0)
            .animation(.easeInOut(duration: EquiDutyDesign.Animation.quick), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == ScaleButtonStyle {
    /// Scale button style with press feedback
    static var scale: ScaleButtonStyle { ScaleButtonStyle() }

    /// Scale button style with custom scale amount
    static func scale(_ amount: CGFloat) -> ScaleButtonStyle {
        ScaleButtonStyle(pressedScale: amount)
    }
}

// MARK: - Modern Status Badge

/// Modern status badge with optional icon and SF Symbol animations
struct ModernStatusBadge: View {
    let status: String
    let color: Color
    var icon: String?
    var isAnimating: Bool = false

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.xs) {
            if let icon {
                Image(systemName: icon)
                    .font(.caption2)
                    .symbolEffect(.pulse, options: .repeating, isActive: isAnimating)
            }

            Text(status)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .foregroundStyle(color)
        .padding(.horizontal, EquiDutyDesign.Spacing.sm)
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
        .background(color.opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Modern Progress View

/// Animated capsule progress bar for iOS 26
struct ModernProgressView: View {
    let value: Double
    let total: Double
    var tint: Color = .accentColor
    var height: CGFloat = 6
    var showLabel: Bool = false
    var labelFormat: String = "%.0f%%"

    private var progress: Double {
        min(max(value / total, 0), 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Track
                    Capsule()
                        .fill(.quaternary)

                    // Fill
                    Capsule()
                        .fill(tint)
                        .frame(width: geometry.size.width * progress)
                        .animation(.smooth(duration: EquiDutyDesign.Animation.smooth), value: progress)
                }
            }
            .frame(height: height)

            if showLabel {
                Text(String(format: labelFormat, progress * 100))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .contentTransition(.numericText())
            }
        }
    }
}

// MARK: - Modern Empty State View

/// Empty state with bouncing icon animation
struct ModernEmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            Image(systemName: icon)
                .font(.system(size: EquiDutyDesign.IconSize.emptyState))
                .foregroundStyle(.secondary)
                .symbolEffect(.bounce, options: .nonRepeating, value: isAnimating)

            Text(title)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, EquiDutyDesign.Spacing.xl)

            if let actionTitle, let action {
                Button(actionTitle) {
                    action()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, EquiDutyDesign.Spacing.section + EquiDutyDesign.Spacing.sm)
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Glass Pill Button

/// Pill-style button with glass effect for navigation layer
struct GlassPillButton: View {
    let title: String
    let isSelected: Bool
    var icon: String?
    var count: Int?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                if let icon {
                    Image(systemName: icon)
                        .font(.subheadline)
                }

                Text(title)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)

                if let count {
                    Text("(\(count))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .contentTransition(.numericText())
                }
            }
            .foregroundStyle(isSelected ? .primary : .secondary)
            .padding(.horizontal, EquiDutyDesign.Spacing.standard)
            .padding(.vertical, EquiDutyDesign.Spacing.sm)
        }
        .buttonStyle(.scale)
        .background {
            if #available(iOS 26.0, *) {
                if isSelected {
                    Capsule()
                        .fill(.clear)
                        .glassEffect(.regular.tint(.accentColor).interactive())
                } else {
                    Capsule()
                        .fill(.clear)
                        .glassEffect(.regular.interactive())
                }
            } else {
                Capsule()
                    .fill(isSelected ? Color.accentColor.opacity(0.2) : Color.secondary.opacity(0.1))
            }
        }
    }
}

// MARK: - Glass Effect Container (iOS 26+)

/// Container for grouping related glass elements with shared namespace
struct GlassEffectContainer<Content: View>: View {
    let spacing: CGFloat
    @ViewBuilder let content: Content

    init(
        spacing: CGFloat = EquiDutyDesign.Spacing.sm,
        @ViewBuilder content: () -> Content
    ) {
        self.spacing = spacing
        self.content = content()
    }

    var body: some View {
        HStack(spacing: spacing) {
            content
        }
        .padding(EquiDutyDesign.Spacing.xs)
        .background {
            if #available(iOS 26.0, *) {
                RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.navigation, style: .continuous)
                    .fill(.clear)
                    .glassEffect(.regular)
            } else {
                RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.navigation, style: .continuous)
                    .fill(.ultraThinMaterial)
            }
        }
    }
}

// MARK: - Modern Section Header

/// Section header with uppercase styling and letter spacing
struct ModernSectionHeader: View {
    let title: String
    var action: (() -> Void)?
    var actionTitle: String?

    var body: some View {
        HStack {
            Text(title.uppercased())
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .tracking(0.5)

            Spacer()

            if let action, let actionTitle {
                Button(actionTitle) {
                    action()
                }
                .font(.subheadline)
            }
        }
    }
}

// MARK: - Previews

#Preview("Content Cards") {
    ScrollView {
        VStack(spacing: 16) {
            Text("Flat Elevation")
                .contentCard(elevation: .flat)

            Text("Subtle Elevation")
                .contentCard(elevation: .subtle)

            Text("Standard Elevation")
                .contentCard(elevation: .standard)

            Text("Elevated")
                .contentCard(elevation: .elevated)
        }
        .padding()
    }
}

#Preview("Status Badges") {
    VStack(spacing: 16) {
        ModernStatusBadge(status: "Scheduled", color: .blue, icon: "clock.fill")
        ModernStatusBadge(status: "In Progress", color: .orange, icon: "play.fill", isAnimating: true)
        ModernStatusBadge(status: "Completed", color: .green, icon: "checkmark")
    }
    .padding()
}

#Preview("Progress Views") {
    VStack(spacing: 24) {
        ModernProgressView(value: 30, total: 100)
        ModernProgressView(value: 60, total: 100, tint: .orange, showLabel: true)
        ModernProgressView(value: 100, total: 100, tint: .green, height: 8)
    }
    .padding()
}

#Preview("Empty State") {
    ModernEmptyStateView(
        icon: "calendar.badge.checkmark",
        title: "No Activities",
        message: "There are no scheduled activities for today.",
        actionTitle: "Add Activity"
    ) {
        print("Add tapped")
    }
}

#Preview("Glass Pills") {
    HStack(spacing: 8) {
        GlassPillButton(title: "All", isSelected: true, count: 8) {}
        GlassPillButton(title: "Activities", isSelected: false, count: 5) {}
        GlassPillButton(title: "Routines", isSelected: false, count: 3) {}
    }
    .padding()
    .background(Color(.systemBackground))
}

#Preview("Section Header") {
    VStack(alignment: .leading, spacing: 16) {
        ModernSectionHeader(title: "Today's Routines")
        ModernSectionHeader(title: "Activities", action: {}, actionTitle: "See All")
    }
    .padding()
}
