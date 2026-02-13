//
//  FacilityDetailViewModel.swift
//  EquiDuty
//
//  ViewModel for facility detail view with day schedule
//

import Foundation

@MainActor
@Observable
final class FacilityDetailViewModel {
    // MARK: - State

    var facility: Facility?
    var reservations: [FacilityReservation] = []
    var availableSlots: AvailableSlotsResponse?
    var selectedDate: Date = .now
    var isLoading = false
    var errorMessage: String?

    // MARK: - Dependencies

    private let facilityService = FacilityService.shared
    private let reservationService = FacilityReservationService.shared
    private let dateFormatter: DateFormatter
    let facilityId: String

    init(facilityId: String) {
        self.facilityId = facilityId
        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
    }

    // MARK: - Computed

    var facilityName: String {
        facility?.name ?? ""
    }

    var facilityType: String {
        facility?.type ?? ""
    }

    // MARK: - Actions

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let facilityResult = facilityService.getFacility(id: facilityId)
            async let slotsResult = facilityService.getAvailableSlots(facilityId: facilityId, date: selectedDate)
            async let reservationsResult = loadReservationsForDate()

            facility = try await facilityResult
            availableSlots = try await slotsResult
            reservations = try await reservationsResult
            isLoading = false
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    func changeDate(_ date: Date) async {
        selectedDate = date
        do {
            async let slotsResult = facilityService.getAvailableSlots(facilityId: facilityId, date: date)
            async let reservationsResult = loadReservationsForDate()

            availableSlots = try await slotsResult
            reservations = try await reservationsResult
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func goToPreviousDay() async {
        let newDate = Calendar.current.date(byAdding: .day, value: -1, to: selectedDate) ?? selectedDate
        await changeDate(newDate)
    }

    func goToNextDay() async {
        let newDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
        await changeDate(newDate)
    }

    // MARK: - Private

    private func loadReservationsForDate() async throws -> [FacilityReservation] {
        try await reservationService.getReservations(
            facilityId: facilityId,
            startDate: selectedDate,
            endDate: selectedDate
        )
    }
}
