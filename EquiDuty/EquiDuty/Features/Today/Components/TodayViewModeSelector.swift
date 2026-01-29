//
//  TodayViewModeSelector.swift
//  EquiDuty
//
//  View mode selector (All/Activities/Routines) for TodayView
//  Updated for iOS 26 Liquid Glass design patterns
//

import SwiftUI

/// Glass-styled segmented control for selecting view mode with counts
struct TodayViewModeSelector: View {
    @Binding var selectedMode: TodayViewMode
    let routineCount: Int
    let activityCount: Int

    @Namespace private var glassAnimation

    var body: some View {
        GlassEffectContainer(spacing: EquiDutyDesign.Spacing.xs) {
            ForEach(TodayViewMode.allCases) { mode in
                GlassPillButton(
                    title: mode.displayName,
                    isSelected: selectedMode == mode,
                    count: countFor(mode)
                ) {
                    withAnimation(.smooth(duration: EquiDutyDesign.Animation.standard)) {
                        selectedMode = mode
                    }
                }
            }
        }
    }

    private func countFor(_ mode: TodayViewMode) -> Int {
        switch mode {
        case .all:
            return routineCount + activityCount
        case .activities:
            return activityCount
        case .routines:
            return routineCount
        }
    }
}

/// Alternative pill-based view mode selector with Liquid Glass styling
struct TodayViewModePills: View {
    @Binding var selectedMode: TodayViewMode
    let routineCount: Int
    let activityCount: Int

    @Namespace private var glassAnimation

    var body: some View {
        GlassEffectContainer(spacing: EquiDutyDesign.Spacing.sm) {
            ForEach(TodayViewMode.allCases) { mode in
                GlassPillButton(
                    title: mode.displayName,
                    isSelected: selectedMode == mode,
                    count: countFor(mode)
                ) {
                    withAnimation(.smooth(duration: EquiDutyDesign.Animation.standard)) {
                        selectedMode = mode
                    }
                }
            }
        }
    }

    private func countFor(_ mode: TodayViewMode) -> Int {
        switch mode {
        case .all:
            return routineCount + activityCount
        case .activities:
            return activityCount
        case .routines:
            return routineCount
        }
    }
}

#Preview("Glass Segmented") {
    VStack(spacing: EquiDutyDesign.Spacing.xl) {
        TodayViewModeSelector(
            selectedMode: .constant(.all),
            routineCount: 3,
            activityCount: 5
        )

        TodayViewModeSelector(
            selectedMode: .constant(.activities),
            routineCount: 3,
            activityCount: 5
        )

        TodayViewModeSelector(
            selectedMode: .constant(.routines),
            routineCount: 3,
            activityCount: 5
        )
    }
    .padding()
    .background(Color(.systemBackground))
}

#Preview("Glass Pills") {
    VStack(spacing: EquiDutyDesign.Spacing.xl) {
        TodayViewModePills(
            selectedMode: .constant(.all),
            routineCount: 3,
            activityCount: 5
        )

        TodayViewModePills(
            selectedMode: .constant(.activities),
            routineCount: 3,
            activityCount: 5
        )
    }
    .padding()
    .background(Color(.systemBackground))
}
