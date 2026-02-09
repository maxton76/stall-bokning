//
//  HorseActionButtons.swift
//  EquiDuty
//
//  Reusable action buttons for horse-related routine operations.
//  Extracted from RoutineFlowView to eliminate duplication.
//

import SwiftUI

// MARK: - Horse Action Button

/// Base button style for horse actions (done/skip)
struct HorseActionButton: View {
    let title: String
    let icon: String?
    let foregroundColor: Color
    let backgroundColor: Color
    let borderColor: Color
    let isExpanded: Bool
    let action: () -> Void

    init(
        title: String,
        icon: String? = nil,
        foregroundColor: Color,
        backgroundColor: Color,
        borderColor: Color,
        isExpanded: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.foregroundColor = foregroundColor
        self.backgroundColor = backgroundColor
        self.borderColor = borderColor
        self.isExpanded = isExpanded
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                if let icon {
                    Image(systemName: icon)
                        .font(.caption)
                }
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .foregroundStyle(foregroundColor)
            .frame(maxWidth: isExpanded ? .infinity : nil)
            .padding(.horizontal, isExpanded ? EquiDutyDesign.Spacing.standard : EquiDutyDesign.Spacing.standard)
            .padding(.vertical, isExpanded ? 10 : EquiDutyDesign.Spacing.sm)
            .background(backgroundColor)
            .continuousCorners(EquiDutyDesign.CornerRadius.small)
            .overlay(
                RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.small, style: .continuous)
                    .stroke(borderColor, lineWidth: 1)
            )
        }
        .buttonStyle(.scale)
    }
}

// MARK: - Horse Done Button

/// "Done" button for marking a horse as complete in a routine step
struct HorseDoneButton: View {
    let isExpanded: Bool
    let action: () -> Void

    var body: some View {
        HorseActionButton(
            title: String(localized: "routine.horse.done"),
            icon: nil,
            foregroundColor: .blue,
            backgroundColor: Color.blue.opacity(0.1),
            borderColor: Color.blue.opacity(0.3),
            isExpanded: isExpanded,
            action: action
        )
    }
}

// MARK: - Horse Skip Button

/// "Skip" button for skipping a horse in a routine step
struct HorseSkipButton: View {
    let isExpanded: Bool
    let action: () -> Void

    var body: some View {
        HorseActionButton(
            title: String(localized: "routine.horse.skip"),
            icon: nil,
            foregroundColor: .secondary,
            backgroundColor: Color(.systemBackground).opacity(0.01), // Near-transparent for ultraThinMaterial
            borderColor: Color.secondary.opacity(0.2),
            isExpanded: false, // Skip button never expands fully
            action: action
        )
        .background(.ultraThinMaterial)
        .continuousCorners(EquiDutyDesign.CornerRadius.small)
    }
}

// MARK: - Horse Action Buttons Row

/// Combined row of Done and Skip buttons with consistent styling
struct HorseActionButtonsRow: View {
    let isExpanded: Bool
    let onDone: () -> Void
    let onSkip: () -> Void

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.sm) {
            HorseDoneButton(isExpanded: isExpanded, action: onDone)
            HorseSkipButton(isExpanded: isExpanded, action: onSkip)
        }
    }
}

// MARK: - Previews

#Preview("Horse Action Buttons - Collapsed") {
    VStack(spacing: 20) {
        Text("Collapsed State")
            .font(.headline)

        HorseActionButtonsRow(
            isExpanded: false,
            onDone: { print("Done tapped") },
            onSkip: { print("Skip tapped") }
        )
    }
    .padding()
}

#Preview("Horse Action Buttons - Expanded") {
    VStack(spacing: 20) {
        Text("Expanded State")
            .font(.headline)

        HorseActionButtonsRow(
            isExpanded: true,
            onDone: { print("Done tapped") },
            onSkip: { print("Skip tapped") }
        )
    }
    .padding()
}

#Preview("Individual Buttons") {
    VStack(spacing: 16) {
        HorseDoneButton(isExpanded: false) { }
        HorseDoneButton(isExpanded: true) { }
        HorseSkipButton(isExpanded: false) { }
        HorseSkipButton(isExpanded: true) { }
    }
    .padding()
}
