//
//  TodayRoutineList.swift
//  EquiDuty
//
//  Grouped routine list for TodayView with Active/Scheduled/Completed sections
//  Updated for iOS 26 Liquid Glass design patterns
//

import SwiftUI

/// Routine list with grouped sections
struct TodayRoutineList: View {
    let routineGroups: RoutineGroups
    let showEmptyState: Bool

    init(routineGroups: RoutineGroups, showEmptyState: Bool = true) {
        self.routineGroups = routineGroups
        self.showEmptyState = showEmptyState
    }

    var body: some View {
        if routineGroups.isEmpty && showEmptyState {
            ModernEmptyStateView(
                icon: "checklist",
                title: String(localized: "today.routines.empty.title"),
                message: String(localized: "today.routines.empty.message")
            )
        } else {
            VStack(spacing: EquiDutyDesign.Spacing.standard) {
                // Active (In Progress) routines - always show first
                if !routineGroups.active.isEmpty {
                    RoutineSectionView(
                        title: String(localized: "today.routines.active"),
                        routines: routineGroups.active,
                        icon: "play.circle.fill",
                        color: .orange
                    )
                }

                // Scheduled routines
                if !routineGroups.scheduled.isEmpty {
                    RoutineSectionView(
                        title: String(localized: "today.routines.scheduled"),
                        routines: routineGroups.scheduled,
                        icon: "clock.fill",
                        color: .blue
                    )
                }

                // Completed routines
                if !routineGroups.completed.isEmpty {
                    RoutineSectionView(
                        title: String(localized: "today.routines.completed"),
                        routines: routineGroups.completed,
                        icon: "checkmark.circle.fill",
                        color: .green,
                        isCollapsible: true
                    )
                }
            }
        }
    }
}

/// Section header with optional collapse functionality
struct RoutineSectionView: View {
    let title: String
    let routines: [RoutineInstance]
    let icon: String
    let color: Color
    var isCollapsible: Bool = false

    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            // Section header with ModernSectionHeader styling
            Button {
                if isCollapsible {
                    withAnimation(.easeInOut(duration: EquiDutyDesign.Animation.standard)) {
                        isExpanded.toggle()
                    }
                }
            } label: {
                HStack {
                    Image(systemName: icon)
                        .foregroundStyle(color)

                    Text(title.uppercased())
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .tracking(0.5)

                    Text("(\(routines.count))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .contentTransition(.numericText())

                    Spacer()

                    if isCollapsible {
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .symbolEffect(.bounce, value: isExpanded)
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(!isCollapsible)

            // Routine cards
            if isExpanded {
                ForEach(routines) { routine in
                    TodayRoutineCard(routine: routine)
                }
            }
        }
    }
}

/// Enhanced routine card for TodayView with iOS 26 Liquid Glass design
struct TodayRoutineCard: View {
    let routine: RoutineInstance

    /// Whether the routine is currently active
    private var isActive: Bool {
        routine.status == .inProgress || routine.status == .started
    }

    /// Icon for the status badge
    private var statusIcon: String {
        switch routine.status {
        case .scheduled:
            return "clock.fill"
        case .started, .inProgress:
            return "play.fill"
        case .completed:
            return "checkmark"
        case .missed:
            return "exclamationmark.circle.fill"
        case .cancelled:
            return "xmark"
        }
    }

    var body: some View {
        NavigationLink {
            RoutineFlowView(instanceId: routine.id)
        } label: {
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                HStack {
                    Image(systemName: "checklist")
                        .foregroundStyle(Color.accentColor)
                        .symbolEffect(.variableColor.iterative, isActive: isActive)

                    Text(routine.templateName)
                        .font(.headline)
                        .lineLimit(1)

                    Spacer()

                    ModernStatusBadge(
                        status: routine.status.displayName,
                        color: Color(routine.status.color),
                        icon: statusIcon,
                        isAnimating: isActive
                    )
                }

                HStack {
                    // Time
                    Label {
                        Text(routine.scheduledStartTime)
                    } icon: {
                        Image(systemName: "clock")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)

                    // Assigned person
                    if let assignedName = routine.assignedToName {
                        Text("•")
                            .foregroundStyle(.secondary)

                        Label {
                            Text(assignedName)
                        } icon: {
                            Image(systemName: "person")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }

                    Spacer()

                    // Duration
                    Label {
                        Text("\(routine.estimatedDuration) min")
                    } icon: {
                        Image(systemName: "timer")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                // Progress bar
                if isActive {
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                        ModernProgressView(
                            value: routine.progress.percentComplete,
                            total: 100,
                            tint: Color.accentColor
                        )

                        Text("\(routine.progress.stepsCompleted)/\(routine.progress.stepsTotal) \(String(localized: "routine.steps_completed"))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .contentTransition(.numericText())
                    }
                }
            }
            .contentCard(
                elevation: .standard,
                cornerRadius: EquiDutyDesign.CornerRadius.card,
                padding: EquiDutyDesign.Spacing.standard
            )
        }
        .buttonStyle(.scale)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(routine.templateName), \(routine.status.displayName), \(routine.scheduledStartTime)")
        .accessibilityHint(isActive
            ? String(localized: "accessibility.routine.in_progress_hint")
            : String(localized: "accessibility.routine.tap_to_start_hint"))
    }
}

#Preview("With Groups") {
    ScrollView {
        TodayRoutineList(
            routineGroups: RoutineGroups()
        )
        .padding(EquiDutyDesign.Spacing.standard)
    }
}

#Preview("Empty State") {
    TodayRoutineList(routineGroups: RoutineGroups())
        .padding(EquiDutyDesign.Spacing.standard)
}
