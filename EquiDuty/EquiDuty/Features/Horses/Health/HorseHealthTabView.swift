//
//  HorseHealthTabView.swift
//  EquiDuty
//
//  Health tab view for horse details showing vaccinations and care activities
//

import SwiftUI

struct HorseHealthTabView: View {
    let horse: Horse

    @State private var vaccinationService = VaccinationService.shared
    @State private var authService = AuthService.shared

    @State private var vaccinationRecords: [VaccinationRecord] = []
    @State private var vaccinationRules: [VaccinationRule] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showAddVaccination = false
    @State private var editingRecord: VaccinationRecord?
    @State private var recordToDelete: VaccinationRecord?
    @State private var showDeleteConfirmation = false

    var body: some View {
        VStack(spacing: EquiDutyDesign.Spacing.standard) {
            // Vaccination Status Card
            VaccinationStatusCard(horse: horse)

            // Vaccination History
            VaccinationHistoryCard(
                records: vaccinationRecords,
                isLoading: isLoading,
                onAdd: { showAddVaccination = true },
                onEdit: { record in editingRecord = record },
                onDelete: { record in
                    recordToDelete = record
                    showDeleteConfirmation = true
                }
            )

            // Care Activities
            CareActivityCardView(horse: horse)
        }
        .padding(.horizontal)
        .onAppear {
            loadData()
        }
        .refreshable {
            await refreshData()
        }
        .sheet(isPresented: $showAddVaccination) {
            VaccinationFormSheet(
                horseId: horse.id,
                rules: vaccinationRules,
                onSave: { _ in
                    loadData()
                }
            )
        }
        .sheet(item: $editingRecord) { record in
            VaccinationFormSheet(
                horseId: horse.id,
                editingRecord: record,
                rules: vaccinationRules,
                onSave: { _ in
                    loadData()
                }
            )
        }
        .confirmationDialog(
            String(localized: "horse.vaccination.delete.title"),
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
            Text(String(localized: "horse.vaccination.delete.message"))
        }
        .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
            Button(String(localized: "common.ok")) {
                errorMessage = nil
            }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                // Fetch records
                vaccinationRecords = try await vaccinationService.getVaccinationRecords(horseId: horse.id)

                // Fetch rules if organization is selected
                if let orgId = authService.selectedOrganization?.id {
                    vaccinationRules = try await vaccinationService.getVaccinationRules(organizationId: orgId)
                } else {
                    vaccinationRules = []
                }

                // Sort records by date descending
                vaccinationRecords.sort { $0.date > $1.date }

                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshData() async {
        do {
            vaccinationRecords = try await vaccinationService.getVaccinationRecords(horseId: horse.id)
            vaccinationRecords.sort { $0.date > $1.date }

            if let orgId = authService.selectedOrganization?.id {
                vaccinationRules = try await vaccinationService.getVaccinationRules(organizationId: orgId)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteRecord(_ record: VaccinationRecord) {
        Task {
            do {
                try await vaccinationService.deleteVaccinationRecord(
                    horseId: horse.id,
                    recordId: record.id
                )
                vaccinationRecords.removeAll { $0.id == record.id }
                recordToDelete = nil
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Vaccination Status Card

struct VaccinationStatusCard: View {
    let horse: Horse

    var body: some View {
        InfoCard(title: String(localized: "horse.vaccination.status")) {
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                // Status indicator
                if let status = horse.vaccinationStatus {
                    HStack {
                        VaccinationBadge(status: status)
                        Spacer()
                    }
                }

                Divider()

                // Last vaccination
                if let lastDate = horse.lastVaccinationDate {
                    HStack {
                        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                            Text(String(localized: "horse.vaccination.last"))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(lastDate.formatted(date: .abbreviated, time: .omitted))
                                .font(.body)
                        }
                        Spacer()
                    }
                }

                // Next due
                if let nextDate = horse.nextVaccinationDue {
                    HStack {
                        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                            Text(String(localized: "horse.vaccination.next"))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                                Text(nextDate.formatted(date: .abbreviated, time: .omitted))
                                    .font(.body)

                                // Days until due badge
                                let daysUntil = Calendar.current.dateComponents([.day], from: Date(), to: nextDate).day ?? 0
                                if daysUntil < 0 {
                                    Text(String(localized: "horse.vaccination.overdue_days \(abs(daysUntil))"))
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, EquiDutyDesign.Spacing.sm)
                                        .padding(.vertical, EquiDutyDesign.Spacing.xs)
                                        .background(.red)
                                        .clipShape(Capsule())
                                } else if daysUntil <= 30 {
                                    Text(String(localized: "horse.vaccination.due_days \(daysUntil)"))
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, EquiDutyDesign.Spacing.sm)
                                        .padding(.vertical, EquiDutyDesign.Spacing.xs)
                                        .background(.orange)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                        Spacer()
                    }
                }

                // No vaccination info
                if horse.vaccinationStatus == nil && horse.lastVaccinationDate == nil {
                    Text(String(localized: "horse.vaccination.no_records"))
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

// MARK: - Vaccination History Card

struct VaccinationHistoryCard: View {
    let records: [VaccinationRecord]
    let isLoading: Bool
    let onAdd: () -> Void
    let onEdit: (VaccinationRecord) -> Void
    let onDelete: (VaccinationRecord) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            // Header with add button
            HStack {
                Text(String(localized: "horse.vaccination.history"))
                    .font(.headline)
                Spacer()
                Button {
                    onAdd()
                } label: {
                    Label(String(localized: "common.add"), systemImage: "plus.circle.fill")
                        .font(.subheadline)
                }
            }

            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical)
            } else if records.isEmpty {
                VStack(spacing: EquiDutyDesign.Spacing.sm) {
                    Image(systemName: "syringe")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text(String(localized: "horse.vaccination.history.empty"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button {
                        onAdd()
                    } label: {
                        Text(String(localized: "horse.vaccination.add_first"))
                            .font(.subheadline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            } else {
                ForEach(records) { record in
                    VaccinationRecordRow(
                        record: record,
                        onEdit: { onEdit(record) },
                        onDelete: { onDelete(record) }
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
}

// MARK: - Vaccination Record Row

struct VaccinationRecordRow: View {
    let record: VaccinationRecord
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(record.vaccineName)
                    .font(.body)
                    .fontWeight(.medium)

                Text(record.date.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let vetName = record.vetName, !vetName.isEmpty {
                    HStack(spacing: EquiDutyDesign.Spacing.xs) {
                        Image(systemName: "person.fill")
                            .font(.caption2)
                        Text(vetName)
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }

                if let notes = record.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

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

#Preview {
    ScrollView {
        HorseHealthTabView(horse: Horse(
            id: "test",
            name: "Test Horse",
            color: .brown,
            ownerId: "owner1",
            status: .active,
            lastVaccinationDate: Date().addingTimeInterval(-60 * 60 * 24 * 180),
            nextVaccinationDue: Date().addingTimeInterval(60 * 60 * 24 * 30),
            vaccinationStatus: .expiringSoon,
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}
