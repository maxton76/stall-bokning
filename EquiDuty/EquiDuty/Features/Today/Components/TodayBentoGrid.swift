//
//  TodayBentoGrid.swift
//  EquiDuty
//
//  Adaptive grid layouts for TodayView that respond to device size class.
//  Uses 2 columns on iPad (regular horizontal size class) and 1 column on iPhone (compact).
//

import SwiftUI

// MARK: - Generic Adaptive Card Grid

/// A generic adaptive grid layout that shows 2 columns on iPad and 1 column on iPhone.
///
/// Example usage:
/// ```swift
/// AdaptiveCardGrid(items: activities) { activity in
///     TodayActivityCard(activity: activity)
/// }
/// ```
struct AdaptiveCardGrid<Item: Identifiable, Content: View>: View {
    let items: [Item]
    @ViewBuilder let content: (Item) -> Content

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    /// Number of columns based on device size class
    private var columns: [GridItem] {
        let columnCount = horizontalSizeClass == .regular ? 2 : 1
        return Array(
            repeating: GridItem(.flexible(), spacing: EquiDutyDesign.Spacing.md),
            count: columnCount
        )
    }

    var body: some View {
        LazyVGrid(columns: columns, spacing: EquiDutyDesign.Spacing.md) {
            ForEach(items) { item in
                content(item)
            }
        }
    }
}

// MARK: - Adaptive Activity Grid

/// Specialized adaptive grid for ActivityInstance items.
/// Wraps TodayActivityCard for each activity in a responsive 1-2 column layout.
struct AdaptiveActivityGrid: View {
    let activities: [ActivityInstance]
    let onActivityTap: ((ActivityInstance) -> Void)?

    init(
        activities: [ActivityInstance],
        onActivityTap: ((ActivityInstance) -> Void)? = nil
    ) {
        self.activities = activities
        self.onActivityTap = onActivityTap
    }

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var columns: [GridItem] {
        let columnCount = horizontalSizeClass == .regular ? 2 : 1
        return Array(
            repeating: GridItem(.flexible(), spacing: EquiDutyDesign.Spacing.md),
            count: columnCount
        )
    }

    var body: some View {
        LazyVGrid(columns: columns, spacing: EquiDutyDesign.Spacing.md) {
            ForEach(activities) { activity in
                TodayActivityCard(activity: activity, onTap: onActivityTap)
            }
        }
    }
}

// MARK: - Adaptive Routine Grid

/// Specialized adaptive grid for RoutineInstance items.
/// Wraps TodayRoutineCard for each routine in a responsive 1-2 column layout.
struct AdaptiveRoutineGrid: View {
    let routines: [RoutineInstance]

    init(routines: [RoutineInstance]) {
        self.routines = routines
    }

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var columns: [GridItem] {
        let columnCount = horizontalSizeClass == .regular ? 2 : 1
        return Array(
            repeating: GridItem(.flexible(), spacing: EquiDutyDesign.Spacing.md),
            count: columnCount
        )
    }

    var body: some View {
        LazyVGrid(columns: columns, spacing: EquiDutyDesign.Spacing.md) {
            ForEach(routines) { routine in
                TodayRoutineCard(routine: routine)
            }
        }
    }
}

// MARK: - Previews

/// Preview showing a simple identifiable item to demonstrate the generic grid
private struct PreviewItem: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let color: Color
}

#Preview("Generic Adaptive Grid - Compact") {
    let items = [
        PreviewItem(id: "1", title: "Morning Feeding", subtitle: "07:00 - John", color: .blue),
        PreviewItem(id: "2", title: "Veterinary Visit", subtitle: "09:00 - Thunder", color: .green),
        PreviewItem(id: "3", title: "Evening Turnout", subtitle: "18:00 - Jane", color: .orange),
        PreviewItem(id: "4", title: "Training Session", subtitle: "14:00 - Storm", color: .purple),
    ]

    return ScrollView {
        AdaptiveCardGrid(items: items) { item in
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                HStack {
                    Circle()
                        .fill(item.color)
                        .frame(width: 10, height: 10)
                    Text(item.title)
                        .font(.headline)
                }
                Text(item.subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .contentCard()
        }
        .padding()
    }
    .environment(\.horizontalSizeClass, .compact)
}

#Preview("Generic Adaptive Grid - Regular (iPad)") {
    let items = [
        PreviewItem(id: "1", title: "Morning Feeding", subtitle: "07:00 - John", color: .blue),
        PreviewItem(id: "2", title: "Veterinary Visit", subtitle: "09:00 - Thunder", color: .green),
        PreviewItem(id: "3", title: "Evening Turnout", subtitle: "18:00 - Jane", color: .orange),
        PreviewItem(id: "4", title: "Training Session", subtitle: "14:00 - Storm", color: .purple),
    ]

    return ScrollView {
        AdaptiveCardGrid(items: items) { item in
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                HStack {
                    Circle()
                        .fill(item.color)
                        .frame(width: 10, height: 10)
                    Text(item.title)
                        .font(.headline)
                }
                Text(item.subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .contentCard()
        }
        .padding()
    }
    .environment(\.horizontalSizeClass, .regular)
}

#Preview("Adaptive Activity Grid - Empty") {
    ScrollView {
        AdaptiveActivityGrid(
            activities: [],
            onActivityTap: { _ in }
        )
        .padding()
    }
}

#Preview("Adaptive Routine Grid - Empty") {
    NavigationStack {
        ScrollView {
            AdaptiveRoutineGrid(routines: [])
                .padding()
        }
    }
}
