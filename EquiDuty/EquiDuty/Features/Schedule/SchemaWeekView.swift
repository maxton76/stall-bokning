import SwiftUI

/// Weekly calendar schedule view
struct SchemaWeekView: View {
    @State private var viewModel: TodayViewModel

    init() {
        let vm = TodayViewModel()
        vm.periodType = .week
        _viewModel = State(initialValue: vm)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Date navigation header (reuse from TodayView)
            TodayDateNavigationHeader(
                selectedDate: $viewModel.selectedDate,
                periodType: $viewModel.periodType,
                onDateChanged: {
                    viewModel.loadData()
                },
                onPeriodChanged: {
                    viewModel.periodType = .week
                    viewModel.loadData()
                }
            )
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()

            // Validate date range before creating grid
            let dateRange = viewModel.dateRange
            if isValidDateRange(dateRange) {
                // Week grid (7 columns for days)
                WeekCalendarGrid(
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    routines: viewModel.filteredRoutines
                )
            } else {
                Text("Invalid date range")
                    .foregroundStyle(.secondary)
                    .padding()
            }
        }
        .task {
            viewModel.loadData()
        }
        .onChange(of: viewModel.selectedDate) { _, _ in
            viewModel.loadData()
        }
    }

    /// Validate date range is reasonable
    private func isValidDateRange(_ range: (start: Date, end: Date)) -> Bool {
        guard range.start <= range.end else { return false }
        let calendar = Calendar.current
        guard let startYear = calendar.dateComponents([.year], from: range.start).year,
              let endYear = calendar.dateComponents([.year], from: range.end).year else {
            return false
        }
        return startYear > 1990 && startYear < 2100 && endYear > 1990 && endYear < 2100
    }
}

#Preview {
    SchemaWeekView()
}
