//
//  ManageFacilitiesViewModel.swift
//  EquiDuty
//
//  ViewModel for managing facilities (CRUD operations)
//

import Foundation

@MainActor
@Observable
final class ManageFacilitiesViewModel {
    // MARK: - State

    var facilities: [Facility] = []
    var isLoading = false
    var errorMessage: String?
    var hasLoaded = false

    // MARK: - Dependencies

    private let service = FacilityService.shared
    private let authService = AuthService.shared
    private var loadTask: Task<Void, Never>?

    // MARK: - Computed

    var stableId: String? {
        authService.selectedStable?.id
    }

    var isEmpty: Bool {
        facilities.isEmpty && !isLoading && hasLoaded
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
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteFacility(_ facility: Facility) async -> Bool {
        do {
            try await service.deleteFacility(id: facility.id)
            facilities.removeAll { $0.id == facility.id }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
