import SwiftUI

/// Weekly calendar schedule view
struct SchemaWeekView: View {
    @State private var viewModel: TodayViewModel
    @State private var router = NavigationRouter.shared
    @State private var selectedInstanceId: String?
    @State private var showInstanceDetail = false
    var initialDate: Date?
    var onSwitchToMonth: ((Date) -> Void)?

    init(initialDate: Date? = nil, onSwitchToMonth: ((Date) -> Void)? = nil) {
        let vm = TodayViewModel()
        vm.periodType = .week
        if let date = initialDate {
            vm.selectedDate = date
        }
        _viewModel = State(initialValue: vm)
        self.initialDate = initialDate
        self.onSwitchToMonth = onSwitchToMonth
    }

    var body: some View {
        VStack(spacing: 0) {
            // Simple date navigation (no period selector - controlled by parent)
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                // Previous button
                Button {
                    viewModel.navigatePrevious()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.scale)

                Spacer()

                // Date display
                VStack(spacing: EquiDutyDesign.Spacing.xs) {
                    Text(viewModel.periodDisplayLabel)
                        .font(.headline)

                    if let secondary = viewModel.periodSecondaryLabel {
                        Text(secondary)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Next button
                Button {
                    viewModel.navigateNext()
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.scale)

                // "Today" button
                if !viewModel.isCurrentPeriod {
                    Button {
                        viewModel.goToToday()
                    } label: {
                        Text(String(localized: "today.goToToday"))
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.capsule)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()

            // Color legend
            ColorLegendView()

            Divider()

            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                let dateRange = viewModel.dateRange
                if isValidDateRange(dateRange) {
                    WeekCalendarGrid(
                        startDate: dateRange.start,
                        endDate: dateRange.end,
                        routines: viewModel.filteredRoutines,
                        onRoutineTap: { routine in
                            selectedInstanceId = routine.id
                            showInstanceDetail = true
                        }
                    )
                } else {
                    Text(String(localized: "schedule.invalidDateRange"))
                        .foregroundStyle(.secondary)
                        .padding()
                }
            }
        }
        .sheet(isPresented: $showInstanceDetail) {
            if let instanceId = selectedInstanceId {
                RoutineInstanceDetailView(instanceId: instanceId)
            }
        }
        .task {
            viewModel.loadData()
        }
        .onChange(of: initialDate) { _, newDate in
            if let date = newDate {
                viewModel.selectedDate = date
                viewModel.loadData()
            }
        }
    }

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
