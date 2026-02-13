//
//  SelectionProcessListViewModel.swift
//  EquiDuty
//
//  ViewModel for the selection process list (Rutinval)
//

import Foundation

@MainActor
@Observable
final class SelectionProcessListViewModel {
    // MARK: - State

    var processes: [SelectionProcessSummary] = []
    var isLoading = false
    var errorMessage: String?
    var selectedStatusFilter: SelectionProcessStatus?
    var hasLoaded = false

    // MARK: - Dependencies

    private let service = SelectionProcessService.shared
    private let authService = AuthService.shared
    private var loadTask: Task<Void, Never>?

    // MARK: - Computed

    var filteredProcesses: [SelectionProcessSummary] {
        guard let filter = selectedStatusFilter else { return processes }
        return processes.filter { $0.status == filter }
    }

    var isEmpty: Bool {
        filteredProcesses.isEmpty && !isLoading
    }

    var stableId: String? {
        authService.selectedStable?.id
    }

    var organizationId: String? {
        authService.selectedOrganization?.id
    }

    // MARK: - Actions

    func loadData(force: Bool = false) {
        guard let stableId else { return }
        if !force && hasLoaded && !isLoading { return }

        // Cancel previous load if switching stables
        loadTask?.cancel()

        isLoading = true
        errorMessage = nil

        loadTask = Task {
            do {
                let result = try await service.listProcesses(stableId: stableId)
                guard !Task.isCancelled else { return }
                processes = result
                isLoading = false
                hasLoaded = true
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    func reload() {
        hasLoaded = false
        loadData(force: true)
    }

    func refresh() async {
        guard let stableId else { return }
        do {
            processes = try await service.listProcesses(stableId: stableId)
            errorMessage = nil
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }
}
