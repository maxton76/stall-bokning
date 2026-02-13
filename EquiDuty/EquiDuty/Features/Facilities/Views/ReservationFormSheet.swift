//
//  ReservationFormSheet.swift
//  EquiDuty
//
//  Sheet for creating or editing a facility reservation
//

import SwiftUI

struct ReservationFormSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: ReservationFormViewModel

    /// Create mode: new reservation with optional pre-filled times
    init(
        facilityId: String,
        facilityName: String,
        date: Date? = nil,
        startTime: String? = nil,
        endTime: String? = nil,
        existingReservationId: String? = nil
    ) {
        _viewModel = State(initialValue: ReservationFormViewModel(
            facilityId: facilityId,
            facilityName: facilityName,
            date: date,
            startTime: startTime,
            endTime: endTime,
            existingReservationId: existingReservationId
        ))
    }

    /// Edit mode: pre-fill from an existing reservation
    init(
        facilityId: String,
        facilityName: String,
        date: Date? = nil,
        existingReservation: FacilityReservation
    ) {
        _viewModel = State(initialValue: ReservationFormViewModel(
            facilityId: facilityId,
            facilityName: facilityName,
            date: date,
            existingReservation: existingReservation
        ))
    }

    var body: some View {
        NavigationStack {
            Form {
                // Facility info (read-only)
                Section {
                    LabeledContent(String(localized: "facilities.title"), value: viewModel.facilityName)
                }

                // Date and time
                Section {
                    DatePicker(
                        String(localized: "reservation.date"),
                        selection: $viewModel.selectedDate,
                        displayedComponents: .date
                    )

                    HStack {
                        Text(String(localized: "reservation.startTime"))
                        Spacer()
                        MinuteIntervalDatePicker(selection: $viewModel.startTime, minuteInterval: 5)
                            .frame(maxWidth: 150, maxHeight: 120)
                    }

                    HStack {
                        Text(String(localized: "reservation.endTime"))
                        Spacer()
                        MinuteIntervalDatePicker(selection: $viewModel.endTime, minuteInterval: 5)
                            .frame(maxWidth: 150, maxHeight: 120)
                    }

                    // Conflict warning
                    if viewModel.hasConflict {
                        Label(
                            viewModel.conflictMessage ?? String(localized: "reservation.conflict"),
                            systemImage: "exclamationmark.triangle.fill"
                        )
                        .foregroundStyle(.orange)
                        .font(.subheadline)
                    }
                }

                // Horse picker
                Section {
                    if viewModel.isLoadingHorses {
                        HStack {
                            Text(String(localized: "reservation.horse"))
                            Spacer()
                            ProgressView()
                        }
                    } else {
                        Picker(String(localized: "reservation.horse"), selection: $viewModel.selectedHorseId) {
                            Text(String(localized: "reservation.noHorse"))
                                .tag(nil as String?)
                            ForEach(viewModel.availableHorses) { horse in
                                Text(horse.name)
                                    .tag(horse.id as String?)
                            }
                        }
                        .onChange(of: viewModel.selectedHorseId) { _, _ in
                            viewModel.onHorseSelectionChanged()
                        }
                    }
                }

                // Optional fields
                Section {
                    TextField(String(localized: "reservation.purpose"), text: $viewModel.purpose)
                    TextField(String(localized: "reservation.notes"), text: $viewModel.notes, axis: .vertical)
                        .lineLimit(3...6)
                    TextField(
                        String(localized: "reservation.contactInfo.placeholder"),
                        text: $viewModel.contactInfo
                    )
                } header: {
                    // No header needed
                }

                // Recurring weekly (create mode only)
                if !viewModel.isEditMode {
                    Section {
                        Toggle(String(localized: "reservation.recurringWeekly"), isOn: $viewModel.recurringWeekly)
                        if viewModel.recurringWeekly {
                            Text(String(localized: "reservation.recurringWeekly.description"))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Error message
                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.subheadline)
                    }
                }
            }
            .navigationTitle(viewModel.isEditMode
                ? String(localized: "reservation.edit")
                : String(localized: "reservation.create"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await viewModel.submit() }
                    } label: {
                        if viewModel.isSubmitting {
                            ProgressView()
                        } else {
                            Text(String(localized: "common.save"))
                        }
                    }
                    .disabled(!viewModel.canSubmit)
                }
            }
            .onChange(of: viewModel.startTime) { _, _ in
                Task { await viewModel.checkConflicts() }
            }
            .onChange(of: viewModel.endTime) { _, _ in
                Task { await viewModel.checkConflicts() }
            }
            .onChange(of: viewModel.selectedDate) { _, _ in
                Task { await viewModel.checkConflicts() }
            }
            .onChange(of: viewModel.didSave) { _, saved in
                if saved { dismiss() }
            }
            .task {
                await viewModel.loadHorses()
            }
        }
    }
}
