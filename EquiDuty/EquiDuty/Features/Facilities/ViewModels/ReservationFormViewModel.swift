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
    var selectedHorseIds: Set<String> = []
    var externalHorseCount: Int = 0
    var purpose: String = ""
    var notes: String = ""
    var contactInfo: String = ""
    var recurringWeekly: Bool = false
    var isSubmitting = false
    var errorMessage: String?
    var hasConflict = false
    var conflictMessage: String?
    var suggestedSlots: [SuggestedSlot] = []
    var didSave = false

    // Capacity state
    var maxHorsesPerReservation: Int = 1
    var remainingCapacity: Int = 1

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
        self.selectedHorseIds = Set(existingReservation.allHorseIds)
        self.purpose = existingReservation.purpose ?? ""
        self.notes = existingReservation.notes ?? ""
        // contactInfo is not in the model yet, but ready for when it is
    }

    // MARK: - Computed

    var isEditMode: Bool {
        existingReservationId != nil
    }

    var canSubmit: Bool {
        let totalHorses = selectedHorseIds.count + externalHorseCount
        return endTime > startTime && !isSubmitting && !hasConflict && totalHorses > 0 && totalHorses <= remainingCapacity
    }

    var stableId: String? {
        authService.selectedStable?.id
    }

    /// Selected horses as an ordered array
    var selectedHorses: [Horse] {
        availableHorses.filter { selectedHorseIds.contains($0.id) }
    }

    /// Names of selected horses
    private var selectedHorseNames: [String] {
        selectedHorses.map { $0.name }
    }

    /// Whether more horses can be added without exceeding capacity (accounts for external horses)
    var canAddMoreHorses: Bool {
        (selectedHorseIds.count + externalHorseCount) < remainingCapacity
    }

    /// Capacity usage message (nil when facility allows only 1 horse)
    var capacityMessage: String? {
        guard maxHorsesPerReservation > 1 else { return nil }
        let used = maxHorsesPerReservation - remainingCapacity
        return String(localized: "reservation.capacity.slotsUsed \(used) \(maxHorsesPerReservation)")
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

    func toggleHorse(_ horseId: String) {
        if selectedHorseIds.contains(horseId) {
            selectedHorseIds.remove(horseId)
        } else {
            guard canAddMoreHorses else { return }
            selectedHorseIds.insert(horseId)
        }
    }

    func removeHorse(_ horseId: String) {
        selectedHorseIds.remove(horseId)
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
            // Update capacity info
            if let max = result.maxHorsesPerReservation {
                maxHorsesPerReservation = max
            }
            if let remaining = result.remainingCapacity {
                remainingCapacity = remaining
            }
        } catch {
            // Don't block submission on conflict check failure
            hasConflict = false
            conflictMessage = nil
            // Fallback: allow up to max capacity
            remainingCapacity = maxHorsesPerReservation
        }
    }

    func submit() async {
        guard let stableId, canSubmit else { return }

        isSubmitting = true
        errorMessage = nil
        suggestedSlots = []

        let startDateTime = combineDateAndTime(date: selectedDate, time: startTime)
        let endDateTime = combineDateAndTime(date: selectedDate, time: endTime)

        let horseIdsList = Array(selectedHorseIds)
        let horseNamesList = selectedHorseNames
        // For backward compatibility, also set legacy single fields
        let legacyHorseId = horseIdsList.first
        let legacyHorseName = horseNamesList.first

        do {
            if let reservationId = existingReservationId {
                let updates = UpdateReservationRequest(
                    startTime: iso8601Formatter.string(from: startDateTime),
                    endTime: iso8601Formatter.string(from: endDateTime),
                    horseId: legacyHorseId,
                    horseName: legacyHorseName,
                    horseIds: horseIdsList.isEmpty ? nil : horseIdsList,
                    horseNames: horseNamesList.isEmpty ? nil : horseNamesList,
                    externalHorseCount: externalHorseCount > 0 ? externalHorseCount : nil,
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
                    horseId: legacyHorseId,
                    horseName: legacyHorseName,
                    horseIds: horseIdsList.isEmpty ? nil : horseIdsList,
                    horseNames: horseNamesList.isEmpty ? nil : horseNamesList,
                    externalHorseCount: externalHorseCount > 0 ? externalHorseCount : nil,
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
                            horseId: legacyHorseId,
                            horseName: legacyHorseName,
                            horseIds: horseIdsList.isEmpty ? nil : horseIdsList,
                            horseNames: horseNamesList.isEmpty ? nil : horseNamesList,
                            externalHorseCount: externalHorseCount > 0 ? externalHorseCount : nil,
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
        } catch let apiError as APIError {
            if case .capacityExceeded(let message, let slots, _) = apiError {
                errorMessage = message
                suggestedSlots = slots
            } else {
                errorMessage = apiError.localizedDescription
            }
            isSubmitting = false
        } catch {
            errorMessage = error.localizedDescription
            isSubmitting = false
        }
    }

    func selectSuggestedSlot(_ slot: SuggestedSlot) {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        // Try with fractional seconds first, then without
        let start = formatter.date(from: slot.startTime) ?? {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime]
            return f.date(from: slot.startTime)
        }()

        let end = formatter.date(from: slot.endTime) ?? {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime]
            return f.date(from: slot.endTime)
        }()

        if let start {
            self.startTime = start
        }
        if let end {
            self.endTime = end
        }

        suggestedSlots = []
        errorMessage = nil
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
