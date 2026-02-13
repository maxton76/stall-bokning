//
//  ReservationFormViewModel.swift
//  EquiDuty
//
//  ViewModel for creating/editing a facility reservation
//

import Foundation

@MainActor
@Observable
final class ReservationFormViewModel {
    // MARK: - State

    var selectedDate: Date
    var startTime: Date
    var endTime: Date
    var selectedHorseId: String?
    var selectedHorseName: String?
    var purpose: String = ""
    var notes: String = ""
    var contactInfo: String = ""
    var recurringWeekly: Bool = false
    var isSubmitting = false
    var errorMessage: String?
    var hasConflict = false
    var conflictMessage: String?
    var didSave = false

    // Horse picker state
    var availableHorses: [Horse] = []
    var isLoadingHorses = false

    // MARK: - Dependencies

    private let service = FacilityReservationService.shared
    private let authService = AuthService.shared
    private let horseService = HorseService.shared
    let facilityId: String
    let facilityName: String
    let existingReservationId: String?

    private let iso8601Formatter: ISO8601DateFormatter

    /// Initialize for creating a new reservation
    init(
        facilityId: String,
        facilityName: String,
        date: Date? = nil,
        startTime: String? = nil,
        endTime: String? = nil,
        existingReservationId: String? = nil
    ) {
        self.facilityId = facilityId
        self.facilityName = facilityName
        self.existingReservationId = existingReservationId

        let now = Date()
        let theDate = date ?? now
        self.selectedDate = theDate

        iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        // Parse start/end times or default to next 5-min-aligned time
        let calendar = Calendar.current
        let parsedStart: Date
        if let startStr = startTime, let hour = Int(startStr.prefix(2)), let minute = Int(startStr.suffix(2)) {
            let roundedMinute = (minute / 5) * 5
            parsedStart = calendar.date(bySettingHour: hour, minute: roundedMinute, second: 0, of: theDate) ?? now
        } else {
            let nextHour = calendar.component(.hour, from: now) + 1
            parsedStart = calendar.date(bySettingHour: nextHour, minute: 0, second: 0, of: theDate) ?? now
        }
        self.startTime = parsedStart

        if let endStr = endTime, let hour = Int(endStr.prefix(2)), let minute = Int(endStr.suffix(2)) {
            let roundedMinute = (minute / 5) * 5
            self.endTime = calendar.date(bySettingHour: hour, minute: roundedMinute, second: 0, of: theDate) ?? now
        } else {
            self.endTime = calendar.date(byAdding: .hour, value: 1, to: parsedStart) ?? now
        }
    }

    /// Initialize for editing an existing reservation
    init(
        facilityId: String,
        facilityName: String,
        date: Date? = nil,
        existingReservation: FacilityReservation
    ) {
        self.facilityId = facilityId
        self.facilityName = facilityName
        self.existingReservationId = existingReservation.id

        iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        // Pre-fill from existing reservation
        let calendar = Calendar.current
        self.selectedDate = date ?? calendar.startOfDay(for: existingReservation.startTime)
        self.startTime = existingReservation.startTime
        self.endTime = existingReservation.endTime
        self.selectedHorseId = existingReservation.horseId
        self.selectedHorseName = existingReservation.horseName
        self.purpose = existingReservation.purpose ?? ""
        self.notes = existingReservation.notes ?? ""
        // contactInfo is not in the model yet, but ready for when it is
    }

    // MARK: - Computed

    var isEditMode: Bool {
        existingReservationId != nil
    }

    var canSubmit: Bool {
        endTime > startTime && !isSubmitting && !hasConflict
    }

    var stableId: String? {
        authService.selectedStable?.id
    }

    // MARK: - Actions

    func loadHorses() async {
        guard let stableId else { return }
        isLoadingHorses = true
        do {
            availableHorses = try await horseService.getMyHorses(stableId: stableId)
        } catch {
            availableHorses = []
        }
        isLoadingHorses = false
    }

    func onHorseSelectionChanged() {
        if let horseId = selectedHorseId {
            selectedHorseName = availableHorses.first(where: { $0.id == horseId })?.name
        } else {
            selectedHorseName = nil
        }
    }

    func checkConflicts() async {
        let startDateTime = combineDateAndTime(date: selectedDate, time: startTime)
        let endDateTime = combineDateAndTime(date: selectedDate, time: endTime)

        let request = CheckConflictsRequest(
            facilityId: facilityId,
            startTime: iso8601Formatter.string(from: startDateTime),
            endTime: iso8601Formatter.string(from: endDateTime),
            excludeReservationId: existingReservationId
        )

        do {
            let result = try await service.checkConflicts(request)
            hasConflict = result.hasConflicts
            if result.hasConflicts {
                conflictMessage = String(localized: "reservation.conflict")
            } else {
                conflictMessage = nil
            }
        } catch {
            // Don't block submission on conflict check failure
            hasConflict = false
            conflictMessage = nil
        }
    }

    func submit() async {
        guard let stableId, canSubmit else { return }

        isSubmitting = true
        errorMessage = nil

        let startDateTime = combineDateAndTime(date: selectedDate, time: startTime)
        let endDateTime = combineDateAndTime(date: selectedDate, time: endTime)

        do {
            if let reservationId = existingReservationId {
                let updates = UpdateReservationRequest(
                    startTime: iso8601Formatter.string(from: startDateTime),
                    endTime: iso8601Formatter.string(from: endDateTime),
                    horseId: selectedHorseId,
                    horseName: selectedHorseName,
                    purpose: purpose.isEmpty ? nil : purpose,
                    notes: notes.isEmpty ? nil : notes,
                    contactInfo: contactInfo.isEmpty ? nil : contactInfo
                )
                _ = try await service.updateReservation(id: reservationId, updates: updates)
            } else {
                // Create primary reservation
                let request = CreateReservationRequest(
                    facilityId: facilityId,
                    stableId: stableId,
                    startTime: iso8601Formatter.string(from: startDateTime),
                    endTime: iso8601Formatter.string(from: endDateTime),
                    horseId: selectedHorseId,
                    horseName: selectedHorseName,
                    purpose: purpose.isEmpty ? nil : purpose,
                    notes: notes.isEmpty ? nil : notes,
                    contactInfo: contactInfo.isEmpty ? nil : contactInfo
                )
                _ = try await service.createReservation(request)

                // Create recurring reservations (+1 to +4 weeks)
                if recurringWeekly {
                    let calendar = Calendar.current
                    var failedWeeks: [Int] = []
                    for weekOffset in 1...4 {
                        guard let futureStart = calendar.date(byAdding: .weekOfYear, value: weekOffset, to: startDateTime),
                              let futureEnd = calendar.date(byAdding: .weekOfYear, value: weekOffset, to: endDateTime) else {
                            continue
                        }
                        let recurringRequest = CreateReservationRequest(
                            facilityId: facilityId,
                            stableId: stableId,
                            startTime: iso8601Formatter.string(from: futureStart),
                            endTime: iso8601Formatter.string(from: futureEnd),
                            horseId: selectedHorseId,
                            horseName: selectedHorseName,
                            purpose: purpose.isEmpty ? nil : purpose,
                            notes: notes.isEmpty ? nil : notes,
                            contactInfo: contactInfo.isEmpty ? nil : contactInfo
                        )
                        do {
                            _ = try await service.createReservation(recurringRequest)
                        } catch {
                            failedWeeks.append(weekOffset)
                        }
                    }
                    if !failedWeeks.isEmpty {
                        let weeksList = failedWeeks.map { "+\($0)" }.joined(separator: ", ")
                        errorMessage = String(localized: "reservation.recurringPartialFailure \(weeksList)")
                    }
                }
            }

            isSubmitting = false
            didSave = true
        } catch {
            errorMessage = error.localizedDescription
            isSubmitting = false
        }
    }

    // MARK: - Private

    private func combineDateAndTime(date: Date, time: Date) -> Date {
        let calendar = Calendar.current
        let dateComponents = calendar.dateComponents([.year, .month, .day], from: date)
        let timeComponents = calendar.dateComponents([.hour, .minute], from: time)

        var combined = DateComponents()
        combined.year = dateComponents.year
        combined.month = dateComponents.month
        combined.day = dateComponents.day
        combined.hour = timeComponents.hour
        combined.minute = timeComponents.minute
        combined.second = 0

        return calendar.date(from: combined) ?? date
    }
}
