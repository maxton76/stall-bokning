//
//  VaccinationFormSheet.swift
//  EquiDuty
//
//  Form for adding/editing vaccination records
//

import SwiftUI

struct VaccinationFormSheet: View {
    let horseId: String
    var editingRecord: VaccinationRecord?
    let rules: [VaccinationRule]
    let onSave: (VaccinationRecord) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var vaccinationService = VaccinationService.shared

    @State private var date = Date()
    @State private var vaccineName = ""
    @State private var selectedRuleId: String?
    @State private var vetName = ""
    @State private var notes = ""

    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isEditing: Bool { editingRecord != nil }

    var body: some View {
        NavigationStack {
            Form {
                // Vaccination Rule Selection (if rules available)
                if !rules.isEmpty {
                    Section(String(localized: "horse.vaccination.rule")) {
                        Picker(String(localized: "horse.vaccination.rule"), selection: $selectedRuleId) {
                            Text(String(localized: "horse.vaccination.custom"))
                                .tag(nil as String?)
                            ForEach(rules) { rule in
                                Text(rule.name).tag(rule.id as String?)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: selectedRuleId) { _, newValue in
                            if let ruleId = newValue,
                               let rule = rules.first(where: { $0.id == ruleId }) {
                                vaccineName = rule.name
                            }
                        }
                    }
                }

                // Basic Info
                Section(String(localized: "horse.vaccination.details")) {
                    TextField(String(localized: "horse.vaccination.name"), text: $vaccineName)
                        .disabled(selectedRuleId != nil)

                    DatePicker(
                        String(localized: "horse.vaccination.date"),
                        selection: $date,
                        in: ...Date(),
                        displayedComponents: .date
                    )

                    TextField(String(localized: "horse.vaccination.vet_name"), text: $vetName)
                }

                // Notes
                Section(String(localized: "horse.vaccination.notes")) {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }
            }
            .navigationTitle(isEditing
                ? String(localized: "horse.vaccination.edit")
                : String(localized: "horse.vaccination.add")
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(String(localized: "common.save"))
                        }
                    }
                    .disabled(isSaving || vaccineName.isEmpty)
                }
            }
            .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
                Button(String(localized: "common.ok")) {
                    errorMessage = nil
                }
            } message: {
                Text(errorMessage ?? "")
            }
            .onAppear {
                loadExistingData()
            }
        }
    }

    // MARK: - Data

    private func loadExistingData() {
        if let record = editingRecord {
            date = record.date
            vaccineName = record.vaccineName
            vetName = record.vetName ?? ""
            notes = record.notes ?? ""
            selectedRuleId = record.ruleId
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil

        do {
            if let record = editingRecord {
                // Update existing
                let updates = UpdateVaccinationRequest(
                    date: date,
                    vaccineName: vaccineName,
                    vetName: vetName.isEmpty ? nil : vetName,
                    notes: notes.isEmpty ? nil : notes,
                    ruleId: selectedRuleId
                )
                try await vaccinationService.updateVaccinationRecord(
                    horseId: horseId,
                    recordId: record.id,
                    updates: updates
                )

                // Create updated record for callback
                var updatedRecord = record
                updatedRecord.date = date
                updatedRecord.vaccineName = vaccineName
                updatedRecord.vetName = vetName.isEmpty ? nil : vetName
                updatedRecord.notes = notes.isEmpty ? nil : notes
                onSave(updatedRecord)
            } else {
                // Create new
                let request = CreateVaccinationRequest(
                    date: date,
                    vaccineName: vaccineName,
                    vetName: vetName.isEmpty ? nil : vetName,
                    notes: notes.isEmpty ? nil : notes,
                    ruleId: selectedRuleId
                )
                let newRecord = try await vaccinationService.addVaccinationRecord(
                    horseId: horseId,
                    record: request
                )
                onSave(newRecord)
            }

            isSaving = false
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

#Preview("Add") {
    VaccinationFormSheet(
        horseId: "test-horse",
        rules: [
            VaccinationRule(
                id: "rule1",
                organizationId: "org1",
                name: "Influenza",
                description: "Annual flu vaccination",
                intervalDays: 365,
                warningDays: 30,
                createdAt: Date(),
                updatedAt: Date()
            )
        ],
        onSave: { _ in }
    )
}

#Preview("Edit") {
    VaccinationFormSheet(
        horseId: "test-horse",
        editingRecord: VaccinationRecord(
            id: "record1",
            horseId: "test-horse",
            date: Date(),
            vaccineName: "Influenza",
            vetName: "Dr. Smith",
            notes: "No adverse reactions",
            createdAt: Date(),
            updatedAt: Date()
        ),
        rules: [],
        onSave: { _ in }
    )
}
