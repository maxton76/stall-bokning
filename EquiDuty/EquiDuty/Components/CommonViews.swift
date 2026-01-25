//
//  CommonViews.swift
//  EquiDuty
//
//  Reusable UI components
//

import SwiftUI

// MARK: - Loading View

struct LoadingView: View {
    var message: String?

    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)

            if let message {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Error View

struct ErrorView: View {
    let message: String
    var retryAction: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundStyle(.orange)

            Text(String(localized: "error.title"))
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

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
        .padding()
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 50))
                .foregroundStyle(.secondary)

            Text(title)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            if let actionTitle, let action {
                Button(actionTitle) {
                    action()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

// MARK: - Section Header

struct SectionHeader: View {
    let title: String
    var action: (() -> Void)?
    var actionTitle: String?

    var body: some View {
        HStack {
            Text(title)
                .font(.headline)

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
            .padding()
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Pill Button

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
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.accentColor : Color.secondary.opacity(0.2))
                .clipShape(Capsule())
        }
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
        VStack(spacing: 20) {
            Text(title)
                .font(.headline)

            Text(message)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            HStack(spacing: 12) {
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
        .padding()
    }
}

// MARK: - Status Badge

struct StatusBadge: View {
    let status: String
    let color: Color

    var body: some View {
        Text(status)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
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
