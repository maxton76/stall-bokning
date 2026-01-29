//
//  CommonViews.swift
//  EquiDuty
//
//  Reusable UI components
//
//  NOTE: For new development, prefer using the Modern* components from
//  LiquidGlassDesignSystem.swift (ModernStatusBadge, ModernEmptyStateView,
//  ModernProgressView, ModernSectionHeader, GlassPillButton)
//
// ============================================================================
// STANDARD PATTERNS
// ============================================================================
//
// Loading/Error/Empty States:
//   Use Group { if isLoading... } pattern or AsyncContentView wrapper
//   Example:
//     Group {
//         if isLoading { ProgressView() }
//         else if let error = errorMessage { ErrorView(message: error) { retry() } }
//         else if items.isEmpty { ModernEmptyStateView(...) }
//         else { content }
//     }
//
// Form Sheets:
//   Always wrap Form in NavigationStack for toolbar support
//   Example:
//     .sheet(isPresented: $showForm) {
//         NavigationStack {
//             Form { ... }
//                 .toolbar {
//                     ToolbarItem(placement: .cancellationAction) { ... }
//                     ToolbarItem(placement: .confirmationAction) { ... }
//                 }
//         }
//     }
//
// Navigation:
//   Use NavigationLink(value: AppDestination.xxx) + withAppNavigationDestinations()
//   See NavigationRouter.swift for available destinations
//   Example:
//     NavigationLink(value: AppDestination.horseDetail(horseId: horse.id)) {
//         HorseRow(horse: horse)
//     }
//
// ============================================================================

import SwiftUI

// MARK: - Loading View

struct LoadingView: View {
    var message: String?

    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            Image(systemName: "circle.dotted")
                .font(.system(size: EquiDutyDesign.IconSize.large))
                .foregroundStyle(.secondary)
                .symbolEffect(.rotate, options: .repeating, value: isAnimating)

            if let message {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Error View

struct ErrorView: View {
    let message: String
    var retryAction: (() -> Void)?

    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: EquiDutyDesign.IconSize.emptyState))
                .foregroundStyle(.orange)
                .symbolEffect(.bounce, options: .nonRepeating, value: isAnimating)

            Text(String(localized: "error.title"))
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, EquiDutyDesign.Spacing.xl)

            if let retryAction {
                Button {
                    retryAction()
                } label: {
                    Label(String(localized: "error.retry"), systemImage: "arrow.clockwise")
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(EquiDutyDesign.Spacing.standard)
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Empty State View
// NOTE: For new development, use ModernEmptyStateView from LiquidGlassDesignSystem.swift

struct EmptyStateView: View {
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

// MARK: - Section Header
// NOTE: For new development, use ModernSectionHeader from LiquidGlassDesignSystem.swift

struct SectionHeader: View {
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

// MARK: - Card View

struct CardView<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .contentCard()
    }
}

// MARK: - Pill Button
// NOTE: For glass-style pill buttons, use GlassPillButton from LiquidGlassDesignSystem.swift

struct PillButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, EquiDutyDesign.Spacing.standard)
                .padding(.vertical, EquiDutyDesign.Spacing.sm)
                .background(isSelected ? Color.accentColor : Color.secondary.opacity(0.2))
                .clipShape(Capsule(style: .continuous))
        }
        .buttonStyle(.scale)
    }
}

// MARK: - Avatar View

struct AvatarView: View {
    let name: String
    let size: CGFloat
    var color: Color = .accentColor

    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.2))

            Text(initials)
                .font(.system(size: size * 0.4, weight: .semibold))
                .foregroundStyle(color)
        }
        .frame(width: size, height: size)
    }

    private var initials: String {
        let components = name.split(separator: " ")
        let firstInitial = components.first?.first.map(String.init) ?? ""
        let lastInitial = components.count > 1 ? components.last?.first.map(String.init) ?? "" : ""
        return "\(firstInitial)\(lastInitial)".uppercased()
    }
}

// MARK: - Async Button

struct AsyncButton<Label: View>: View {
    let action: () async -> Void
    @ViewBuilder let label: () -> Label

    @State private var isRunning = false

    var body: some View {
        Button {
            isRunning = true
            Task {
                await action()
                isRunning = false
            }
        } label: {
            if isRunning {
                ProgressView()
            } else {
                label()
            }
        }
        .disabled(isRunning)
    }
}

// MARK: - Confirmation Dialog

struct ConfirmationDialog: View {
    let title: String
    let message: String
    let confirmTitle: String
    let confirmRole: ButtonRole?
    let onConfirm: () -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.lg) {
            Text(title)
                .font(.headline)

            Text(message)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            HStack(spacing: EquiDutyDesign.Spacing.md) {
                Button(String(localized: "common.cancel")) {
                    onCancel()
                }
                .buttonStyle(.bordered)

                Button(confirmTitle, role: confirmRole) {
                    onConfirm()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(EquiDutyDesign.Spacing.standard)
    }
}

// MARK: - Labeled Text Field

/// A reusable labeled text field component for form inputs
/// Provides consistent styling with label above TextField
struct LabeledTextField: View {
    let label: String
    let placeholder: String
    @Binding var text: String

    var textContentType: UITextContentType?
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    var autocorrectionDisabled: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.primary)

            TextField(placeholder, text: $text)
                .textFieldStyle(.roundedBorder)
                .textContentType(textContentType)
                .keyboardType(keyboardType)
                .textInputAutocapitalization(autocapitalization)
                .autocorrectionDisabled(autocorrectionDisabled)
        }
    }
}

// MARK: - Labeled Secure Field

/// A reusable labeled secure field component for password inputs
/// Provides consistent styling with label above SecureField
struct LabeledSecureField: View {
    let label: String
    let placeholder: String
    @Binding var text: String

    var textContentType: UITextContentType?

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.primary)

            SecureField(placeholder, text: $text)
                .textFieldStyle(.roundedBorder)
                .textContentType(textContentType)
        }
    }
}

// MARK: - Labeled Text Editor

/// A reusable labeled text editor component for multi-line inputs
struct LabeledTextEditor: View {
    let label: String
    let placeholder: String
    @Binding var text: String

    var minHeight: CGFloat = 80

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.primary)

            ZStack(alignment: .topLeading) {
                TextEditor(text: $text)
                    .frame(minHeight: minHeight)
                    .scrollContentBackground(.hidden)
                    .padding(EquiDutyDesign.Spacing.sm)
                    .background(Color(.systemGray6))
                    .continuousCorners(EquiDutyDesign.CornerRadius.small)

                if text.isEmpty {
                    Text(placeholder)
                        .font(.body)
                        .foregroundStyle(.tertiary)
                        .padding(EquiDutyDesign.Spacing.sm + 4) // Match TextEditor padding
                        .allowsHitTesting(false)
                }
            }
        }
    }
}

// MARK: - Async Content View

/// Generic wrapper for async content with loading, error, and empty states
/// Provides consistent state handling across the app
///
/// Usage:
/// ```swift
/// AsyncContentView(
///     isLoading: viewModel.isLoading,
///     errorMessage: viewModel.errorMessage,
///     isEmpty: viewModel.items.isEmpty,
///     onRetry: { viewModel.loadData() },
///     emptyIcon: "tray",
///     emptyTitle: "No Items",
///     emptyMessage: "There are no items to display."
/// ) {
///     ForEach(viewModel.items) { item in
///         ItemRow(item: item)
///     }
/// }
/// ```
struct AsyncContentView<Content: View>: View {
    let isLoading: Bool
    let errorMessage: String?
    let isEmpty: Bool
    let onRetry: () -> Void
    let emptyIcon: String
    let emptyTitle: String
    let emptyMessage: String
    let emptyAction: (() -> Void)?
    let emptyActionTitle: String?
    @ViewBuilder let content: () -> Content

    init(
        isLoading: Bool,
        errorMessage: String?,
        isEmpty: Bool,
        onRetry: @escaping () -> Void,
        emptyIcon: String = "tray",
        emptyTitle: String = "No Items",
        emptyMessage: String = "There are no items to display.",
        emptyAction: (() -> Void)? = nil,
        emptyActionTitle: String? = nil,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.isLoading = isLoading
        self.errorMessage = errorMessage
        self.isEmpty = isEmpty
        self.onRetry = onRetry
        self.emptyIcon = emptyIcon
        self.emptyTitle = emptyTitle
        self.emptyMessage = emptyMessage
        self.emptyAction = emptyAction
        self.emptyActionTitle = emptyActionTitle
        self.content = content
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                ErrorView(message: error, retryAction: onRetry)
            } else if isEmpty {
                ModernEmptyStateView(
                    icon: emptyIcon,
                    title: emptyTitle,
                    message: emptyMessage,
                    actionTitle: emptyActionTitle,
                    action: emptyAction
                )
            } else {
                content()
            }
        }
    }
}

// MARK: - Status Badge
// NOTE: For new development, use ModernStatusBadge from LiquidGlassDesignSystem.swift

struct StatusBadge: View {
    let status: String
    let color: Color
    var icon: String? = nil
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

// MARK: - Previews

#Preview("Loading") {
    LoadingView(message: "Loading data...")
}

#Preview("Error") {
    ErrorView(message: "Something went wrong. Please try again.") {
        print("Retry tapped")
    }
}

#Preview("Empty State") {
    EmptyStateView(
        icon: "tray",
        title: "No Items",
        message: "There are no items to display.",
        actionTitle: "Add Item"
    ) {
        print("Add tapped")
    }
}

#Preview("Avatar") {
    HStack(spacing: 20) {
        AvatarView(name: "John Doe", size: 40)
        AvatarView(name: "Jane", size: 50, color: .green)
        AvatarView(name: "A B C", size: 60, color: .purple)
    }
}

#Preview("Labeled Fields") {
    VStack(spacing: 20) {
        LabeledTextField(
            label: "Email",
            placeholder: "Enter your email",
            text: .constant(""),
            textContentType: .emailAddress,
            keyboardType: .emailAddress,
            autocapitalization: .never,
            autocorrectionDisabled: true
        )

        LabeledTextField(
            label: "Name",
            placeholder: "Enter your name",
            text: .constant("John")
        )

        LabeledSecureField(
            label: "Password",
            placeholder: "Enter password",
            text: .constant(""),
            textContentType: .password
        )

        LabeledTextEditor(
            label: "Notes",
            placeholder: "Add any additional notes...",
            text: .constant("")
        )
    }
    .padding()
}

#Preview("Async Content - Loading") {
    AsyncContentView(
        isLoading: true,
        errorMessage: nil,
        isEmpty: false,
        onRetry: {},
        emptyIcon: "tray",
        emptyTitle: "No Items",
        emptyMessage: "No items found."
    ) {
        Text("Content")
    }
}

#Preview("Async Content - Error") {
    AsyncContentView(
        isLoading: false,
        errorMessage: "Network error occurred",
        isEmpty: false,
        onRetry: { print("Retry tapped") },
        emptyIcon: "tray",
        emptyTitle: "No Items",
        emptyMessage: "No items found."
    ) {
        Text("Content")
    }
}

#Preview("Async Content - Empty") {
    AsyncContentView(
        isLoading: false,
        errorMessage: nil,
        isEmpty: true,
        onRetry: {},
        emptyIcon: "tray",
        emptyTitle: "No Items",
        emptyMessage: "There are no items to display.",
        emptyAction: { print("Add tapped") },
        emptyActionTitle: "Add Item"
    ) {
        Text("Content")
    }
}

#Preview("Async Content - Content") {
    AsyncContentView(
        isLoading: false,
        errorMessage: nil,
        isEmpty: false,
        onRetry: {},
        emptyIcon: "tray",
        emptyTitle: "No Items",
        emptyMessage: "No items found."
    ) {
        VStack {
            Text("Item 1")
            Text("Item 2")
            Text("Item 3")
        }
    }
}
