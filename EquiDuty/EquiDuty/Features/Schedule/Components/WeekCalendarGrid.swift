import SwiftUI

/// 7-column grid showing week days with routine instances
struct WeekCalendarGrid: View {
    let startDate: Date
    let endDate: Date
    let routines: [RoutineInstance]

    private var days: [Date] {
        // Generate 7 days from startDate
        let generatedDays = (0..<7).compactMap { offset in
            Calendar.current.date(byAdding: .day, value: offset, to: startDate)
        }

        // Ensure we always have 7 days
        assert(generatedDays.count == 7, "Week grid must have exactly 7 days, got \(generatedDays.count)")

        return generatedDays
    }

    var body: some View {
        ScrollView {
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 7),
                spacing: 8
            ) {
                ForEach(days, id: \.self) { day in
                    DayCell(
                        date: day,
                        routines: routines.filter { routine in
                            // Validate routine has valid scheduled date
                            guard let year = Calendar.current.dateComponents([.year], from: routine.scheduledDate).year,
                                  year > 1990 && year < 2100 else {
                                return false
                            }
                            return Calendar.current.isDate(routine.scheduledDate, inSameDayAs: day)
                        }
                    )
                }
            }
            .padding()
        }
    }
}

/// Individual day cell in the week grid
struct DayCell: View {
    let date: Date
    let routines: [RoutineInstance]

    // Static formatters to avoid recreating on every render
    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter
    }()

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter
    }()

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    var body: some View {
        VStack(alignment: .center, spacing: 4) {
            // Weekday abbreviation (Mon, Tue, etc.)
            Text(Self.dayFormatter.string(from: date))
                .font(.caption2)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            // Day number
            Text(Self.dateFormatter.string(from: date))
                .font(.caption)
                .fontWeight(isToday ? .bold : .regular)
                .foregroundStyle(isToday ? .blue : .primary)

            Spacer()

            // Routine count or placeholder
            if routines.isEmpty {
                Text("—")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            } else {
                VStack(spacing: 2) {
                    Text("\(routines.count)")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundStyle(.blue)

                    Text(routines.count == 1 ? "routine" : "routines")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, minHeight: 80)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isToday ? Color.blue.opacity(0.1) : Color(.systemBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isToday ? Color.blue : Color.clear, lineWidth: 2)
        )
    }
}

#Preview("Week Grid with Routines") {
    let interval = Calendar.current.dateInterval(of: .weekOfYear, for: Date())
    let startOfWeek = interval?.start ?? Date()
    let endOfWeek = interval?.start.addingTimeInterval(6 * 24 * 3600) ?? Date()

    // Mock routines for preview
    let mockRoutines: [RoutineInstance] = [
        RoutineInstance(
            id: "1",
            templateId: "template1",
            templateName: "Morning Feeding",
            organizationId: "org1",
            stableId: "stable1",
            stableName: "Main Stable",
            template: nil,
            scheduledDate: startOfWeek,
            scheduledStartTime: "08:00",
            estimatedDuration: 60,
            assignedTo: nil,
            assignedToName: nil,
            assignmentType: .unassigned,
            assignedAt: nil,
            assignedBy: nil,
            status: .scheduled,
            startedAt: nil,
            startedBy: nil,
            startedByName: nil,
            completedAt: nil,
            completedBy: nil,
            completedByName: nil,
            cancelledAt: nil,
            cancelledBy: nil,
            cancellationReason: nil,
            currentStepId: nil,
            currentStepOrder: nil,
            progress: RoutineProgress(
                stepsCompleted: 0,
                stepsTotal: 5,
                percentComplete: 0,
                stepProgress: [:]
            ),
            pointsValue: 10,
            pointsAwarded: nil,
            isHolidayShift: nil,
            dailyNotesAcknowledged: false,
            dailyNotesAcknowledgedAt: nil,
            notes: nil,
            createdAt: Date(),
            createdBy: "system",
            updatedAt: Date(),
            updatedBy: nil
        ),
        RoutineInstance(
            id: "2",
            templateId: "template2",
            templateName: "Evening Feeding",
            organizationId: "org1",
            stableId: "stable1",
            stableName: "Main Stable",
            template: nil,
            scheduledDate: startOfWeek,
            scheduledStartTime: "18:00",
            estimatedDuration: 60,
            assignedTo: nil,
            assignedToName: nil,
            assignmentType: .unassigned,
            assignedAt: nil,
            assignedBy: nil,
            status: .scheduled,
            startedAt: nil,
            startedBy: nil,
            startedByName: nil,
            completedAt: nil,
            completedBy: nil,
            completedByName: nil,
            cancelledAt: nil,
            cancelledBy: nil,
            cancellationReason: nil,
            currentStepId: nil,
            currentStepOrder: nil,
            progress: RoutineProgress(
                stepsCompleted: 0,
                stepsTotal: 5,
                percentComplete: 0,
                stepProgress: [:]
            ),
            pointsValue: 10,
            pointsAwarded: nil,
            isHolidayShift: nil,
            dailyNotesAcknowledged: false,
            dailyNotesAcknowledgedAt: nil,
            notes: nil,
            createdAt: Date(),
            createdBy: "system",
            updatedAt: Date(),
            updatedBy: nil
        ),
        RoutineInstance(
            id: "3",
            templateId: "template3",
            templateName: "Stable Cleaning",
            organizationId: "org1",
            stableId: "stable1",
            stableName: "Main Stable",
            template: nil,
            scheduledDate: Calendar.current.date(byAdding: .day, value: 2, to: startOfWeek) ?? startOfWeek,
            scheduledStartTime: "10:00",
            estimatedDuration: 90,
            assignedTo: nil,
            assignedToName: nil,
            assignmentType: .unassigned,
            assignedAt: nil,
            assignedBy: nil,
            status: .scheduled,
            startedAt: nil,
            startedBy: nil,
            startedByName: nil,
            completedAt: nil,
            completedBy: nil,
            completedByName: nil,
            cancelledAt: nil,
            cancelledBy: nil,
            cancellationReason: nil,
            currentStepId: nil,
            currentStepOrder: nil,
            progress: RoutineProgress(
                stepsCompleted: 0,
                stepsTotal: 5,
                percentComplete: 0,
                stepProgress: [:]
            ),
            pointsValue: 15,
            pointsAwarded: nil,
            isHolidayShift: nil,
            dailyNotesAcknowledged: false,
            dailyNotesAcknowledgedAt: nil,
            notes: nil,
            createdAt: Date(),
            createdBy: "system",
            updatedAt: Date(),
            updatedBy: nil
        )
    ]

    WeekCalendarGrid(
        startDate: startOfWeek,
        endDate: endOfWeek,
        routines: mockRoutines
    )
}

#Preview("Week Grid Empty") {
    let interval = Calendar.current.dateInterval(of: .weekOfYear, for: Date())
    let startOfWeek = interval?.start ?? Date()
    let endOfWeek = interval?.start.addingTimeInterval(6 * 24 * 3600) ?? Date()

    WeekCalendarGrid(
        startDate: startOfWeek,
        endDate: endOfWeek,
        routines: []
    )
}
