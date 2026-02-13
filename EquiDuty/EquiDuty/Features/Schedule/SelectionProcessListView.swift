//
//  SelectionProcessListView.swift
//  EquiDuty
//
//  Selection process list view (Rutinval tab in SchemaView)
//

import SwiftUI

struct SelectionProcessListView: View {
    @State private var viewModel = SelectionProcessListViewModel()
    @State private var authService = AuthService.shared
    @State private var showCreateSheet = false
    @State private var showAlgorithmInfo = false

    var body: some View {
        ScrollView {
            VStack(spacing: EquiDutyDesign.Spacing.lg) {
                // Header description + help link
                VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.sm) {
                    Text(String(localized: "selectionProcess.descriptions.list"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Button {
                        showAlgorithmInfo = true
                    } label: {
                        Label(String(localized: "selectionProcess.algorithm.help.learnMore"), systemImage: "info.circle")
                            .font(.subheadline)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)

                // Status filter
                statusFilterPicker

                // Content
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if let errorMessage = viewModel.errorMessage {
                    ErrorView(message: errorMessage) {
                        viewModel.loadData()
                    }
                } else if viewModel.isEmpty {
                    emptyState
                } else {
                    processList
                }
            }
            .padding(.vertical)
        }
        .refreshable {
            await viewModel.refresh()
        }
        .onAppear {
            viewModel.loadData()
        }
        .onChange(of: authService.selectedStable?.id) { _, _ in
            viewModel.reload()
        }
        .sheet(isPresented: $showCreateSheet) {
            if let stableId = viewModel.stableId, let orgId = viewModel.organizationId {
                CreateSelectionProcessView(stableId: stableId, organizationId: orgId) {
                    viewModel.reload()
                }
            }
        }
        .sheet(isPresented: $showAlgorithmInfo) {
            AlgorithmInfoView()
        }
    }

    // MARK: - Subviews

    private var statusFilterPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                FilterChip(
                    label: String(localized: "selectionProcess.filters.all"),
                    isSelected: viewModel.selectedStatusFilter == nil
                ) {
                    viewModel.selectedStatusFilter = nil
                }

                ForEach(SelectionProcessStatus.allCases) { status in
                    FilterChip(
                        label: status.displayName,
                        isSelected: viewModel.selectedStatusFilter == status
                    ) {
                        viewModel.selectedStatusFilter = status
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    private var emptyState: some View {
        VStack(spacing: EquiDutyDesign.Spacing.lg) {
            ModernEmptyStateView(
                icon: "calendar.badge.clock",
                title: String(localized: "selectionProcess.emptyStates.noProcesses"),
                message: String(localized: "selectionProcess.emptyStates.noProcessesDescription")
            )

            Button {
                showCreateSheet = true
            } label: {
                Label(String(localized: "selectionProcess.buttons.create"), systemImage: "plus")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .padding(.horizontal, EquiDutyDesign.Spacing.xl)
        }
    }

    private var processList: some View {
        LazyVStack(spacing: EquiDutyDesign.Spacing.md) {
            // Create button at top for admin
            Button {
                showCreateSheet = true
            } label: {
                Label(String(localized: "selectionProcess.buttons.create"), systemImage: "plus")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .padding(.horizontal)

            ForEach(viewModel.filteredProcesses) { process in
                NavigationLink(value: AppDestination.selectionProcessDetail(processId: process.id)) {
                    SelectionProcessCard(process: process)
                }
                .buttonStyle(.plain)
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Process Card

private struct SelectionProcessCard: View {
    let process: SelectionProcessSummary

    private var statusColor: Color {
        switch process.status {
        case .draft: return .gray
        case .active: return .green
        case .completed: return .blue
        case .cancelled: return .red
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
            // Header: name + status + your turn
            HStack {
                Text(process.name)
                    .font(.headline)
                    .lineLimit(1)

                Spacer()

                if process.isCurrentTurn && process.status == .active {
                    Text(String(localized: "selectionProcess.messages.yourTurn"))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.green, in: Capsule())
                }

                StatusBadge(
                    status: process.status.displayName,
                    color: statusColor,
                    icon: process.status.icon
                )
            }

            // Date range
            HStack(spacing: EquiDutyDesign.Spacing.xs) {
                Image(systemName: "calendar")
                    .foregroundStyle(.secondary)
                Text(process.formattedDateRange)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Progress
            HStack {
                Label(
                    String(localized: "selectionProcess.labels.completedTurns") + ": \(process.completedTurns)/\(process.totalMembers)",
                    systemImage: "person.2"
                )
                .font(.caption)
                .foregroundStyle(.secondary)

                Spacer()

                if let currentTurn = process.currentTurnUserName, process.status == .active {
                    HStack(spacing: 4) {
                        Image(systemName: "person.fill")
                        Text(currentTurn)
                    }
                    .font(.caption)
                    .foregroundStyle(.blue)
                }
            }
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
    }
}

#Preview {
    NavigationStack {
        SelectionProcessListView()
    }
}
