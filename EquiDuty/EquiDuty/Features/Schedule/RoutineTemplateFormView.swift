//
//  RoutineTemplateFormView.swift
//  EquiDuty
//
//  Form for creating and editing routine templates
//

import SwiftUI

enum TemplateFormMode {
    case create
    case edit(RoutineTemplate)
}

struct RoutineTemplateFormView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared

    let mode: TemplateFormMode
    let onSave: (RoutineTemplate) -> Void

    // Form state
    @State private var name = ""
    @State private var description = ""
    @State private var type: RoutineType = .morning
    @State private var icon: String?
    @State private var defaultStartTime = Date()
    @State private var estimatedDuration = 60
    @State private var pointsValue = 10
    @State private var requiresNotesRead = true
    @State private var allowSkipSteps = true
    @State private var steps: [RoutineStepDraft] = []

    // UI state
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var validationErrors: [ValidationError] = []
    @State private var showStepEditor = false
    @State private var editingStepIndex: Int?

    var isValid: Bool {
        // Pure computed property - don't modify state here
        // Only check basic fields - let save() handle full validation
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmedName.isEmpty && trimmedName.count >= 3
    }

    @discardableResult
    private func validate() -> Bool {
        validationErrors.removeAll()

        if let nameError = ValidationHelper.validateTemplateName(name) {
            validationErrors.append(nameError)
        }

        if let stepsError = ValidationHelper.validateTemplateSteps(steps) {
            validationErrors.append(stepsError)
        }

        return validationErrors.isEmpty
    }

    private func errorFor(field: String) -> String? {
        validationErrors.first { $0.field == field }?.message
    }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Information
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        TextField(String(localized: "templates.form.name"), text: $name)
                            .onChange(of: name) { _, _ in validate() }

                        if let error = errorFor(field: "name") {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                    }

                    TextField(String(localized: "templates.form.description"), text: $description, axis: .vertical)
                        .lineLimit(3...6)
                } header: {
                    Text(String(localized: "templates.form.basic"))
                }

                // Type and Settings
                Section {
                    Picker(String(localized: "templates.form.type"), selection: $type) {
                        ForEach(RoutineType.allCases, id: \.self) { type in
                            Label(type.displayName, systemImage: type.icon)
                                .tag(type)
                        }
                    }

                    DatePicker(
                        String(localized: "templates.form.start_time"),
                        selection: $defaultStartTime,
                        displayedComponents: .hourAndMinute
                    )

                    Stepper(
                        String(localized: "templates.form.duration.\(estimatedDuration)"),
                        value: $estimatedDuration,
                        in: 15...180,
                        step: 15
                    )

                    Stepper(
                        String(localized: "templates.form.points.\(pointsValue)"),
                        value: $pointsValue,
                        in: 1...100,
                        step: 5
                    )
                } header: {
                    Text(String(localized: "templates.form.settings"))
                }

                // Options
                Section {
                    Toggle(String(localized: "templates.form.requires_notes"), isOn: $requiresNotesRead)
                    Toggle(String(localized: "templates.form.allow_skip"), isOn: $allowSkipSteps)
                } header: {
                    Text(String(localized: "templates.form.options"))
                }

                // Steps
                Section {
                    if steps.isEmpty {
                        Text(String(localized: "templates.form.no_steps"))
                            .foregroundStyle(.secondary)
                            .italic()
                    } else {
                        ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                            Button {
                                editingStepIndex = index
                                showStepEditor = true
                            } label: {
                                HStack {
                                    Text("\(index + 1)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .frame(width: 24)

                                    Image(systemName: step.category.icon)
                                        .foregroundStyle(step.category.color)

                                    VStack(alignment: .leading) {
                                        Text(step.name)
                                        Text(step.category.displayName)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .onDelete(perform: deleteSteps)
                        .onMove(perform: moveSteps)
                    }

                    Button {
                        editingStepIndex = nil
                        showStepEditor = true
                    } label: {
                        Label(String(localized: "templates.form.add_step"), systemImage: "plus.circle.fill")
                    }
                } header: {
                    Text(String(localized: "templates.form.steps"))
                }
            }
            .navigationTitle(mode.isEditing ? String(localized: "templates.form.edit_title") : String(localized: "templates.form.create_title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }

                // Edit button to enable drag-to-reorder for steps
                ToolbarItem(placement: .principal) {
                    if !steps.isEmpty {
                        EditButton()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.save")) {
                        Task { await save() }
                    }
                    .disabled(!isValid || isSaving)
                }
            }
            .sheet(isPresented: $showStepEditor) {
                if let index = editingStepIndex {
                    RoutineStepFormView(step: steps[index]) { updatedStep in
                        steps[index] = updatedStep
                        validate() // Validate after step update
                    }
                } else {
                    RoutineStepFormView(step: nil) { newStep in
                        steps.append(newStep)
                        validate() // Validate after adding step
                    }
                }
            }
            .alert(String(localized: "common.error"), isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button(String(localized: "common.ok")) {
                    errorMessage = nil
                }
            } message: {
                if let error = errorMessage {
                    Text(error)
                }
            }
            .onAppear {
                loadInitialData()
            }
        }
    }

    private func loadInitialData() {
        switch mode {
        case .create:
            // Start fresh
            break
        case .edit(let template):
            name = template.name
            description = template.description ?? ""
            type = template.type
            icon = template.icon
            estimatedDuration = template.estimatedDuration
            pointsValue = template.pointsValue
            requiresNotesRead = template.requiresNotesRead
            allowSkipSteps = template.allowSkipSteps

            // Parse start time
            let components = template.defaultStartTime.split(separator: ":")
            if components.count == 2,
               let hour = Int(components[0]),
               let minute = Int(components[1]) {
                var dateComponents = DateComponents()
                dateComponents.hour = hour
                dateComponents.minute = minute
                if let date = Calendar.current.date(from: dateComponents) {
                    defaultStartTime = date
                }
            }

            // Convert steps to draft format
            steps = template.steps.sorted { $0.order < $1.order }.map { step in
                RoutineStepDraft(
                    id: step.id,
                    name: step.name,
                    description: step.description,
                    category: step.category,
                    horseContext: step.horseContext,
                    horseFilter: step.horseFilter,
                    requiresConfirmation: step.requiresConfirmation,
                    allowPartialCompletion: step.allowPartialCompletion,
                    estimatedMinutes: step.estimatedMinutes,
                    showFeeding: step.showFeeding,
                    showMedication: step.showMedication,
                    showBlanketStatus: step.showBlanketStatus,
                    icon: step.icon
                )
            }
        }
    }

    private func deleteSteps(at offsets: IndexSet) {
        steps.remove(atOffsets: offsets)
        validate() // Validate after deletion
    }

    private func moveSteps(from source: IndexSet, to destination: Int) {
        steps.move(fromOffsets: source, toOffset: destination)
        // No need to validate after reordering
    }

    private func save() async {
        // Validate before saving
        guard validate() else {
            return
        }

        isSaving = true
        errorMessage = nil

        do {
            // Format time string
            let formatter = DateFormatter()
            formatter.dateFormat = "HH:mm"
            let timeString = formatter.string(from: defaultStartTime)

            // Convert steps to API format
            let stepCreates = steps.enumerated().map { index, step in
                RoutineStepCreate(
                    name: step.name,
                    description: step.description,
                    category: step.category.rawValue,
                    order: index,
                    horseContext: step.horseContext.rawValue,
                    horseFilter: step.horseFilter,
                    requiresConfirmation: step.requiresConfirmation,
                    allowPartialCompletion: step.allowPartialCompletion,
                    estimatedMinutes: step.estimatedMinutes,
                    showFeeding: step.showFeeding,
                    showMedication: step.showMedication,
                    showBlanketStatus: step.showBlanketStatus,
                    icon: step.icon
                )
            }

            // Use retry logic for network operations
            let template: RoutineTemplate = try await RetryHelper.retry {
                switch mode {
                case .create:
                    let create = RoutineTemplateCreate(
                        name: name,
                        description: description.isEmpty ? nil : description,
                        type: type.rawValue,
                        defaultStartTime: timeString,
                        estimatedDuration: estimatedDuration,
                        steps: stepCreates,
                        requiresNotesRead: requiresNotesRead,
                        allowSkipSteps: allowSkipSteps,
                        pointsValue: pointsValue,
                        stableId: authService.selectedStable?.id,
                        icon: icon,
                        color: nil
                    )
                    return try await routineService.createRoutineTemplate(template: create)

                case .edit(let existing):
                    let update = RoutineTemplateUpdate(
                        name: name,
                        description: description.isEmpty ? nil : description,
                        type: type.rawValue,
                        defaultStartTime: timeString,
                        estimatedDuration: estimatedDuration,
                        steps: stepCreates,
                        requiresNotesRead: requiresNotesRead,
                        allowSkipSteps: allowSkipSteps,
                        pointsValue: pointsValue,
                        stableId: authService.selectedStable?.id,
                        icon: icon,
                        color: nil,
                        isActive: existing.isActive
                    )
                    return try await routineService.updateRoutineTemplate(templateId: existing.id, updates: update)
                }
            }

            onSave(template)
            dismiss()
        } catch let error as NetworkError {
            // Handle specific network errors with better messages
            errorMessage = error.localizedDescription
            isSaving = false
        } catch {
            // Generic error fallback
            errorMessage = error.localizedDescription
            isSaving = false
        }
    }
}

extension TemplateFormMode {
    var isEditing: Bool {
        if case .edit = self { return true }
        return false
    }
}

// MARK: - Step Draft Model

struct RoutineStepDraft: Identifiable {
    let id: String
    var name: String
    var description: String?
    var category: RoutineCategory
    var horseContext: RoutineStepHorseContext
    var horseFilter: RoutineStepHorseFilter?
    var requiresConfirmation: Bool
    var allowPartialCompletion: Bool
    var estimatedMinutes: Int?
    var showFeeding: Bool?
    var showMedication: Bool?
    var showBlanketStatus: Bool?
    var icon: String?

    init(
        id: String = UUID().uuidString,
        name: String = "",
        description: String? = nil,
        category: RoutineCategory = .other,
        horseContext: RoutineStepHorseContext = .all,
        horseFilter: RoutineStepHorseFilter? = nil,
        requiresConfirmation: Bool = true,
        allowPartialCompletion: Bool = false,
        estimatedMinutes: Int? = nil,
        showFeeding: Bool? = nil,
        showMedication: Bool? = nil,
        showBlanketStatus: Bool? = nil,
        icon: String? = nil
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.category = category
        self.horseContext = horseContext
        self.horseFilter = horseFilter
        self.requiresConfirmation = requiresConfirmation
        self.allowPartialCompletion = allowPartialCompletion
        self.estimatedMinutes = estimatedMinutes
        self.showFeeding = showFeeding
        self.showMedication = showMedication
        self.showBlanketStatus = showBlanketStatus
        self.icon = icon
    }
}

extension RoutineCategory {
    var color: Color {
        switch self {
        case .preparation: return .gray
        case .feeding: return .green
        case .medication: return .red
        case .blanket: return .blue
        case .turnout: return .orange
        case .bringIn: return .purple
        case .mucking: return .brown
        case .water: return .cyan
        case .healthCheck: return .pink
        case .safety: return .yellow
        case .cleaning: return .mint
        case .other: return .secondary
        }
    }
}

#Preview {
    RoutineTemplateFormView(mode: .create) { _ in }
}
