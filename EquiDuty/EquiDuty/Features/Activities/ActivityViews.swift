//
//  ActivityViews.swift
//  EquiDuty
//
//  Activity form view for creating and editing activities
//

import SwiftUI

// MARK: - Activity Form View

struct ActivityFormView: View {
    let activityId: String?

    @Environment(\.dismiss) private var dismiss

    @State private var activityTypeId: String?
    @State private var selectedHorseIds: Set<String> = []
    @State private var scheduledDate = Date()
    @State private var scheduledTime = ""
    @State private var notes = ""

    @State private var isLoading = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isEditing: Bool { activityId != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section(String(localized: "activity.form.type")) {
                    Text(String(localized: "activity.form.select_type"))
                        .foregroundStyle(.secondary)
                    // TODO: Activity type picker
                }

                Section(String(localized: "activity.form.horses")) {
                    Text(String(localized: "activity.form.select_horses"))
                        .foregroundStyle(.secondary)
                    // TODO: Horse multi-select
                }

                Section(String(localized: "activity.form.schedule")) {
                    DatePicker(
                        String(localized: "activity.form.date"),
                        selection: $scheduledDate,
                        displayedComponents: .date
                    )

                    TextField(String(localized: "activity.form.time"), text: $scheduledTime)
                        .keyboardType(.numbersAndPunctuation)
                }

                Section(String(localized: "activity.notes")) {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }
            }
            .navigationTitle(isEditing ? String(localized: "activity.edit") : String(localized: "activity.add"))
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
                    .disabled(isSaving || activityTypeId == nil)
                }
            }
            .onAppear {
                if isEditing {
                    loadActivity()
                }
            }
        }
    }

    private func loadActivity() {
        // TODO: Load existing activity
    }

    private func save() async {
        isSaving = true
        // TODO: Save via API
        isSaving = false
        dismiss()
    }
}

#Preview("Form - New") {
    ActivityFormView(activityId: nil)
}

#Preview("Form - Edit") {
    ActivityFormView(activityId: "test-id")
}
