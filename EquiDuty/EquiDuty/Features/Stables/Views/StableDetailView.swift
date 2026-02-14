//
//  StableDetailView.swift
//  EquiDuty
//
//  Detail view for a single stable
//

import SwiftUI

struct StableDetailView: View {
    @State private var viewModel: StableDetailViewModel
    @State private var permissionService = PermissionService.shared
    @State private var showSettingsSheet = false

    let stableId: String

    init(stableId: String) {
        self.stableId = stableId
        _viewModel = State(initialValue: StableDetailViewModel(stableId: stableId))
    }

    private var canManageSettings: Bool {
        permissionService.hasPermission(.manageStableSettings) || permissionService.isOrgOwner
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.stable == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.stable == nil {
                ErrorView(message: error) {
                    viewModel.loadData()
                }
            } else if let stable = viewModel.stable {
                List {
                    // Basic Info
                    Section {
                        if let description = stable.description, !description.isEmpty {
                            LabeledContent(String(localized: "stables.detail.description")) {
                                Text(description)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        if let address = stable.address, !address.isEmpty {
                            LabeledContent(String(localized: "stables.detail.address")) {
                                Text(address)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        if let facilityNumber = stable.facilityNumber, !facilityNumber.isEmpty {
                            LabeledContent(String(localized: "stables.detail.facilityNumber")) {
                                Text(facilityNumber)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    } header: {
                        Text(String(localized: "stables.detail.section.basicInfo"))
                    }

                    // Points System
                    if let points = stable.pointsSystem {
                        Section {
                            LabeledContent(String(localized: "stables.form.resetPeriod")) {
                                Text(points.resetPeriod.displayName)
                                    .foregroundStyle(.secondary)
                            }

                            LabeledContent(String(localized: "stables.form.memoryHorizonDays")) {
                                Text("\(points.memoryHorizonDays) \(String(localized: "stables.form.unit.days"))")
                                    .foregroundStyle(.secondary)
                            }

                            LabeledContent(String(localized: "stables.form.holidayMultiplier")) {
                                Text(String(format: "%.1fx", points.holidayMultiplier))
                                    .foregroundStyle(.secondary)
                            }
                        } header: {
                            Text(String(localized: "stables.form.section.pointsSystem"))
                        }
                    }

                    // Boxes & Paddocks
                    if let boxes = stable.boxes, !boxes.isEmpty {
                        Section {
                            ForEach(boxes, id: \.self) { box in
                                Label(box, systemImage: "square.grid.2x2")
                            }
                        } header: {
                            Text(String(localized: "stables.detail.section.boxes") + " (\(boxes.count))")
                        }
                    }

                    if let paddocks = stable.paddocks, !paddocks.isEmpty {
                        Section {
                            ForEach(paddocks, id: \.self) { paddock in
                                Label(paddock, systemImage: "leaf")
                            }
                        } header: {
                            Text(String(localized: "stables.detail.section.paddocks") + " (\(paddocks.count))")
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable {
                    await viewModel.refresh()
                }
            }
        }
        .navigationTitle(viewModel.stable?.name ?? String(localized: "stables.detail.title"))
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            if canManageSettings {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showSettingsSheet = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
        }
        .sheet(isPresented: $showSettingsSheet) {
            viewModel.loadData()
        } content: {
            if let stable = viewModel.stable {
                StableFormView(stable: stable)
            }
        }
        .onAppear {
            viewModel.loadData()
        }
    }
}

// MARK: - ResetPeriod Display Name

extension PointsSystemConfig.ResetPeriod {
    var displayName: String {
        switch self {
        case .monthly: String(localized: "stables.resetPeriod.monthly")
        case .quarterly: String(localized: "stables.resetPeriod.quarterly")
        case .yearly: String(localized: "stables.resetPeriod.yearly")
        case .rolling: String(localized: "stables.resetPeriod.rolling")
        case .never: String(localized: "stables.resetPeriod.never")
        }
    }
}
