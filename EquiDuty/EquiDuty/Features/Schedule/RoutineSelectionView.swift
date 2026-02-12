//
//  RoutineSelectionView.swift
//  EquiDuty
//
//  Routine selection tab - embedded within SchemaView
//  Shows list of routine instances for selected date
//

import SwiftUI

struct RoutineSelectionView: View {
    @State private var authService = AuthService.shared
    @State private var routineService = RoutineService.shared
    @State private var selectedDate = Date()
    @State private var instances: [RoutineInstance] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: EquiDutyDesign.Spacing.lg) {
                // Date navigation
                DateNavigationHeader(
                    selectedDate: $selectedDate,
                    onDateChanged: { loadData() }
                )

                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if let errorMessage {
                    ErrorView(message: errorMessage) {
                        loadData()
                    }
                } else if instances.isEmpty {
                    ModernEmptyStateView(
                        icon: "checklist",
                        title: String(localized: "routines.empty.title"),
                        message: String(localized: "routines.empty.message")
                    )
                } else {
                    // Today's routines
                    VStack(alignment: .leading, spacing: EquiDutyDesign.Spacing.md) {
                        Text(String(localized: "routines.today"))
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(instances) { instance in
                            NavigationLink(value: AppDestination.routineFlow(instanceId: instance.id)) {
                                RoutineInstanceCard(instance: instance)
                            }
                            .buttonStyle(.scale)
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .padding(.vertical)
        }
        .refreshable {
            await refreshData()
        }
        .onAppear {
            loadData()
        }
        .onChange(of: authService.selectedStable?.id) { _, _ in
            loadData()
        }
        .onChange(of: authService.selectedOrganization?.id) { _, _ in
            loadData()
        }
        .onChange(of: selectedDate) { _, _ in
            loadData()
        }
    }

    // MARK: - Data Loading

    private func loadData() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                // Fetch routine instances for the selected date
                if let stableId = authService.selectedStable?.id {
                    instances = try await routineService.getRoutineInstances(
                        stableId: stableId,
                        date: selectedDate
                    )
                    // Sort by scheduled time
                    instances.sort { $0.scheduledStartTime < $1.scheduledStartTime }
                } else {
                    instances = []
                }

                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func refreshData() async {
        do {
            if let stableId = authService.selectedStable?.id {
                instances = try await routineService.getRoutineInstances(
                    stableId: stableId,
                    date: selectedDate
                )
                instances.sort { $0.scheduledStartTime < $1.scheduledStartTime }
            } else {
                instances = []
            }

            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    RoutineSelectionView()
}
