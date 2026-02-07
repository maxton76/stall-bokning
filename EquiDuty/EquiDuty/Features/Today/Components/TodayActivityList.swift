//
//  TodayActivityList.swift
//  EquiDuty
//
//  Activity list for TodayView with temporal sections or grouping
//

import SwiftUI

/// Activity list with temporal sections (Overdue/Today/Upcoming) or grouped display
struct TodayActivityList: View {
    let activities: [ActivityInstance]
    let groupBy: TodayGroupByOption
    let periodType: TodayPeriodType
    let referenceDate: Date
    let showEmptyState: Bool
    let onActivityTap: ((ActivityInstance) -> Void)?

    init(
        activities: [ActivityInstance],
        groupBy: TodayGroupByOption,
        periodType: TodayPeriodType,
        referenceDate: Date,
        showEmptyState: Bool = true,
        onActivityTap: ((ActivityInstance) -> Void)? = nil
    ) {
        self.activities = activities
        self.groupBy = groupBy
        self.periodType = periodType
        self.referenceDate = referenceDate
        self.showEmptyState = showEmptyState
        self.onActivityTap = onActivityTap
    }

    var body: some View {
        if activities.isEmpty && showEmptyState {
            ModernEmptyStateView(
                icon: "calendar.badge.checkmark",
                title: String(localized: "today.activities.empty.title"),
                message: String(localized: "today.activities.empty.message")
            )
        } else if groupBy != .none {
            // Grouped display
            GroupedActivityList(
                activities: activities,
                groupBy: groupBy,
                onActivityTap: onActivityTap
            )
        } else if periodType == .day {
            // Temporal sections for day view
            TemporalActivityList(
                activities: activities,
                referenceDate: referenceDate,
                onActivityTap: onActivityTap
            )
        } else {
            // Simple list for week/month view with no grouping
            SimpleActivityList(activities: activities, onActivityTap: onActivityTap)
        }
    }
}

// MARK: - Temporal Activity List

/// Activity list with Overdue/Today/Upcoming sections
struct TemporalActivityList: View {
    let sections: TemporalSections
    let onActivityTap: ((ActivityInstance) -> Void)?

    init(
        activities: [ActivityInstance],
        referenceDate: Date,
        onActivityTap: ((ActivityInstance) -> Void)? = nil
    ) {
        self.sections = TemporalSections(from: activities, referenceDate: referenceDate)
        self.onActivityTap = onActivityTap
    }

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            // Overdue section
            if !sections.overdue.isEmpty {
                ActivitySectionView(
                    title: String(localized: "today.sections.overdue"),
                    activities: sections.overdue,
                    icon: "exclamationmark.triangle.fill",
                    color: .red,
                    onActivityTap: onActivityTap
                )
            }

            // Today section
            if !sections.today.isEmpty {
                ActivitySectionView(
                    title: String(localized: "today.sections.today"),
                    activities: sections.today,
                    icon: "sun.max.fill",
                    color: .orange,
                    onActivityTap: onActivityTap
                )
            }

            // Upcoming section
            if !sections.upcoming.isEmpty {
                ActivitySectionView(
                    title: String(localized: "today.sections.upcoming"),
                    activities: sections.upcoming,
                    icon: "calendar.badge.clock",
                    color: .blue,
                    onActivityTap: onActivityTap
                )
            }
        }
    }
}

// MARK: - Grouped Activity List

/// Activity list grouped by horse/staff/type
struct GroupedActivityList: View {
    let grouped: GroupedActivities
    let onActivityTap: ((ActivityInstance) -> Void)?

    init(
        activities: [ActivityInstance],
        groupBy: TodayGroupByOption,
        onActivityTap: ((ActivityInstance) -> Void)? = nil
    ) {
        self.grouped = GroupedActivities(from: activities, groupBy: groupBy)
        self.onActivityTap = onActivityTap
    }

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            ForEach(grouped.groups, id: \.key) { group in
                ActivitySectionView(
                    title: group.key,
                    activities: group.activities,
                    icon: nil,
                    color: .accentColor,
                    onActivityTap: onActivityTap
                )
            }

            if !grouped.ungrouped.isEmpty {
                ForEach(grouped.ungrouped) { activity in
                    TodayActivityCard(activity: activity, onTap: onActivityTap)
                }
            }
        }
    }
}

// MARK: - Simple Activity List

/// Simple chronological activity list
struct SimpleActivityList: View {
    let activities: [ActivityInstance]
    let onActivityTap: ((ActivityInstance) -> Void)?

    init(
        activities: [ActivityInstance],
        onActivityTap: ((ActivityInstance) -> Void)? = nil
    ) {
        self.activities = activities
        self.onActivityTap = onActivityTap
    }

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.md) {
            ForEach(activities) { activity in
                TodayActivityCard(activity: activity, onTap: onActivityTap)
            }
        }
    }
}

// MARK: - Activity Section

/// Section with header and activity cards
struct ActivitySectionView: View {
    let title: String
    let activities: [ActivityInstance]
    let icon: String?
    let color: Color
    let onActivityTap: ((ActivityInstance) -> Void)?

    init(
        title: String,
        activities: [ActivityInstance],
        icon: String?,
        color: Color,
        onActivityTap: ((ActivityInstance) -> Void)? = nil
    ) {
        self.title = title
        self.activities = activities
        self.icon = icon
        self.color = color
        self.onActivityTap = onActivityTap
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            // Section header with ModernSectionHeader styling
            HStack {
                if let icon = icon {
                    Image(systemName: icon)
                        .foregroundStyle(color)
                }

                Text(title.uppercased())
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                    .tracking(0.5)

                Text("(\(activities.count))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .contentTransition(.numericText())

                Spacer()
            }

            // Activity cards
            ForEach(activities) { activity in
                TodayActivityCard(activity: activity, onTap: onActivityTap)
            }
        }
    }
}

// MARK: - Activity Card

/// Enhanced activity card for TodayView with iOS 26 Liquid Glass design
/// Uses NavigationLink for consistent navigation pattern
struct TodayActivityCard: View {
    let activity: ActivityInstance
    let onTap: ((ActivityInstance) -> Void)?

    init(activity: ActivityInstance, onTap: ((ActivityInstance) -> Void)? = nil) {
        self.activity = activity
        self.onTap = onTap
    }

    private var isInProgress: Bool {
        activity.status == .inProgress
    }

    private var statusIcon: String {
        switch activity.status {
        case .pending:
            return "clock.fill"
        case .inProgress:
            return "play.fill"
        case .completed:
            return "checkmark"
        case .cancelled:
            return "xmark"
        case .overdue:
            return "exclamationmark.circle.fill"
        }
    }

    var body: some View {
        // Use NavigationLink for standard navigation pattern
        // Falls back to onTap callback if provided (for legacy compatibility)
        if let onTap {
            Button {
                onTap(activity)
            } label: {
                cardContent
            }
            .buttonStyle(.scale)
        } else {
            NavigationLink(value: AppDestination.activityDetail(activityId: activity.id)) {
                cardContent
            }
            .buttonStyle(.scale)
        }
    }

    private var cardContent: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack {
                Image(systemName: activity.activityTypeCategory.icon)
                    .foregroundStyle(Color.accentColor)
                    .symbolEffect(.pulse, isActive: isInProgress)

                Text(activity.activityTypeName)
                    .font(.headline)
                    .lineLimit(1)

                Spacer()

                ModernStatusBadge(
                    status: activity.status.displayName,
                    color: activity.status.color,
                    icon: statusIcon,
                    isAnimating: isInProgress
                )
            }

            // Horse names
            if !activity.horseNames.isEmpty {
                Label {
                    Text(activity.horseNames.joined(separator: ", "))
                        .lineLimit(2)
                } icon: {
                    Image(systemName: "pawprint.fill")
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }

            HStack {
                // Date & Time
                if let time = activity.scheduledTime {
                    Label {
                        Text(time)
                    } icon: {
                        Image(systemName: "clock")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                } else {
                    Label {
                        Text(activity.scheduledDate, format: .dateTime.day().month(.abbreviated))
                    } icon: {
                        Image(systemName: "calendar")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                // Assigned person
                if let assignedName = activity.assignedToName {
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
                if let duration = activity.duration {
                    Label {
                        Text("\(duration) min")
                    } icon: {
                        Image(systemName: "timer")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
            }

            // Notes preview
            if let notes = activity.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .padding(.top, EquiDutyDesign.Spacing.xs)
            }

            // Tap hint (chevron)
            HStack {
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .contentCard(
            elevation: .standard,
            cornerRadius: EquiDutyDesign.CornerRadius.card,
            padding: EquiDutyDesign.Spacing.standard
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(activity.activityTypeName), \(activity.status.displayName), \(activity.horseNames.joined(separator: ", "))")
        .accessibilityHint(String(localized: "accessibility.activity.tap_hint"))
    }
}

#Preview("Temporal Sections") {
    ScrollView {
        TodayActivityList(
            activities: [],
            groupBy: .none,
            periodType: .day,
            referenceDate: Date()
        )
        .padding()
    }
}

#Preview("Empty State") {
    TodayActivityList(
        activities: [],
        groupBy: .none,
        periodType: .day,
        referenceDate: Date()
    )
    .padding()
}
