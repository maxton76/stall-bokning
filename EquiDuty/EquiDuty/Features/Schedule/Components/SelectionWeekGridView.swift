//
//  SelectionWeekGridView.swift
//  EquiDuty
//
//  Week-based grid for routine instance selection
//

import SwiftUI

struct SelectionWeekGridView: View {
    let weekStart: Date
    let routines: [RoutineInstance]
    let currentUserId: String?
    let canSelect: Bool
    let selectionStartDate: String
    let selectionEndDate: String
    let onNavigateWeek: (Int) -> Void
    let onGoToToday: () -> Void
    let onSelectRoutine: (String) -> Void

    private let calendar = Calendar.current
    private let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f
    }()
    private let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f
    }()

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.md) {
            // Week navigation
            weekNavigation

            // Stats
            statsRow

            // Day headers
            dayHeaders

            // Routine slots by day
            routineGrid

            // Legend
            legend
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
        .padding(.horizontal)
    }

    // MARK: - Subviews

    private var weekNavigation: some View {
        HStack {
            Button { onNavigateWeek(-1) } label: {
                Image(systemName: "chevron.left")
            }

            Spacer()

            Button { onGoToToday() } label: {
                Text(weekRangeString)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            Spacer()

            Button { onNavigateWeek(1) } label: {
                Image(systemName: "chevron.right")
            }
        }
    }

    private var statsRow: some View {
        HStack(spacing: EquiDutyDesign.Spacing.lg) {
            StatPill(
                label: String(localized: "selectionProcess.schedule.total"),
                value: "\(routines.count)",
                color: .secondary
            )
            StatPill(
                label: String(localized: "selectionProcess.schedule.available"),
                value: "\(availableRoutines.count)",
                color: .green
            )
            StatPill(
                label: String(localized: "selectionProcess.schedule.assigned"),
                value: "\(assignedRoutines.count)",
                color: .blue
            )
        }
    }

    private var dayHeaders: some View {
        HStack(spacing: 2) {
            ForEach(weekDays, id: \.self) { day in
                VStack(spacing: 2) {
                    Text(dayFormatter.string(from: day))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(dateFormatter.string(from: day))
                        .font(.caption)
                        .fontWeight(calendar.isDateInToday(day) ? .bold : .regular)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private var routineGrid: some View {
        let grouped = Dictionary(grouping: routines) { instance -> String in
            let df = DateFormatter()
            df.dateFormat = "yyyy-MM-dd"
            return df.string(from: instance.scheduledDate)
        }

        return HStack(alignment: .top, spacing: 2) {
            ForEach(weekDays, id: \.self) { day in
                let dayKey = {
                    let df = DateFormatter()
                    df.dateFormat = "yyyy-MM-dd"
                    return df.string(from: day)
                }()
                let dayRoutines = grouped[dayKey] ?? []
                let isInPeriod = isDateInSelectionPeriod(day)

                VStack(spacing: 2) {
                    if dayRoutines.isEmpty {
                        Text(isInPeriod ? "-" : "")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .frame(height: 36)
                    } else {
                        ForEach(dayRoutines) { instance in
                            routineSlot(instance, isInPeriod: isInPeriod)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    @ViewBuilder
    private func routineSlot(_ instance: RoutineInstance, isInPeriod: Bool) -> some View {
        let isOwnSelection = instance.assignedTo == currentUserId && instance.assignedTo != nil
        let isAssignedToOther = instance.assignedTo != nil && !isOwnSelection
        let isAvailable = instance.assignedTo == nil && isInPeriod

        Button {
            if canSelect && isAvailable {
                onSelectRoutine(instance.id)
            }
        } label: {
            VStack(spacing: 1) {
                if isOwnSelection {
                    Image(systemName: "checkmark")
                        .font(.caption2)
                } else if isAssignedToOther {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                } else {
                    Text(instance.template?.name.prefix(3) ?? "...")
                        .font(.system(size: 9))
                        .lineLimit(1)
                }
                Text(formatTime(instance.scheduledStartTime))
                    .font(.system(size: 8))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 36)
            .background(slotColor(isOwn: isOwnSelection, isOther: isAssignedToOther, isAvailable: isAvailable, isInPeriod: isInPeriod))
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
        .disabled(!canSelect || !isAvailable)
        .buttonStyle(.plain)
    }

    private var legend: some View {
        HStack(spacing: EquiDutyDesign.Spacing.md) {
            LegendItem(color: .green.opacity(0.3), label: String(localized: "selectionProcess.labels.yourSelection"))
            LegendItem(color: .blue.opacity(0.3), label: String(localized: "selectionProcess.schedule.assigned"))
            LegendItem(color: .white, label: String(localized: "selectionProcess.schedule.available"))
            LegendItem(color: .gray.opacity(0.2), label: String(localized: "selectionProcess.schedule.unavailable"))
        }
        .font(.caption2)
    }

    // MARK: - Helpers

    private var weekDays: [Date] {
        (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: weekStart) }
    }

    private var weekRangeString: String {
        guard let end = calendar.date(byAdding: .day, value: 6, to: weekStart) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "d MMM"
        return "\(f.string(from: weekStart)) - \(f.string(from: end))"
    }

    private var availableRoutines: [RoutineInstance] {
        routines.filter { $0.assignedTo == nil }
    }

    private var assignedRoutines: [RoutineInstance] {
        routines.filter { $0.assignedTo != nil }
    }

    private func isDateInSelectionPeriod(_ date: Date) -> Bool {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        guard let start = parseISODate(selectionStartDate),
              let end = parseISODate(selectionEndDate) else { return true }
        let dayStart = calendar.startOfDay(for: date)
        return dayStart >= calendar.startOfDay(for: start) && dayStart <= calendar.startOfDay(for: end)
    }

    private func parseISODate(_ str: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: str) { return d }
        iso.formatOptions = [.withInternetDateTime]
        if let d = iso.date(from: str) { return d }
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        return df.date(from: str)
    }

    private func formatTime(_ time: String) -> String {
        // time is like "07:00" or similar
        String(time.prefix(5))
    }

    private func slotColor(isOwn: Bool, isOther: Bool, isAvailable: Bool, isInPeriod: Bool) -> Color {
        if isOwn { return .green.opacity(0.3) }
        if isOther { return .blue.opacity(0.3) }
        if !isInPeriod { return .gray.opacity(0.15) }
        return .white.opacity(0.5)
    }
}

// MARK: - Supporting Views

private struct StatPill: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.headline)
                .foregroundStyle(color)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

private struct LegendItem: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 12, height: 12)
                .overlay(RoundedRectangle(cornerRadius: 2).stroke(.secondary.opacity(0.3), lineWidth: 0.5))
            Text(label)
        }
    }
}
