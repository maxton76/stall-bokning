//
//  TodayDateNavigationHeader.swift
//  EquiDuty
//
//  Enhanced date navigation header with period awareness
//  iOS 26 Liquid Glass design
//

import SwiftUI

/// Enhanced date navigation header with period selector and "Today" button
/// Uses iOS 26 Liquid Glass styling for navigation layer
struct TodayDateNavigationHeader: View {
    @Binding var selectedDate: Date
    @Binding var periodType: TodayPeriodType
    let onDateChanged: () -> Void
    let onPeriodChanged: () -> Void

    private let calendar = Calendar.current

    /// Check if currently viewing current period (today/this week/this month)
    private var isCurrentPeriod: Bool {
        selectedDate.isInCurrentPeriod(for: periodType, calendar: calendar)
    }

    /// Display label for current period
    private var periodLabel: String {
        selectedDate.periodDisplayLabel(for: periodType, calendar: calendar)
    }

    /// Secondary label (date details)
    private var secondaryLabel: String? {
        selectedDate.periodSecondaryLabel(for: periodType, calendar: calendar)
    }

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.md) {
            // Period type selector with glass pills
            TodayPeriodSelector(selectedPeriod: $periodType) {
                onPeriodChanged()
            }

            // Date navigation
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                // Previous button
                Button {
                    selectedDate = selectedDate.previousPeriod(for: periodType, calendar: calendar)
                    onDateChanged()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.scale)

                Spacer()

                // Date display with smooth content transitions
                VStack(spacing: EquiDutyDesign.Spacing.xs) {
                    Text(periodLabel)
                        .font(.headline)
                        .contentTransition(.interpolate)

                    if let secondary = secondaryLabel {
                        Text(secondary)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .contentTransition(.interpolate)
                    }
                }

                Spacer()

                // Next button
                Button {
                    selectedDate = selectedDate.nextPeriod(for: periodType, calendar: calendar)
                    onDateChanged()
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.scale)
            }

            // "Today" button (only show if not current period)
            if !isCurrentPeriod {
                Button {
                    selectedDate = Date()
                    onDateChanged()
                } label: {
                    HStack(spacing: EquiDutyDesign.Spacing.xs) {
                        Image(systemName: "calendar.badge.clock")
                            .symbolEffect(.bounce, value: isCurrentPeriod)
                        Text(todayButtonLabel)
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                }
                .buttonStyle(.scale)
                .padding(.horizontal, EquiDutyDesign.Spacing.standard)
                .padding(.vertical, EquiDutyDesign.Spacing.sm)
                .background {
                    if #available(iOS 26.0, *) {
                        Capsule()
                            .fill(.clear)
                            .glassEffect(.regular.tint(.accentColor).interactive())
                    } else {
                        Capsule()
                            .fill(Color.accentColor.opacity(0.2))
                    }
                }
                .foregroundStyle(Color.accentColor)
            }
        }
        .padding(EquiDutyDesign.Spacing.standard)
        .glassNavigation(cornerRadius: EquiDutyDesign.CornerRadius.navigation)
    }

    private var todayButtonLabel: String {
        switch periodType {
        case .week:
            return String(localized: "today.navigation.goToThisWeek")
        case .month:
            return String(localized: "today.navigation.goToThisMonth")
        }
    }
}

#Preview("Week View") {
    TodayDateNavigationHeader(
        selectedDate: .constant(Date()),
        periodType: .constant(.week),
        onDateChanged: {},
        onPeriodChanged: {}
    )
    .padding()
}

#Preview("Month View - Past") {
    TodayDateNavigationHeader(
        selectedDate: .constant(Calendar.current.date(byAdding: .month, value: -2, to: Date())!),
        periodType: .constant(.month),
        onDateChanged: {},
        onPeriodChanged: {}
    )
    .padding()
}
