import SwiftUI

/// Month calendar grid showing routine indicators per day
struct MonthCalendarGrid: View {
    let year: Int
    let month: Int
    let routines: [RoutineInstance]
    var onDayTap: ((Date) -> Void)?

    private let calendar = Calendar.current

    /// All days to display in the month grid (including leading/trailing days from adjacent months)
    private var gridDays: [Date?] {
        guard let firstOfMonth = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
              let range = calendar.range(of: .day, in: .month, for: firstOfMonth) else {
            return []
        }

        // Weekday of first day (1 = Sunday in default calendar, adjusted for Monday start)
        let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
        // Adjust for Monday-start week (Monday=0, ..., Sunday=6)
        let leadingEmpty = (firstWeekday + 5) % 7

        var days: [Date?] = Array(repeating: nil, count: leadingEmpty)

        for day in range {
            if let date = calendar.date(from: DateComponents(year: year, month: month, day: day)) {
                days.append(date)
            }
        }

        // Pad to complete the last row
        let remainder = days.count % 7
        if remainder > 0 {
            days += Array(repeating: nil as Date?, count: 7 - remainder)
        }

        return days
    }

    /// Weekday headers (Mon-Sun)
    private var weekdayHeaders: [String] {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        // veryShort gives single letters: M, T, W, ...
        let symbols = formatter.veryShortWeekdaySymbols ?? ["M", "T", "W", "T", "F", "S", "S"]
        // Reorder from Sunday-start to Monday-start
        return Array(symbols[1...]) + [symbols[0]]
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 4) {
                // Weekday headers
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 7), spacing: 2) {
                    ForEach(Array(weekdayHeaders.enumerated()), id: \.offset) { _, day in
                        Text(day)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 8)

                // Day cells
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 7), spacing: 2) {
                    ForEach(Array(gridDays.enumerated()), id: \.offset) { _, day in
                        if let date = day {
                            MonthDayCell(
                                date: date,
                                routines: routinesForDay(date),
                                onTap: { onDayTap?(date) }
                            )
                        } else {
                            Color.clear
                                .frame(height: 56)
                        }
                    }
                }
                .padding(.horizontal, 8)
            }
            .padding(.vertical, 8)
        }
    }

    private func routinesForDay(_ date: Date) -> [RoutineInstance] {
        routines.filter { calendar.isDate($0.scheduledDate, inSameDayAs: date) }
    }
}

/// Single day cell in the month grid
private struct MonthDayCell: View {
    let date: Date
    let routines: [RoutineInstance]
    let onTap: () -> Void

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    private var dayNumber: String {
        "\(Calendar.current.component(.day, from: date))"
    }

    /// Status colors for the dot indicators
    private var statusDots: [Color] {
        let sorted = routines.sorted { $0.scheduledStartTime < $1.scheduledStartTime }
        return sorted.prefix(4).map { routine in
            switch routine.status {
            case .completed: return .green
            case .missed: return .red
            case .cancelled: return .gray
            case .started, .inProgress: return .orange
            case .scheduled:
                return routine.assignedTo == nil ? .gray : .blue
            }
        }
    }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 3) {
                // Day number
                Text(dayNumber)
                    .font(.caption)
                    .fontWeight(isToday ? .bold : .regular)
                    .foregroundStyle(isToday ? .white : .primary)
                    .frame(width: 22, height: 22)
                    .background(
                        Circle()
                            .fill(isToday ? Color.accentColor : Color.clear)
                    )

                // Routine indicators
                if routines.isEmpty {
                    Spacer()
                        .frame(height: 16)
                } else {
                    // Colored dots (max 4)
                    HStack(spacing: 2) {
                        ForEach(Array(statusDots.enumerated()), id: \.offset) { _, color in
                            Circle()
                                .fill(color)
                                .frame(width: 5, height: 5)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, minHeight: 56)
        }
        .buttonStyle(.plain)
        .background(
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(isToday ? Color.accentColor.opacity(0.06) : Color.clear)
        )
    }
}

#Preview {
    let comps = Calendar.current.dateComponents([.year, .month], from: Date())
    MonthCalendarGrid(
        year: comps.year ?? 2026,
        month: comps.month ?? 2,
        routines: []
    )
}
