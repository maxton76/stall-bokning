//
//  TodayView.swift
//  EquiDuty
//
//  Unified daily view combining routines and activities
//

import SwiftUI

struct TodayView: View {
    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared
    @State private var activityService = ActivityService.shared
    @State private var selectedDate = Date()
    @State private var routines: [RoutineInstance] = []
    @State private var activities: [ActivityInstance] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let calendar = Calendar.current

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Date navigation
                    DateNavigationHeader(
                        selectedDate: $selectedDate,
                        onDateChanged: { loadData() }
                    )

                    // Stable selector
                    if let stable = authService.selectedStable {
                        StableContextBadge(stable: stable)
                    }

                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if let errorMessage {
                        ErrorView(message: errorMessage) {
                            loadData()
                        }
                    } else {
                        // Routines section
                        if !routines.isEmpty {
                            RoutinesSectionView(
                                routines: routines,
                                title: String(localized: "today.routines.title")
                            )
                        }

                        // Activities section
                        if !activities.isEmpty {
                            ActivitiesSectionView(
                                activities: activities,
                                title: String(localized: "today.activities.title")
                            )
                        }

                        // Empty state
                        if routines.isEmpty && activities.isEmpty {
                            EmptyStateView(
                                icon: "calendar.badge.checkmark",
                                title: String(localized: "today.empty.title"),
                                message: String(localized: "today.empty.message")
                            )
                        }
                    }
                }
                .padding()
            }
            .navigationTitle(String(localized: "today.title"))
            .refreshable {
                await refreshData()
            }
            .onAppear {
                loadData()
            }
            .onChange(of: authService.selectedStable?.id) { _, _ in
                loadData()
            }
            .onChange(of: authService.selectedOrganization?.id) { _, _ in
                loadData()
            }
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        print("📱 TodayView.loadData() - selectedStable: \(authService.selectedStable?.name ?? "nil"), selectedOrg: \(authService.selectedOrganization?.name ?? "nil")")

        Task {
            do {
                // Fetch routines if stable is selected
                if let stableId = authService.selectedStable?.id {
                    print("🔄 Fetching routines for stable: \(stableId)")
                    routines = try await routineService.getRoutineInstances(
                        stableId: stableId,
                        date: selectedDate
                    )
                    print("✅ Fetched \(routines.count) routines")

                    // Fetch activities for the same stable
                    print("🔄 Fetching activities for stable: \(stableId)")
                    activities = try await activityService.getActivitiesForStable(
                        stableId: stableId,
                        startDate: selectedDate,
                        endDate: selectedDate,
                        types: nil
                    )
                    print("✅ Fetched \(activities.count) activities")
                } else {
                    print("⚠️ No stable selected, skipping data fetch")
                    routines = []
                    activities = []
                }

                isLoading = false
            } catch {
                print("❌ Error loading data: \(error)")
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshData() async {
        do {
            // Fetch routines and activities if stable is selected
            if let stableId = authService.selectedStable?.id {
                routines = try await routineService.getRoutineInstances(
                    stableId: stableId,
                    date: selectedDate
                )
                activities = try await activityService.getActivitiesForStable(
                    stableId: stableId,
                    startDate: selectedDate,
                    endDate: selectedDate,
                    types: nil
                )
            } else {
                routines = []
                activities = []
            }

            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Date Navigation Header

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

            Spacer()

            VStack {
                Text(selectedDate, format: .dateTime.weekday(.wide))
                    .font(.headline)

                Text(selectedDate, format: .dateTime.day().month(.abbreviated))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
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
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Stable Context Badge

struct StableContextBadge: View {
    let stable: Stable

    var body: some View {
        HStack {
            Image(systemName: "building.2.fill")
                .foregroundStyle(.secondary)

            Text(stable.name)
                .font(.subheadline)
                .fontWeight(.medium)

            Spacer()

            Button {
                // TODO: Show stable selector
            } label: {
                Text(String(localized: "common.change"))
                    .font(.caption)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Routines Section

struct RoutinesSectionView: View {
    let routines: [RoutineInstance]
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            ForEach(routines) { routine in
                RoutineCard(routine: routine)
            }
        }
    }
}

// MARK: - Activities Section

struct ActivitiesSectionView: View {
    let activities: [ActivityInstance]
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            ForEach(activities) { activity in
                ActivityCard(activity: activity)
            }
        }
    }
}

// MARK: - Routine Card

struct RoutineCard: View {
    let routine: RoutineInstance

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "checklist")
                    .foregroundStyle(Color.accentColor)

                Text(routine.templateName)
                    .font(.headline)

                Spacer()

                StatusBadge(status: routine.status.displayName, color: Color(routine.status.color))
            }

            HStack {
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

            // Progress bar
            ProgressView(value: routine.progress.percentComplete, total: 100)
                .tint(Color.accentColor)

            Text("\(routine.progress.stepsCompleted)/\(routine.progress.stepsTotal) \(String(localized: "routine.steps_completed"))")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Activity Card

struct ActivityCard: View {
    let activity: ActivityInstance

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: activity.activityTypeCategory.icon)
                    .foregroundStyle(Color.accentColor)

                Text(activity.activityTypeName)
                    .font(.headline)

                Spacer()

                StatusBadge(status: activity.status.displayName, color: Color(activity.status.color))
            }

            if !activity.horseNames.isEmpty {
                Text(activity.horseNames.joined(separator: ", "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack {
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
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    TodayView()
}
