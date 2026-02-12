//
//  RoutineStepFormView.swift
//  EquiDuty
//
//  Form for creating and editing routine steps
//

import SwiftUI

struct RoutineStepFormView: View {
    @Environment(\.dismiss) private var dismiss

    let step: RoutineStepDraft?
    let onSave: (RoutineStepDraft) -> Void

    // Form state
    @State private var name = ""
    @State private var description = ""
    @State private var category: RoutineCategory = .other
    @State private var horseContext: RoutineStepHorseContext = .all
    @State private var requiresConfirmation = true
    @State private var allowPartialCompletion = false
    @State private var estimatedMinutes: Int? = nil
    @State private var showFeeding = false
    @State private var showMedication = false
    @State private var showBlanketStatus = false

    // Track if user manually edited the name
    @State private var hasManuallyEditedName = false
    @State private var previousCategoryName = ""

    var isValid: Bool {
        !name.isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Info
                Section {
                    TextField(String(localized: "steps.form.name"), text: $name)
                        .onChange(of: name) { oldValue, newValue in
                            // If user manually changes name, mark as edited
                            if !newValue.isEmpty && newValue != category.displayName {
                                hasManuallyEditedName = true
                            }
                        }
                    TextField(String(localized: "steps.form.description"), text: $description, axis: .vertical)
                        .lineLimit(2...4)
                } header: {
                    Text(String(localized: "steps.form.basic"))
                }

                // Category
                Section {
                    Picker(String(localized: "steps.form.category"), selection: $category) {
                        ForEach(RoutineCategory.allCases, id: \.self) { cat in
                            Label(cat.displayName, systemImage: cat.icon)
                                .tag(cat)
                        }
                    }
                    .onChange(of: category) { oldValue, newValue in
                        // Auto-fill name if:
                        // 1. Name is empty, OR
                        // 2. Name matches the previous category name (hasn't been manually edited)
                        if !hasManuallyEditedName && (name.isEmpty || name == previousCategoryName) {
                            name = newValue.displayName
                        }
                        previousCategoryName = newValue.displayName
                    }
                } header: {
                    Text(String(localized: "steps.form.category_section"))
                }

                // Horse Context
                Section {
                    Picker(String(localized: "steps.form.horse_context"), selection: $horseContext) {
                        Text(String(localized: "steps.context.all")).tag(RoutineStepHorseContext.all)
                        Text(String(localized: "steps.context.specific")).tag(RoutineStepHorseContext.specific)
                        Text(String(localized: "steps.context.groups")).tag(RoutineStepHorseContext.groups)
                        Text(String(localized: "steps.context.none")).tag(RoutineStepHorseContext.none)
                    }

                    // TODO: Add horse/group pickers for specific/groups modes
                    if horseContext == .specific {
                        Text(String(localized: "steps.context.specific_placeholder"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else if horseContext == .groups {
                        Text(String(localized: "steps.context.groups_placeholder"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text(String(localized: "steps.form.horse_context_section"))
                }

                // Display Options
                Section {
                    if category == .feeding || category == .healthCheck {
                        Toggle(String(localized: "steps.form.show_feeding"), isOn: $showFeeding)
                    }
                    if category == .medication || category == .healthCheck {
                        Toggle(String(localized: "steps.form.show_medication"), isOn: $showMedication)
                    }
                    if category == .blanket || category == .healthCheck {
                        Toggle(String(localized: "steps.form.show_blanket"), isOn: $showBlanketStatus)
                    }
                } header: {
                    Text(String(localized: "steps.form.display_options"))
                }

                // Completion Settings
                Section {
                    Toggle(String(localized: "steps.form.requires_confirmation"), isOn: $requiresConfirmation)
                    Toggle(String(localized: "steps.form.allow_partial"), isOn: $allowPartialCompletion)

                    HStack {
                        Text(String(localized: "steps.form.estimated_minutes"))
                        Spacer()
                        if let minutes = estimatedMinutes {
                            Text("\(minutes) min")
                                .foregroundStyle(.secondary)
                        } else {
                            Text(String(localized: "steps.form.none"))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .onTapGesture {
                        // TODO: Show minute picker
                        if estimatedMinutes == nil {
                            estimatedMinutes = 5
                        }
                    }

                    if estimatedMinutes != nil {
                        Stepper(
                            "",
                            value: Binding(
                                get: { estimatedMinutes ?? 5 },
                                set: { estimatedMinutes = $0 }
                            ),
                            in: 1...120,
                            step: 5
                        )
                        .labelsHidden()
                    }
                } header: {
                    Text(String(localized: "steps.form.completion"))
                }
            }
            .navigationTitle(step == nil ? String(localized: "steps.form.create_title") : String(localized: "steps.form.edit_title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.save")) {
                        save()
                    }
                    .disabled(!isValid)
                }
            }
            .onAppear {
                loadInitialData()
            }
        }
    }

    private func loadInitialData() {
        guard let step else {
            // New step - initialize with category name
            previousCategoryName = category.displayName
            name = category.displayName
            return
        }

        // Editing existing step - mark as manually edited
        name = step.name
        description = step.description ?? ""
        category = step.category
        horseContext = step.horseContext
        requiresConfirmation = step.requiresConfirmation
        allowPartialCompletion = step.allowPartialCompletion
        estimatedMinutes = step.estimatedMinutes
        showFeeding = step.showFeeding ?? false
        showMedication = step.showMedication ?? false
        showBlanketStatus = step.showBlanketStatus ?? false

        // Mark as manually edited since it's an existing step
        hasManuallyEditedName = true
        previousCategoryName = category.displayName
    }

    private func save() {
        let savedStep = RoutineStepDraft(
            id: step?.id ?? UUID().uuidString,
            name: name,
            description: description.isEmpty ? nil : description,
            category: category,
            horseContext: horseContext,
            horseFilter: step?.horseFilter,  // Preserve existing filter for now
            requiresConfirmation: requiresConfirmation,
            allowPartialCompletion: allowPartialCompletion,
            estimatedMinutes: estimatedMinutes,
            showFeeding: showFeeding,
            showMedication: showMedication,
            showBlanketStatus: showBlanketStatus,
            icon: step?.icon
        )

        onSave(savedStep)
        dismiss()
    }
}

#Preview {
    RoutineStepFormView(step: nil) { _ in }
}
