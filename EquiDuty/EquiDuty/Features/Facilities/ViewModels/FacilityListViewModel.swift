//
//  FacilityListViewModel.swift
//  EquiDuty
//
//  ViewModel for the facility list (Browse)
//

import Foundation

@MainActor
@Observable
final class FacilityListViewModel {
    // MARK: - State

    var facilities: [Facility] = []
    var isLoading = false
    var errorMessage: String?
    var hasLoaded = false
    var selectedTypeFilter: String?

    // MARK: - Dependencies

    private let service = FacilityService.shared
    private let authService = AuthService.shared
    private var loadTask: Task<Void, Never>?

    // MARK: - Computed

    var filteredFacilities: [Facility] {
        guard let filter = selectedTypeFilter else { return facilities }
        return facilities.filter { $0.type == filter }
    }

    var isEmpty: Bool {
        filteredFacilities.isEmpty && !isLoading
    }

    var stableId: String? {
        authService.selectedStable?.id
    }

    var availableTypes: [String] {
        Array(Set(facilities.map(\.type))).sorted()
    }

    // MARK: - Actions

    func loadData(force: Bool = false) {
        guard let stableId else { return }
        if !force && hasLoaded && !isLoading { return }

        loadTask?.cancel()
        isLoading = true
        errorMessage = nil

        loadTask = Task {
            do {
                let result = try await service.getFacilities(stableId: stableId)
                guard !Task.isCancelled else { return }
                facilities = result
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
            facilities = try await service.getFacilities(stableId: stableId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
