//
//  StablesListView.swift
//  EquiDuty
//
//  List of stables with CRUD actions for the Stall segment
//

import SwiftUI

struct StablesListView: View {
    @State private var viewModel = StablesListViewModel()
    @State private var authService = AuthService.shared
    @State private var permissionService = PermissionService.shared
    @State private var showAddSheet = false
    @State private var editingStable: Stable?
    @State private var deletingStable: Stable?

    private var canCreate: Bool {
        permissionService.hasPermission(.createStables) || permissionService.isOrgOwner
    }

    private var canManageSettings: Bool {
        permissionService.hasPermission(.manageStableSettings) || permissionService.isOrgOwner
    }

    var body: some View {
        Group {
            if viewModel.isLoading && !viewModel.hasLoaded {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, !viewModel.hasLoaded {
                ErrorView(message: error) {
                    viewModel.reload()
                }
            } else if viewModel.isEmpty {
                ModernEmptyStateView(
                    icon: "house",
                    title: String(localized: "stables.empty.title"),
                    message: String(localized: "stables.empty.message")
                )
            } else {
                List {
                    ForEach(viewModel.stables) { stable in
                        NavigationLink(value: AppDestination.stableDetail(stableId: stable.id)) {
                            StableRow(stable: stable)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            if canManageSettings {
                                Button(role: .destructive) {
                                    deletingStable = stable
                                } label: {
                                    Label(String(localized: "common.delete"), systemImage: "trash")
                                }

                                Button {
                                    editingStable = stable
                                } label: {
                                    Label(String(localized: "common.edit"), systemImage: "pencil")
                                }
                                .tint(.blue)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable {
                    await viewModel.refresh()
                }
            }
        }
        .toolbar {
            if canCreate {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .sheet(isPresented: $showAddSheet) {
            viewModel.reload()
        } content: {
            StableFormView()
        }
        .sheet(item: $editingStable) {
            viewModel.reload()
        } content: { stable in
            StableFormView(stable: stable)
        }
        .confirmationDialog(
            String(localized: "stables.delete.title"),
            isPresented: Binding(
                get: { deletingStable != nil },
                set: { if !$0 { deletingStable = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button(String(localized: "stables.delete.confirm"), role: .destructive) {
                if let stable = deletingStable {
                    Task {
                        _ = await viewModel.deleteStable(stable)
                    }
                }
                deletingStable = nil
            }
            Button(String(localized: "common.cancel"), role: .cancel) {
                deletingStable = nil
            }
        } message: {
            if let stable = deletingStable {
                Text(String(localized: "stables.delete.message \(stable.name)"))
            }
        }
        .onAppear {
            viewModel.loadData()
        }
        .onChange(of: authService.selectedOrganization?.id) { _, _ in
            viewModel.reload()
        }
    }
}

// MARK: - Stable Row

private struct StableRow: View {
    let stable: Stable

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.md) {
            Image(systemName: "house")
                .font(.title3)
                .foregroundStyle(.tint)
                .frame(width: 36, height: 36)
                .background(.tint.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(stable.name)
                    .font(.headline)

                HStack(spacing: EquiDutyDesign.Spacing.sm) {
                    if let address = stable.address, !address.isEmpty {
                        Label(address, systemImage: "mappin")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    if let facilityNumber = stable.facilityNumber, !facilityNumber.isEmpty {
                        Text(facilityNumber)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.blue.opacity(0.1))
                            .foregroundStyle(.blue)
                            .clipShape(Capsule())
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
    }
}
