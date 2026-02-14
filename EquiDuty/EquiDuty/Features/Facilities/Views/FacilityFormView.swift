//
//  FacilityFormView.swift
//  EquiDuty
//
//  Form for creating/editing a facility
//

import SwiftUI

struct FacilityFormView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: FacilityFormViewModel

    init(facility: Facility? = nil) {
        _viewModel = State(initialValue: FacilityFormViewModel(facility: facility))
    }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Information
                Section {
                    TextField(
                        String(localized: "facilities.form.name"),
                        text: $viewModel.name
                    )

                    Picker(String(localized: "facilities.form.type"), selection: $viewModel.type) {
                        ForEach(FacilityType.allCases) { facilityType in
                            Label(facilityType.displayName, systemImage: facilityType.icon)
                                .tag(facilityType)
                        }
                    }

                    TextField(
                        String(localized: "facilities.form.description"),
                        text: $viewModel.facilityDescription,
                        axis: .vertical
                    )
                    .lineLimit(2...6)

                    Picker(String(localized: "facilities.form.status"), selection: $viewModel.status) {
                        ForEach(FacilityStatus.allCases) { status in
                            Text(status.displayName).tag(status)
                        }
                    }
                } header: {
                    Text(String(localized: "facilities.form.section.basicInfo"))
                }

                // Booking Rules
                Section {
                    Stepper(
                        value: $viewModel.planningWindowOpens,
                        in: 0...365
                    ) {
                        HStack {
                            Text(String(localized: "facilities.form.planningWindowOpens"))
                            Spacer()
                            Text("\(viewModel.planningWindowOpens) \(String(localized: "facilities.form.unit.daysAhead"))")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Stepper(
                        value: $viewModel.planningWindowCloses,
                        in: 0...168
                    ) {
                        HStack {
                            Text(String(localized: "facilities.form.planningWindowCloses"))
                            Spacer()
                            Text("\(viewModel.planningWindowCloses) \(String(localized: "facilities.form.unit.hoursBefore"))")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Stepper(
                        value: $viewModel.maxHorsesPerReservation,
                        in: 1...50
                    ) {
                        HStack {
                            Text(String(localized: "facilities.form.maxHorses"))
                            Spacer()
                            Text("\(viewModel.maxHorsesPerReservation)")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Picker(String(localized: "facilities.form.minTimeSlot"), selection: $viewModel.minTimeSlotDuration) {
                        ForEach(TimeSlotDuration.allCases) { duration in
                            Text(duration.displayName).tag(duration)
                        }
                    }

                    HStack {
                        Text(String(localized: "facilities.form.maxDuration"))

                        Spacer()

                        Stepper(value: $viewModel.maxHoursPerReservation, in: 1...365) {
                            Text("\(viewModel.maxHoursPerReservation)")
                                .frame(minWidth: 30)
                        }
                        .fixedSize()

                        Picker("", selection: $viewModel.maxDurationUnit) {
                            ForEach(DurationUnit.allCases) { unit in
                                Text(unit.displayName).tag(unit)
                            }
                        }
                        .labelsHidden()
                        .fixedSize()
                    }
                } header: {
                    Text(String(localized: "facilities.form.section.bookingRules"))
                }

                // Weekly Schedule
                WeeklyScheduleEditorView(viewModel: viewModel)

                // Exceptions
                ScheduleExceptionsEditorView(viewModel: viewModel)
            }
            .navigationTitle(viewModel.isEditing
                ? String(localized: "facilities.form.editTitle")
                : String(localized: "facilities.form.createTitle"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                    .disabled(viewModel.isSubmitting)
                }

                ToolbarItem(placement: .confirmationAction) {
                    if viewModel.isSubmitting {
                        ProgressView()
                    } else {
                        Button(String(localized: "common.save")) {
                            Task {
                                await viewModel.save()
                            }
                        }
                        .disabled(!viewModel.isValid)
                    }
                }
            }
            .alert(
                String(localized: "common.error"),
                isPresented: Binding(
                    get: { viewModel.errorMessage != nil },
                    set: { if !$0 { viewModel.errorMessage = nil } }
                )
            ) {
                Button(String(localized: "common.ok")) {
                    viewModel.errorMessage = nil
                }
            } message: {
                if let error = viewModel.errorMessage {
                    Text(error)
                }
            }
            .onChange(of: viewModel.didSave) { _, didSave in
                if didSave {
                    dismiss()
                }
            }
        }
    }
}
