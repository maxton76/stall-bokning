//
//  RoutineSchedulesView.swift
//  EquiDuty
//
//  Routine schedules management - list and CRUD operations
//

import SwiftUI

struct RoutineSchedulesView: View {
    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared
    @State private var schedules: [RoutineSchedule] = []
    @State private var filterStatus: ScheduleStatus = .all
    @State private var isLoading = false
    @State private var errorMessage: String?

    // Navigation state
    @State private var showCreateSheet = false
    @State private var editingSchedule: RoutineSchedule?
    @State private var publishingSchedule: RoutineSchedule?
    @State private var scheduleToDelete: RoutineSchedule?
    @State private var showDeleteAlert = false

    enum ScheduleStatus: String, CaseIterable {
        case all, active, paused

        var displayName: String {
            switch self {
            case .all: return String(localized: "common.all")
            case .active: return String(localized: "schedules.filter.active")
            case .paused: return String(localized: "schedules.filter.paused")
            }
        }
    }

    var filteredSchedules: [RoutineSchedule] {
        var result = schedules

        switch filterStatus {
        case .all:
            break
        case .active:
            result = result.filter { $0.isActive && !$0.isPaused }
        case .paused:
            result = result.filter { $0.isPaused }
        }

        return result.sorted { $0.templateName < $1.templateName }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Filter tabs
            Picker("", selection: $filterStatus) {
                ForEach(ScheduleStatus.allCases, id: \.self) { status in
                    Text(status.displayName).tag(status)
                }
            }
            .pickerStyle(.segmented)
            .padding()

            // Content
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let errorMessage {
                ErrorView(message: errorMessage) {
                    loadData()
                }
            } else if filteredSchedules.isEmpty {
                ModernEmptyStateView(
                    icon: "repeat.circle",
                    title: String(localized: "schedules.empty.title"),
                    message: String(localized: "schedules.empty.message")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: EquiDutyDesign.Spacing.md) {
                        ForEach(filteredSchedules) { schedule in
                            RoutineScheduleCard(
                                schedule: schedule,
                                onEdit: { editingSchedule = schedule },
                                onPublish: { publishingSchedule = schedule },
                                onToggle: {
                                    Task { await toggleSchedule(schedule) }
                                },
                                onDelete: {
                                    scheduleToDelete = schedule
                                    showDeleteAlert = true
                                }
                            )
                        }
                    }
                    .padding()
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            // FAB
            Button {
                showCreateSheet = true
            } label: {
                Image(systemName: "plus")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(width: 60, height: 60)
                    .background(Color.accentColor)
                    .clipShape(Circle())
                    .shadow(radius: 4)
            }
            .padding()
        }
        .refreshable {
            await refreshData()
        }
        .onAppear {
            loadData()
        }
        .onChange(of: authService.selectedStable?.id) { _, _ in
            loadData()
        }
        .sheet(isPresented: $showCreateSheet) {
            RoutineScheduleFormView(mode: .create, onSave: { _ in
                loadData()
            })
        }
        .sheet(item: $editingSchedule) { schedule in
            RoutineScheduleFormView(mode: .edit(schedule), onSave: { _ in
                loadData()
            })
        }
        .sheet(item: $publishingSchedule) { schedule in
            PublishScheduleSheet(schedule: schedule, onPublish: { start, end in
                Task { await publish(schedule: schedule, startDate: start, endDate: end) }
            })
        }
        .alert(String(localized: "schedules.delete.title"), isPresented: $showDeleteAlert) {
            Button(String(localized: "common.cancel"), role: .cancel) {
                scheduleToDelete = nil
            }
            Button(String(localized: "common.delete"), role: .destructive) {
                if let schedule = scheduleToDelete {
                    Task { await delete(schedule: schedule) }
                }
            }
        } message: {
            Text(String(localized: "schedules.delete.message"))
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                if let stableId = authService.selectedStable?.id {
                    schedules = try await routineService.getRoutineSchedules(stableId: stableId)
                } else {
                    schedules = []
                }
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshData() async {
        do {
            if let stableId = authService.selectedStable?.id {
                schedules = try await routineService.getRoutineSchedules(stableId: stableId)
            } else {
                schedules = []
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Actions

    private func toggleSchedule(_ schedule: RoutineSchedule) async {
        do {
            try await routineService.toggleScheduleEnabled(scheduleId: schedule.id)
            await refreshData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func publish(schedule: RoutineSchedule, startDate: Date, endDate: Date) async {
        do {
            try await routineService.publishSchedule(scheduleId: schedule.id, startDate: startDate, endDate: endDate)
            publishingSchedule = nil
            await refreshData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func delete(schedule: RoutineSchedule) async {
        do {
            try await routineService.deleteRoutineSchedule(scheduleId: schedule.id)
            scheduleToDelete = nil
            await refreshData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Routine Schedule Card

struct RoutineScheduleCard: View {
    let schedule: RoutineSchedule
    let onEdit: () -> Void
    let onPublish: () -> Void
    let onToggle: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(schedule.templateName)
                        .font(.headline)

                    HStack(spacing: 8) {
                        Label(schedule.repeatPattern.displayName, systemImage: "repeat")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("•")
                            .foregroundStyle(.secondary)

                        Label(schedule.scheduledStartTime, systemImage: "clock")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Status badge
                HStack(spacing: 4) {
                    Circle()
                        .fill(schedule.statusColor)
                        .frame(width: 8, height: 8)
                    Text(schedule.statusText)
                        .font(.caption2)
                        .fontWeight(.medium)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(.systemGray6))
                .clipShape(Capsule())
            }

            // Days display
            if let repeatDays = schedule.repeatDays, !repeatDays.isEmpty {
                HStack(spacing: 4) {
                    DayBadge(day: "S", isSelected: repeatDays.contains(0)) // Sunday
                    DayBadge(day: "M", isSelected: repeatDays.contains(1)) // Monday
                    DayBadge(day: "T", isSelected: repeatDays.contains(2)) // Tuesday
                    DayBadge(day: "W", isSelected: repeatDays.contains(3)) // Wednesday
                    DayBadge(day: "T", isSelected: repeatDays.contains(4)) // Thursday
                    DayBadge(day: "F", isSelected: repeatDays.contains(5)) // Friday
                    DayBadge(day: "S", isSelected: repeatDays.contains(6)) // Saturday
                }
            }

            // Actions
            HStack(spacing: 12) {
                Button {
                    onEdit()
                } label: {
                    Image(systemName: "pencil")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)

                Button {
                    onPublish()
                } label: {
                    Label(String(localized: "schedules.publish"), systemImage: "calendar.badge.plus")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)

                Spacer()

                Button {
                    onToggle()
                } label: {
                    Image(systemName: schedule.isPaused ? "play.fill" : "pause.fill")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)

                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Image(systemName: "trash")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
            }
        }
        .contentCard()
    }
}

struct DayBadge: View {
    let day: String
    let isSelected: Bool

    var body: some View {
        Text(day)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundStyle(isSelected ? .white : .secondary)
            .frame(width: 24, height: 24)
            .background(isSelected ? Color.accentColor : Color(.systemGray6))
            .clipShape(Circle())
    }
}

extension RoutineSchedule {
    var statusColor: Color {
        if !isActive { return .gray }
        if isPaused { return .orange }
        return .green
    }

    var statusText: String {
        if !isActive { return String(localized: "schedules.status.inactive") }
        if isPaused { return String(localized: "schedules.status.paused") }
        return String(localized: "schedules.status.active")
    }
}

#Preview {
    RoutineSchedulesView()
}
