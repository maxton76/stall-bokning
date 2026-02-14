//
//  StablesListViewModel.swift
//  EquiDuty
//
//  ViewModel for listing stables in the Stall segment
//

import Foundation

@MainActor
@Observable
final class StablesListViewModel {
    // MARK: - State

    var stables: [Stable] = []
    var isLoading = false
    var errorMessage: String?
    var hasLoaded = false

    // MARK: - Dependencies

    private let service = StableService.shared
    private let authService = AuthService.shared
    private var loadTask: Task<Void, Never>?

    // MARK: - Computed

    var organizationId: String? {
        authService.selectedOrganization?.id
    }

    var isEmpty: Bool {
        stables.isEmpty && !isLoading && hasLoaded
    }

    // MARK: - Actions

    func loadData(force: Bool = false) {
        guard let organizationId else { return }
        if !force && hasLoaded && !isLoading { return }

        loadTask?.cancel()
        isLoading = true
        errorMessage = nil

        loadTask = Task {
            do {
                let result = try await service.getStables(organizationId: organizationId)
                guard !Task.isCancelled else { return }
                stables = result
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
        guard let organizationId else { return }
        do {
            stables = try await service.getStables(organizationId: organizationId)
            errorMessage = nil
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteStable(_ stable: Stable) async -> Bool {
        do {
            try await service.deleteStable(id: stable.id)
            stables.removeAll { $0.id == stable.id }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
