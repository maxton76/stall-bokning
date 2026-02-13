//
//  RoutineInstanceDetailView.swift
//  EquiDuty
//
//  Detail modal for routine instance management
//

import SwiftUI

struct RoutineInstanceDetailView: View {
    let instanceId: String
    @State private var viewModel: RoutineInstanceDetailViewModel
    @Environment(\.dismiss) private var dismiss

    // Alert/sheet state
    @State private var showReassignSheet = false
    @State private var showCancelConfirm = false
    @State private var showDeleteConfirm = false
    @State private var selectedMemberId: String?
    @State private var selectedMemberName: String?
    @State private var showStartRoutine = false

    init(instanceId: String) {
        self.instanceId = instanceId
        _viewModel = State(initialValue: RoutineInstanceDetailViewModel(instanceId: instanceId))
    }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = viewModel.errorMessage {
                    errorView(error)
                } else if let instance = viewModel.instance {
                    detailContent(instance)
                } else {
                    // Instance was deleted
                    Text(String(localized: "routineDetails.error.notFound"))
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(String(localized: "routineDetails.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(String(localized: "common.close")) {
                        dismiss()
                    }
                }
            }
        }
        .task {
            await viewModel.loadData()
        }
        .fullScreenCover(isPresented: $showStartRoutine) {
            if let instance = viewModel.instance {
                NavigationStack {
                    RoutineFlowView(instanceId: instance.id)
                }
            }
        }
    }

    // MARK: - Content Views

    @ViewBuilder
    private func detailContent(_ instance: RoutineInstance) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Status Section
                statusSection(instance)

                // Assignment Section
                assignmentSection(instance)

                // Progress Section
                if instance.progress.stepsTotal > 0 {
                    progressSection(instance)
                }

                // Action Buttons
                actionButtons(instance)
            }
            .padding()
        }
        .sheet(isPresented: $showReassignSheet) {
            reassignSheet
        }
        .alert(String(localized: "routineDetails.cancel.confirm"), isPresented: $showCancelConfirm) {
            Button(String(localized: "common.cancel"), role: .cancel) {}
            Button(String(localized: "routineDetails.actions.cancel"), role: .destructive) {
                Task {
                    do {
                        try await viewModel.cancelInstance()
                    } catch {
                        // Error already set in viewModel
                    }
                }
            }
        }
        .alert(String(localized: "routineDetails.delete.confirm"), isPresented: $showDeleteConfirm) {
            Button(String(localized: "common.cancel"), role: .cancel) {}
            Button(String(localized: "common.delete"), role: .destructive) {
                Task {
                    do {
                        try await viewModel.deleteInstance()
                        dismiss()
                    } catch {
                        // Error already set in viewModel
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func statusSection(_ instance: RoutineInstance) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(String(localized: "routineDetails.status"))
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                Text(instance.status.displayName)
                    .font(.headline)
                    .foregroundStyle(instance.status.color)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(instance.status.color.opacity(0.2))
                    .clipShape(Capsule())

                Spacer()
            }

            HStack {
                Label(
                    formatDateTime(date: instance.scheduledDate, time: instance.scheduledStartTime),
                    systemImage: "calendar"
                )
                .font(.subheadline)

                Spacer()

                Label(
                    String(format: "%d %@", instance.pointsValue, String(localized: "routineDetails.points")),
                    systemImage: "star.fill"
                )
                .font(.subheadline)
                .foregroundStyle(.yellow)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func assignmentSection(_ instance: RoutineInstance) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(String(localized: "routineDetails.assignedTo"))
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                if let assigneeName = instance.assignedToName {
                    Text(assigneeName)
                        .font(.body)
                } else {
                    Text(String(localized: "routineDetails.unassigned"))
                        .font(.body)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if viewModel.canReassign {
                    Button {
                        showReassignSheet = true
                    } label: {
                        // Show "Assign" if unassigned, "Reassign" if already assigned
                        let isUnassigned = instance.assignedToName == nil
                        let buttonKey = isUnassigned ? "routineDetails.actions.assign" : "routineDetails.actions.reassign"
                        Text(String(localized: String.LocalizationValue(buttonKey)))
                            .font(.subheadline)
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isMutating)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func progressSection(_ instance: RoutineInstance) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(String(localized: "routineDetails.progress"))
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(spacing: 8) {
                HStack {
                    Text(String(
                        format: String(localized: "routineDetails.stepsCompleted"),
                        instance.progress.stepsCompleted,
                        instance.progress.stepsTotal
                    ))
                    .font(.body)

                    Spacer()

                    Text("\(Int(instance.progress.percentComplete))%")
                        .font(.headline)
                }

                ProgressView(value: instance.progress.percentComplete, total: 100)
                    .progressViewStyle(.linear)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func actionButtons(_ instance: RoutineInstance) -> some View {
        VStack(spacing: 12) {
            // Primary action: Start/Continue
            if viewModel.canStartContinue {
                Button {
                    showStartRoutine = true
                } label: {
                    HStack {
                        Image(systemName: "play.fill")
                        Text(instance.status == .scheduled ?
                             String(localized: "routineDetails.actions.start") :
                             String(localized: "routineDetails.actions.continue"))
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isMutating)
            }

            // Secondary action: Cancel
            if viewModel.canCancel {
                Button(role: .destructive) {
                    showCancelConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "xmark.circle.fill")
                        Text(String(localized: "routineDetails.actions.cancel"))
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isMutating)
            }

            // Destructive action: Delete
            if viewModel.canDelete {
                Button(role: .destructive) {
                    showDeleteConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "trash.fill")
                        Text(String(localized: "common.delete"))
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isMutating)
            }
        }
    }

    @ViewBuilder
    private func errorView(_ error: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.red)

            Text(error)
                .font(.headline)
                .multilineTextAlignment(.center)

            Button {
                Task {
                    await viewModel.loadData()
                }
            } label: {
                Label(String(localized: "common.retry"), systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }

    @ViewBuilder
    private var reassignSheet: some View {
        NavigationStack {
            List {
                ForEach(viewModel.availableMembers) { member in
                    Button {
                        selectedMemberId = member.userId
                        selectedMemberName = member.fullName ?? member.userEmail ?? "Unknown"
                        showReassignSheet = false
                        showReassignConfirm()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                if let name = member.fullName {
                                    Text(name)
                                        .font(.body)
                                }
                                if let email = member.userEmail {
                                    Text(email)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle(String(localized: "routineDetails.reassign.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(String(localized: "common.cancel")) {
                        showReassignSheet = false
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func showReassignConfirm() {
        guard let memberId = selectedMemberId,
              let memberName = selectedMemberName else { return }

        Task { @MainActor in
            // Show confirmation alert
            let alert = UIAlertController(
                title: String(localized: "routineDetails.reassign.confirm"),
                message: String(format: String(localized: "routineDetails.reassign.confirmMessage"), memberName),
                preferredStyle: .alert
            )

            alert.addAction(UIAlertAction(title: String(localized: "common.cancel"), style: .cancel))
            alert.addAction(UIAlertAction(title: String(localized: "common.confirm"), style: .default) { _ in
                Task {
                    do {
                        try await viewModel.assignToMember(memberId: memberId, memberName: memberName)
                    } catch {
                        // Error already set in viewModel
                    }
                }
            })

            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                rootViewController.present(alert, animated: true)
            }
        }
    }

    private func formatDateTime(date: Date, time: String) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        dateFormatter.timeStyle = .none
        let dateString = dateFormatter.string(from: date)
        return "\(dateString) \(time)"
    }
}

#Preview {
    RoutineInstanceDetailView(instanceId: "preview-instance-id")
}
