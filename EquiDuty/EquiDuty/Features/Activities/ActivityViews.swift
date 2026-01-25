//
//  ActivityViews.swift
//  EquiDuty
//
//  Activity detail and form views
//

import SwiftUI

// MARK: - Activity Detail View

struct ActivityDetailView: View {
    let activityId: String

    @State private var activity: ActivityInstance?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let errorMessage {
                ErrorView(message: errorMessage) {
                    loadActivity()
                }
            } else if let activity {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: activity.activityTypeCategory.icon)
                                    .font(.title2)
                                    .foregroundStyle(Color.accentColor)

                                Text(activity.activityTypeName)
                                    .font(.title2)
                                    .fontWeight(.bold)

                                Spacer()

                                StatusBadge(
                                    status: activity.status.displayName,
                                    color: Color(activity.status.color)
                                )
                            }

                            if !activity.horseNames.isEmpty {
                                Text(activity.horseNames.joined(separator: ", "))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        // Details
                        VStack(alignment: .leading, spacing: 12) {
                            Text(String(localized: "activity.details"))
                                .font(.headline)

                            if let time = activity.scheduledTime {
                                HStack {
                                    Image(systemName: "clock")
                                        .foregroundStyle(.secondary)
                                    Text(time)
                                }
                            }

                            HStack {
                                Image(systemName: "calendar")
                                    .foregroundStyle(.secondary)
                                Text(activity.scheduledDate.formatted(date: .abbreviated, time: .omitted))
                            }

                            if let assignedName = activity.assignedToName {
                                HStack {
                                    Image(systemName: "person")
                                        .foregroundStyle(.secondary)
                                    Text(assignedName)
                                }
                            }

                            if let contactName = activity.contactName {
                                HStack {
                                    Image(systemName: "phone")
                                        .foregroundStyle(.secondary)
                                    Text(contactName)
                                }
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        // Notes
                        if let notes = activity.notes, !notes.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(String(localized: "activity.notes"))
                                    .font(.headline)
                                Text(notes)
                                    .font(.body)
                            }
                            .padding()
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(String(localized: "activity.detail"))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadActivity()
        }
    }

    private func loadActivity() {
        // TODO: Implement API call
        isLoading = false
    }
}

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

#Preview("Detail") {
    NavigationStack {
        ActivityDetailView(activityId: "test-id")
    }
}

#Preview("Form") {
    ActivityFormView(activityId: nil)
}
