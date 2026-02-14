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
    let stableId: String?
    let organizationId: String?
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
    @State private var showSpecialInstructions = true
    @State private var allowPhotoEvidence = false

    // Horse/group selection
    @State private var selectedHorseIds: Set<String> = []
    @State private var selectedGroupIds: Set<String> = []
    @State private var availableHorses: [Horse] = []
    @State private var availableGroups: [HorseGroup] = []
    @State private var isLoadingHorses = false
    @State private var isLoadingGroups = false
    @State private var showHorseSheet = false
    @State private var showGroupSheet = false

    // Track if user manually edited the name
    @State private var hasManuallyEditedName = false
    @State private var previousCategoryName = ""

    var isValid: Bool {
        !name.isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                basicInfoSection
                categorySection
                horseContextSection
                displayOptionsSection
                completionSection
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
            .sheet(isPresented: $showHorseSheet) {
                horseSelectionSheet
            }
            .sheet(isPresented: $showGroupSheet) {
                groupSelectionSheet
            }
        }
    }

    // MARK: - Sections

    private var basicInfoSection: some View {
        Section {
            TextField(String(localized: "steps.form.name"), text: $name)
                .onChange(of: name) { _, newValue in
                    if !newValue.isEmpty && newValue != category.displayName {
                        hasManuallyEditedName = true
                    }
                }
            TextField(String(localized: "steps.form.description"), text: $description, axis: .vertical)
                .lineLimit(2...4)
        } header: {
            Text(String(localized: "steps.form.basic"))
        }
    }

    private var categorySection: some View {
        Section {
            Picker(String(localized: "steps.form.category"), selection: $category) {
                ForEach(RoutineCategory.allCases, id: \.self) { cat in
                    Label(cat.displayName, systemImage: cat.icon)
                        .tag(cat)
                }
            }
            .onChange(of: category) { _, newValue in
                // Auto-fill name
                if !hasManuallyEditedName && (name.isEmpty || name == previousCategoryName) {
                    name = newValue.displayName
                }
                previousCategoryName = newValue.displayName

                // Auto-enable relevant display toggles
                switch newValue {
                case .feeding:
                    showFeeding = true
                case .medication:
                    showMedication = true
                case .blanket:
                    showBlanketStatus = true
                default:
                    break
                }
            }
        } header: {
            Text(String(localized: "steps.form.category_section"))
        }
    }

    private var horseContextSection: some View {
        Section {
            Picker(String(localized: "steps.form.horse_context"), selection: $horseContext) {
                Text(String(localized: "steps.context.all")).tag(RoutineStepHorseContext.all)
                Text(String(localized: "steps.context.specific")).tag(RoutineStepHorseContext.specific)
                Text(String(localized: "steps.context.groups")).tag(RoutineStepHorseContext.groups)
                Text(String(localized: "steps.context.none")).tag(RoutineStepHorseContext.none)
            }
            .onChange(of: horseContext) { oldValue, newValue in
                if newValue != .specific {
                    selectedHorseIds.removeAll()
                }
                if newValue != .groups {
                    selectedGroupIds.removeAll()
                }
                // Load data when switching to specific/groups
                if newValue == .specific && availableHorses.isEmpty {
                    Task { await loadHorses() }
                }
                if newValue == .groups && availableGroups.isEmpty {
                    Task { await loadGroups() }
                }
            }

            if horseContext == .specific {
                horseSelectionRow
            } else if horseContext == .groups {
                groupSelectionRow
            }
        } header: {
            Text(String(localized: "steps.form.horse_context_section"))
        }
    }

    private var horseSelectionRow: some View {
        Button {
            if availableHorses.isEmpty {
                Task { await loadHorses() }
            }
            showHorseSheet = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    if selectedHorseIds.isEmpty {
                        Text(String(localized: "steps.form.select_horses"))
                            .foregroundStyle(.secondary)
                    } else {
                        Text("steps.form.horses_selected.\(selectedHorseIds.count)")
                        let names = availableHorses
                            .filter { selectedHorseIds.contains($0.id) }
                            .map(\.name)
                            .joined(separator: ", ")
                        if !names.isEmpty {
                            Text(names)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var groupSelectionRow: some View {
        Button {
            if availableGroups.isEmpty {
                Task { await loadGroups() }
            }
            showGroupSheet = true
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    if selectedGroupIds.isEmpty {
                        Text(String(localized: "steps.form.select_groups"))
                            .foregroundStyle(.secondary)
                    } else {
                        Text("steps.form.groups_selected.\(selectedGroupIds.count)")
                        let names = availableGroups
                            .filter { selectedGroupIds.contains($0.id) }
                            .map(\.name)
                            .joined(separator: ", ")
                        if !names.isEmpty {
                            Text(names)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var displayOptionsSection: some View {
        Section {
            if horseContext != .none {
                Toggle(String(localized: "steps.form.show_feeding"), isOn: $showFeeding)
                Toggle(String(localized: "steps.form.show_medication"), isOn: $showMedication)
                Toggle(String(localized: "steps.form.show_blanket"), isOn: $showBlanketStatus)
                Toggle(String(localized: "steps.form.show_special_instructions"), isOn: $showSpecialInstructions)
            } else {
                Text(String(localized: "steps.form.display_options_none"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        } header: {
            Text(String(localized: "steps.form.display_options"))
        }
    }

    private var completionSection: some View {
        Section {
            Toggle(String(localized: "steps.form.requires_confirmation"), isOn: $requiresConfirmation)
            Toggle(String(localized: "steps.form.allow_partial"), isOn: $allowPartialCompletion)
            Toggle(String(localized: "steps.form.allow_photo_evidence"), isOn: $allowPhotoEvidence)

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

    // MARK: - Selection Sheets

    private var horseSelectionSheet: some View {
        NavigationStack {
            Group {
                if isLoadingHorses {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if availableHorses.isEmpty {
                    ContentUnavailableView(
                        String(localized: "steps.form.no_horses_available"),
                        systemImage: "figure.equestrian.sports"
                    )
                } else {
                    List {
                        ForEach(availableHorses) { horse in
                            let isSelected = selectedHorseIds.contains(horse.id)
                            Button {
                                if isSelected {
                                    selectedHorseIds.remove(horse.id)
                                } else {
                                    selectedHorseIds.insert(horse.id)
                                }
                            } label: {
                                HStack {
                                    Text(horse.name)
                                    Spacer()
                                    if isSelected {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(Color.accentColor)
                                    } else {
                                        Image(systemName: "circle")
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(String(localized: "steps.form.select_horses_title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.done")) {
                        showHorseSheet = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private var groupSelectionSheet: some View {
        NavigationStack {
            Group {
                if isLoadingGroups {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if availableGroups.isEmpty {
                    ContentUnavailableView(
                        String(localized: "steps.form.no_groups_available"),
                        systemImage: "rectangle.3.group"
                    )
                } else {
                    List {
                        ForEach(availableGroups) { group in
                            let isSelected = selectedGroupIds.contains(group.id)
                            Button {
                                if isSelected {
                                    selectedGroupIds.remove(group.id)
                                } else {
                                    selectedGroupIds.insert(group.id)
                                }
                            } label: {
                                HStack {
                                    Text(group.name)
                                    Spacer()
                                    if isSelected {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(Color.accentColor)
                                    } else {
                                        Image(systemName: "circle")
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(String(localized: "steps.form.select_groups_title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.done")) {
                        showGroupSheet = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Data Loading

    private func loadHorses() async {
        guard let stableId, !isLoadingHorses else { return }
        isLoadingHorses = true
        defer { isLoadingHorses = false }
        do {
            availableHorses = try await HorseService.shared.getStableHorses(stableId: stableId)
        } catch {
            print("Failed to load horses: \(error)")
        }
    }

    private func loadGroups() async {
        guard let organizationId, !isLoadingGroups else { return }
        isLoadingGroups = true
        defer { isLoadingGroups = false }
        do {
            let response: HorseGroupsResponse = try await APIClient.shared.get(
                APIEndpoints.horseGroups(organizationId)
            )
            availableGroups = response.groups
        } catch {
            print("Failed to load horse groups: \(error)")
        }
    }

    // MARK: - Load / Save

    private func loadInitialData() {
        guard let step else {
            // New step - initialize with category name
            previousCategoryName = category.displayName
            name = category.displayName
            return
        }

        // Editing existing step
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
        showSpecialInstructions = step.showSpecialInstructions ?? true
        allowPhotoEvidence = step.allowPhotoEvidence ?? false

        // Restore horse/group selections from filter
        if let filter = step.horseFilter {
            if let horseIds = filter.horseIds {
                selectedHorseIds = Set(horseIds)
            }
            if let groupIds = filter.groupIds {
                selectedGroupIds = Set(groupIds)
            }
        }

        // Pre-load data if step has selections
        if horseContext == .specific {
            Task { await loadHorses() }
        } else if horseContext == .groups {
            Task { await loadGroups() }
        }

        hasManuallyEditedName = true
        previousCategoryName = category.displayName
    }

    private func save() {
        // Build horse filter from selections
        var horseFilter: RoutineStepHorseFilter? = nil
        if horseContext == .specific && !selectedHorseIds.isEmpty {
            horseFilter = RoutineStepHorseFilter(
                horseIds: Array(selectedHorseIds),
                groupIds: nil,
                locationIds: nil,
                excludeHorseIds: nil
            )
        } else if horseContext == .groups && !selectedGroupIds.isEmpty {
            horseFilter = RoutineStepHorseFilter(
                horseIds: nil,
                groupIds: Array(selectedGroupIds),
                locationIds: nil,
                excludeHorseIds: nil
            )
        }

        let savedStep = RoutineStepDraft(
            id: step?.id ?? UUID().uuidString,
            name: name,
            description: description.isEmpty ? nil : description,
            category: category,
            horseContext: horseContext,
            horseFilter: horseFilter,
            requiresConfirmation: requiresConfirmation,
            allowPartialCompletion: allowPartialCompletion,
            estimatedMinutes: estimatedMinutes,
            showFeeding: horseContext != .none ? showFeeding : nil,
            showMedication: horseContext != .none ? showMedication : nil,
            showBlanketStatus: horseContext != .none ? showBlanketStatus : nil,
            showSpecialInstructions: horseContext != .none ? showSpecialInstructions : nil,
            allowPhotoEvidence: allowPhotoEvidence,
            icon: step?.icon
        )

        onSave(savedStep)
        dismiss()
    }
}

#Preview {
    RoutineStepFormView(step: nil, stableId: nil, organizationId: nil) { _ in }
}
