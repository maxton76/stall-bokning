//
//  CareActivityDetailSheet.swift
//  EquiDuty
//
//  Detail view for care activities with complete/edit/delete actions
//

import SwiftUI

struct CareActivityDetailSheet: View {
    let horse: Horse
    let status: CareActivityStatus
    let onComplete: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var careService = CareActivityService.shared

    @State private var isCompleting = false
    @State private var isDeleting = false
    @State private var showDeleteConfirmation = false
    @State private var errorMessage: String?

    private var nextActivity: ActivityInstance? {
        status.nextScheduledActivity
    }

    var body: some View {
        NavigationStack {
            List {
                // Activity Info Section
                Section {
                    // Type
                    HStack {
                        Label {
                            Text(status.type.displayName)
                        } icon: {
                            Image(systemName: status.type.icon)
                                .foregroundStyle(status.type.color)
                        }
                        Spacer()
                    }

                    // Scheduled date
                    if let date = status.nextScheduledDate {
                        HStack {
                            Text(String(localized: "care.form.date"))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(date.formatted(date: .abbreviated, time: .omitted))
                        }

                        // Overdue indicator
                        if status.isOverdue {
                            HStack {
                                Spacer()
                                Label(String(localized: "care.status.overdue"), systemImage: "exclamationmark.circle.fill")
                                    .foregroundStyle(.red)
                                    .font(.subheadline)
                                Spacer()
                            }
                        }
                    }

                    // Notes
                    if let notes = nextActivity?.notes, !notes.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(String(localized: "care.form.notes"))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(notes)
                        }
                    }
                } header: {
                    Text(String(localized: "care.detail.scheduled"))
                }

                // Last completed section
                if let lastDate = status.lastCompletedDate {
                    Section {
                        HStack {
                            Text(String(localized: "care.status.last"))
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(lastDate.formatted(date: .abbreviated, time: .omitted))
                        }
                    }
                }

                // Actions Section
                if let activity = nextActivity {
                    Section {
                        // Mark Complete button
                        Button {
                            completeActivity(activity)
                        } label: {
                            HStack {
                                Spacer()
                                if isCompleting {
                                    ProgressView()
                                        .padding(.trailing, 8)
                                }
                                Label(String(localized: "care.action.complete"), systemImage: "checkmark.circle.fill")
                                Spacer()
                            }
                        }
                        .disabled(isCompleting || isDeleting)

                        // Delete button
                        Button(role: .destructive) {
                            showDeleteConfirmation = true
                        } label: {
                            HStack {
                                Spacer()
                                if isDeleting {
                                    ProgressView()
                                        .padding(.trailing, 8)
                                }
                                Label(String(localized: "common.delete"), systemImage: "trash")
                                Spacer()
                            }
                        }
                        .disabled(isCompleting || isDeleting)
                    }
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
            .navigationTitle(status.type.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.close")) {
                        dismiss()
                    }
                }
            }
            .confirmationDialog(
                String(localized: "care.delete.title"),
                isPresented: $showDeleteConfirmation,
                titleVisibility: .visible
            ) {
                Button(String(localized: "common.delete"), role: .destructive) {
                    if let activity = nextActivity {
                        deleteActivity(activity)
                    }
                }
                Button(String(localized: "common.cancel"), role: .cancel) {}
            } message: {
                Text(String(localized: "care.delete.message"))
            }
        }
    }

    // MARK: - Actions

    private func completeActivity(_ activity: ActivityInstance) {
        isCompleting = true
        errorMessage = nil

        Task {
            do {
                try await careService.completeCareActivity(activityId: activity.id)
                await MainActor.run {
                    onComplete()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isCompleting = false
                }
            }
        }
    }

    private func deleteActivity(_ activity: ActivityInstance) {
        isDeleting = true
        errorMessage = nil

        Task {
            do {
                try await careService.cancelCareActivity(activityId: activity.id)
                await MainActor.run {
                    onDelete()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isDeleting = false
                }
            }
        }
    }
}

#Preview {
    CareActivityDetailSheet(
        horse: Horse(
            id: "test",
            name: "Test Horse",
            color: .brown,
            ownerId: "owner1",
            status: .active,
            createdAt: Date(),
            updatedAt: Date()
        ),
        status: CareActivityStatus(
            type: .farrier,
            lastCompletedDate: Date().addingTimeInterval(-60 * 60 * 24 * 60),
            lastCompletedActivity: nil,
            nextScheduledDate: Date().addingTimeInterval(60 * 60 * 24 * 7),
            nextScheduledActivity: nil
        ),
        onComplete: {},
        onEdit: {},
        onDelete: {}
    )
}
