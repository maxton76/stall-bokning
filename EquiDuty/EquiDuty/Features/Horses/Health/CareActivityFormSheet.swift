//
//  CareActivityFormSheet.swift
//  EquiDuty
//
//  Form for adding/editing care activities
//

import SwiftUI

struct CareActivityFormSheet: View {
    let horse: Horse
    let preselectedType: CareActivityType?
    let onSave: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var careService = CareActivityService.shared
    @State private var authService = AuthService.shared

    @State private var selectedType: CareActivityType = .dentist
    @State private var selectedDate: Date = Date()
    @State private var selectedTime: Date = {
        let cal = Calendar.current
        let nextHour = cal.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        var comps = cal.dateComponents([.year, .month, .day, .hour], from: nextHour)
        comps.minute = 0
        return cal.date(from: comps) ?? Date()
    }()
    @State private var durationMinutes: Int = 60
    @State private var notes: String = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let durationOptions = [15, 30, 45, 60, 90, 120]

    init(
        horse: Horse,
        preselectedType: CareActivityType? = nil,
        onSave: @escaping () -> Void
    ) {
        self.horse = horse
        self.preselectedType = preselectedType
        self.onSave = onSave
        self._selectedType = State(initialValue: preselectedType ?? .dentist)
    }

    var body: some View {
        NavigationStack {
            Form {
                // Activity Type
                Section {
                    Picker(String(localized: "care.form.type"), selection: $selectedType) {
                        ForEach(CareActivityType.allCases) { type in
                            Label(type.displayName, systemImage: type.icon)
                                .tag(type)
                        }
                    }
                }

                // Date
                Section {
                    DatePicker(
                        String(localized: "care.form.date"),
                        selection: $selectedDate,
                        displayedComponents: .date
                    )
                }

                // Time
                Section {
                    DatePicker(
                        String(localized: "care.form.time"),
                        selection: $selectedTime,
                        displayedComponents: .hourAndMinute
                    )
                }

                // Duration
                Section {
                    Picker(String(localized: "care.form.duration"), selection: $durationMinutes) {
                        ForEach(durationOptions, id: \.self) { minutes in
                            Text(String(localized: "care.form.duration.minutes.\(minutes)"))
                                .tag(minutes)
                        }
                    }
                }

                // Notes
                Section {
                    TextField(
                        String(localized: "care.form.notes"),
                        text: $notes,
                        axis: .vertical
                    )
                    .lineLimit(3...6)
                }

                // Error message
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(String(localized: "care.form.title.add"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                    .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.save")) {
                        saveActivity()
                    }
                    .disabled(isSaving)
                }
            }
            .interactiveDismissDisabled(isSaving)
        }
    }

    // MARK: - Actions

    private func saveActivity() {
        guard !isSaving else { return }
        isSaving = true
        errorMessage = nil

        Task {
            do {
                // Get stable info from auth service
                guard let stable = authService.selectedStable else {
                    throw CareActivityError.noStableSelected
                }

                // Combine date + time into a single Date
                let calendar = Calendar.current
                let dateComponents = calendar.dateComponents([.year, .month, .day], from: selectedDate)
                let timeComponents = calendar.dateComponents([.hour, .minute], from: selectedTime)
                var combined = DateComponents()
                combined.year = dateComponents.year
                combined.month = dateComponents.month
                combined.day = dateComponents.day
                combined.hour = timeComponents.hour
                combined.minute = timeComponents.minute
                let combinedDate = calendar.date(from: combined) ?? selectedDate

                // Format scheduledTime as "HH:MM"
                let timeFormatter = DateFormatter()
                timeFormatter.dateFormat = "HH:mm"
                let scheduledTimeString = timeFormatter.string(from: selectedTime)

                _ = try await careService.createCareActivity(
                    horseId: horse.id,
                    horseName: horse.name,
                    stableId: stable.id,
                    stableName: stable.name,
                    type: selectedType,
                    date: combinedDate,
                    scheduledTime: scheduledTimeString,
                    duration: durationMinutes,
                    note: notes.isEmpty ? nil : notes
                )

                await MainActor.run {
                    onSave()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isSaving = false
                }
            }
        }
    }
}

// MARK: - Errors

enum CareActivityError: LocalizedError {
    case noStableSelected

    var errorDescription: String? {
        switch self {
        case .noStableSelected:
            return String(localized: "error.no_stable_selected")
        }
    }
}

#Preview {
    CareActivityFormSheet(
        horse: Horse(
            id: "test",
            name: "Test Horse",
            color: .brown,
            ownerId: "owner1",
            status: .active,
            createdAt: Date(),
            updatedAt: Date()
        ),
        preselectedType: .farrier,
        onSave: {}
    )
}
