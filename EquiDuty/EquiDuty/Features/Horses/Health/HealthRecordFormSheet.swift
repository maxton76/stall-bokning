//
//  HealthRecordFormSheet.swift
//  EquiDuty
//
//  Create/edit health record form

import SwiftUI

struct HealthRecordFormSheet: View {
    let horseId: String
    var editingRecord: HealthRecord?
    let onSave: (HealthRecord) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var service = HealthRecordService.shared

    // Required fields
    @State private var recordType: HealthRecordType = .veterinary
    @State private var title = ""
    @State private var date = Date()

    // Optional time/duration
    @State private var hasScheduledTime = false
    @State private var scheduledTime = Date()
    @State private var hasDuration = false
    @State private var durationMinutes = ""

    // Provider
    @State private var provider = ""
    @State private var clinic = ""

    // Clinical details
    @State private var diagnosis = ""
    @State private var treatment = ""
    @State private var symptoms = ""
    @State private var findings = ""

    // Cost
    @State private var hasCost = false
    @State private var cost = ""
    @State private var currency = "SEK"

    // Follow-up
    @State private var requiresFollowUp = false
    @State private var followUpDate = Date().addingTimeInterval(60 * 60 * 24 * 14)
    @State private var followUpNotes = ""

    // Notes
    @State private var notes = ""

    // State
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isEditing: Bool { editingRecord != nil }

    var body: some View {
        NavigationStack {
            Form {
                // Type & title
                Section(String(localized: "health.form.basics")) {
                    Picker(String(localized: "health.form.type"), selection: $recordType) {
                        ForEach(HealthRecordType.allCases) { type in
                            Label(type.displayName, systemImage: type.icon)
                                .tag(type)
                        }
                    }

                    TextField(String(localized: "health.form.title"), text: $title)

                    DatePicker(
                        String(localized: "health.form.date"),
                        selection: $date,
                        displayedComponents: .date
                    )

                    Toggle(String(localized: "health.form.has_time"), isOn: $hasScheduledTime)
                    if hasScheduledTime {
                        DatePicker(
                            String(localized: "health.form.time"),
                            selection: $scheduledTime,
                            displayedComponents: .hourAndMinute
                        )
                    }

                    Toggle(String(localized: "health.form.has_duration"), isOn: $hasDuration)
                    if hasDuration {
                        HStack {
                            TextField(String(localized: "health.form.duration"), text: $durationMinutes)
                                .keyboardType(.numberPad)
                            Text(String(localized: "common.unit.minutes"))
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Provider
                Section(String(localized: "health.form.provider")) {
                    TextField(String(localized: "health.form.provider_name"), text: $provider)
                    TextField(String(localized: "health.form.clinic"), text: $clinic)
                }

                // Clinical details
                Section(String(localized: "health.form.clinical")) {
                    TextField(String(localized: "health.form.symptoms"), text: $symptoms, axis: .vertical)
                        .lineLimit(2...5)
                    TextField(String(localized: "health.form.diagnosis"), text: $diagnosis, axis: .vertical)
                        .lineLimit(2...5)
                    TextField(String(localized: "health.form.treatment"), text: $treatment, axis: .vertical)
                        .lineLimit(2...5)
                    TextField(String(localized: "health.form.findings"), text: $findings, axis: .vertical)
                        .lineLimit(2...5)
                }

                // Cost
                Section(String(localized: "health.form.cost")) {
                    Toggle(String(localized: "health.form.has_cost"), isOn: $hasCost)
                    if hasCost {
                        HStack {
                            TextField(String(localized: "health.form.amount"), text: $cost)
                                .keyboardType(.decimalPad)
                            Text(currency)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Follow-up
                Section(String(localized: "health.form.follow_up")) {
                    Toggle(String(localized: "health.form.requires_follow_up"), isOn: $requiresFollowUp)
                    if requiresFollowUp {
                        DatePicker(
                            String(localized: "health.form.follow_up_date"),
                            selection: $followUpDate,
                            displayedComponents: .date
                        )
                        TextField(String(localized: "health.form.follow_up_notes"), text: $followUpNotes, axis: .vertical)
                            .lineLimit(2...4)
                    }
                }

                // Notes
                Section(String(localized: "health.form.notes")) {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }
            }
            .navigationTitle(isEditing ? String(localized: "health.record.edit") : String(localized: "health.record.add"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) { dismiss() }
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
                    .disabled(isSaving || title.isEmpty)
                }
            }
            .alert(String(localized: "common.error"), isPresented: .constant(errorMessage != nil)) {
                Button(String(localized: "common.ok")) { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
            .onAppear { populateFromRecord() }
        }
    }

    // MARK: - Data

    private func populateFromRecord() {
        guard let record = editingRecord else { return }
        recordType = record.recordType
        title = record.title
        date = record.date
        if let time = record.scheduledTime {
            hasScheduledTime = true
            let formatter = DateFormatter()
            formatter.dateFormat = "HH:mm"
            if let parsed = formatter.date(from: time) {
                scheduledTime = parsed
            }
        }
        if let dur = record.duration {
            hasDuration = true
            durationMinutes = String(dur)
        }
        provider = record.provider ?? ""
        clinic = record.clinic ?? ""
        diagnosis = record.diagnosis ?? ""
        treatment = record.treatment ?? ""
        symptoms = record.symptoms ?? ""
        findings = record.findings ?? ""
        if let c = record.cost {
            hasCost = true
            cost = String(c)
        }
        currency = record.currency ?? "SEK"
        requiresFollowUp = record.requiresFollowUp ?? false
        if let fDate = record.followUpDate {
            followUpDate = fDate
        }
        followUpNotes = record.followUpNotes ?? ""
        notes = record.notes ?? ""
    }

    private func save() async {
        isSaving = true
        errorMessage = nil

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"

        do {
            let result: HealthRecord
            if let existing = editingRecord {
                let updates = UpdateHealthRecordRequest(
                    horseId: horseId,
                    recordType: recordType,
                    title: title,
                    date: date,
                    scheduledTime: hasScheduledTime ? timeFormatter.string(from: scheduledTime) : nil,
                    duration: hasDuration ? Int(durationMinutes) : nil,
                    provider: provider.isEmpty ? nil : provider,
                    clinic: clinic.isEmpty ? nil : clinic,
                    diagnosis: diagnosis.isEmpty ? nil : diagnosis,
                    treatment: treatment.isEmpty ? nil : treatment,
                    symptoms: symptoms.isEmpty ? nil : symptoms,
                    findings: findings.isEmpty ? nil : findings,
                    cost: hasCost ? Double(cost) : nil,
                    currency: hasCost ? currency : nil,
                    requiresFollowUp: requiresFollowUp,
                    followUpDate: requiresFollowUp ? followUpDate : nil,
                    followUpNotes: requiresFollowUp && !followUpNotes.isEmpty ? followUpNotes : nil,
                    notes: notes.isEmpty ? nil : notes
                )
                result = try await service.updateHealthRecord(id: existing.id, updates: updates)
            } else {
                let request = CreateHealthRecordRequest(
                    horseId: horseId,
                    recordType: recordType,
                    title: title,
                    date: date,
                    scheduledTime: hasScheduledTime ? timeFormatter.string(from: scheduledTime) : nil,
                    duration: hasDuration ? Int(durationMinutes) : nil,
                    provider: provider.isEmpty ? nil : provider,
                    clinic: clinic.isEmpty ? nil : clinic,
                    diagnosis: diagnosis.isEmpty ? nil : diagnosis,
                    treatment: treatment.isEmpty ? nil : treatment,
                    symptoms: symptoms.isEmpty ? nil : symptoms,
                    findings: findings.isEmpty ? nil : findings,
                    cost: hasCost ? Double(cost) : nil,
                    currency: hasCost ? currency : nil,
                    requiresFollowUp: requiresFollowUp,
                    followUpDate: requiresFollowUp ? followUpDate : nil,
                    followUpNotes: requiresFollowUp && !followUpNotes.isEmpty ? followUpNotes : nil,
                    notes: notes.isEmpty ? nil : notes
                )
                result = try await service.createHealthRecord(request)
            }
            isSaving = false
            onSave(result)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

#Preview {
    HealthRecordFormSheet(
        horseId: "test-horse",
        onSave: { _ in }
    )
}
