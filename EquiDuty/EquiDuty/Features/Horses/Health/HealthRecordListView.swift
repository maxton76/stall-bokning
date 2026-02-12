//
//  HealthRecordListView.swift
//  EquiDuty
//
//  Comprehensive health records list for a horse

import SwiftUI

struct HealthRecordListView: View {
    let horse: Horse

    @State private var service = HealthRecordService.shared

    private var canEdit: Bool {
        RBACFilterService.shared.canEditHorse(horse)
    }
    @State private var records: [HealthRecord] = []
    @State private var stats: HealthRecordStats?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedType: HealthRecordType?
    @State private var showAddRecord = false
    @State private var editingRecord: HealthRecord?
    @State private var recordToDelete: HealthRecord?
    @State private var showDeleteConfirmation = false

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            // Stats card
            if let stats {
                HealthStatsCard(stats: stats)
            }

            // Type filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: EquiDutyDesign.Spacing.sm) {
                    FilterChip(
                        label: String(localized: "common.all"),
                        isSelected: selectedType == nil,
                        action: { selectedType = nil; loadRecords() }
                    )
                    ForEach(HealthRecordType.allCases) { type in
                        FilterChip(
                            label: type.displayName,
                            icon: type.icon,
                            color: type.color,
                            isSelected: selectedType == type,
                            action: { selectedType = type; loadRecords() }
                        )
                    }
                }
                .padding(.horizontal)
            }

            // Records list
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                HStack {
                    Text(String(localized: "health.records"))
                        .font(.headline)
                    Spacer()
                    if canEdit {
                        Button {
                            showAddRecord = true
                        } label: {
                            Label(String(localized: "common.add"), systemImage: "plus.circle.fill")
                                .font(.subheadline)
                        }
                    }
                }

                if isLoading && records.isEmpty {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(.vertical)
                } else if records.isEmpty {
                    VStack(spacing: EquiDutyDesign.Spacing.sm) {
                        Image(systemName: "heart.text.square")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text(String(localized: "health.records.empty"))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        if canEdit {
                            Button {
                                showAddRecord = true
                            } label: {
                                Text(String(localized: "health.records.add_first"))
                                    .font(.subheadline)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical)
                } else {
                    ForEach(records) { record in
                        HealthRecordRow(
                            record: record,
                            canEdit: canEdit,
                            onEdit: { editingRecord = record },
                            onDelete: {
                                recordToDelete = record
                                showDeleteConfirmation = true
                            }
                        )
                        if record.id != records.last?.id {
                            Divider()
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentCard()
        }
        .onAppear { loadData() }
        .sheet(isPresented: $showAddRecord) {
            HealthRecordFormSheet(
                horseId: horse.id,
                onSave: { _ in loadData() }
            )
        }
        .sheet(item: $editingRecord) { record in
            HealthRecordFormSheet(
                horseId: horse.id,
                editingRecord: record,
                onSave: { _ in loadData() }
            )
        }
        .confirmationDialog(
            String(localized: "health.record.delete.title"),
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button(String(localized: "common.delete"), role: .destructive) {
                if let record = recordToDelete {
                    deleteRecord(record)
                }
            }
            Button(String(localized: "common.cancel"), role: .cancel) {
                recordToDelete = nil
            }
        } message: {
            Text(String(localized: "health.record.delete.message"))
        }
        .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
            Button(String(localized: "common.ok")) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    // MARK: - Data

    private func loadData() {
        loadRecords()
        loadStats()
    }

    private func loadRecords() {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        Task {
            defer { isLoading = false }
            do {
                records = try await service.getHealthRecords(
                    horseId: horse.id,
                    recordType: selectedType
                )
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func loadStats() {
        Task {
            do {
                stats = try await service.getStats(horseId: horse.id)
            } catch {
                // Non-critical
            }
        }
    }

    private func deleteRecord(_ record: HealthRecord) {
        Task {
            do {
                try await service.deleteHealthRecord(id: record.id, horseId: horse.id)
                records.removeAll { $0.id == record.id }
                recordToDelete = nil
                loadStats()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Health Record Row

struct HealthRecordRow: View {
    let record: HealthRecord
    var canEdit: Bool = true
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top) {
            // Type icon
            Image(systemName: record.recordType.icon)
                .font(.title3)
                .foregroundStyle(record.recordType.color)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(record.title)
                    .font(.body)
                    .fontWeight(.medium)

                Text(record.date.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let provider = record.provider, !provider.isEmpty {
                    HStack(spacing: EquiDutyDesign.Spacing.xs) {
                        Image(systemName: "person.fill")
                            .font(.caption2)
                        Text(provider)
                            .font(.caption)
                        if let clinic = record.clinic, !clinic.isEmpty {
                            Text("- \(clinic)")
                                .font(.caption)
                        }
                    }
                    .foregroundStyle(.secondary)
                }

                if let diagnosis = record.diagnosis, !diagnosis.isEmpty {
                    Text(diagnosis)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                HStack(spacing: EquiDutyDesign.Spacing.sm) {
                    if let cost = record.cost {
                        Text("\(Int(cost)) \(record.currency ?? "SEK")")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.orange)
                    }

                    if record.requiresFollowUp == true {
                        Label(String(localized: "health.follow_up"), systemImage: "calendar.badge.clock")
                            .font(.caption2)
                            .foregroundStyle(.blue)
                    }
                }
            }

            Spacer()

            if canEdit {
                Menu {
                    Button {
                        onEdit()
                    } label: {
                        Label(String(localized: "common.edit"), systemImage: "pencil")
                    }
                    Button(role: .destructive) {
                        onDelete()
                    } label: {
                        Label(String(localized: "common.delete"), systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

// MARK: - Health Stats Card

struct HealthStatsCard: View {
    let stats: HealthRecordStats

    var body: some View {
        InfoCard(title: String(localized: "health.stats")) {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
            ], spacing: EquiDutyDesign.Spacing.md) {
                StatItem(
                    label: String(localized: "health.stats.total"),
                    value: "\(stats.totalRecords)",
                    icon: "heart.text.square",
                    color: .blue
                )
                StatItem(
                    label: String(localized: "health.stats.follow_ups"),
                    value: "\(stats.upcomingFollowUps)",
                    icon: "calendar.badge.clock",
                    color: .orange
                )
            }

            if stats.totalCostThisYear > 0 {
                Divider()
                HStack {
                    Text(String(localized: "health.stats.cost_year"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("\(Int(stats.totalCostThisYear)) SEK")
                        .font(.body)
                        .fontWeight(.medium)
                }
            }
        }
    }
}

struct StatItem: View {
    let label: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.xs) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let label: String
    var icon: String?
    var color: Color = .accentColor
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon {
                    Image(systemName: icon)
                        .font(.caption2)
                }
                Text(label)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, EquiDutyDesign.Spacing.md)
            .padding(.vertical, EquiDutyDesign.Spacing.sm)
            .background(isSelected ? color.opacity(0.2) : Color(.systemGray6))
            .foregroundStyle(isSelected ? color : .secondary)
            .clipShape(Capsule())
        }
    }
}

#Preview {
    ScrollView {
        HealthRecordListView(horse: Horse(
            id: "test",
            name: "Test Horse",
            color: .brown,
            ownerId: "owner1",
            status: .active,
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}
