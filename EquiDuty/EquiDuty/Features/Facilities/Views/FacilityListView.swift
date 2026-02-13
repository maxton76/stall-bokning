//
//  FacilityListView.swift
//  EquiDuty
//
//  List of facilities for the current stable
//

import SwiftUI

struct FacilityListView: View {
    @State private var viewModel = FacilityListViewModel()
    @State private var authService = AuthService.shared

    var body: some View {
        Group {
            if viewModel.isLoading && !viewModel.hasLoaded {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                ErrorView(message: error) {
                    viewModel.reload()
                }
            } else if viewModel.isEmpty && viewModel.hasLoaded {
                ModernEmptyStateView(
                    icon: "building.2",
                    title: String(localized: "facilities.noFacilities"),
                    message: String(localized: "facilities.noFacilitiesMessage")
                )
            } else {
                ScrollView {
                    VStack(spacing: EquiDutyDesign.Spacing.md) {
                        // Type filter chips
                        if !viewModel.availableTypes.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: EquiDutyDesign.Spacing.sm) {
                                    FilterChip(
                                        label: String(localized: "common.all"),
                                        isSelected: viewModel.selectedTypeFilter == nil
                                    ) {
                                        viewModel.selectedTypeFilter = nil
                                    }

                                    ForEach(viewModel.availableTypes, id: \.self) { type in
                                        FilterChip(
                                            label: facilityTypeLabel(type),
                                            isSelected: viewModel.selectedTypeFilter == type
                                        ) {
                                            viewModel.selectedTypeFilter = type
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }

                        // Facility list
                        LazyVStack(spacing: EquiDutyDesign.Spacing.md) {
                            ForEach(viewModel.filteredFacilities) { facility in
                                NavigationLink(value: AppDestination.facilityDetail(facilityId: facility.id)) {
                                    FacilityRowView(facility: facility)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical)
                }
                .refreshable {
                    await viewModel.refresh()
                }
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

private struct FacilityRowView: View {
    let facility: Facility

    var body: some View {
        HStack(spacing: EquiDutyDesign.Spacing.md) {
            // Type icon
            Image(systemName: facilityTypeIcon(facility.type))
                .font(.title2)
                .foregroundStyle(.tint)
                .frame(width: 44, height: 44)
                .background(.tint.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.medium))

            VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.xs) {
                Text(facility.name)
                    .font(.headline)
                    .foregroundStyle(.primary)

                HStack(spacing: EquiDutyDesign.Spacing.sm) {
                    Text(facilityTypeLabel(facility.type))
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let capacity = facility.capacity {
                        Text("\(String(localized: "facilities.capacity")): \(capacity)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                // Status badge
                if facility.status != .active {
                    Text(facility.status.rawValue.capitalized)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(facility.status == .maintenance ? Color.orange.opacity(0.15) : Color.gray.opacity(0.15))
                        .foregroundStyle(facility.status == .maintenance ? .orange : .secondary)
                        .clipShape(Capsule())
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: EquiDutyDesign.CornerRadius.card))
        .shadow(color: .black.opacity(0.06), radius: 4, y: 1)
    }
}

// MARK: - Helpers

/// Get SF Symbol for facility type
func facilityTypeIcon(_ type: String) -> String {
    switch type.lowercased() {
    case "arena", "ridhus": return "figure.equestrian.sports"
    case "paddock": return "square.dashed"
    case "wash_area", "wash area", "tvättspilta": return "drop.fill"
    case "walker", "rullband": return "arrow.triangle.2.circlepath"
    case "solarium": return "sun.max.fill"
    case "round_pen", "round pen", "rund paddock": return "circle.dashed"
    default: return "building.2"
    }
}

/// Get localized label for facility type
func facilityTypeLabel(_ type: String) -> String {
    switch type.lowercased() {
    case "arena", "ridhus": return String(localized: "facilities.type.arena")
    case "paddock": return String(localized: "facilities.type.paddock")
    case "wash_area", "wash area", "tvättspilta": return String(localized: "facilities.type.washArea")
    case "walker", "rullband": return String(localized: "facilities.type.walker")
    case "solarium": return String(localized: "facilities.type.solarium")
    case "round_pen", "round pen", "rund paddock": return String(localized: "facilities.type.roundPen")
    default: return String(localized: "facilities.type.other")
    }
}
