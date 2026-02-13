//
//  TodayPeriodSelector.swift
//  EquiDuty
//
//  Period type selector (Day/Week/Month) for TodayView
//  iOS 26 Liquid Glass design with pill buttons
//

import SwiftUI

/// Glass pill selector for choosing period type (Day/Week/Month)
/// Uses iOS 26 Liquid Glass styling
struct TodayPeriodSelector: View {
    @Binding var selectedPeriod: TodayPeriodType
    let onChange: () -> Void

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.sm) {
            ForEach(TodayPeriodType.allCases) { period in
                GlassPillButton(
                    title: period.displayName,
                    isSelected: selectedPeriod == period,
                    icon: period.iconName
                ) {
                    withAnimation(.smooth(duration: EquiDutyDesign.Animation.standard)) {
                        selectedPeriod = period
                    }
                    onChange()
                }
            }
        }
    }
}

// MARK: - Period Type Icon Extension

private extension TodayPeriodType {
    /// SF Symbol icon for each period type
    var iconName: String? {
        switch self {
        case .week:
            return "calendar.day.timeline.left"
        case .month:
            return "calendar"
        }
    }
}

#Preview("Light Mode") {
    TodayPeriodSelector(selectedPeriod: .constant(.week)) {
        print("Period changed")
    }
    .padding()
    .background(Color(.systemBackground))
}

#Preview("Dark Mode") {
    TodayPeriodSelector(selectedPeriod: .constant(.month)) {
        print("Period changed")
    }
    .padding()
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}

#Preview("In Context") {
    VStack(spacing: 20) {
        TodayPeriodSelector(selectedPeriod: .constant(.week)) {}
        TodayPeriodSelector(selectedPeriod: .constant(.month)) {}
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
