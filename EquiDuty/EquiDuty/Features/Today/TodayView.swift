//
//  TodayView.swift
//  EquiDuty
//
//  Unified daily view combining routines and activities with enhanced navigation,
//  view modes, and filtering (matching web frontend TodayPage.tsx)
//
//  NAVIGATION PATTERN:
//  - Uses NavigationLink(value: AppDestination.xxx) for standard navigation
//  - Uses withAppNavigationDestinations() for ID-based deep linking support
//  - See NavigationRouter.swift for available destinations
//

import SwiftUI

struct TodayView: View {
    @State private var viewModel = TodayViewModel()
    @State private var authService = AuthService.shared
    @State private var router = NavigationRouter.shared
    @Environment(NotificationViewModel.self) private var notificationViewModel
    @State private var showNotificationCenter = false

    var body: some View {
        NavigationStack(path: $router.todayPath) {
            ScrollView {
                VStack(spacing: EquiDutyDesign.Spacing.lg) {
                    // Enhanced date navigation with period selector
                    TodayDateNavigationHeader(
                        selectedDate: $viewModel.selectedDate,
                        periodType: $viewModel.periodType,
                        onDateChanged: { viewModel.loadData() },
                        onPeriodChanged: { viewModel.loadData() }
                    )

                    // View mode selector with counts
                    TodayViewModeSelector(
                        selectedMode: $viewModel.viewMode,
                        routineCount: viewModel.routineCount,
                        activityCount: viewModel.activityCount
                    )

                    // Filter button
                    HStack(spacing: EquiDutyDesign.Spacing.md) {
                        TodayFilterButton(filters: viewModel.filters) {
                            viewModel.showFilterSheet = true
                        }

                        Spacer()

                        // Quick filter toggle for "For Me" with glass styling
                        ForMeToggleButton(
                            isActive: Binding(
                                get: { viewModel.filters.forMe },
                                set: { viewModel.filters.forMe = $0 }
                            )
                        )
                    }

                    // Main content with animation wrapper
                    Group {
                        if viewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity, minHeight: 200)
                        } else if let errorMessage = viewModel.errorMessage {
                            ErrorView(message: errorMessage) {
                                viewModel.loadData()
                            }
                        } else {
                            // Content based on view mode
                            TodayContentView(viewModel: viewModel)
                        }
                    }
                    .animation(.easeInOut(duration: EquiDutyDesign.Animation.standard), value: viewModel.viewMode)
                    .animation(.easeInOut(duration: EquiDutyDesign.Animation.standard), value: viewModel.isLoading)
                }
                .padding(EquiDutyDesign.Spacing.md)
            }
            .navigationTitle(String(localized: "today.title"))
            .notificationBellToolbar(viewModel: notificationViewModel, showNotificationCenter: $showNotificationCenter)
            .withAppNavigationDestinations()
            .refreshable {
                await viewModel.refreshData()
            }
            .onAppear {
                viewModel.loadData()
            }
            .onChange(of: authService.selectedStable?.id) { _, _ in
                viewModel.loadData()
            }
            .onChange(of: PermissionService.shared.userPermissions) { _, newValue in
                // Reload when permissions finish loading (fixes race condition on app launch)
                if newValue != nil && viewModel.errorMessage != nil {
                    viewModel.loadData()
                }
            }
            .onChange(of: router.todayPath.count) { oldCount, newCount in
                // Reload data when navigating back (path gets shorter)
                if newCount < oldCount {
                    viewModel.forceLoadData()
                }
            }
            .sheet(isPresented: $viewModel.showFilterSheet) {
                TodayFilterSheet(filters: $viewModel.filters) {
                    // Filters applied - data updates via computed properties
                }
            }
        }
    }
}

// MARK: - For Me Toggle Button

/// Glass-styled toggle button for "For Me" filter
struct ForMeToggleButton: View {
    @Binding var isActive: Bool

    var body: some View {
        Button {
            withAnimation(.easeInOut(duration: EquiDutyDesign.Animation.quick)) {
                isActive.toggle()
            }
        } label: {
            Label(
                String(localized: "today.filters.forMe"),
                systemImage: "person.fill"
            )
            .font(.subheadline)
            .fontWeight(.medium)
            .padding(.horizontal, EquiDutyDesign.Spacing.md)
            .padding(.vertical, EquiDutyDesign.Spacing.sm)
        }
        .background(
            RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous)
                .fill(isActive ? Color.accentColor.opacity(0.15) : .clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium, style: .continuous)
                .strokeBorder(isActive ? Color.accentColor : Color.secondary.opacity(0.3), lineWidth: 1)
        )
        .foregroundStyle(isActive ? Color.accentColor : .secondary)
        .buttonStyle(.scale)
    }
}

// MARK: - Content View

/// Main content view that switches based on view mode
/// Uses NavigationLink for activity navigation (see TodayActivityCard)
struct TodayContentView: View {
    let viewModel: TodayViewModel

    var body: some View {
        switch viewModel.viewMode {
        case .all:
            AllContentView(viewModel: viewModel)
        case .activities:
            ActivitiesOnlyView(viewModel: viewModel)
        case .routines:
            RoutinesOnlyView(viewModel: viewModel)
        }
    }
}

/// All content (routines + activities)
/// Activities use NavigationLink for navigation (see TodayActivityCard)
struct AllContentView: View {
    let viewModel: TodayViewModel

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.lg) {
            // Check if completely empty
            if viewModel.isEmpty {
                ModernEmptyStateView(
                    icon: "calendar.badge.checkmark",
                    title: String(localized: "today.empty.title"),
                    message: String(localized: "today.empty.message")
                )
            } else if viewModel.isFilteredEmpty && viewModel.filters.hasActiveFilters {
                // Filtered to empty
                ModernEmptyStateView(
                    icon: "line.3.horizontal.decrease.circle",
                    title: String(localized: "today.filtered.empty.title"),
                    message: String(localized: "today.filtered.empty.message")
                )
            } else {
                // Routines section (always shows today's routines only)
                if !viewModel.filteredRoutines.isEmpty {
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                        ModernSectionHeader(title: String(localized: "today.routines.todaysTitle"))
                        TodayRoutineList(
                            routineGroups: viewModel.routineGroups,
                            showEmptyState: false
                        )
                    }
                }

                // Activities section
                if !viewModel.filteredActivities.isEmpty {
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                        ModernSectionHeader(title: String(localized: "today.activities.title"))
                        TodayActivityList(
                            activities: viewModel.filteredActivities,
                            groupBy: viewModel.filters.groupBy,
                            periodType: viewModel.periodType,
                            referenceDate: viewModel.selectedDate,
                            showEmptyState: false
                        )
                    }
                }
            }
        }
    }
}

/// Activities only view
/// Uses NavigationLink for activity navigation (see TodayActivityCard)
struct ActivitiesOnlyView: View {
    let viewModel: TodayViewModel

    var body: some View {
        if viewModel.activities.isEmpty {
            ModernEmptyStateView(
                icon: "calendar.badge.checkmark",
                title: String(localized: "today.activities.empty.title"),
                message: String(localized: "today.activities.empty.message")
            )
        } else if viewModel.filteredActivities.isEmpty && viewModel.filters.hasActiveFilters {
            ModernEmptyStateView(
                icon: "line.3.horizontal.decrease.circle",
                title: String(localized: "today.filtered.empty.title"),
                message: String(localized: "today.filtered.empty.message")
            )
        } else {
            TodayActivityList(
                activities: viewModel.filteredActivities,
                groupBy: viewModel.filters.groupBy,
                periodType: viewModel.periodType,
                referenceDate: viewModel.selectedDate
            )
        }
    }
}

/// Routines only view
struct RoutinesOnlyView: View {
    let viewModel: TodayViewModel

    var body: some View {
        if viewModel.routines.isEmpty {
            ModernEmptyStateView(
                icon: "checklist",
                title: String(localized: "today.routines.empty.title"),
                message: String(localized: "today.routines.empty.message")
            )
        } else if viewModel.filteredRoutines.isEmpty && viewModel.filters.hasActiveFilters {
            ModernEmptyStateView(
                icon: "line.3.horizontal.decrease.circle",
                title: String(localized: "today.filtered.empty.title"),
                message: String(localized: "today.filtered.empty.message")
            )
        } else {
            TodayRoutineList(routineGroups: viewModel.routineGroups)
        }
    }
}

// MARK: - Supporting Views (Legacy Compatibility)

/// Simple date navigation header (kept for backward compatibility)
struct DateNavigationHeader: View {
    @Binding var selectedDate: Date
    var onDateChanged: () -> Void

    private let calendar = Calendar.current

    var body: some View {
        HStack {
            Button {
                selectedDate = calendar.date(byAdding: .day, value: -1, to: selectedDate) ?? selectedDate
                onDateChanged()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.title3)
                    .fontWeight(.semibold)
            }
            .buttonStyle(.scale)

            Spacer()

            VStack(spacing: EquiDutyDesign.Spacing.xs) {
                Text(selectedDate, format: .dateTime.weekday(.wide))
                    .font(.headline)
                    .contentTransition(.interpolate)

                Text(selectedDate, format: .dateTime.day().month(.abbreviated))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .contentTransition(.interpolate)
            }

            Spacer()

            Button {
                selectedDate = calendar.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
                onDateChanged()
            } label: {
                Image(systemName: "chevron.right")
                    .font(.title3)
                    .fontWeight(.semibold)
            }
            .buttonStyle(.scale)
        }
        .glassNavigation()
    }
}

// MARK: - Legacy Section Views (for other views that may use them)

struct RoutinesSectionView: View {
    let routines: [RoutineInstance]
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: title)

            ForEach(routines) { routine in
                RoutineCard(routine: routine)
            }
        }
    }
}

struct ActivitiesSectionView: View {
    let activities: [ActivityInstance]
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            ModernSectionHeader(title: title)

            ForEach(activities) { activity in
                ActivityCard(activity: activity)
            }
        }
    }
}

// MARK: - Legacy Routine Card

struct RoutineCard: View {
    let routine: RoutineInstance

    /// Whether the routine is currently active
    private var isActive: Bool {
        routine.status == .inProgress
    }

    /// Icon for the current status
    private var statusIcon: String {
        switch routine.status {
        case .completed: return "checkmark.circle.fill"
        case .started, .inProgress: return "clock.fill"
        case .scheduled: return "circle"
        case .missed: return "exclamationmark.circle.fill"
        case .cancelled: return "xmark.circle.fill"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Image(systemName: "checklist")
                    .font(.system(size: EquiDutyDesign.IconSize.medium))
                    .foregroundStyle(Color.accentColor)
                    .symbolEffect(.variableColor.iterative, isActive: isActive)

                Text(routine.templateName)
                    .font(.headline)

                Spacer()

                ModernStatusBadge(
                    status: routine.status.displayName,
                    color: routine.status.color,
                    icon: statusIcon,
                    isAnimating: isActive
                )
            }

            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                Image(systemName: "clock")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(routine.scheduledStartTime)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let assignedName = routine.assignedToName {
                    Text("•")
                        .foregroundStyle(.secondary)

                    Text(assignedName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Modern progress bar
            ModernProgressView(
                value: routine.progress.percentComplete,
                total: 100
            )

            Text("\(routine.progress.stepsCompleted)/\(routine.progress.stepsTotal) \(String(localized: "routine.steps_completed"))")
                .font(.caption)
                .foregroundStyle(.secondary)
                .contentTransition(.numericText())
        }
        .contentCard()
    }
}

// MARK: - Legacy Activity Card

struct ActivityCard: View {
    let activity: ActivityInstance

    /// Whether the activity is currently in progress
    private var isInProgress: Bool {
        activity.status == .inProgress
    }

    /// Icon for the current status
    private var statusIcon: String {
        switch activity.status {
        case .completed: return "checkmark.circle.fill"
        case .inProgress: return "clock.fill"
        case .cancelled: return "xmark.circle.fill"
        case .pending: return "calendar"
        case .overdue: return "exclamationmark.circle.fill"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                Image(systemName: activity.activityTypeCategory.icon)
                    .font(.system(size: EquiDutyDesign.IconSize.medium))
                    .foregroundStyle(Color.accentColor)
                    .symbolEffect(.pulse, isActive: isInProgress)

                Text(activity.activityTypeName)
                    .font(.headline)

                Spacer()

                ModernStatusBadge(
                    status: activity.status.displayName,
                    color: activity.status.color,
                    icon: statusIcon,
                    isAnimating: isInProgress
                )
            }

            if !activity.horseNames.isEmpty {
                Text(activity.horseNames.joined(separator: ", "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                if let time = activity.scheduledTime {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(time)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let assignedName = activity.assignedToName {
                    Text("•")
                        .foregroundStyle(.secondary)

                    Text(assignedName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .contentCard()
    }
}

#Preview {
    TodayView()
}
