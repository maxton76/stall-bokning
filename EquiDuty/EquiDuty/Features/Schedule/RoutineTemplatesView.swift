//
//  RoutineTemplatesView.swift
//  EquiDuty
//
//  Routine templates management - list and CRUD operations
//

import SwiftUI

struct RoutineTemplatesView: View {
    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared
    @State private var templates: [RoutineTemplate] = []
    @StateObject private var searchDebouncer = Debouncer()
    @State private var filterType: RoutineType? = nil
    @State private var isLoading = false
    @State private var errorMessage: String?

    // Navigation state
    @State private var showCreateSheet = false
    @State private var editingTemplate: RoutineTemplate?
    @State private var showDuplicateDialog = false
    @State private var duplicatingTemplate: RoutineTemplate?
    @State private var duplicateName = ""
    @State private var templateToDelete: RoutineTemplate?
    @State private var showDeleteAlert = false

    var filteredTemplates: [RoutineTemplate] {
        var result = templates

        // Filter by type
        if let filterType {
            result = result.filter { $0.type == filterType }
        }

        // Filter by debounced search text
        if !searchDebouncer.debouncedText.isEmpty {
            result = result.filter { template in
                template.name.localizedCaseInsensitiveContains(searchDebouncer.debouncedText) ||
                (template.description?.localizedCaseInsensitiveContains(searchDebouncer.debouncedText) ?? false)
            }
        }

        return result.sorted { $0.name < $1.name }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Search and filter bar
            VStack(spacing: EquiDutyDesign.Spacing.md) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField(String(localized: "common.search"), text: $searchDebouncer.text)
                        .textFieldStyle(.plain)
                        .accessibilityLabel(String(localized: "templates.search.accessibility"))
                    if !searchDebouncer.text.isEmpty {
                        Button {
                            searchDebouncer.text = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                        .accessibilityLabel(String(localized: "common.clear.search"))
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))

                // Type filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(
                            label: String(localized: "common.all"),
                            isSelected: filterType == nil
                        ) {
                            filterType = nil
                        }

                        ForEach(RoutineType.allCases, id: \.self) { type in
                            FilterChip(
                                label: type.displayName,
                                icon: type.icon,
                                isSelected: filterType == type
                            ) {
                                filterType = type
                            }
                        }
                    }
                }
            }
            .padding()

            // Content
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let errorMessage {
                ErrorView(message: errorMessage) {
                    loadData()
                }
            } else if filteredTemplates.isEmpty {
                ModernEmptyStateView(
                    icon: "doc.text",
                    title: searchDebouncer.debouncedText.isEmpty ? String(localized: "templates.empty.title") : String(localized: "templates.empty.search.title"),
                    message: searchDebouncer.debouncedText.isEmpty ? String(localized: "templates.empty.message") : String(localized: "templates.empty.search.message")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: EquiDutyDesign.Spacing.md) {
                        ForEach(filteredTemplates) { template in
                            RoutineTemplateCard(
                                template: template,
                                onEdit: { editingTemplate = template },
                                onDuplicate: {
                                    duplicatingTemplate = template
                                    duplicateName = "\(template.name) (kopia)"
                                    showDuplicateDialog = true
                                },
                                onDelete: {
                                    templateToDelete = template
                                    showDeleteAlert = true
                                },
                                onToggleActive: { isActive in
                                    Task { await toggleActive(template: template, isActive: isActive) }
                                }
                            )
                        }
                    }
                    .padding()
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            // Floating action button
            Button {
                showCreateSheet = true
            } label: {
                Image(systemName: "plus")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(width: 60, height: 60)
                    .background(Color.accentColor)
                    .clipShape(Circle())
                    .shadow(radius: 4)
            }
            .padding()
        }
        .refreshable {
            await refreshData()
        }
        .onAppear {
            loadData()
        }
        .onChange(of: authService.selectedOrganization?.id) { _, _ in
            loadData()
        }
        .sheet(isPresented: $showCreateSheet) {
            RoutineTemplateFormView(mode: .create, onSave: { _ in
                loadData()
            })
        }
        .sheet(item: $editingTemplate) { template in
            RoutineTemplateFormView(mode: .edit(template), onSave: { _ in
                loadData()
            })
        }
        .alert(String(localized: "templates.duplicate.title"), isPresented: $showDuplicateDialog) {
            TextField(String(localized: "templates.name"), text: $duplicateName)
            Button(String(localized: "common.cancel"), role: .cancel) {
                duplicatingTemplate = nil
                duplicateName = ""
            }
            Button(String(localized: "templates.duplicate.action")) {
                if let template = duplicatingTemplate {
                    Task { await duplicate(template: template, newName: duplicateName) }
                }
            }
        } message: {
            Text(String(localized: "templates.duplicate.message"))
        }
        .confirmationDialog(
            String(localized: "templates.delete.dialog.title"),
            isPresented: $showDeleteAlert,
            titleVisibility: .visible
        ) {
            if let template = templateToDelete, template.isActive {
                Button(String(localized: "templates.delete.dialog.disable")) {
                    if let template = templateToDelete {
                        Task { await disableTemplate(template: template) }
                    }
                }
            }
            Button(String(localized: "templates.delete.dialog.delete"), role: .destructive) {
                if let template = templateToDelete {
                    Task { await delete(template: template) }
                }
            }
            Button(String(localized: "common.cancel"), role: .cancel) {
                templateToDelete = nil
            }
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                if let orgId = authService.selectedOrganization?.id {
                    templates = try await routineService.getRoutineTemplates(organizationId: orgId)
                } else {
                    templates = []
                }
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshData() async {
        do {
            if let orgId = authService.selectedOrganization?.id {
                templates = try await routineService.getRoutineTemplates(organizationId: orgId)
            } else {
                templates = []
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Actions

    private func toggleActive(template: RoutineTemplate, isActive: Bool) async {
        do {
            try await routineService.toggleTemplateActive(templateId: template.id, isActive: isActive)
            await refreshData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func duplicate(template: RoutineTemplate, newName: String) async {
        do {
            _ = try await routineService.duplicateRoutineTemplate(templateId: template.id, newName: newName)
            duplicatingTemplate = nil
            duplicateName = ""
            await refreshData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func delete(template: RoutineTemplate) async {
        do {
            try await routineService.deleteRoutineTemplate(templateId: template.id)
            templateToDelete = nil
            await refreshData()
        } catch APIError.badRequest(let message) {
            // Template has dependencies - show specific error message
            errorMessage = message
            templateToDelete = nil
        } catch {
            errorMessage = error.localizedDescription
            templateToDelete = nil
        }
    }

    private func disableTemplate(template: RoutineTemplate) async {
        do {
            try await routineService.toggleTemplateActive(templateId: template.id, isActive: false)
            templateToDelete = nil
            await refreshData()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Routine Template Card

struct RoutineTemplateCard: View {
    let template: RoutineTemplate
    let onEdit: () -> Void
    let onDuplicate: () -> Void
    let onDelete: () -> Void
    let onToggleActive: (Bool) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            // Header
            HStack {
                // Icon
                ZStack {
                    Circle()
                        .fill(template.type.color.opacity(0.15))
                        .frame(width: 44, height: 44)

                    Image(systemName: template.displayIcon)
                        .font(.title3)
                        .foregroundStyle(template.type.color)
                }
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(template.name)
                        .font(.headline)

                    HStack(spacing: 8) {
                        Label(template.type.displayName, systemImage: template.type.icon)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("•")
                            .foregroundStyle(.secondary)

                        Label(
                            String(localized: "templates.duration.\(template.estimatedDuration)"),
                            systemImage: "clock"
                        )
                        .font(.caption)
                        .foregroundStyle(.secondary)

                        Text("•")
                            .foregroundStyle(.secondary)

                        Label(
                            "\(template.steps.count) \(String(localized: "templates.steps"))",
                            systemImage: "list.bullet"
                        )
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Active toggle
                Toggle("", isOn: Binding(
                    get: { template.isActive },
                    set: { onToggleActive($0) }
                ))
                .labelsHidden()
            }

            // Description
            if let description = template.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            // Actions
            HStack(spacing: 12) {
                Button {
                    onEdit()
                } label: {
                    Label(String(localized: "common.edit"), systemImage: "pencil")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)

                Button {
                    onDuplicate()
                } label: {
                    Label(String(localized: "templates.duplicate"), systemImage: "doc.on.doc")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)

                Spacer()

                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Image(systemName: "trash")
                        .font(.subheadline)
                }
                .buttonStyle(.bordered)
            }
        }
        .contentCard()
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            String(
                format: String(localized: "templates.card.accessibility"),
                template.name,
                template.steps.count,
                template.estimatedDuration
            )
        )
        .accessibilityHint(template.isActive ? String(localized: "common.active") : String(localized: "common.inactive"))
    }
}

extension RoutineType {
    var color: Color {
        switch self {
        case .morning: return .orange
        case .midday: return .yellow
        case .evening: return .blue
        case .custom: return .purple
        }
    }
}

#Preview {
    RoutineTemplatesView()
}
