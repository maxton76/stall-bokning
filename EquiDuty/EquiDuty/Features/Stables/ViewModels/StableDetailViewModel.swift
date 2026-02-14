//
//  StableDetailViewModel.swift
//  EquiDuty
//
//  ViewModel for viewing a single stable's details
//

import Foundation

@MainActor
@Observable
final class StableDetailViewModel {
    // MARK: - State

    var stable: Stable?
    var isLoading = false
    var errorMessage: String?

    // MARK: - Dependencies

    private let service = StableService.shared
    private let stableId: String

    // MARK: - Init

    init(stableId: String) {
        self.stableId = stableId
    }

    // MARK: - Actions

    func loadData() {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        Task {
            do {
                stable = try await service.getStable(id: stableId)
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    func refresh() async {
        do {
            stable = try await service.getStable(id: stableId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
