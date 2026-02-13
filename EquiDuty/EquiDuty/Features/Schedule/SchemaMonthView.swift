import SwiftUI

/// Monthly calendar schedule view
struct SchemaMonthView: View {
    @State private var viewModel: TodayViewModel
    var onSwitchToWeek: ((Date) -> Void)?

    init(onSwitchToWeek: ((Date) -> Void)? = nil) {
        let vm = TodayViewModel()
        vm.periodType = .month
        _viewModel = State(initialValue: vm)
        self.onSwitchToWeek = onSwitchToWeek
    }

    private var currentYear: Int {
        Calendar.current.component(.year, from: viewModel.selectedDate)
    }

    private var currentMonth: Int {
        Calendar.current.component(.month, from: viewModel.selectedDate)
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
                MonthCalendarGrid(
                    year: currentYear,
                    month: currentMonth,
                    routines: viewModel.filteredRoutines,
                    onDayTap: { date in
                        onSwitchToWeek?(date)
                    }
                )
            }
        }
        .task {
            viewModel.loadData()
        }
    }
}

#Preview {
    SchemaMonthView()
}
