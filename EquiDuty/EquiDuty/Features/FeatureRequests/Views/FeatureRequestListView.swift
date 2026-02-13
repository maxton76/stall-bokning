//
//  FeatureRequestListView.swift
//  EquiDuty
//
//  Feature request list with status tabs, filters, and pagination
//

import SwiftUI

struct FeatureRequestListView: View {
    @State private var viewModel = FeatureRequestListViewModel()
    @State private var showCreateSheet = false

    var body: some View {
        VStack(spacing: 0) {
            // Status tabs
            statusTabBar

            // Filters row
            filtersRow

            // Content
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
                        icon: "lightbulb",
                        title: String(localized: "featureRequests.empty.title"),
                        message: String(localized: "featureRequests.empty.message")
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: EquiDutyDesign.Spacing.md) {
                            ForEach(viewModel.requests) { request in
                                NavigationLink(value: AppDestination.featureRequestDetail(requestId: request.id)) {
                                    FeatureRequestCard(request: request) {
                                        viewModel.toggleVote(requestId: request.id)
                                    }
                                }
                                .buttonStyle(.plain)
                            }

                            // Load more
                            if viewModel.nextCursor != nil {
                                Button {
                                    viewModel.loadMore()
                                } label: {
                                    if viewModel.isLoadingMore {
                                        ProgressView()
                                    } else {
                                        Text(String(localized: "featureRequests.loadMore"))
                                            .font(.subheadline)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                            }
                        }
                        .padding(.horizontal)
                        .padding(.vertical, EquiDutyDesign.Spacing.sm)
                    }
                    .refreshable {
                        await viewModel.refresh()
                    }
                }
            }
        }
        .navigationTitle(String(localized: "featureRequests.title"))
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showCreateSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showCreateSheet) {
            CreateFeatureRequestView {
                viewModel.reload()
            }
        }
        .onAppear {
            if !viewModel.hasLoaded {
                viewModel.loadData()
            }
        }
    }

    // MARK: - Status Tab Bar

    private var statusTabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: EquiDutyDesign.Spacing.sm) {
                statusPill(nil, label: String(localized: "featureRequests.filter.all"))
                ForEach(FeatureRequestStatus.allCases, id: \.self) { status in
                    statusPill(status, label: status.displayName)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, EquiDutyDesign.Spacing.sm)
        }
    }

    private func statusPill(_ status: FeatureRequestStatus?, label: String) -> some View {
        let isSelected = viewModel.selectedStatus == status
        return Button {
            viewModel.selectedStatus = status
            viewModel.onFilterChange()
        } label: {
            Text(label)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? Color.accentColor : Color(.systemGray6))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Filters Row

    private var filtersRow: some View {
        HStack(spacing: EquiDutyDesign.Spacing.md) {
            // Category picker
            Menu {
                Button(String(localized: "featureRequests.filter.allCategories")) {
                    viewModel.selectedCategory = nil
                    viewModel.onFilterChange()
                }
                ForEach(FeatureRequestCategory.allCases, id: \.self) { category in
                    Button(category.displayName) {
                        viewModel.selectedCategory = category
                        viewModel.onFilterChange()
                    }
                }
            } label: {
                HStack(spacing: 4) {
                    Text(viewModel.selectedCategory?.displayName ?? String(localized: "featureRequests.filter.category"))
                        .font(.subheadline)
                    Image(systemName: "chevron.down")
                        .font(.caption2)
                }
                .foregroundStyle(.primary)
            }

            // Sort picker
            Menu {
                ForEach(FeatureRequestSortBy.allCases, id: \.self) { sort in
                    Button(sort.displayName) {
                        viewModel.sortBy = sort
                        viewModel.onFilterChange()
                    }
                }
            } label: {
                HStack(spacing: 4) {
                    Text(viewModel.sortBy.displayName)
                        .font(.subheadline)
                    Image(systemName: "arrow.up.arrow.down")
                        .font(.caption2)
                }
                .foregroundStyle(.primary)
            }

            Spacer()

            // My Requests toggle
            Toggle(isOn: Binding(
                get: { viewModel.showMineOnly },
                set: { newValue in
                    viewModel.showMineOnly = newValue
                    viewModel.onFilterChange()
                }
            )) {
                Text(String(localized: "featureRequests.filter.mine"))
                    .font(.subheadline)
            }
            .toggleStyle(.button)
            .buttonStyle(.bordered)
            .tint(viewModel.showMineOnly ? .accentColor : .gray)
        }
        .padding(.horizontal)
        .padding(.bottom, EquiDutyDesign.Spacing.xs)
    }
}
