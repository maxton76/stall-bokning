//
//  MyReservationsViewModel.swift
//  EquiDuty
//
//  ViewModel for the user's reservations list
//

import Foundation

/// Segment filter for reservations list
enum ReservationSegment: String, CaseIterable {
    case upcoming
    case past
}

@MainActor
@Observable
final class MyReservationsViewModel {
    // MARK: - State

    var reservations: [FacilityReservation] = []
    var isLoading = false
    var errorMessage: String?
    var hasLoaded = false
    var selectedSegment: ReservationSegment = .upcoming

    // MARK: - Dependencies

    private let service = FacilityReservationService.shared
    private let authService = AuthService.shared
    private var loadTask: Task<Void, Never>?

    // MARK: - Computed

    var filteredReservations: [FacilityReservation] {
        let now = Date()
        switch selectedSegment {
        case .upcoming:
            return reservations
                .filter { $0.endTime >= now && $0.status != .cancelled && $0.status != .rejected }
                .sorted { $0.startTime < $1.startTime }
        case .past:
            return reservations
                .filter { $0.endTime < now || $0.status == .cancelled || $0.status == .rejected }
                .sorted { $0.startTime > $1.startTime }
        }
    }

    var isEmpty: Bool {
        filteredReservations.isEmpty && !isLoading
    }

    var userId: String? {
        authService.firebaseUid
    }

    /// Group reservations by date for section display
    var groupedReservations: [(date: Date, reservations: [FacilityReservation])] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: filteredReservations) { reservation in
            calendar.startOfDay(for: reservation.startTime)
        }
        return grouped
            .sorted { $0.key < $1.key }
            .map { (date: $0.key, reservations: $0.value) }
    }

    // MARK: - Actions

    func loadData(force: Bool = false) {
        guard let userId else { return }
        if !force && hasLoaded && !isLoading { return }

        loadTask?.cancel()
        isLoading = true
        errorMessage = nil

        loadTask = Task {
            do {
                let result = try await service.getMyReservations(userId: userId)
                guard !Task.isCancelled else { return }
                reservations = result
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
        guard let userId else { return }
        do {
            reservations = try await service.getMyReservations(userId: userId)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func cancelReservation(id: String) async -> Bool {
        do {
            try await service.cancelReservation(id: id)
            // Update local state
            if let index = reservations.firstIndex(where: { $0.id == id }) {
                reservations.remove(at: index)
            }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    /// Check if a reservation is starting within the next hour
    func isStartingSoon(_ reservation: FacilityReservation) -> Bool {
        let now = Date()
        let oneHourFromNow = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now
        return reservation.startTime > now && reservation.startTime <= oneHourFromNow
            && reservation.status != .cancelled && reservation.status != .rejected
    }
}
