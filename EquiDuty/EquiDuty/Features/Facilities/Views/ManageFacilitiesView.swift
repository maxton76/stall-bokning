//
//  ManageFacilitiesView.swift
//  EquiDuty
//
//  List of facilities with CRUD actions for the Manage tab
//

import SwiftUI

struct ManageFacilitiesView: View {
    @State private var viewModel = ManageFacilitiesViewModel()
    @State private var authService = AuthService.shared
    @State private var showAddSheet = false
    @State private var editingFacility: Facility?
    @State private var deletingFacility: Facility?

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
                    icon: "building.2",
                    title: String(localized: "facilities.manage.empty.title"),
                    message: String(localized: "facilities.manage.empty.message")
                )
            } else {
                List {
                    ForEach(viewModel.facilities) { facility in
                        Button {
                            editingFacility = facility
                        } label: {
                            ManageFacilityRow(facility: facility)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    deletingFacility = facility
                                } label: {
                                    Label(String(localized: "common.delete"), systemImage: "trash")
                                }

                                Button {
                                    editingFacility = facility
                                } label: {
                                    Label(String(localized: "common.edit"), systemImage: "pencil")
                                }
                                .tint(.blue)
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
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showAddSheet) {
            viewModel.reload()
        } content: {
            FacilityFormView()
        }
        .sheet(item: $editingFacility) {
            viewModel.reload()
        } content: { facility in
            FacilityFormView(facility: facility)
        }
        .confirmationDialog(
            String(localized: "facilities.manage.delete.title"),
            isPresented: Binding(
                get: { deletingFacility != nil },
                set: { if !$0 { deletingFacility = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button(String(localized: "facilities.manage.delete.confirm"), role: .destructive) {
                if let facility = deletingFacility {
                    Task {
                        _ = await viewModel.deleteFacility(facility)
                    }
                }
                deletingFacility = nil
            }
            Button(String(localized: "common.cancel"), role: .cancel) {
                deletingFacility = nil
            }
        } message: {
            if let facility = deletingFacility {
                Text(String(localized: "facilities.manage.delete.message \(facility.name)"))
            }
        }
        .onAppear {
            viewModel.loadData()
        }
        .onChange(of: authService.selectedStable?.id) { _, _ in
            viewModel.reload()
        }
    }
}

// MARK: - Facility Row

private struct ManageFacilityRow: View {
    let facility: Facility

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.md) {
            // Type icon
            Image(systemName: facility.facilityType.icon)
                .font(.title3)
                .foregroundStyle(.tint)
                .frame(width: 36, height: 36)
                .background(.tint.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(facility.name)
                    .font(.headline)

                HStack(spacing: EquiDutyDesign.Spacing.sm) {
                    // Type badge
                    Label(facility.facilityType.displayName, systemImage: facility.facilityType.icon)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .labelStyle(.titleOnly)

                    // Status badge
                    Text(facility.status.displayName)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.15))
                        .foregroundStyle(statusColor)
                        .clipShape(Capsule())
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, EquiDutyDesign.Spacing.xs)
    }

    private var statusColor: Color {
        switch facility.status {
        case .active: .green
        case .inactive: .gray
        case .maintenance: .orange
        }
    }
}
