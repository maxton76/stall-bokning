//
//  SelectionProcessDetailView.swift
//  EquiDuty
//
//  Detail view for a single selection process
//

import SwiftUI

struct SelectionProcessDetailView: View {
    let processId: String

    @State private var viewModel: SelectionProcessDetailViewModel
    @Environment(\.dismiss) private var dismiss

    init(processId: String) {
        self.processId = processId
        _viewModel = State(initialValue: SelectionProcessDetailViewModel(processId: processId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.process == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let errorMessage = viewModel.errorMessage, viewModel.process == nil {
                ErrorView(message: errorMessage) {
                    viewModel.loadData()
                }
            } else if let process = viewModel.process {
                processContent(process)
            }
        }
        .navigationTitle(viewModel.process?.name ?? String(localized: "selectionProcess.titles.list"))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { viewModel.loadData() }
        .alert(String(localized: "selectionProcess.modals.confirmStart.title"), isPresented: $viewModel.showStartConfirm) {
            Button(String(localized: "selectionProcess.modals.confirmStart.confirm"), role: .destructive) { viewModel.startProcess() }
            Button(String(localized: "selectionProcess.buttons.cancel"), role: .cancel) {}
        } message: {
            if let name = viewModel.process?.name {
                Text(String(localized: "selectionProcess.modals.confirmStart.description \(name)"))
            }
        }
        .alert(String(localized: "selectionProcess.modals.confirmComplete.title"), isPresented: $viewModel.showCompleteTurnConfirm) {
            Button(String(localized: "selectionProcess.modals.confirmComplete.confirm"), role: .destructive) { viewModel.completeTurn() }
            Button(String(localized: "selectionProcess.buttons.cancel"), role: .cancel) {}
        } message: {
            Text(String(localized: "selectionProcess.modals.confirmComplete.description"))
        }
        .alert(String(localized: "selectionProcess.modals.confirmCancel.title"), isPresented: $viewModel.showCancelConfirm) {
            Button(String(localized: "selectionProcess.buttons.cancel"), role: .cancel) {}
            Button(String(localized: "selectionProcess.admin.cancelProcess"), role: .destructive) { viewModel.cancelProcess() }
        } message: {
            Text(String(localized: "selectionProcess.modals.confirmCancel.description"))
        }
        .alert(String(localized: "selectionProcess.modals.confirmDelete.title"), isPresented: $viewModel.showDeleteConfirm) {
            Button(String(localized: "selectionProcess.buttons.cancel"), role: .cancel) {}
            Button(String(localized: "selectionProcess.buttons.delete"), role: .destructive) {
                viewModel.deleteProcess()
            }
        } message: {
            Text(String(localized: "selectionProcess.modals.confirmDelete.description"))
        }
        .onChange(of: viewModel.shouldDismiss) { _, shouldDismiss in
            if shouldDismiss { dismiss() }
        }
        .sheet(isPresented: $viewModel.showEditDates) {
            editDatesSheet
        }
    }

    // MARK: - Process Content

    @ViewBuilder
    private func processContent(_ process: SelectionProcessWithContext) -> some View {
        ScrollView {
            VStack(spacing: EquiDutyDesign.Spacing.lg) {
                // Your turn alert
                if process.isCurrentTurn && process.status == .active {
                    yourTurnBanner
                }

                // Week selection grid (only for active + current turn)
                if process.status == .active {
                    selectionWeekSection(process)
                }

                // Overview card
                overviewCard(process)

                // Turn order
                turnOrderSection(process)

                // Complete turn button
                if process.isCurrentTurn && process.status == .active {
                    completeTurnButton
                }

                // Admin controls
                if process.canManage {
                    adminSection(process)
                }

                // Error/success messages
                if let error = viewModel.actionError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }
                if let success = viewModel.successMessage {
                    Text(success)
                        .font(.caption)
                        .foregroundStyle(.green)
                        .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .refreshable { await viewModel.refresh() }
    }

    // MARK: - Your Turn Banner

    private var yourTurnBanner: some View {
        HStack {
            Image(systemName: "hand.raised.fill")
            Text(String(localized: "selectionProcess.messages.yourTurn"))
                .fontWeight(.semibold)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding()
        .background(.green, in: RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium))
        .padding(.horizontal)
    }

    // MARK: - Week Selection

    @ViewBuilder
    private func selectionWeekSection(_ process: SelectionProcessWithContext) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Text(String(localized: "selectionProcess.titles.selectRoutines"))
                .font(.headline)
                .padding(.horizontal)

            if !process.isCurrentTurn {
                HStack {
                    Image(systemName: "lock.fill")
                    Text(String(localized: "selectionProcess.messages.notYourTurn"))
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
            }

            SelectionWeekGridView(
                weekStart: viewModel.currentWeekStart,
                routines: viewModel.weekRoutines,
                currentUserId: viewModel.currentUserId,
                canSelect: viewModel.canSelectRoutines,
                selectionStartDate: process.selectionStartDate,
                selectionEndDate: process.selectionEndDate,
                onNavigateWeek: { viewModel.navigateWeek(by: $0) },
                onGoToToday: { viewModel.goToToday() },
                onSelectRoutine: { viewModel.assignRoutineToSelf(instanceId: $0) }
            )
        }
    }

    // MARK: - Overview Card

    private func overviewCard(_ process: SelectionProcessWithContext) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Text(String(localized: "selectionProcess.details.overview"))
                .font(.headline)

            // Status
            HStack {
                Text("Status")
                    .foregroundStyle(.secondary)
                Spacer()
                DetailStatusBadge(status: process.status)
            }

            Divider()

            // Date range
            HStack {
                Text(String(localized: "selectionProcess.labels.startDate"))
                    .foregroundStyle(.secondary)
                Spacer()
                Text(process.formattedDateRange)
            }

            Divider()

            // Algorithm
            if let algorithm = process.algorithm {
                HStack {
                    Text(String(localized: "selectionProcess.labels.algorithm"))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Label(algorithm.displayName, systemImage: algorithm.icon)
                }
                Divider()
            }

            // Participants
            HStack {
                Text(String(localized: "selectionProcess.labels.participantCount"))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(process.turns.count)")
            }

            Divider()

            // Completed turns
            HStack {
                Text(String(localized: "selectionProcess.labels.completedTurns"))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(process.completedTurnsCount)/\(process.turns.count)")
            }

            // Your position
            if let order = process.userTurnOrder {
                Divider()
                HStack {
                    Text(String(localized: "selectionProcess.queue.yourPosition \(order) \(process.turns.count)"))
                        .foregroundStyle(.secondary)
                    if process.turnsAhead > 0 {
                        Spacer()
                        Text("\(process.turnsAhead) \(String(localized: "selectionProcess.queue.waiting"))")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }
            }
        }
        .font(.subheadline)
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
        .padding(.horizontal)
    }

    // MARK: - Turn Order

    private func turnOrderSection(_ process: SelectionProcessWithContext) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Text(String(localized: "selectionProcess.labels.turnOrder"))
                .font(.headline)
                .padding(.horizontal)

            TurnOrderListView(
                turns: process.turns,
                currentUserId: viewModel.currentUserId
            )
            .padding(.horizontal)
        }
    }

    // MARK: - Complete Turn

    private var completeTurnButton: some View {
        Button {
            viewModel.showCompleteTurnConfirm = true
        } label: {
            HStack {
                if viewModel.isActionLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                    Text(String(localized: "selectionProcess.buttons.completeTurn"))
                }
            }
            .font(.headline)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(.green)
        .disabled(viewModel.isActionLoading)
        .padding(.horizontal)
    }

    // MARK: - Admin Section

    private func adminSection(_ process: SelectionProcessWithContext) -> some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            Text(String(localized: "selectionProcess.admin.title"))
                .font(.headline)
                .padding(.horizontal)

            VStack(spacing: EquiDutyDesign.Spacing.sm) {
                if process.status == .draft {
                    Button {
                        viewModel.showStartConfirm = true
                    } label: {
                        Label(String(localized: "selectionProcess.admin.startProcess"), systemImage: "play.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label(String(localized: "selectionProcess.buttons.delete"), systemImage: "trash")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }

                if process.status == .active {
                    Button {
                        if let process = viewModel.process {
                            let isoFormatter = ISO8601DateFormatter()
                            isoFormatter.formatOptions = [.withInternetDateTime]
                            viewModel.editStartDate = isoFormatter.date(from: process.selectionStartDate) ?? Date()
                            viewModel.editEndDate = isoFormatter.date(from: process.selectionEndDate) ?? Date()
                        }
                        viewModel.showEditDates = true
                    } label: {
                        Label(String(localized: "selectionProcess.admin.editDates"), systemImage: "calendar")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)

                    Button(role: .destructive) {
                        viewModel.showCancelConfirm = true
                    } label: {
                        Label(String(localized: "selectionProcess.admin.cancelProcess"), systemImage: "xmark.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }

                if process.status == .cancelled {
                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label(String(localized: "selectionProcess.buttons.delete"), systemImage: "trash")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
            .disabled(viewModel.isActionLoading)
            .padding(.horizontal)
        }
    }

    // MARK: - Edit Dates Sheet

    private var editDatesSheet: some View {
        NavigationStack {
            Form {
                DatePicker(
                    String(localized: "selectionProcess.labels.startDate"),
                    selection: $viewModel.editStartDate,
                    displayedComponents: .date
                )
                DatePicker(
                    String(localized: "selectionProcess.labels.endDate"),
                    selection: $viewModel.editEndDate,
                    displayedComponents: .date
                )
            }
            .navigationTitle(String(localized: "selectionProcess.admin.editDates"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "selectionProcess.buttons.cancel")) {
                        viewModel.showEditDates = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.save")) {
                        viewModel.saveDates()
                        viewModel.showEditDates = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Detail Status Badge

private struct DetailStatusBadge: View {
    let status: SelectionProcessStatus

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: status.icon)
            Text(status.displayName)
        }
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(statusColor)
    }

    private var statusColor: Color {
        switch status {
        case .draft: return .gray
        case .active: return .green
        case .completed: return .blue
        case .cancelled: return .red
        }
    }
}

#Preview {
    NavigationStack {
        SelectionProcessDetailView(processId: "preview-id")
    }
}
