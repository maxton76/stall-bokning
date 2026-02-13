import SwiftUI

/// 7-column grid showing week days with rich routine cards
struct WeekCalendarGrid: View {
    let startDate: Date
    let endDate: Date
    let routines: [RoutineInstance]
    var onRoutineTap: ((RoutineInstance) -> Void)?

    private var days: [Date] {
        (0..<7).compactMap { offset in
            Calendar.current.date(byAdding: .day, value: offset, to: startDate)
        }
    }

    var body: some View {
        ScrollView {
            HStack(alignment: .top, spacing: 4) {
                ForEach(days, id: \.self) { day in
                    WeekDayColumn(
                        date: day,
                        routines: routines.filter { routine in
                            guard let year = Calendar.current.dateComponents([.year], from: routine.scheduledDate).year,
                                  year > 1990 && year < 2100 else {
                                return false
                            }
                            return Calendar.current.isDate(routine.scheduledDate, inSameDayAs: day)
                        },
                        onRoutineTap: onRoutineTap
                    )
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
    }
}

/// Single day column in the week grid
private struct WeekDayColumn: View {
    let date: Date
    let routines: [RoutineInstance]
    var onRoutineTap: ((RoutineInstance) -> Void)?

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f
    }()

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f
    }()

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    private var sortedRoutines: [RoutineInstance] {
        routines.sorted { $0.scheduledStartTime < $1.scheduledStartTime }
    }

    var body: some View {
        VStack(spacing: 4) {
            // Day header
            VStack(spacing: 1) {
                Text(Self.dayFormatter.string(from: date))
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                Text(Self.dateFormatter.string(from: date))
                    .font(.caption)
                    .fontWeight(isToday ? .bold : .regular)
                    .foregroundStyle(isToday ? .white : .primary)
                    .frame(width: 24, height: 24)
                    .background(
                        Circle()
                            .fill(isToday ? Color.accentColor : Color.clear)
                    )
            }
            .padding(.bottom, 2)

            // Routine cards
            if routines.isEmpty {
                Text("—")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, minHeight: 40)
            } else {
                VStack(spacing: 3) {
                    ForEach(sortedRoutines) { routine in
                        Button {
                            onRoutineTap?(routine)
                        } label: {
                            RoutineCardView(routine: routine)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(isToday ? Color.accentColor.opacity(0.06) : Color(.systemBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .stroke(isToday ? Color.accentColor.opacity(0.4) : Color(.separator).opacity(0.3), lineWidth: isToday ? 1.5 : 0.5)
        )
    }
}

#Preview("Week Grid with Routines") {
    let interval = Calendar.current.dateInterval(of: .weekOfYear, for: Date())
    let startOfWeek = interval?.start ?? Date()
    let endOfWeek = interval?.start.addingTimeInterval(6 * 24 * 3600) ?? Date()

    let mockRoutines: [RoutineInstance] = [
        RoutineInstance(
            id: "1", templateId: "t1", templateName: "Morgonrutin",
            organizationId: "o1", stableId: "s1",
            scheduledDate: startOfWeek, scheduledStartTime: "07:00",
            estimatedDuration: 60, assignedTo: "u1", assignedToName: "Anna",
            assignmentType: .manual, status: .scheduled,
            progress: RoutineProgress(stepsCompleted: 0, stepsTotal: 5, percentComplete: 0, stepProgress: [:]),
            pointsValue: 10, dailyNotesAcknowledged: false,
            createdAt: Date(), createdBy: "sys", updatedAt: Date()
        ),
        RoutineInstance(
            id: "2", templateId: "t2", templateName: "Kvällsrutin",
            organizationId: "o1", stableId: "s1",
            scheduledDate: startOfWeek, scheduledStartTime: "18:00",
            estimatedDuration: 45, assignmentType: .unassigned, status: .inProgress,
            progress: RoutineProgress(stepsCompleted: 2, stepsTotal: 4, percentComplete: 50, stepProgress: [:]),
            pointsValue: 8, dailyNotesAcknowledged: false,
            createdAt: Date(), createdBy: "sys", updatedAt: Date()
        ),
        RoutineInstance(
            id: "3", templateId: "t3", templateName: "Städning",
            organizationId: "o1", stableId: "s1",
            scheduledDate: Calendar.current.date(byAdding: .day, value: 2, to: startOfWeek) ?? startOfWeek,
            scheduledStartTime: "10:00",
            estimatedDuration: 90, assignedTo: "u2", assignedToName: "Erik",
            assignmentType: .manual, status: .completed,
            progress: RoutineProgress(stepsCompleted: 5, stepsTotal: 5, percentComplete: 100, stepProgress: [:]),
            pointsValue: 15, dailyNotesAcknowledged: false,
            createdAt: Date(), createdBy: "sys", updatedAt: Date()
        )
    ]

    WeekCalendarGrid(startDate: startOfWeek, endDate: endOfWeek, routines: mockRoutines)
}
