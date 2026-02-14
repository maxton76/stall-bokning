//
//  StableFormView.swift
//  EquiDuty
//
//  Form for creating/editing a stable
//

import SwiftUI

struct StableFormView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: StableFormViewModel

    init(stable: Stable? = nil) {
        _viewModel = State(initialValue: StableFormViewModel(stable: stable))
    }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Information (always shown)
                Section {
                    TextField(
                        String(localized: "stables.form.name"),
                        text: $viewModel.name
                    )

                    TextField(
                        String(localized: "stables.form.description"),
                        text: $viewModel.stableDescription,
                        axis: .vertical
                    )
                    .lineLimit(2...6)

                    TextField(
                        String(localized: "stables.form.address"),
                        text: $viewModel.address
                    )

                    TextField(
                        String(localized: "stables.form.facilityNumber"),
                        text: $viewModel.facilityNumber
                    )
                } header: {
                    Text(String(localized: "stables.form.section.basicInfo"))
                }

                // Settings mode: Points System
                if viewModel.mode == .settings {
                    Section {
                        Picker(String(localized: "stables.form.resetPeriod"), selection: $viewModel.resetPeriod) {
                            ForEach(PointsSystemConfig.ResetPeriod.allCases, id: \.self) { period in
                                Text(period.displayName).tag(period)
                            }
                        }

                        Stepper(value: $viewModel.memoryHorizonDays, in: 30...365, step: 30) {
                            HStack {
                                Text(String(localized: "stables.form.memoryHorizonDays"))
                                Spacer()
                                Text("\(viewModel.memoryHorizonDays) \(String(localized: "stables.form.unit.days"))")
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Stepper(value: $viewModel.holidayMultiplier, in: 1.0...5.0, step: 0.1) {
                            HStack {
                                Text(String(localized: "stables.form.holidayMultiplier"))
                                Spacer()
                                Text(String(format: "%.1fx", viewModel.holidayMultiplier))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    } header: {
                        Text(String(localized: "stables.form.section.pointsSystem"))
                    }

                    // Settings mode: Scheduling
                    Section {
                        Stepper(value: $viewModel.scheduleHorizonDays, in: 7...90) {
                            HStack {
                                Text(String(localized: "stables.form.scheduleHorizonDays"))
                                Spacer()
                                Text("\(viewModel.scheduleHorizonDays) \(String(localized: "stables.form.unit.days"))")
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Toggle(String(localized: "stables.form.autoAssignment"), isOn: $viewModel.autoAssignment)
                        Toggle(String(localized: "stables.form.allowSwaps"), isOn: $viewModel.allowSwaps)
                        Toggle(String(localized: "stables.form.requireApproval"), isOn: $viewModel.requireApproval)
                    } header: {
                        Text(String(localized: "stables.form.section.scheduling"))
                    }

                    // Settings mode: Notifications
                    Section {
                        Toggle(String(localized: "stables.form.emailNotifications"), isOn: $viewModel.emailNotifications)
                        Toggle(String(localized: "stables.form.shiftReminders"), isOn: $viewModel.shiftReminders)
                        Toggle(String(localized: "stables.form.schedulePublished"), isOn: $viewModel.schedulePublished)
                        Toggle(String(localized: "stables.form.memberJoined"), isOn: $viewModel.memberJoined)
                        Toggle(String(localized: "stables.form.shiftSwapRequests"), isOn: $viewModel.shiftSwapRequests)
                    } header: {
                        Text(String(localized: "stables.form.section.notifications"))
                    }
                }
            }
            .navigationTitle(viewModel.isEditing
                ? String(localized: "stables.form.editTitle")
                : String(localized: "stables.form.createTitle"))
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

// MARK: - CaseIterable for ResetPeriod

extension PointsSystemConfig.ResetPeriod: CaseIterable {
    static var allCases: [PointsSystemConfig.ResetPeriod] {
        [.monthly, .quarterly, .yearly, .rolling, .never]
    }
}
